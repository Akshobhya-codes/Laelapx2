import { stackServerApp } from "@/stack";
import {
  getFounderEntitlement,
  getInvestorEntitlement,
} from "@/lib/billing/entitlements";
import {
  getTeamByOwner,
  listTeamMembers,
  listReviewOrdersForUser,
} from "@/lib/insforge/billing";
import { listSubmissionsByOwner } from "@/lib/insforge/submissions";
import { isStripeConfigured } from "@/lib/billing/stripe";
import { BillingPage } from "./billing-client";

export const metadata = { title: "Billing · Laelapx" };
export const dynamic = "force-dynamic";

export default async function Billing({
  searchParams,
}: {
  searchParams: Promise<{
    side?: string;
    checkout?: string;
    review?: string;
    notice?: string;
  }>;
}) {
  const user = await stackServerApp.getUser({ or: "redirect" });
  const sp = await searchParams;
  const role = (user.clientReadOnlyMetadata as { role?: string } | null)?.role;
  const side: "founder" | "investor" =
    sp.side === "investor" || sp.side === "founder"
      ? sp.side
      : role === "investor"
      ? "investor"
      : "founder";

  const [founder, investor, submissions, orders] = await Promise.all([
    getFounderEntitlement(user.id),
    getInvestorEntitlement({ userId: user.id, email: user.primaryEmail }),
    listSubmissionsByOwner(user.id),
    listReviewOrdersForUser(user.id),
  ]);

  // Team panel only for owners on a team-enabled plan.
  let team: { id: string; name: string; members: Awaited<ReturnType<typeof listTeamMembers>> } | null = null;
  if (investor.active && !investor.isTeamMember && investor.plan?.features.teamAccess) {
    const t = await getTeamByOwner(user.id);
    if (t) team = { id: t.id, name: t.name, members: await listTeamMembers(t.id) };
    else team = { id: "", name: "", members: [] };
  }

  const subNames = new Map(submissions.map((s) => [s.id, s.data.companyName]));

  return (
    <BillingPage
      side={side}
      displayName={user.displayName}
      profileImageUrl={user.profileImageUrl}
      email={user.primaryEmail}
      paymentsReady={isStripeConfigured()}
      notice={{
        checkout: sp.checkout ?? null,
        review: sp.review ?? null,
        notice: sp.notice ?? null,
      }}
      founder={{
        planId: founder.plan.id,
        planName: founder.plan.name,
        isPaid: founder.isPaid,
        status: founder.subscription?.status ?? null,
        cadence: founder.subscription?.cadence ?? null,
        renewsAt: founder.subscription?.currentPeriodEnd ?? null,
        cancelAtPeriodEnd: founder.subscription?.cancelAtPeriodEnd ?? false,
        hasStripeSub: !!founder.subscription?.stripeSubscriptionId,
        features: founder.plan.features,
      }}
      investor={{
        planId: investor.plan?.id ?? null,
        planName: investor.plan?.name ?? null,
        active: investor.active,
        status: investor.subscription?.status ?? null,
        renewsAt: investor.periodEndsAt,
        cancelAtPeriodEnd: investor.subscription?.cancelAtPeriodEnd ?? false,
        hasStripeSub: !!investor.subscription?.stripeSubscriptionId,
        isTeamMember: investor.isTeamMember,
        teamName: investor.teamName,
        seats: investor.seats,
        quota: investor.quota,
        pilotExhausted: investor.pilotExhausted,
        teamAccess: investor.plan?.features.teamAccess ?? false,
      }}
      team={team}
      submissions={submissions.map((s) => ({
        slug: s.slug,
        name: s.data.companyName,
        hasDeck: !!s.data.pitchDeckUrl,
      }))}
      reviewOrders={orders.map((o) => ({
        id: o.id,
        status: o.status,
        companyName: o.submissionId ? subNames.get(o.submissionId) ?? null : null,
        wantsCall: o.wantsCall,
        createdAt: o.createdAt,
        deliveredAt: o.deliveredAt,
        memoUrl: o.memoUrl,
        memoText: o.memoText,
      }))}
    />
  );
}
