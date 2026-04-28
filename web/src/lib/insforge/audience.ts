import "server-only";
import { getInsforge } from "./client";
import { thesisFitScore, type InvestorThesis } from "./investors";
import type { StoredSubmission } from "./submissions";

/* ─── TYPES ───────────────────────────────────────────────────────────── */
export type Viewer = {
  viewerUserId: string;
  fundSlug: string | null;
  fundName: string | null;
  partnerName: string | null;
  hq: string | null;
  thesisOneLiner: string | null;
  fit: number | null;
  fitReasons: string[];
  viewedAt: string;
};

export type IncomingConnect = {
  id: string;
  investorUserId: string;
  fundSlug: string | null;
  fundName: string | null;
  partnerName: string | null;
  thesisOneLiner: string | null;
  fit: number | null;
  message: string | null;
  status: "pending" | "accepted" | "declined";
  requestedAt: string;
};

export type AudienceStats = {
  totalViews: number;
  uniqueInvestorViewers: number;
  saves: number;
  pendingConnects: number;
};

export type ViewBucket = { date: string; count: number };

/* ─── VIEW RECORDING (with 1-hour dedup per viewer) ───────────────────── */
export async function recordView({
  submissionId,
  viewerUserId,
  viewerRole,
  referrer,
}: {
  submissionId: string;
  viewerUserId: string | null;
  viewerRole: "owner" | "investor" | "founder" | "anonymous";
  referrer?: string;
}): Promise<void> {
  const client = getInsforge();

  // Dedup: if a signed-in viewer hit this submission within the last hour, skip.
  if (viewerUserId) {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { data: recent } = await client.database
      .from("profile_views")
      .select("id")
      .eq("submission_id", submissionId)
      .eq("viewer_user_id", viewerUserId)
      .gte("viewed_at", oneHourAgo)
      .limit(1);
    if (recent && recent.length > 0) return;
  }

  await client.database.from("profile_views").insert({
    submission_id: submissionId,
    viewer_user_id: viewerUserId,
    viewer_role: viewerRole,
    referrer: referrer ?? null,
  });
}

/* ─── STATS ──────────────────────────────────────────────────────────── */
export async function getAudienceStats(submissionId: string): Promise<AudienceStats> {
  const client = getInsforge();

  const [viewsRes, savesRes, connectsRes] = await Promise.all([
    client.database
      .from("profile_views")
      .select("viewer_user_id, viewer_role")
      .eq("submission_id", submissionId),
    client.database
      .from("saves")
      .select("id", { count: "exact", head: true })
      .eq("submission_id", submissionId),
    client.database
      .from("connect_requests")
      .select("id", { count: "exact", head: true })
      .eq("submission_id", submissionId)
      .eq("status", "pending"),
  ]);

  const views = (viewsRes.data ?? []) as {
    viewer_user_id: string | null;
    viewer_role: string | null;
  }[];
  const totalViews = views.length;
  const uniqueInvestorViewers = new Set(
    views
      .filter((v) => v.viewer_role === "investor" && v.viewer_user_id)
      .map((v) => v.viewer_user_id as string)
  ).size;

  return {
    totalViews,
    uniqueInvestorViewers,
    saves: savesRes.count ?? 0,
    pendingConnects: connectsRes.count ?? 0,
  };
}

/* ─── SPARKLINE: views per day for last N days ───────────────────────── */
export async function getViewSparkline(
  submissionId: string,
  days = 14
): Promise<ViewBucket[]> {
  const client = getInsforge();
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const { data } = await client.database
    .from("profile_views")
    .select("viewed_at")
    .eq("submission_id", submissionId)
    .gte("viewed_at", since.toISOString());

  const buckets: Record<string, number> = {};
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    buckets[isoDay(d)] = 0;
  }
  for (const row of (data ?? []) as { viewed_at: string }[]) {
    const day = isoDay(new Date(row.viewed_at));
    if (buckets[day] !== undefined) buckets[day] += 1;
  }
  return Object.entries(buckets).map(([date, count]) => ({ date, count }));
}

