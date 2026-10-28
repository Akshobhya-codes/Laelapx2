import "server-only";
import {
  listAllSubmissions,
  markFirstVisible,
  type StoredSubmission,
} from "@/lib/insforge/submissions";
import { listFounderSubscriptionsByUserIds } from "@/lib/insforge/billing";
import { founderPlanFromSubscription } from "./entitlements";
import { investorVisibility } from "./visibility";

/**
 * Priority review (Emerging Fund and up): a founder who has just become
 * investor-visible is shown to priority accounts immediately and to every
 * other plan after this window. The rule is time-based and identical for
 * every founder — "objective platform criteria" — and never affects scores.
 */
export const PRIORITY_WINDOW_HOURS = 48;

export type VisibleSet = {
  submissions: StoredSubmission[];
  /** Ids still inside the priority window (shown only to priority plans). */
  priorityIds: Set<string>;
  /** How many were held back from this account by the priority window. */
  heldBack: number;
};

/**
 * The founders an investor is allowed to discover: paying, opted in, and
 * over the completeness + fundability bars. One batched subscription
 * lookup, no N+1. Used by /funder, /funder/discover, /funder/pipeline.
 *
 * `/s/[slug]` deliberately does NOT use this — a founder's public page is a
 * link they share themselves and stays reachable on every plan.
 */
export async function listInvestorVisibleSubmissions(opts: {
  limit?: number;
  /** Account has priorityReview. */
  priority: boolean;
}): Promise<VisibleSet> {
  const all = await listAllSubmissions({ limit: opts.limit ?? 200 });
  const owners = Array.from(new Set(all.map((s) => s.ownerUserId)));
  const subs = await listFounderSubscriptionsByUserIds(owners);
  const visible = all.filter((s) => {
    const plan = founderPlanFromSubscription(subs.get(s.ownerUserId));
    return investorVisibility(s, plan).visible;
  });

  // First sighting starts the priority window.
  const unstamped = visible.filter((s) => !s.firstVisibleAt).map((s) => s.id);
  const stampedAt = await markFirstVisible(unstamped);
  for (const s of visible) if (!s.firstVisibleAt) s.firstVisibleAt = stampedAt;

  const windowMs = PRIORITY_WINDOW_HOURS * 60 * 60 * 1000;
  const now = Date.now();
  const priorityIds = new Set(
    visible
      .filter((s) => now - new Date(s.firstVisibleAt!).getTime() < windowMs)
      .map((s) => s.id)
  );

  if (opts.priority) {
    return { submissions: visible, priorityIds, heldBack: 0 };
  }
  const shown = visible.filter((s) => !priorityIds.has(s.id));
  return { submissions: shown, priorityIds: new Set(), heldBack: visible.length - shown.length };
}
