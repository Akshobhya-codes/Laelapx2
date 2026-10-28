import "server-only";
import { cache } from "react";
import {
  FOUNDER_PLANS,
  INVESTOR_PLANS,
  getPlan,
  type FounderPlan,
  type InvestorPlan,
} from "./plans";
import {
  getSubscription,
  findMembershipForUser,
  countUnlocksSince,
  countUnlocksTotal,
  isProfileUnlocked,
  recordUnlock,
  type StoredSubscription,
} from "@/lib/insforge/billing";

/**
 * Entitlements — what a user is allowed to do right now.
 *
 * This is the only module the rest of the app should ask "can they?"
 * questions to. It resolves the subscription row, applies the plan table,
 * handles team members inheriting the owner's plan, and computes the
 * weekly / total profile quota.
 *
 * Wrapped in React `cache()` so a page that asks several times in one
 * request does one set of queries.
 */

/* ─── STATUS ─────────────────────────────────────────────────────────── */

/**
 * `past_due` still counts as active: Stripe keeps a subscription in that
 * state while it retries the card, and locking someone out on the first
 * failed charge is a bad experience. The billing page shows the warning.
 * Stripe flips it to `canceled` / `unpaid` when retries are exhausted, and
 * that does lock them out.
 */
export function isSubscriptionActive(sub: StoredSubscription | null): boolean {
  if (!sub) return false;
  if (sub.status === "active" || sub.status === "past_due") return true;
  if (sub.status === "trialing") {
    // Pilots have no Stripe subscription, so expiry is checked here.
    if (!sub.trialEnd) return true;
    return new Date(sub.trialEnd).getTime() > Date.now();
  }
  return false;
}

/* ─── FOUNDER ────────────────────────────────────────────────────────── */

export type FounderEntitlement = {
  plan: FounderPlan;
  subscription: StoredSubscription | null;
  active: boolean;
  isPaid: boolean;
};

export const getFounderEntitlement = cache(
  async (userId: string): Promise<FounderEntitlement> => {
    const sub = await getSubscription(userId, "founder");
    const active = isSubscriptionActive(sub);
    const plan =
      (active && sub && getPlan("founder", sub.plan)) || FOUNDER_PLANS.free;
    return { plan, subscription: sub, active, isPaid: plan.id !== "free" };
  }
);

/** For batch use (discover): plan from an already-fetched row. */
export function founderPlanFromSubscription(
  sub: StoredSubscription | null | undefined
): FounderPlan {
  if (!sub || !isSubscriptionActive(sub)) return FOUNDER_PLANS.free;
  return getPlan("founder", sub.plan) ?? FOUNDER_PLANS.free;
}

/* ─── INVESTOR ───────────────────────────────────────────────────────── */

export type InvestorQuota = {
  weekly: number | null;
  usedThisWeek: number;
  remainingThisWeek: number | null;
  total: number | null;
  usedTotal: number;
  remainingTotal: number | null;
  /** True when at least one more profile can be unlocked right now. */
  canUnlock: boolean;
  weekResetsAt: string;
};

export type InvestorEntitlement = {
  /** null = no plan at all (never started a pilot, never subscribed). */
  plan: InvestorPlan | null;
  active: boolean;
  subscription: StoredSubscription | null;
  /** Whose subscription applies: the user, or the team owner. */
  accountUserId: string;
  isTeamMember: boolean;
  teamId: string | null;
  teamName: string | null;
  seats: number;
  quota: InvestorQuota;
  /** For the pilot: when it ends. For paid: the period end. */
  periodEndsAt: string | null;
  /** Previously used the pilot and it ended — offer paid, not another pilot. */
  pilotExhausted: boolean;
};

/** Monday 00:00 UTC of the current week. Quotas reset here. */
export function currentWeekStart(now = new Date()): Date {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const day = d.getUTCDay(); // 0 = Sunday
  const diff = (day + 6) % 7; // days since Monday
  d.setUTCDate(d.getUTCDate() - diff);
  return d;
}

export function nextWeekStart(now = new Date()): Date {
  const d = currentWeekStart(now);
  d.setUTCDate(d.getUTCDate() + 7);
  return d;
}

export const getInvestorEntitlement = cache(
  async (input: { userId: string; email: string | null }): Promise<InvestorEntitlement> => {
    // A team member inherits the owner's subscription and quota.
    const membership = await findMembershipForUser(input);
    const accountUserId = membership ? membership.team.ownerUserId : input.userId;

    const sub = await getSubscription(accountUserId, "investor");
    const active = isSubscriptionActive(sub);
    const plan = active && sub ? getPlan("investor", sub.plan) : null;

    const pilotExhausted =
      !active && !!sub && (sub.hasUsedPilot || sub.plan === "pilot");

    const weekStart = currentWeekStart();
    const weekly = plan?.features.weeklyProfiles ?? 0;
    const total = plan?.features.totalProfiles ?? null;

    const [usedThisWeek, usedTotal] = plan
      ? await Promise.all([
          weekly === null ? Promise.resolve(0) : countUnlocksSince(accountUserId, weekStart.toISOString()),
          total === null ? Promise.resolve(0) : countUnlocksTotal(accountUserId),
        ])
      : [0, 0];

    const remainingThisWeek = weekly === null ? null : Math.max(0, weekly - usedThisWeek);
    const remainingTotal = total === null ? null : Math.max(0, total - usedTotal);
    const canUnlock =
      !!plan &&
      (remainingThisWeek === null || remainingThisWeek > 0) &&
      (remainingTotal === null || remainingTotal > 0);

    return {
      plan,
      active: active && !!plan,
      subscription: sub,
      accountUserId,
      isTeamMember: !!membership,
      teamId: membership?.team.id ?? null,
      teamName: membership?.team.name ?? null,
      seats: sub?.seats ?? plan?.features.seats ?? 1,
      quota: {
        weekly: plan ? weekly : 0,
        usedThisWeek,
        remainingThisWeek: plan ? remainingThisWeek : 0,
        total,
        usedTotal,
        remainingTotal,
        canUnlock,
        weekResetsAt: nextWeekStart().toISOString(),
      },
      periodEndsAt: sub?.trialEnd ?? sub?.currentPeriodEnd ?? null,
      pilotExhausted,
    };
  }
);

/**
 * Open a founder profile for an investor account. Free if it was already
 * unlocked (by anyone on the team); otherwise spends one unit of quota.
 * Returns whether the investor may see the full profile.
 */
export async function unlockProfileIfAllowed(
  ent: InvestorEntitlement,
  submissionId: string,
  viewerUserId: string
): Promise<{ unlocked: boolean; spentQuota: boolean }> {
  if (!ent.active) return { unlocked: false, spentQuota: false };
  if (await isProfileUnlocked(ent.accountUserId, submissionId)) {
    return { unlocked: true, spentQuota: false };
  }
  if (!ent.quota.canUnlock) return { unlocked: false, spentQuota: false };
  await recordUnlock({
    accountUserId: ent.accountUserId,
    viewerUserId,
    submissionId,
  });
  return { unlocked: true, spentQuota: true };
}

/** Which plan comes next on the ladder, for upgrade prompts. */
export function nextInvestorPlan(current: InvestorPlan | null): InvestorPlan {
  const order: InvestorPlan["id"][] = [
    "pilot", "angel", "syndicate", "micro_fund", "emerging_fund", "institutional", "elite",
  ];
  if (!current) return INVESTOR_PLANS.angel;
  const i = order.indexOf(current.id);
  return INVESTOR_PLANS[order[Math.min(i + 1, order.length - 1)]];
}