function isoDay(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/* ─── RECENT VIEWERS (joined with investor thesis when present) ──────── */
export async function listRecentViewers(
  submission: StoredSubmission,
  limit = 8
): Promise<Viewer[]> {
  const client = getInsforge();

  // 1) Latest distinct viewers (investors only) for this submission.
  const { data: rows } = await client.database
    .from("profile_views")
    .select("viewer_user_id, viewed_at")
    .eq("submission_id", submission.id)
    .eq("viewer_role", "investor")
    .not("viewer_user_id", "is", null)
    .order("viewed_at", { ascending: false })
    .limit(80); // pull more than `limit` so we can dedup by viewer

  const seen = new Set<string>();
  const distinct: { viewer_user_id: string; viewed_at: string }[] = [];
  for (const r of (rows ?? []) as {
    viewer_user_id: string;
    viewed_at: string;
  }[]) {
    if (seen.has(r.viewer_user_id)) continue;
    seen.add(r.viewer_user_id);
    distinct.push(r);
    if (distinct.length >= limit) break;
  }

  if (distinct.length === 0) return [];

  // 2) Join investor profiles by owner_user_id.
  const ids = distinct.map((d) => d.viewer_user_id);
  const { data: invs } = await client.database
    .from("investors")
    .select(
      "owner_user_id, slug, fund_name, partner_name, hq, thesis_one_liner, stages, sectors, check_size_min_usd, check_size_max_usd"
    )
    .in("owner_user_id", ids);

  type InvJoinRow = {
    owner_user_id: string;
    slug: string;
    fund_name: string;
    partner_name: string | null;
    hq: string | null;
    thesis_one_liner: string;
    stages: string[];
    sectors: string[];
    check_size_min_usd: number | null;
    check_size_max_usd: number | null;
  };

  const invByOwner = new Map<string, InvJoinRow>();
  for (const inv of (invs ?? []) as InvJoinRow[]) {
    invByOwner.set(inv.owner_user_id, inv);
  }

  return distinct.map((d): Viewer => {
    const inv = invByOwner.get(d.viewer_user_id);
    if (!inv) {
      return {
        viewerUserId: d.viewer_user_id,
        fundSlug: null,
        fundName: null,
        partnerName: null,
        hq: null,
        thesisOneLiner: null,
        fit: null,
        fitReasons: [],
        viewedAt: d.viewed_at,
      };
    }
    const thesis: InvestorThesis = {
      fundName: inv.fund_name,
      partnerName: inv.partner_name ?? undefined,
      thesisOneLiner: inv.thesis_one_liner,
      stages: inv.stages as InvestorThesis["stages"],
      sectors: inv.sectors as InvestorThesis["sectors"],
      checkSizeMinUsd: inv.check_size_min_usd ?? undefined,
      checkSizeMaxUsd: inv.check_size_max_usd ?? undefined,
    };
    const { score, reasons } = thesisFitScore(thesis, submission);
    return {
      viewerUserId: d.viewer_user_id,
      fundSlug: inv.slug,
      fundName: inv.fund_name,
      partnerName: inv.partner_name,
      hq: inv.hq,
      thesisOneLiner: inv.thesis_one_liner,
      fit: score,
      fitReasons: reasons,
      viewedAt: d.viewed_at,
    };
  });
}

/* ─── CONNECT REQUESTS: pending inbox for the founder ─────────────────── */
export async function listIncomingConnects(
  submission: StoredSubmission
): Promise<IncomingConnect[]> {
  const client = getInsforge();
  const { data } = await client.database
    .from("connect_requests")
    .select("id, investor_user_id, message, status, requested_at")
    .eq("submission_id", submission.id)
    .eq("status", "pending")
    .order("requested_at", { ascending: false })
    .limit(20);

  const rows = (data ?? []) as {
    id: string;
    investor_user_id: string;
    message: string | null;
    status: "pending" | "accepted" | "declined";
    requested_at: string;
  }[];
  if (rows.length === 0) return [];

  const ids = rows.map((r) => r.investor_user_id);
  const { data: invs } = await client.database
    .from("investors")
    .select(
      "owner_user_id, slug, fund_name, partner_name, thesis_one_liner, stages, sectors, check_size_min_usd, check_size_max_usd"
    )
    .in("owner_user_id", ids);

  type InvJoinRow = {
    owner_user_id: string;
    slug: string;
    fund_name: string;
    partner_name: string | null;
    thesis_one_liner: string;
    stages: string[];
    sectors: string[];
    check_size_min_usd: number | null;
    check_size_max_usd: number | null;
  };

  const invByOwner = new Map<string, InvJoinRow>();
  for (const inv of (invs ?? []) as InvJoinRow[]) {
    invByOwner.set(inv.owner_user_id, inv);
  }

  return rows.map((r): IncomingConnect => {
    const inv = invByOwner.get(r.investor_user_id);
    let fit: number | null = null;
    if (inv) {
      const thesis: InvestorThesis = {
        fundName: inv.fund_name,
        partnerName: inv.partner_name ?? undefined,
        thesisOneLiner: inv.thesis_one_liner,
        stages: inv.stages as InvestorThesis["stages"],
        sectors: inv.sectors as InvestorThesis["sectors"],
        checkSizeMinUsd: inv.check_size_min_usd ?? undefined,
        checkSizeMaxUsd: inv.check_size_max_usd ?? undefined,
      };
      fit = thesisFitScore(thesis, submission).score;
    }
    return {
      id: r.id,
      investorUserId: r.investor_user_id,
      fundSlug: inv?.slug ?? null,
      fundName: inv?.fund_name ?? null,
      partnerName: inv?.partner_name ?? null,
      thesisOneLiner: inv?.thesis_one_liner ?? null,
      fit,
      message: r.message,
      status: r.status,
      requestedAt: r.requested_at,
    };
  });
}

/* ─── SAVES: investor-side helpers ────────────────────────────────────── */

/** Returns the set of submission ids saved by this investor. Used by /funder/discover. */
export async function getSavedSubmissionIdsForInvestor(
  investorUserId: string
): Promise<Set<string>> {
  const client = getInsforge();
  const { data } = await client.database
    .from("saves")
    .select("submission_id")
    .eq("investor_user_id", investorUserId);
  return new Set(
    ((data ?? []) as { submission_id: string }[]).map((r) => r.submission_id)
  );
}

/* ─── ENGAGEMENT MAP (save + connect status + conversation, per submission) ── */

export type Engagement = {
  isSaved: boolean;
  connectStatus: "pending" | "accepted" | "declined" | null;
  conversationId: string | null;
  savedAt: string | null;
};

/**
 * Returns a Map<submissionId, Engagement> for the given investor across all
 * submissions. Used by /funder/discover to surface "Saved" / "Pending connect"
 * / "Connected — message them" / "Passed" badges per card.
 */
export async function getInvestorEngagementMap(
  investorUserId: string
): Promise<Map<string, Engagement>> {
  const client = getInsforge();
  const [savesRes, connectsRes, convosRes] = await Promise.all([
    client.database
      .from("saves")
      .select("submission_id, saved_at")
      .eq("investor_user_id", investorUserId),
    client.database
      .from("connect_requests")
      .select("submission_id, status, requested_at")
      .eq("investor_user_id", investorUserId),
    client.database
      .from("conversations")
      .select("id, submission_id")
      .eq("investor_user_id", investorUserId),
  ]);

  type SaveRow = { submission_id: string; saved_at: string };
  type ConnectRow = {
    submission_id: string;
    status: "pending" | "accepted" | "declined";
    requested_at: string;
  };
  type ConvoRow = { id: string; submission_id: string };

  const map = new Map<string, Engagement>();
  const ensure = (id: string): Engagement => {
    let e = map.get(id);
    if (!e) {
      e = {
        isSaved: false,
        connectStatus: null,
        conversationId: null,
        savedAt: null,
      };
      map.set(id, e);
    }
    return e;
  };

  for (const s of (savesRes.data ?? []) as SaveRow[]) {
    const e = ensure(s.submission_id);
    e.isSaved = true;
    e.savedAt = s.saved_at;
  }
  // For connect_requests: a single (investor, submission) pair could in theory
  // have multiple rows over time; keep the most recent by requested_at.
  const latestConnect = new Map<string, ConnectRow>();
  for (const c of (connectsRes.data ?? []) as ConnectRow[]) {
    const prev = latestConnect.get(c.submission_id);
    if (!prev || c.requested_at > prev.requested_at) {
      latestConnect.set(c.submission_id, c);
    }
  }
  for (const c of latestConnect.values()) {
    const e = ensure(c.submission_id);
    e.connectStatus = c.status;
  }
  for (const v of (convosRes.data ?? []) as ConvoRow[]) {
    const e = ensure(v.submission_id);
    e.conversationId = v.id;
  }

  return map;
}

/**
 * Investor-side: list saved submissions with the submission detail row pre-joined.
 * Returns rows ordered by most-recently-saved first.
 */
export async function listSavedForInvestor(investorUserId: string): Promise<
  Array<{
    submissionId: string;
    savedAt: string;
    slug: string;
    companyName: string;
    oneLiner: string;
    stage: string;
    sectors: string[];
    raisingUsd: number;
    roundType: string;
    productStage: string;
    launched: boolean;
    hqCity: string;
    hqCountry: string;
  }>
> {
  const client = getInsforge();
  const { data: saves } = await client.database
    .from("saves")
    .select("submission_id, saved_at")
    .eq("investor_user_id", investorUserId)
    .order("saved_at", { ascending: false })
    .limit(100);

  type SaveRow = { submission_id: string; saved_at: string };
  const rows = (saves ?? []) as SaveRow[];
  if (rows.length === 0) return [];

  const ids = rows.map((r) => r.submission_id);
  const { data: subs } = await client.database
    .from("submissions")
    .select(
      "id, slug, company_name, one_liner, stage, sectors, raising_usd, round_type, product_stage, launched, hq_city, hq_country"
    )
    .in("id", ids);

  type SubRow = {
    id: string;
    slug: string;
    company_name: string;
    one_liner: string;
    stage: string;
    sectors: string[];
    raising_usd: number;
    round_type: string;
    product_stage: string;
    launched: boolean;
    hq_city: string;
    hq_country: string;
  };
  const subMap = new Map<string, SubRow>();
  for (const s of (subs ?? []) as SubRow[]) subMap.set(s.id, s);

  return rows
    .map((r) => {
      const s = subMap.get(r.submission_id);
      if (!s) return null;
      return {
        submissionId: s.id,
        savedAt: r.saved_at,
        slug: s.slug,
        companyName: s.company_name,
        oneLiner: s.one_liner,
        stage: s.stage,
        sectors: s.sectors,
        raisingUsd: s.raising_usd,
        roundType: s.round_type,
        productStage: s.product_stage,
        launched: s.launched,
        hqCity: s.hq_city,
        hqCountry: s.hq_country,
      };
    })
    .filter(Boolean) as Array<{
    submissionId: string;
    savedAt: string;
    slug: string;
    companyName: string;
    oneLiner: string;
    stage: string;
    sectors: string[];
    raisingUsd: number;
    roundType: string;
    productStage: string;
    launched: boolean;
    hqCity: string;
    hqCountry: string;
  }>;
}

/**
 * Investor-side: list outgoing connect requests with submission + conversation
 * resolution. Newest first.
 */
export async function listConnectsForInvestor(investorUserId: string): Promise<
  Array<{
    id: string;
    submissionId: string;
    submissionSlug: string;
    companyName: string;
    oneLiner: string;
    status: "pending" | "accepted" | "declined";
    message: string | null;
    requestedAt: string;
    conversationId: string | null;
  }>
> {
  const client = getInsforge();
  const { data: connects } = await client.database
    .from("connect_requests")
    .select("id, submission_id, status, message, requested_at")
    .eq("investor_user_id", investorUserId)
    .order("requested_at", { ascending: false })
    .limit(100);

  type ConnectRow = {
    id: string;
    submission_id: string;
    status: "pending" | "accepted" | "declined";
    message: string | null;
    requested_at: string;
  };
  const rows = (connects ?? []) as ConnectRow[];
  if (rows.length === 0) return [];

  const ids = Array.from(new Set(rows.map((r) => r.submission_id)));

  const [subsRes, convosRes] = await Promise.all([
    client.database
      .from("submissions")
      .select("id, slug, company_name, one_liner")
      .in("id", ids),
    client.database
      .from("conversations")
      .select("id, submission_id")
      .in("submission_id", ids)
      .eq("investor_user_id", investorUserId),
  ]);

  type SubRow = {
    id: string;
    slug: string;
    company_name: string;
    one_liner: string;
  };
  type ConvoRow = { id: string; submission_id: string };

  const subMap = new Map<string, SubRow>();
  for (const s of (subsRes.data ?? []) as SubRow[]) subMap.set(s.id, s);
  const convoMap = new Map<string, string>();
  for (const c of (convosRes.data ?? []) as ConvoRow[])
    convoMap.set(c.submission_id, c.id);

  return rows.map((r) => {
    const s = subMap.get(r.submission_id);
    return {
      id: r.id,
      submissionId: r.submission_id,
      submissionSlug: s?.slug ?? "",
      companyName: s?.company_name ?? "Unknown",
      oneLiner: s?.one_liner ?? "",
      status: r.status,
      message: r.message,
      requestedAt: r.requested_at,
      conversationId: convoMap.get(r.submission_id) ?? null,
    };
  });
}

export async function isSavedByInvestor(
  submissionId: string,
  investorUserId: string
): Promise<boolean> {
  const client = getInsforge();
  const { data } = await client.database
    .from("saves")
    .select("id")
    .eq("submission_id", submissionId)
    .eq("investor_user_id", investorUserId)
    .limit(1);
  return !!(data && data.length > 0);
}

export async function toggleSave(
  submissionId: string,
  investorUserId: string
): Promise<boolean> {
  const client = getInsforge();
  const isSaved = await isSavedByInvestor(submissionId, investorUserId);
  if (isSaved) {
    await client.database
      .from("saves")
      .delete()
      .eq("submission_id", submissionId)
      .eq("investor_user_id", investorUserId);
    return false;
  }
  await client.database.from("saves").insert({
    submission_id: submissionId,
    investor_user_id: investorUserId,
  });
  return true;
}

/* ─── CONNECT REQUESTS: investor-side helpers ─────────────────────────── */
export async function hasPendingConnect(
  submissionId: string,
  investorUserId: string
): Promise<boolean> {
  const client = getInsforge();
  const { data } = await client.database
    .from("connect_requests")
    .select("id")
    .eq("submission_id", submissionId)
    .eq("investor_user_id", investorUserId)
    .eq("status", "pending")
    .limit(1);
  return !!(data && data.length > 0);
}

export async function requestConnect(
  submissionId: string,
  investorUserId: string,
  message: string | null
): Promise<void> {
  const client = getInsforge();
  // Avoid duplicate pending requests.
  if (await hasPendingConnect(submissionId, investorUserId)) return;
  await client.database.from("connect_requests").insert({
    submission_id: submissionId,
    investor_user_id: investorUserId,
    message,
    status: "pending",
  });
}

export async function respondToConnect(
  connectId: string,
  accept: boolean
): Promise<void> {
  const client = getInsforge();
  await client.database
    .from("connect_requests")
    .update({
      status: accept ? "accepted" : "declined",
      resolved_at: new Date().toISOString(),
    })
    .eq("id", connectId);
}
