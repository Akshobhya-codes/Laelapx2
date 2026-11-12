import "server-only";
import { getInsforge } from "./client";

/**
 * Investor workspace data: custom criteria, meetings, the pipeline (notes +
 * partner workflow), and the activity counts behind analytics.
 *
 * Everything is keyed by `account_user_id` — the subscription holder — so a
 * team shares one workspace. Tables: db/0009 (investor_notes,
 * profile_unlocks) + db/0010.
 */

/* ─── CUSTOM CRITERIA ────────────────────────────────────────────────── */

export type CustomCriteria = {
  minMrrUsd: number | null;
  minCustomers: number | null;
  minScore: number | null;
  launchedOnly: boolean;
  countries: string[];
  productStages: string[];
  keywords: string[];
  updatedAt: string | null;
};

export const EMPTY_CRITERIA: CustomCriteria = {
  minMrrUsd: null,
  minCustomers: null,
  minScore: null,
  launchedOnly: false,
  countries: [],
  productStages: [],
  keywords: [],
  updatedAt: null,
};

type CriteriaRow = {
  account_user_id: string;
  min_mrr_usd: number | null;
  min_customers: number | null;
  min_score: number | null;
  launched_only: boolean;
  countries: string[] | null;
  product_stages: string[] | null;
  keywords: string[] | null;
  updated_at: string;
};

export async function getCustomCriteria(accountUserId: string): Promise<CustomCriteria> {
  const client = getInsforge();
  const { data } = await client.database
    .from("investor_criteria")
    .select("*")
    .eq("account_user_id", accountUserId)
    .maybeSingle();
  if (!data) return EMPTY_CRITERIA;
  const r = data as CriteriaRow;
  return {
    minMrrUsd: r.min_mrr_usd,
    minCustomers: r.min_customers,
    minScore: r.min_score,
    launchedOnly: r.launched_only,
    countries: r.countries ?? [],
    productStages: r.product_stages ?? [],
    keywords: r.keywords ?? [],
    updatedAt: r.updated_at,
  };
}

export async function saveCustomCriteria(
  accountUserId: string,
  updatedBy: string,
  c: Omit<CustomCriteria, "updatedAt">
): Promise<void> {
  const client = getInsforge();
  const row = {
    min_mrr_usd: c.minMrrUsd,
    min_customers: c.minCustomers,
    min_score: c.minScore,
    launched_only: c.launchedOnly,
    countries: c.countries,
    product_stages: c.productStages,
    keywords: c.keywords,
    updated_by_user_id: updatedBy,
    updated_at: new Date().toISOString(),
  };
  const { data: existing } = await client.database
    .from("investor_criteria")
    .select("account_user_id")
    .eq("account_user_id", accountUserId)
    .maybeSingle();
  if (existing) {
    const { error } = await client.database
      .from("investor_criteria")
      .update(row)
      .eq("account_user_id", accountUserId);
    if (error) throw new Error(`saveCustomCriteria: ${error.message}`);
    return;
  }
  const { error } = await client.database
    .from("investor_criteria")
    .insert({ account_user_id: accountUserId, ...row });
  if (error) throw new Error(`saveCustomCriteria: ${error.message}`);
}

export function hasAnyCriteria(c: CustomCriteria): boolean {
  return (
    c.minMrrUsd !== null ||
    c.minCustomers !== null ||
    c.minScore !== null ||
    c.launchedOnly ||
    c.countries.length > 0 ||
    c.productStages.length > 0 ||
    c.keywords.length > 0
  );
}

/* ─── MEETINGS ───────────────────────────────────────────────────────── */

export type MeetingKind = "intro" | "follow_up" | "partner" | "diligence" | "other";

export type StoredMeeting = {
  id: string;
  accountUserId: string;
  authorUserId: string;
  submissionId: string;
  metOn: string;
  kind: MeetingKind;
  attendees: string | null;
  notes: string | null;
  createdAt: string;
};

type MeetingRow = {
  id: string;
  account_user_id: string;
  author_user_id: string;
  submission_id: string;
  met_on: string;
  kind: MeetingKind;
  attendees: string | null;
  notes: string | null;
  created_at: string;
};

const meetingRowToStored = (r: MeetingRow): StoredMeeting => ({
  id: r.id,
  accountUserId: r.account_user_id,
  authorUserId: r.author_user_id,
  submissionId: r.submission_id,
  metOn: r.met_on,
  kind: r.kind,
  attendees: r.attendees,
  notes: r.notes,
  createdAt: r.created_at,
});

export async function addMeeting(input: {
  accountUserId: string;
  authorUserId: string;
  submissionId: string;
  metOn: string;
  kind: MeetingKind;
  attendees: string | null;
  notes: string | null;
}): Promise<StoredMeeting> {
  const client = getInsforge();
  const { data, error } = await client.database
    .from("investor_meetings")
    .insert({
      account_user_id: input.accountUserId,
      author_user_id: input.authorUserId,
      submission_id: input.submissionId,
      met_on: input.metOn,
      kind: input.kind,
      attendees: input.attendees,
      notes: input.notes,
    })
    .select("*")
    .single();
  if (error) throw new Error(`addMeeting: ${error.message}`);
  return meetingRowToStored(data as MeetingRow);
}

