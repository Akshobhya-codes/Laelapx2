import "server-only";
import { getInsforge } from "./client";
import type { ExternalFund } from "@/lib/external-funds/types";
import { fundDomain } from "@/lib/external-funds/discover";

/* Tables from db/0012-fund-network.sql. */

/* ─── EXTERNAL FUNDS ──────────────────────────────────────────────────── */

export type StoredExternalFund = {
  domain: string;
  fundName: string;
  websiteUrl: string;
  applyUrl: string | null;
  thesisOneLiner: string | null;
  showInMarquee: boolean;
  firstSeenAt: string;
  lastSeenAt: string;
};

type FundRow = {
  domain: string;
  fund_name: string;
  website_url: string;
  apply_url: string | null;
  thesis_one_liner: string | null;
  show_in_marquee: boolean;
  first_seen_at: string;
  last_seen_at: string;
};

const toFund = (r: FundRow): StoredExternalFund => ({
  domain: r.domain,
  fundName: r.fund_name,
  websiteUrl: r.website_url,
  applyUrl: r.apply_url,
  thesisOneLiner: r.thesis_one_liner,
  showInMarquee: r.show_in_marquee,
  firstSeenAt: r.first_seen_at,
  lastSeenAt: r.last_seen_at,
});

/**
 * Record funds the research pipeline matched. Upserts by domain, refreshing
 * the details and last_seen_at; first_seen_at and show_in_marquee are left
 * alone on existing rows (they're omitted from the payload). Soft-fails: a
 * write problem must never break the founder dashboard.
 */
export async function upsertExternalFunds(funds: ExternalFund[]): Promise<number> {
  const now = new Date().toISOString();
  const rows = new Map<string, Record<string, unknown>>();
  for (const f of funds) {
    const domain = fundDomain(f);
    if (!domain || !f.fundName?.trim()) continue;
    rows.set(domain, {
      domain,
      fund_name: f.fundName.trim(),
      website_url: f.websiteUrl || `https://${domain}`,
      apply_url: f.applyUrl || null,
      source_url: f.sourceUrl || null,
      thesis_one_liner: f.thesisOneLiner || null,
      hq: f.hq ?? null,
      stages: f.stages ?? [],
      sectors: f.sectors ?? [],
      check_size_min_usd: f.checkSizeMinUsd ?? null,
      check_size_max_usd: f.checkSizeMaxUsd ?? null,
      last_seen_at: now,
    });
  }
  if (!rows.size) return 0;
  try {
    const { error } = await getInsforge()
      .database.from("external_funds")
      .upsert([...rows.values()], { onConflict: "domain" });
    if (error) {
      console.error("[fund-network] upsert failed:", error.message);
      return 0;
    }
    return rows.size;
  } catch (err) {
    console.error("[fund-network] upsert failed:", err);
    return 0;
  }
}

export async function getExternalFund(domain: string): Promise<StoredExternalFund | null> {
  const { data } = await getInsforge()
    .database.from("external_funds")
    .select("*")
    .eq("domain", domain)
    .maybeSingle();
  return data ? toFund(data as FundRow) : null;
}

