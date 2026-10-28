import "server-only";
import { getInsforge } from "./client";
import type { Side } from "@/lib/billing/plans";

/**
 * Data access for everything billing: subscriptions, Stripe customer
 * mapping, webhook idempotency, teams, the weekly unlock ledger, founder
 * review orders, pilot feedback, and investor notes.
 *
 * Tables: db/0008-subscriptions.sql + db/0009-billing-and-teams.sql.
 */

/* ─── SUBSCRIPTIONS ──────────────────────────────────────────────────── */

export type SubscriptionStatus =
  | "trialing"
  | "active"
  | "past_due"
  | "canceled"
  | "incomplete"
  | "incomplete_expired"
  | "unpaid";

export type StoredSubscription = {
  id: string;
  userId: string;
  side: Side;
  plan: string;
  status: SubscriptionStatus;
  cadence: "monthly" | "annual" | null;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  stripePriceId: string | null;
  currentPeriodEnd: string | null;
  trialEnd: string | null;
  hasUsedPilot: boolean;
  cancelAtPeriodEnd: boolean;
  seats: number;
  createdAt: string;
  updatedAt: string;
};

type SubscriptionRow = {
  id: string;
  user_id: string;
  side: Side;
  plan: string;
  status: SubscriptionStatus;
  cadence: "monthly" | "annual" | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  stripe_price_id: string | null;
  current_period_end: string | null;
  trial_end: string | null;
  has_used_pilot: boolean;
  cancel_at_period_end: boolean;
  seats: number | null;
  created_at: string;
  updated_at: string;
};

