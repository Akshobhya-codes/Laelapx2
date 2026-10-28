import "server-only";
import {
  listAllSubmissions,
  type StoredSubmission,
} from "@/lib/insforge/submissions";
import { listFounderSubscriptionsByUserIds } from "@/lib/insforge/billing";
import { founderPlanFromSubscription } from "./entitlements";
import { investorVisibility } from "./visibility";

/**
 * The founders an investor is allowed to discover: paying, opted in, and
 * over the completeness + fundability bars. One batched subscription
 * lookup, no N+1. Used by /funder and /funder/discover.
 *
 * `/s/[slug]` deliberately does NOT use this — a founder's public page is a
 * link they share themselves and stays reachable on every plan.
 */
export async function listInvestorVisibleSubmissions(opts?: {
  limit?: number;
}): Promise<StoredSubmission[]> {
  const all = await listAllSubmissions({ limit: opts?.limit ?? 200 });
  const owners = Array.from(new Set(all.map((s) => s.ownerUserId)));
  const subs = await listFounderSubscriptionsByUserIds(owners);
  return all.filter((s) => {
    const plan = founderPlanFromSubscription(subs.get(s.ownerUserId));
    return investorVisibility(s, plan).visible;
  });
}
