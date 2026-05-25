import "server-only";
import { getInsforge } from "./client";
import type { Submission, Founder } from "@/lib/submission/schema";
import type { Snapshot } from "@/lib/scoring/rubric";
import slugify from "slugify";
import { nanoid } from "nanoid";

/* ─── ROW SHAPE (mirrors db/0002-init-schema.sql + 0007-scored-snapshot.sql) ─ */
type SubmissionRow = {
  id: string;
  owner_user_id: string;
  slug: string;
  company_name: string;
  one_liner: string;
  website_url: string;
  logo_url: string | null;
  founded_year: number;
  hq_city: string;
  hq_country: string;
  stage: string;
  sectors: string[];
  problem_description: string;
  why_now: string;
  solution_description: string;
  demo_video_url: string | null;
  icp_description: string;
  tam_usd: number;
  tam_reasoning: string;
  competitors_and_edge: string;
  defensibility: string;
  product_stage: string;
  launched: boolean;
  customer_count: number;
  mrr_usd: number | null;
  mom_growth_pct: number | null;
  milestones: string[];
  founders_data: Founder[];
  why_this_team: string;
  team_size: number;
  advisors: string | null;
  raised_to_date_usd: number | null;
  raised_from_whom: string | null;
  raising_usd: number;
  round_type: string;
  use_of_funds: string;
  target_close_date: string | null;
  pitch_deck_url: string | null;
  show_financials_public: boolean;
  open_to_investor_contact: boolean;
  created_at: string;
  updated_at: string;
  // Added by migration 0007 — nullable until the migration is applied.
  scored_snapshot: Snapshot | null;
  scored_for_updated_at: string | null;
};

export type StoredSubmission = {
  id: string;
  ownerUserId: string;
  slug: string;
  data: Submission;
  createdAt: string;
  updatedAt: string;
  /** Cached LLM-scored Snapshot (migration 0007). Null if not yet scored
   *  or if the score is stale (founder edited the submission since scoring). */
  scoredSnapshot: Snapshot | null;
  /** The submission's updated_at at the time the cached score was computed. */
  scoredForUpdatedAt: string | null;
};

/* ─── MAPPERS ─────────────────────────────────────────────────────────── */
function rowToStored(r: SubmissionRow): StoredSubmission {
  const data: Submission = {
    companyName: r.company_name,
    oneLiner: r.one_liner,
    websiteUrl: r.website_url,
    logoUrl: r.logo_url ?? "",
    foundedYear: r.founded_year,
    hqCity: r.hq_city,
    hqCountry: r.hq_country,
    stage: r.stage as Submission["stage"],
    sectors: r.sectors as Submission["sectors"],
    problemDescription: r.problem_description,
    whyNow: r.why_now,
    solutionDescription: r.solution_description,
    demoVideoUrl: r.demo_video_url ?? "",
    icpDescription: r.icp_description,
    tamUsd: r.tam_usd,
    tamReasoning: r.tam_reasoning,
    competitorsAndEdge: r.competitors_and_edge,
    defensibility: r.defensibility,
    productStage: r.product_stage as Submission["productStage"],
    launched: r.launched,
    customerCount: r.customer_count,
    mrrUsd: r.mrr_usd ?? undefined,
    momGrowthPct: r.mom_growth_pct ?? undefined,
    milestones: r.milestones,
    founders: r.founders_data,
    whyThisTeam: r.why_this_team,
    teamSize: r.team_size,
    advisors: r.advisors ?? undefined,
    raisedToDateUsd: r.raised_to_date_usd ?? undefined,
    raisedFromWhom: r.raised_from_whom ?? undefined,
    raisingUsd: r.raising_usd,
    roundType: r.round_type as Submission["roundType"],
    useOfFunds: r.use_of_funds,
    targetCloseDate: r.target_close_date ?? undefined,
    pitchDeckUrl: r.pitch_deck_url ?? "",
    showFinancialsPublic: r.show_financials_public,
    openToInvestorContact: r.open_to_investor_contact,
  };
  return {
    id: r.id,
    ownerUserId: r.owner_user_id,
    slug: r.slug,
    data,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    scoredSnapshot: r.scored_snapshot ?? null,
    scoredForUpdatedAt: r.scored_for_updated_at ?? null,
  };
}

/**
 * Persist a freshly-computed Snapshot back to the submission row so we never
 * recompute it until the founder edits their submission again. Fails soft —
 * if the migration hasn't been applied yet (no columns), this is a no-op
 * and the caller will just keep computing on every read.
 */
export async function persistScoredSnapshot(
  submissionId: string,
  snapshot: Snapshot,
  scoredForUpdatedAt: string
): Promise<void> {
  const client = getInsforge();
  try {
    await client.database
      .from("submissions")
      .update({
        scored_snapshot: snapshot,
        scored_for_updated_at: scoredForUpdatedAt,
      })
      .eq("id", submissionId);
  } catch {
    // No-op on failure (e.g. column doesn't exist because migration 0007
    // hasn't been applied). The next dashboard load will just recompute.
  }
}