function subRowToStored(r: SubscriptionRow): StoredSubscription {
  return {
    id: r.id,
    userId: r.user_id,
    side: r.side,
    plan: r.plan,
    status: r.status,
    cadence: r.cadence,
    stripeCustomerId: r.stripe_customer_id,
    stripeSubscriptionId: r.stripe_subscription_id,
    stripePriceId: r.stripe_price_id,
    currentPeriodEnd: r.current_period_end,
    trialEnd: r.trial_end,
    hasUsedPilot: r.has_used_pilot,
    cancelAtPeriodEnd: r.cancel_at_period_end,
    seats: r.seats ?? 1,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export async function getSubscription(
  userId: string,
  side: Side
): Promise<StoredSubscription | null> {
  const client = getInsforge();
  const { data, error } = await client.database
    .from("subscriptions")
    .select("*")
    .eq("user_id", userId)
    .eq("side", side)
    .maybeSingle();
  if (error) throw new Error(`getSubscription: ${error.message}`);
  return data ? subRowToStored(data as SubscriptionRow) : null;
}

export async function getSubscriptionByStripeId(
  stripeSubscriptionId: string
): Promise<StoredSubscription | null> {
  const client = getInsforge();
  const { data } = await client.database
    .from("subscriptions")
    .select("*")
    .eq("stripe_subscription_id", stripeSubscriptionId)
    .maybeSingle();
  return data ? subRowToStored(data as SubscriptionRow) : null;
}

/** Both sides for one user, for the billing page. */
export async function listSubscriptionsForUser(
  userId: string
): Promise<StoredSubscription[]> {
  const client = getInsforge();
  const { data } = await client.database
    .from("subscriptions")
    .select("*")
    .eq("user_id", userId);
  return ((data ?? []) as SubscriptionRow[]).map(subRowToStored);
}

/** Founder-side subscriptions for a batch of owners (discover visibility). */
export async function listFounderSubscriptionsByUserIds(
  userIds: string[]
): Promise<Map<string, StoredSubscription>> {
  if (userIds.length === 0) return new Map();
  const client = getInsforge();
  const { data } = await client.database
    .from("subscriptions")
    .select("*")
    .eq("side", "founder")
    .in("user_id", userIds);
  const map = new Map<string, StoredSubscription>();
  for (const r of (data ?? []) as SubscriptionRow[]) {
    map.set(r.user_id, subRowToStored(r));
  }
  return map;
}

export type SubscriptionUpsert = {
  userId: string;
  side: Side;
  plan: string;
  status: SubscriptionStatus;
  cadence?: "monthly" | "annual" | null;
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
  stripePriceId?: string | null;
  currentPeriodEnd?: string | null;
  trialEnd?: string | null;
  cancelAtPeriodEnd?: boolean;
  seats?: number;
  hasUsedPilot?: boolean;
};

/**
 * Insert or update the one row per (user, side). Used by the webhook and
 * by the pilot start. The SDK has no upsert, so select-then-write.
 */
export async function upsertSubscription(
  input: SubscriptionUpsert
): Promise<StoredSubscription> {
  const client = getInsforge();
  const existing = await getSubscription(input.userId, input.side);

  const row: Record<string, unknown> = {
    plan: input.plan,
    status: input.status,
    updated_at: new Date().toISOString(),
  };
  if (input.cadence !== undefined) row.cadence = input.cadence;
  if (input.stripeCustomerId !== undefined) row.stripe_customer_id = input.stripeCustomerId;
  if (input.stripeSubscriptionId !== undefined) row.stripe_subscription_id = input.stripeSubscriptionId;
  if (input.stripePriceId !== undefined) row.stripe_price_id = input.stripePriceId;
  if (input.currentPeriodEnd !== undefined) row.current_period_end = input.currentPeriodEnd;
  if (input.trialEnd !== undefined) row.trial_end = input.trialEnd;
  if (input.cancelAtPeriodEnd !== undefined) row.cancel_at_period_end = input.cancelAtPeriodEnd;
  if (input.seats !== undefined) row.seats = input.seats;
  if (input.hasUsedPilot !== undefined) row.has_used_pilot = input.hasUsedPilot;

  if (existing) {
    const { data, error } = await client.database
      .from("subscriptions")
      .update(row)
      .eq("id", existing.id)
      .select("*")
      .single();
    if (error) throw new Error(`upsertSubscription(update): ${error.message}`);
    return subRowToStored(data as SubscriptionRow);
  }

  const { data, error } = await client.database
    .from("subscriptions")
    .insert({ user_id: input.userId, side: input.side, ...row })
    .select("*")
    .single();
  if (error) throw new Error(`upsertSubscription(insert): ${error.message}`);
  return subRowToStored(data as SubscriptionRow);
}

/** Admin: every subscription, newest first. */
export async function listAllSubscriptions(): Promise<StoredSubscription[]> {
  const client = getInsforge();
  const { data } = await client.database
    .from("subscriptions")
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(500);
  return ((data ?? []) as SubscriptionRow[]).map(subRowToStored);
}

/* ─── STRIPE CUSTOMERS ───────────────────────────────────────────────── */

export async function getStripeCustomerId(
  userId: string
): Promise<string | null> {
  const client = getInsforge();
  const { data } = await client.database
    .from("stripe_customers")
    .select("stripe_customer_id")
    .eq("user_id", userId)
    .maybeSingle();
  return (data as { stripe_customer_id: string } | null)?.stripe_customer_id ?? null;
}

export async function saveStripeCustomerId(input: {
  userId: string;
  stripeCustomerId: string;
  email: string | null;
}): Promise<void> {
  const client = getInsforge();
  await client.database.from("stripe_customers").insert({
    user_id: input.userId,
    stripe_customer_id: input.stripeCustomerId,
    email: input.email,
  });
}

export async function getUserIdByStripeCustomer(
  stripeCustomerId: string
): Promise<string | null> {
  const client = getInsforge();
  const { data } = await client.database
    .from("stripe_customers")
    .select("user_id")
    .eq("stripe_customer_id", stripeCustomerId)
    .maybeSingle();
  return (data as { user_id: string } | null)?.user_id ?? null;
}

/* ─── WEBHOOK IDEMPOTENCY ────────────────────────────────────────────── */

/** True if this event id was already processed. Records it otherwise. */
export async function claimBillingEvent(
  stripeEventId: string,
  type: string
): Promise<boolean> {
  const client = getInsforge();
  const { error } = await client.database
    .from("billing_events")
    .insert({ stripe_event_id: stripeEventId, type });
  if (!error) return false;
  // Unique violation = already seen.
  if ((error as { code?: string }).code === "23505") return true;
  throw new Error(`claimBillingEvent: ${error.message}`);
}

/* ─── TEAMS ──────────────────────────────────────────────────────────── */

export type StoredTeam = {
  id: string;
  ownerUserId: string;
  name: string;
  createdAt: string;
};

export type StoredTeamMember = {
  id: string;
  teamId: string;
  userId: string | null;
  email: string;
  role: "owner" | "member";
  status: "invited" | "active" | "removed";
  invitedAt: string;
  joinedAt: string | null;
};

type TeamRow = { id: string; owner_user_id: string; name: string; created_at: string };
type TeamMemberRow = {
  id: string;
  team_id: string;
  user_id: string | null;
  email: string;
  role: "owner" | "member";
  status: "invited" | "active" | "removed";
  invited_at: string;
  joined_at: string | null;
};

const teamRowToStored = (r: TeamRow): StoredTeam => ({
  id: r.id,
  ownerUserId: r.owner_user_id,
  name: r.name,
  createdAt: r.created_at,
});
const memberRowToStored = (r: TeamMemberRow): StoredTeamMember => ({
  id: r.id,
  teamId: r.team_id,
  userId: r.user_id,
  email: r.email,
  role: r.role,
  status: r.status,
  invitedAt: r.invited_at,
  joinedAt: r.joined_at,
});

export async function getTeamByOwner(ownerUserId: string): Promise<StoredTeam | null> {
  const client = getInsforge();
  const { data } = await client.database
    .from("teams")
    .select("*")
    .eq("owner_user_id", ownerUserId)
    .maybeSingle();
  return data ? teamRowToStored(data as TeamRow) : null;
}

export async function ensureTeam(input: {
  ownerUserId: string;
  name: string;
  ownerEmail: string | null;
}): Promise<StoredTeam> {
  const existing = await getTeamByOwner(input.ownerUserId);
  if (existing) return existing;
  const client = getInsforge();
  const { data, error } = await client.database
    .from("teams")
    .insert({ owner_user_id: input.ownerUserId, name: input.name })
    .select("*")
    .single();
  if (error) throw new Error(`ensureTeam: ${error.message}`);
  const team = teamRowToStored(data as TeamRow);
  // The owner is a member too, so seat counting is one query.
  await client.database.from("team_members").insert({
    team_id: team.id,
    user_id: input.ownerUserId,
    email: input.ownerEmail ?? `${input.ownerUserId}@owner.local`,
    role: "owner",
    status: "active",
    joined_at: new Date().toISOString(),
  });
  return team;
}

export async function listTeamMembers(teamId: string): Promise<StoredTeamMember[]> {
  const client = getInsforge();
  const { data } = await client.database
    .from("team_members")
    .select("*")
    .eq("team_id", teamId)
    .neq("status", "removed")
    .order("invited_at", { ascending: true });
  return ((data ?? []) as TeamMemberRow[]).map(memberRowToStored);
}

/**
 * The team this user belongs to as a non-owner, if any. Also activates a
 * pending invite the first time the invited email shows up signed in.
 */
export async function findMembershipForUser(input: {
  userId: string;
  email: string | null;
}): Promise<{ team: StoredTeam; member: StoredTeamMember } | null> {
  const client = getInsforge();

  // Already linked by user id.
  const byId = await client.database
    .from("team_members")
    .select("*")
    .eq("user_id", input.userId)
    .eq("status", "active")
    .eq("role", "member")
    .maybeSingle();
  let member = byId.data ? memberRowToStored(byId.data as TeamMemberRow) : null;

  // Pending invite matching this email: activate it.
  if (!member && input.email) {
    const byEmail = await client.database
      .from("team_members")
      .select("*")
      .ilike("email", input.email)
      .eq("status", "invited")
      .limit(1);
    const row = (byEmail.data ?? [])[0] as TeamMemberRow | undefined;
    if (row) {
      const { data } = await client.database
        .from("team_members")
        .update({
          user_id: input.userId,
          status: "active",
          joined_at: new Date().toISOString(),
        })
        .eq("id", row.id)
        .select("*")
        .single();
      if (data) member = memberRowToStored(data as TeamMemberRow);
    }
  }

  if (!member) return null;
  const { data: teamRow } = await client.database
    .from("teams")
    .select("*")
    .eq("id", member.teamId)
    .maybeSingle();
  if (!teamRow) return null;
  return { team: teamRowToStored(teamRow as TeamRow), member };
}

export async function inviteTeamMember(input: {
  teamId: string;
  email: string;
}): Promise<StoredTeamMember> {
  const client = getInsforge();
  const email = input.email.trim().toLowerCase();
  // Re-inviting someone previously removed revives the row.
  const { data: existing } = await client.database
    .from("team_members")
    .select("*")
    .eq("team_id", input.teamId)
    .ilike("email", email)
    .maybeSingle();
  if (existing) {
    const { data } = await client.database
      .from("team_members")
      .update({ status: "invited", invited_at: new Date().toISOString() })
      .eq("id", (existing as TeamMemberRow).id)
      .select("*")
      .single();
    return memberRowToStored(data as TeamMemberRow);
  }
  const { data, error } = await client.database
    .from("team_members")
    .insert({ team_id: input.teamId, email, role: "member", status: "invited" })
    .select("*")
    .single();
  if (error) throw new Error(`inviteTeamMember: ${error.message}`);
  return memberRowToStored(data as TeamMemberRow);
}

export async function removeTeamMember(memberId: string, teamId: string): Promise<void> {
  const client = getInsforge();
  await client.database
    .from("team_members")
    .update({ status: "removed" })
    .eq("id", memberId)
    .eq("team_id", teamId)
    .eq("role", "member");
}

/* ─── PROFILE UNLOCKS (weekly quota ledger) ──────────────────────────── */

export async function isProfileUnlocked(
  accountUserId: string,
  submissionId: string
): Promise<boolean> {
  const client = getInsforge();
  const { data } = await client.database
    .from("profile_unlocks")
    .select("id")
    .eq("account_user_id", accountUserId)
    .eq("submission_id", submissionId)
    .limit(1);
  return (data?.length ?? 0) > 0;
}

export async function listUnlockedSubmissionIds(
  accountUserId: string
): Promise<Set<string>> {
  const client = getInsforge();
  const { data } = await client.database
    .from("profile_unlocks")
    .select("submission_id")
    .eq("account_user_id", accountUserId);
  return new Set(
    ((data ?? []) as { submission_id: string }[]).map((r) => r.submission_id)
  );
}

export async function countUnlocksSince(
  accountUserId: string,
  sinceIso: string
): Promise<number> {
  const client = getInsforge();
  const { count } = await client.database
    .from("profile_unlocks")
    .select("id", { count: "exact", head: true })
    .eq("account_user_id", accountUserId)
    .gte("unlocked_at", sinceIso);
  return count ?? 0;
}

export async function countUnlocksTotal(accountUserId: string): Promise<number> {
  const client = getInsforge();
  const { count } = await client.database
    .from("profile_unlocks")
    .select("id", { count: "exact", head: true })
    .eq("account_user_id", accountUserId);
  return count ?? 0;
}

export async function recordUnlock(input: {
  accountUserId: string;
  viewerUserId: string;
  submissionId: string;
}): Promise<void> {
  const client = getInsforge();
  const { error } = await client.database.from("profile_unlocks").insert({
    account_user_id: input.accountUserId,
    viewer_user_id: input.viewerUserId,
    submission_id: input.submissionId,
  });
  // Unique violation = a teammate unlocked it concurrently. Fine.
  if (error && (error as { code?: string }).code !== "23505") {
    throw new Error(`recordUnlock: ${error.message}`);
  }
}

/* ─── FOUNDER REVIEW ORDERS ──────────────────────────────────────────── */

export type ReviewOrderStatus =
  | "pending_payment"
  | "paid"
  | "in_progress"
  | "delivered"
  | "refunded";

export type StoredReviewOrder = {
  id: string;
  userId: string;
  submissionId: string | null;
  stripeCheckoutSessionId: string | null;
  stripePaymentIntentId: string | null;
  amountCents: number;
  status: ReviewOrderStatus;
  wantsCall: boolean;
  founderNotes: string | null;
  deckUrl: string | null;
  memoUrl: string | null;
  memoText: string | null;
  reviewerUserId: string | null;
  createdAt: string;
  paidAt: string | null;
  deliveredAt: string | null;
};

type ReviewOrderRow = {
  id: string;
  user_id: string;
  submission_id: string | null;
  stripe_checkout_session_id: string | null;
  stripe_payment_intent_id: string | null;
  amount_cents: number;
  status: ReviewOrderStatus;
  wants_call: boolean;
  founder_notes: string | null;
  deck_url: string | null;
  memo_url: string | null;
  memo_text: string | null;
  reviewer_user_id: string | null;
  created_at: string;
  paid_at: string | null;
  delivered_at: string | null;
};

const orderRowToStored = (r: ReviewOrderRow): StoredReviewOrder => ({
  id: r.id,
  userId: r.user_id,
  submissionId: r.submission_id,
  stripeCheckoutSessionId: r.stripe_checkout_session_id,
  stripePaymentIntentId: r.stripe_payment_intent_id,
  amountCents: r.amount_cents,
  status: r.status,
  wantsCall: r.wants_call,
  founderNotes: r.founder_notes,
  deckUrl: r.deck_url,
  memoUrl: r.memo_url,
  memoText: r.memo_text,
  reviewerUserId: r.reviewer_user_id,
  createdAt: r.created_at,
  paidAt: r.paid_at,
  deliveredAt: r.delivered_at,
});

export async function createReviewOrder(input: {
  userId: string;
  submissionId: string | null;
  amountCents: number;
  wantsCall: boolean;
  founderNotes: string | null;
  deckUrl: string | null;
}): Promise<StoredReviewOrder> {
  const client = getInsforge();
  const { data, error } = await client.database
    .from("founder_review_orders")
    .insert({
      user_id: input.userId,
      submission_id: input.submissionId,
      amount_cents: input.amountCents,
      wants_call: input.wantsCall,
      founder_notes: input.founderNotes,
      deck_url: input.deckUrl,
      status: "pending_payment",
    })
    .select("*")
    .single();
  if (error) throw new Error(`createReviewOrder: ${error.message}`);
  return orderRowToStored(data as ReviewOrderRow);
}

export async function getReviewOrder(id: string): Promise<StoredReviewOrder | null> {
  const client = getInsforge();
  const { data } = await client.database
    .from("founder_review_orders")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  return data ? orderRowToStored(data as ReviewOrderRow) : null;
}

export async function updateReviewOrder(
  id: string,
  patch: Partial<{
    status: ReviewOrderStatus;
    stripeCheckoutSessionId: string | null;
    stripePaymentIntentId: string | null;
    memoUrl: string | null;
    memoText: string | null;
    reviewerUserId: string | null;
    paidAt: string | null;
    deliveredAt: string | null;
  }>
): Promise<StoredReviewOrder> {
  const client = getInsforge();
  const row: Record<string, unknown> = {};
  if (patch.status !== undefined) row.status = patch.status;
  if (patch.stripeCheckoutSessionId !== undefined) row.stripe_checkout_session_id = patch.stripeCheckoutSessionId;
  if (patch.stripePaymentIntentId !== undefined) row.stripe_payment_intent_id = patch.stripePaymentIntentId;
  if (patch.memoUrl !== undefined) row.memo_url = patch.memoUrl;
  if (patch.memoText !== undefined) row.memo_text = patch.memoText;
  if (patch.reviewerUserId !== undefined) row.reviewer_user_id = patch.reviewerUserId;
  if (patch.paidAt !== undefined) row.paid_at = patch.paidAt;
  if (patch.deliveredAt !== undefined) row.delivered_at = patch.deliveredAt;
  const { data, error } = await client.database
    .from("founder_review_orders")
    .update(row)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw new Error(`updateReviewOrder: ${error.message}`);
  return orderRowToStored(data as ReviewOrderRow);
}

export async function listReviewOrdersForUser(userId: string): Promise<StoredReviewOrder[]> {
  const client = getInsforge();
  const { data } = await client.database
    .from("founder_review_orders")
    .select("*")
    .eq("user_id", userId)
    .neq("status", "pending_payment")
    .order("created_at", { ascending: false });
  return ((data ?? []) as ReviewOrderRow[]).map(orderRowToStored);
}

/** Admin queue: paid work first, then history. */
export async function listAllReviewOrders(): Promise<StoredReviewOrder[]> {
  const client = getInsforge();
  const { data } = await client.database
    .from("founder_review_orders")
    .select("*")
    .neq("status", "pending_payment")
    .order("created_at", { ascending: false })
    .limit(200);
  return ((data ?? []) as ReviewOrderRow[]).map(orderRowToStored);
}

/* ─── PILOT FEEDBACK ─────────────────────────────────────────────────── */

export type StoredPilotFeedback = {
  id: string;
  investorUserId: string;
  submissionId: string;
  useful: boolean;
  note: string | null;
  createdAt: string;
};

type PilotFeedbackRow = {
  id: string;
  investor_user_id: string;
  submission_id: string;
  useful: boolean;
  note: string | null;
  created_at: string;
};

const feedbackRowToStored = (r: PilotFeedbackRow): StoredPilotFeedback => ({
  id: r.id,
  investorUserId: r.investor_user_id,
  submissionId: r.submission_id,
  useful: r.useful,
  note: r.note,
  createdAt: r.created_at,
});

export async function upsertPilotFeedback(input: {
  investorUserId: string;
  submissionId: string;
  useful: boolean;
  note: string | null;
}): Promise<void> {
  const client = getInsforge();
  const { data: existing } = await client.database
    .from("pilot_feedback")
    .select("id")
    .eq("investor_user_id", input.investorUserId)
    .eq("submission_id", input.submissionId)
    .maybeSingle();
  if (existing) {
    await client.database
      .from("pilot_feedback")
      .update({ useful: input.useful, note: input.note })
      .eq("id", (existing as { id: string }).id);
    return;
  }
  await client.database.from("pilot_feedback").insert({
    investor_user_id: input.investorUserId,
    submission_id: input.submissionId,
    useful: input.useful,
    note: input.note,
  });
}

export async function getPilotFeedbackMap(
  investorUserId: string
): Promise<Map<string, StoredPilotFeedback>> {
  const client = getInsforge();
  const { data } = await client.database
    .from("pilot_feedback")
    .select("*")
    .eq("investor_user_id", investorUserId);
  const map = new Map<string, StoredPilotFeedback>();
  for (const r of (data ?? []) as PilotFeedbackRow[]) {
    map.set(r.submission_id, feedbackRowToStored(r));
  }
  return map;
}

export async function listAllPilotFeedback(): Promise<StoredPilotFeedback[]> {
  const client = getInsforge();
  const { data } = await client.database
    .from("pilot_feedback")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(500);
  return ((data ?? []) as PilotFeedbackRow[]).map(feedbackRowToStored);
}

/* ─── INVESTOR NOTES (light CRM) ─────────────────────────────────────── */

export type StoredInvestorNote = {
  id: string;
  accountUserId: string;
  authorUserId: string;
  submissionId: string;
  body: string;
  stage: string | null;
  createdAt: string;
  updatedAt: string;
};

type InvestorNoteRow = {
  id: string;
  account_user_id: string;
  author_user_id: string;
  submission_id: string;
  body: string;
  stage: string | null;
  created_at: string;
  updated_at: string;
};

const noteRowToStored = (r: InvestorNoteRow): StoredInvestorNote => ({
  id: r.id,
  accountUserId: r.account_user_id,
  authorUserId: r.author_user_id,
  submissionId: r.submission_id,
  body: r.body,
  stage: r.stage,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

/** One note per (account, submission); writing again replaces it. */
export async function saveInvestorNote(input: {
  accountUserId: string;
  authorUserId: string;
  submissionId: string;
  body: string;
  stage: string | null;
}): Promise<StoredInvestorNote> {
  const client = getInsforge();
  const { data: existing } = await client.database
    .from("investor_notes")
    .select("id")
    .eq("account_user_id", input.accountUserId)
    .eq("submission_id", input.submissionId)
    .maybeSingle();
  if (existing) {
    const { data, error } = await client.database
      .from("investor_notes")
      .update({
        body: input.body,
        stage: input.stage,
        author_user_id: input.authorUserId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", (existing as { id: string }).id)
      .select("*")
      .single();
    if (error) throw new Error(`saveInvestorNote: ${error.message}`);
    return noteRowToStored(data as InvestorNoteRow);
  }
  const { data, error } = await client.database
    .from("investor_notes")
    .insert({
      account_user_id: input.accountUserId,
      author_user_id: input.authorUserId,
      submission_id: input.submissionId,
      body: input.body,
      stage: input.stage,
    })
    .select("*")
    .single();
  if (error) throw new Error(`saveInvestorNote: ${error.message}`);
  return noteRowToStored(data as InvestorNoteRow);
}

export async function getInvestorNote(
  accountUserId: string,
  submissionId: string
): Promise<StoredInvestorNote | null> {
  const client = getInsforge();
  const { data } = await client.database
    .from("investor_notes")
    .select("*")
    .eq("account_user_id", accountUserId)
    .eq("submission_id", submissionId)
    .maybeSingle();
  return data ? noteRowToStored(data as InvestorNoteRow) : null;
}

export async function listInvestorNotes(
  accountUserId: string
): Promise<Map<string, StoredInvestorNote>> {
  const client = getInsforge();
  const { data } = await client.database
    .from("investor_notes")
    .select("*")
    .eq("account_user_id", accountUserId);
  const map = new Map<string, StoredInvestorNote>();
  for (const r of (data ?? []) as InvestorNoteRow[]) {
    map.set(r.submission_id, noteRowToStored(r));
  }
  return map;
}
