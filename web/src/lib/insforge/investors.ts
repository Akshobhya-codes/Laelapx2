import "server-only";
import { getInsforge } from "./client";
import type { SECTORS } from "@/lib/submission/schema";
import slugify from "slugify";
import { nanoid } from "nanoid";

export type Stage = "Pre-Seed" | "Seed" | "Series A" | "Series B+";
export type Sector = (typeof SECTORS)[number];

export type InvestorThesis = {
  fundName: string;
  partnerName?: string;
  partnerTitle?: string;
  hq?: string;
  thesisOneLiner: string;
  stages: Stage[];
  sectors: Sector[];
  checkSizeMinUsd?: number;
  checkSizeMaxUsd?: number;
  notablePortfolio?: string[];
  websiteUrl?: string;
};

export type StoredInvestor = {
  id: string;
  ownerUserId: string;
  slug: string;
  data: InvestorThesis;
  createdAt: string;
  updatedAt: string;
};

type InvestorRow = {
  id: string;
  owner_user_id: string;
  slug: string;
  fund_name: string;
  partner_name: string | null;
  partner_title: string | null;
  hq: string | null;
  thesis_one_liner: string;
  stages: Stage[];
  sectors: Sector[];
  check_size_min_usd: number | null;
  check_size_max_usd: number | null;
  notable_portfolio: string[] | null;
  website_url: string | null;
  created_at: string;
  updated_at: string;
};