function dataToRow(s: Submission, ownerUserId: string, slug: string) {
  return {
    owner_user_id: ownerUserId,
    slug,
    company_name: s.companyName,
    one_liner: s.oneLiner,
    website_url: s.websiteUrl,
    logo_url: s.logoUrl || null,
    founded_year: s.foundedYear,
    hq_city: s.hqCity,
    hq_country: s.hqCountry,
    stage: s.stage,
    sectors: s.sectors,
    problem_description: s.problemDescription,
    why_now: s.whyNow,
    solution_description: s.solutionDescription,
    demo_video_url: s.demoVideoUrl || null,
    icp_description: s.icpDescription,
    tam_usd: s.tamUsd,
    tam_reasoning: s.tamReasoning,
    competitors_and_edge: s.competitorsAndEdge,
    defensibility: s.defensibility,
    product_stage: s.productStage,
    launched: s.launched,
    customer_count: s.customerCount,
    mrr_usd: s.mrrUsd ?? null,
    mom_growth_pct: s.momGrowthPct ?? null,
    milestones: s.milestones,
    founders_data: s.founders,
    why_this_team: s.whyThisTeam,
    team_size: s.teamSize,
    advisors: s.advisors ?? null,
    raised_to_date_usd: s.raisedToDateUsd ?? null,
    raised_from_whom: s.raisedFromWhom ?? null,
    raising_usd: s.raisingUsd,
    round_type: s.roundType,
    use_of_funds: s.useOfFunds,
    target_close_date: s.targetCloseDate ?? null,
    pitch_deck_url: s.pitchDeckUrl || null,
    show_financials_public: s.showFinancialsPublic,
    open_to_investor_contact: s.openToInvestorContact,
  };
}

function makeSlug(companyName: string): string {
  const base = slugify(companyName, { lower: true, strict: true });
  return base || nanoid(8);
}

/* ─── PUBLIC API ─────────────────────────────────────────────────────── */

export async function createSubmission(
  data: Submission,
  ownerUserId: string
): Promise<StoredSubmission> {
  const client = getInsforge();
  const baseSlug = makeSlug(data.companyName);

  // Try with the clean slug first; if collision, retry with a 6-char suffix.
  for (let attempt = 0; attempt < 3; attempt++) {
    const slug = attempt === 0 ? baseSlug : `${baseSlug}-${nanoid(6).toLowerCase()}`;
    const row = dataToRow(data, ownerUserId, slug);
    const result = await client.database
      .from("submissions")
      .insert(row)
      .select("*")
      .single();

    if (!result.error && result.data) {
      return rowToStored(result.data as SubmissionRow);
    }

    // Postgres unique violation = 23505. Retry with a suffix.
    const code = (result.error as { code?: string } | null)?.code;
    if (code === "23505") continue;

    throw new Error(
      `Failed to create submission: ${result.error?.message ?? "unknown error"}`
    );
  }
  throw new Error("Could not generate a unique slug after 3 attempts");
}

export async function updateSubmission(
  slug: string,
  data: Submission,
  ownerUserId: string
): Promise<StoredSubmission> {
  const client = getInsforge();
  // Build the row but strip the slug + owner so we never mutate them.
  const full = dataToRow(data, ownerUserId, slug);
  type Row = ReturnType<typeof dataToRow>;
  const { owner_user_id: _o, slug: _s, ...rest } = full as Row & {
    owner_user_id: string;
    slug: string;
  };
  void _o;
  void _s;
  const updateRow = {
    ...rest,
    updated_at: new Date().toISOString(),
    // Invalidate the cached LLM score — the submission just changed, so any
    // previously-computed Snapshot is stale. Next dashboard load will lazily
    // recompute and persist via persistScoredSnapshot().
    scored_snapshot: null,
    scored_for_updated_at: null,
  };
  const result = await client.database
    .from("submissions")
    .update(updateRow)
    .eq("slug", slug)
    .eq("owner_user_id", ownerUserId)
    .select("*")
    .single();
  if (result.error) {
    throw new Error(`updateSubmission: ${result.error.message}`);
  }
  return rowToStored(result.data as SubmissionRow);
}

export async function listSubmissionsByOwner(
  ownerUserId: string
): Promise<StoredSubmission[]> {
  const client = getInsforge();
  const { data, error } = await client.database
    .from("submissions")
    .select("*")
    .eq("owner_user_id", ownerUserId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(`listSubmissionsByOwner failed: ${error.message}`);
  return (data as SubmissionRow[]).map(rowToStored);
}

export async function getSubmissionBySlug(
  slug: string
): Promise<StoredSubmission | null> {
  const client = getInsforge();
  const { data, error } = await client.database
    .from("submissions")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (error) throw new Error(`getSubmissionBySlug failed: ${error.message}`);
  if (!data) return null;
  return rowToStored(data as SubmissionRow);
}

export async function listAllSubmissions(opts?: {
  limit?: number;
  stages?: string[];
  sectors?: string[];
}): Promise<StoredSubmission[]> {
  const client = getInsforge();
  let q = client.database
    .from("submissions")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(opts?.limit ?? 50);

  if (opts?.stages && opts.stages.length > 0) {
    q = q.in("stage", opts.stages);
  }
  // Sector filtering is client-side for v1 since postgrest jsonb array filtering
  // needs more setup; punt that to next iteration.

  const { data, error } = await q;
  if (error) throw new Error(`listAllSubmissions failed: ${error.message}`);
  let rows = (data as SubmissionRow[]).map(rowToStored);
  if (opts?.sectors && opts.sectors.length > 0) {
    rows = rows.filter((r) =>
      r.data.sectors.some((s) => opts.sectors!.includes(s))
    );
  }
  return rows;
}
