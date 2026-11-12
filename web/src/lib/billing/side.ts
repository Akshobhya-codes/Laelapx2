import type { FounderEntitlement, InvestorEntitlement } from "./entitlements";

/**
 * Once someone pays on one side, that's who they are: a founder on Founder+
 * isn't about to buy an investor plan, and vice versa. So the billing and
 * pricing pages lock to the paid side and drop the founder/investor toggle.
 *
 * "Paid" means an active plan someone pays for — a free investor pilot
 * doesn't count. Someone paying on both sides (an operator who invests)
 * keeps the toggle, since both sides are genuinely theirs. The pages also
 * skip the lock for the Laelapx team (ADMIN_EMAILS), who test both sides.
 */
export function paidSide(
  founder: Pick<FounderEntitlement, "isPaid">,
  investor: Pick<InvestorEntitlement, "active" | "plan">
): "founder" | "investor" | null {
  const founderPaid = founder.isPaid;
  const investorPaid = investor.active && !!investor.plan && investor.plan.id !== "pilot";
  if (founderPaid && !investorPaid) return "founder";
  if (investorPaid && !founderPaid) return "investor";
  return null;
}