function rowToStored(r: InvestorRow): StoredInvestor {
  return {
    id: r.id,
    ownerUserId: r.owner_user_id,
    slug: r.slug,
    data: {
      fundName: r.fund_name,
      partnerName: r.partner_name ?? undefined,
      partnerTitle: r.partner_title ?? undefined,
      hq: r.hq ?? undefined,
      thesisOneLiner: r.thesis_one_liner,
      stages: r.stages,
      sectors: r.sectors,
      checkSizeMinUsd: r.check_size_min_usd ?? undefined,
      checkSizeMaxUsd: r.check_size_max_usd ?? undefined,
      notablePortfolio: r.notable_portfolio ?? undefined,
      websiteUrl: r.website_url ?? undefined,
    },
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

function makeFundSlug(fundName: string): string {
  const base = slugify(fundName, { lower: true, strict: true });
  return base || nanoid(8);
}

export async function getInvestorByOwner(
  ownerUserId: string
): Promise<StoredInvestor | null> {
  const client = getInsforge();
  const { data, error } = await client.database
    .from("investors")
    .select("*")
    .eq("owner_user_id", ownerUserId)
    .maybeSingle();
  if (error) throw new Error(`getInvestorByOwner: ${error.message}`);
  if (!data) return null;
  return rowToStored(data as InvestorRow);
}

export async function upsertInvestor(
  data: InvestorThesis,
  ownerUserId: string
): Promise<StoredInvestor> {
  const client = getInsforge();

  // Preserve existing slug across updates; only derive on first create.
  const existing = await getInvestorByOwner(ownerUserId);
  let slug = existing?.slug;
  if (!slug) {
    const base = makeFundSlug(data.fundName);
    // Try base slug first; on collision, append a 6-char suffix.
    for (let attempt = 0; attempt < 3; attempt++) {
      slug = attempt === 0 ? base : `${base}-${nanoid(6).toLowerCase()}`;
      const { data: clash } = await client.database
        .from("investors")
        .select("id")
        .eq("slug", slug)
        .limit(1);
      if (!clash || clash.length === 0) break;
    }
  }

  const row = {
    owner_user_id: ownerUserId,
    slug,
    fund_name: data.fundName,
    partner_name: data.partnerName ?? null,
    partner_title: data.partnerTitle ?? null,
    hq: data.hq ?? null,
    thesis_one_liner: data.thesisOneLiner,
    stages: data.stages,
    sectors: data.sectors,
    check_size_min_usd: data.checkSizeMinUsd ?? null,
    check_size_max_usd: data.checkSizeMaxUsd ?? null,
    notable_portfolio: data.notablePortfolio ?? null,
    website_url: data.websiteUrl ?? null,
    updated_at: new Date().toISOString(),
  };

  const { data: out, error } = await client.database
    .from("investors")
    .upsert(row, { onConflict: "owner_user_id" })
    .select("*")
    .single();
  if (error) throw new Error(`upsertInvestor: ${error.message}`);
  return rowToStored(out as InvestorRow);
}

/* ─── PUBLIC LOOKUPS ─────────────────────────────────────────────────── */
export async function getInvestorBySlug(
  slug: string
): Promise<StoredInvestor | null> {
  const client = getInsforge();
  const { data, error } = await client.database
    .from("investors")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw new Error(`getInvestorBySlug: ${error.message}`);
  if (!data) return null;
  return rowToStored(data as InvestorRow);
}

export async function getInvestorByOwnerOrNull(
  ownerUserId: string
): Promise<StoredInvestor | null> {
  return getInvestorByOwner(ownerUserId);
}

/**
 * Map of owner_user_id → StoredInvestor for a list of owner ids. Used to
 * batch-resolve viewer/connect-list cards into investor profiles in one query.
 */
export async function listInvestorsByOwners(
  ownerUserIds: string[]
): Promise<Map<string, StoredInvestor>> {
  if (ownerUserIds.length === 0) return new Map();
  const client = getInsforge();
  const { data } = await client.database
    .from("investors")
    .select("*")
    .in("owner_user_id", ownerUserIds);
  const map = new Map<string, StoredInvestor>();
  for (const r of (data ?? []) as InvestorRow[]) {
    map.set(r.owner_user_id, rowToStored(r));
  }
  return map;
}

/**
 * Every investor on Laelapx (every row in the `investors` table). Used by the
 * founder dashboard to match against real investor theses, not a mock list.
 */
export async function listAllInvestors(): Promise<StoredInvestor[]> {
  const client = getInsforge();
  const { data, error } = await client.database
    .from("investors")
    .select("*")
    .order("updated_at", { ascending: false });
  if (error) throw new Error(`listAllInvestors: ${error.message}`);
  return ((data ?? []) as InvestorRow[]).map(rowToStored);
}

/* ─── MATCHING ────────────────────────────────────────────────────────── */
import type { StoredSubmission } from "./submissions";

export type InvestorMatch = {
  investor: StoredInvestor;
  fitScore: number;
  reasons: string[];
};

/**
 * Score a submission against every investor on Laelapx. Excludes the founder's
 * own investor profile (operator-VCs), filters by minimum fit, and returns the
 * top N.
 */
export async function matchInvestorsFromInsforge(
  submission: StoredSubmission,
  opts: {
    excludeOwnerUserId?: string;
    minScore?: number;
    top?: number;
  } = {}
): Promise<InvestorMatch[]> {
  const minScore = opts.minScore ?? 40;
  const top = opts.top ?? 6;
  const all = await listAllInvestors();
  return all
    .filter((inv) => inv.ownerUserId !== opts.excludeOwnerUserId)
    .map((inv) => {
      const { score, reasons } = thesisFitScore(inv.data, submission);
      return { investor: inv, fitScore: score, reasons };
    })
    .filter((m) => m.fitScore >= minScore)
    .sort((a, b) => b.fitScore - a.fitScore)
    .slice(0, top);
}

export function thesisFitScore(
  thesis: InvestorThesis,
  submission: StoredSubmission
): { score: number; reasons: string[] } {
  let score = 0;
  const reasons: string[] = [];

  // Stage overlap (0–40)
  if ((thesis.stages as string[]).includes(submission.data.stage)) {
    score += 40;
    reasons.push(`Stage match — invests at ${submission.data.stage}.`);
  } else {
    score += 5;
  }

  // Sector overlap (0–35)
  const overlap = submission.data.sectors.filter((s) =>
    thesis.sectors.includes(s)
  );
  if (overlap.length >= 2) {
    score += 35;
    reasons.push(`Sector overlap on ${overlap.slice(0, 3).join(", ")}.`);
  } else if (overlap.length === 1) {
    score += 22;
    reasons.push(`Thesis includes ${overlap[0]}.`);
  } else {
    score += 4;
  }

  // Check size fit (0–25)
  if (
    thesis.checkSizeMinUsd !== undefined &&
    thesis.checkSizeMaxUsd !== undefined
  ) {
    const ask = submission.data.raisingUsd;
    const fits =
      ask >= thesis.checkSizeMinUsd * 0.75 &&
      ask <= thesis.checkSizeMaxUsd * 1.5;
    if (fits) {
      score += 25;
      const fmt = (n: number) =>
        n >= 1_000_000
          ? `$${(n / 1_000_000).toFixed(1)}M`
          : `$${Math.round(n / 1_000)}K`;
      reasons.push(
        `Check size fits — ${fmt(thesis.checkSizeMinUsd)}–${fmt(
          thesis.checkSizeMaxUsd
        )}.`
      );
    } else {
      score += 6;
    }
  } else {
    score += 12;
  }

  return { score: Math.min(100, score), reasons };
}