/** Funds for the homepage marquee, most recently matched first. */
export async function listMarqueeFunds(limit = 40): Promise<StoredExternalFund[]> {
  const { data, error } = await getInsforge()
    .database.from("external_funds")
    .select("*")
    .eq("show_in_marquee", true)
    .order("last_seen_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(`listMarqueeFunds: ${error.message}`);
  return ((data ?? []) as FundRow[]).map(toFund);
}

export async function listAllExternalFunds(): Promise<StoredExternalFund[]> {
  const { data, error } = await getInsforge()
    .database.from("external_funds")
    .select("*")
    .order("last_seen_at", { ascending: false });
  if (error) throw new Error(`listAllExternalFunds: ${error.message}`);
  return ((data ?? []) as FundRow[]).map(toFund);
}

export async function setFundInMarquee(domain: string, show: boolean): Promise<void> {
  const { error } = await getInsforge()
    .database.from("external_funds")
    .update({ show_in_marquee: show })
    .eq("domain", domain);
  if (error) throw new Error(`setFundInMarquee: ${error.message}`);
}

/* ─── APPLICATIONS ────────────────────────────────────────────────────── */

export type ApplicationMode = "self" | "concierge";
export type ApplicationStatus = "applied" | "awaiting_payment" | "paid" | "in_progress" | "submitted" | "canceled";

export type StoredApplication = {
  id: string;
  founderUserId: string;
  submissionId: string;
  fundDomain: string;
  mode: ApplicationMode;
  status: ApplicationStatus;
  amountCents: number;
  stripeCheckoutSessionId: string | null;
  founderNotes: string | null;
  adminNotes: string | null;
  createdAt: string;
  updatedAt: string;
};

type AppRow = {
  id: string;
  founder_user_id: string;
  submission_id: string;
  fund_domain: string;
  mode: ApplicationMode;
  status: ApplicationStatus;
  amount_cents: number;
  stripe_checkout_session_id: string | null;
  founder_notes: string | null;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
};

const toApp = (r: AppRow): StoredApplication => ({
  id: r.id,
  founderUserId: r.founder_user_id,
  submissionId: r.submission_id,
  fundDomain: r.fund_domain,
  mode: r.mode,
  status: r.status,
  amountCents: r.amount_cents,
  stripeCheckoutSessionId: r.stripe_checkout_session_id,
  founderNotes: r.founder_notes,
  adminNotes: r.admin_notes,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

export async function createApplication(input: {
  founderUserId: string;
  submissionId: string;
  fundDomain: string;
  mode: ApplicationMode;
  status: ApplicationStatus;
  amountCents: number;
  founderNotes?: string | null;
}): Promise<StoredApplication> {
  const { data, error } = await getInsforge()
    .database.from("fund_applications")
    .insert({
      founder_user_id: input.founderUserId,
      submission_id: input.submissionId,
      fund_domain: input.fundDomain,
      mode: input.mode,
      status: input.status,
      amount_cents: input.amountCents,
      founder_notes: input.founderNotes ?? null,
    })
    .select("*")
    .single();
  if (error) throw new Error(`createApplication: ${error.message}`);
  return toApp(data as AppRow);
}

export async function updateApplication(
  id: string,
  fields: Partial<{ status: ApplicationStatus; stripeCheckoutSessionId: string; adminNotes: string | null }>
): Promise<void> {
  const row: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (fields.status) row.status = fields.status;
  if (fields.stripeCheckoutSessionId) row.stripe_checkout_session_id = fields.stripeCheckoutSessionId;
  if (fields.adminNotes !== undefined) row.admin_notes = fields.adminNotes;
  const { error } = await getInsforge().database.from("fund_applications").update(row).eq("id", id);
  if (error) throw new Error(`updateApplication: ${error.message}`);
}

export async function getApplication(id: string): Promise<StoredApplication | null> {
  const { data } = await getInsforge().database.from("fund_applications").select("*").eq("id", id).maybeSingle();
  return data ? toApp(data as AppRow) : null;
}

/** A founder's applications for one submission (self + concierge). */
export async function listApplicationsForSubmission(submissionId: string): Promise<StoredApplication[]> {
  const { data } = await getInsforge()
    .database.from("fund_applications")
    .select("*")
    .eq("submission_id", submissionId)
    .neq("status", "canceled")
    .order("created_at", { ascending: false });
  return ((data ?? []) as AppRow[]).map(toApp);
}

export async function listAllApplications(): Promise<StoredApplication[]> {
  const { data, error } = await getInsforge()
    .database.from("fund_applications")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) throw new Error(`listAllApplications: ${error.message}`);
  return ((data ?? []) as AppRow[]).map(toApp);
}

/* ─── CONCIERGE KICKOFF ───────────────────────────────────────────────── */

export type KickoffStatus = "awaiting_payment" | "paid" | "scheduled" | "done";

export type StoredKickoff = {
  founderUserId: string;
  status: KickoffStatus;
  amountCents: number;
  scheduledFor: string | null;
  adminNotes: string | null;
  createdAt: string;
  updatedAt: string;
};

type KickoffRow = {
  founder_user_id: string;
  status: KickoffStatus;
  amount_cents: number;
  scheduled_for: string | null;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
};

const toKickoff = (r: KickoffRow): StoredKickoff => ({
  founderUserId: r.founder_user_id,
  status: r.status,
  amountCents: r.amount_cents,
  scheduledFor: r.scheduled_for,
  adminNotes: r.admin_notes,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

export async function getKickoff(founderUserId: string): Promise<StoredKickoff | null> {
  const { data } = await getInsforge()
    .database.from("concierge_kickoffs")
    .select("*")
    .eq("founder_user_id", founderUserId)
    .maybeSingle();
  return data ? toKickoff(data as KickoffRow) : null;
}

/** Paid at least once — no further kickoff fee. */
export function kickoffIsPaid(k: StoredKickoff | null): boolean {
  return !!k && k.status !== "awaiting_payment";
}

export async function upsertKickoff(
  founderUserId: string,
  fields: Partial<{ status: KickoffStatus; amountCents: number; stripeCheckoutSessionId: string; scheduledFor: string | null; adminNotes: string | null }>
): Promise<void> {
  const row: Record<string, unknown> = { founder_user_id: founderUserId, updated_at: new Date().toISOString() };
  if (fields.status) row.status = fields.status;
  if (fields.amountCents !== undefined) row.amount_cents = fields.amountCents;
  if (fields.stripeCheckoutSessionId) row.stripe_checkout_session_id = fields.stripeCheckoutSessionId;
  if (fields.scheduledFor !== undefined) row.scheduled_for = fields.scheduledFor;
  if (fields.adminNotes !== undefined) row.admin_notes = fields.adminNotes;
  const { error } = await getInsforge()
    .database.from("concierge_kickoffs")
    .upsert(row, { onConflict: "founder_user_id" });
  if (error) throw new Error(`upsertKickoff: ${error.message}`);
}

export async function listAllKickoffs(): Promise<StoredKickoff[]> {
  const { data, error } = await getInsforge()
    .database.from("concierge_kickoffs")
    .select("*")
    .order("updated_at", { ascending: false });
  if (error) throw new Error(`listAllKickoffs: ${error.message}`);
  return ((data ?? []) as KickoffRow[]).map(toKickoff);
}