export async function deleteMeeting(id: string, accountUserId: string): Promise<void> {
  const client = getInsforge();
  await client.database
    .from("investor_meetings")
    .delete()
    .eq("id", id)
    .eq("account_user_id", accountUserId);
}

export async function listMeetings(
  accountUserId: string,
  submissionId?: string
): Promise<StoredMeeting[]> {
  const client = getInsforge();
  let q = client.database
    .from("investor_meetings")
    .select("*")
    .eq("account_user_id", accountUserId);
  if (submissionId) q = q.eq("submission_id", submissionId);
  const { data } = await q.order("met_on", { ascending: false }).limit(500);
  return ((data ?? []) as MeetingRow[]).map(meetingRowToStored);
}

/* ─── PIPELINE (notes + partner workflow) ────────────────────────────── */

export type Decision = "advance" | "hold" | "pass";

export type PipelineEntry = {
  submissionId: string;
  stage: string | null;
  body: string;
  authorUserId: string | null;
  assignedToUserId: string | null;
  decision: Decision | null;
  decidedByUserId: string | null;
  decidedAt: string | null;
  updatedAt: string | null;
};

type NoteRow = {
  submission_id: string;
  stage: string | null;
  body: string | null;
  author_user_id: string | null;
  assigned_to_user_id: string | null;
  decision: Decision | null;
  decided_by_user_id: string | null;
  decided_at: string | null;
  updated_at: string | null;
};

export async function listPipelineEntries(
  accountUserId: string
): Promise<Map<string, PipelineEntry>> {
  const client = getInsforge();
  const { data } = await client.database
    .from("investor_notes")
    .select(
      "submission_id, stage, body, author_user_id, assigned_to_user_id, decision, decided_by_user_id, decided_at, updated_at"
    )
    .eq("account_user_id", accountUserId);
  const map = new Map<string, PipelineEntry>();
  for (const r of (data ?? []) as NoteRow[]) {
    map.set(r.submission_id, {
      submissionId: r.submission_id,
      stage: r.stage,
      body: r.body ?? "",
      authorUserId: r.author_user_id,
      assignedToUserId: r.assigned_to_user_id,
      decision: r.decision,
      decidedByUserId: r.decided_by_user_id,
      decidedAt: r.decided_at,
      updatedAt: r.updated_at,
    });
  }
  return map;
}

/**
 * Patch the pipeline row for a deal, creating it if needed. Only the fields
 * passed are written, so moving a card's stage never clobbers its note.
 */
export async function patchPipelineEntry(input: {
  accountUserId: string;
  actorUserId: string;
  submissionId: string;
  stage?: string | null;
  assignedToUserId?: string | null;
  decision?: Decision | null;
}): Promise<void> {
  const client = getInsforge();
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (input.stage !== undefined) patch.stage = input.stage;
  if (input.assignedToUserId !== undefined) patch.assigned_to_user_id = input.assignedToUserId;
  if (input.decision !== undefined) {
    patch.decision = input.decision;
    patch.decided_by_user_id = input.decision ? input.actorUserId : null;
    patch.decided_at = input.decision ? new Date().toISOString() : null;
  }

  const { data: existing } = await client.database
    .from("investor_notes")
    .select("id")
    .eq("account_user_id", input.accountUserId)
    .eq("submission_id", input.submissionId)
    .maybeSingle();

  if (existing) {
    const { error } = await client.database
      .from("investor_notes")
      .update(patch)
      .eq("id", (existing as { id: string }).id);
    if (error) throw new Error(`patchPipelineEntry: ${error.message}`);
    return;
  }
  const { error } = await client.database.from("investor_notes").insert({
    account_user_id: input.accountUserId,
    author_user_id: input.actorUserId,
    submission_id: input.submissionId,
    body: "",
    ...patch,
  });
  if (error) throw new Error(`patchPipelineEntry: ${error.message}`);
}

/* ─── ACTIVITY (analytics) ───────────────────────────────────────────── */

export type UnlockEvent = { submissionId: string; viewerUserId: string; unlockedAt: string };

export async function listUnlocks(accountUserId: string): Promise<UnlockEvent[]> {
  const client = getInsforge();
  const { data } = await client.database
    .from("profile_unlocks")
    .select("submission_id, viewer_user_id, unlocked_at")
    .eq("account_user_id", accountUserId)
    .order("unlocked_at", { ascending: false })
    .limit(2000);
  return ((data ?? []) as { submission_id: string; viewer_user_id: string; unlocked_at: string }[]).map(
    (r) => ({ submissionId: r.submission_id, viewerUserId: r.viewer_user_id, unlockedAt: r.unlocked_at })
  );
}

export type ConnectEvent = {
  submissionId: string;
  investorUserId: string;
  status: "pending" | "accepted" | "declined";
  requestedAt: string;
};

export async function listConnectsByInvestors(userIds: string[]): Promise<ConnectEvent[]> {
  if (userIds.length === 0) return [];
  const client = getInsforge();
  const { data } = await client.database
    .from("connect_requests")
    .select("submission_id, investor_user_id, status, requested_at")
    .in("investor_user_id", userIds)
    .limit(2000);
  return (
    (data ?? []) as {
      submission_id: string;
      investor_user_id: string;
      status: ConnectEvent["status"];
      requested_at: string;
    }[]
  ).map((r) => ({
    submissionId: r.submission_id,
    investorUserId: r.investor_user_id,
    status: r.status,
    requestedAt: r.requested_at,
  }));
}
