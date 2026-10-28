import { notFound } from "next/navigation";
import { stackServerApp } from "@/stack";
import { isAdminEmail } from "@/lib/billing/admin";
import {
  listAllReviewOrders,
  listAllSubscriptions,
  listAllPilotFeedback,
} from "@/lib/insforge/billing";
import { listProfilesByUserIds } from "@/lib/insforge/profiles";
import { listAllSubmissions } from "@/lib/insforge/submissions";
import { getPlan } from "@/lib/billing/plans";
import { isSubscriptionActive } from "@/lib/billing/entitlements";
import { AdminPage } from "./admin-client";

export const metadata = { title: "Admin · Laelapx" };
export const dynamic = "force-dynamic";

export default async function Admin() {
  const user = await stackServerApp.getUser({ or: "redirect" });
  // 404 rather than 403: non-admins shouldn't learn the route exists.
  if (!isAdminEmail(user.primaryEmail)) notFound();

  const [orders, subs, feedback, submissions] = await Promise.all([
    listAllReviewOrders(),
    listAllSubscriptions(),
    listAllPilotFeedback(),
    listAllSubmissions({ limit: 500 }),
  ]);

  const userIds = Array.from(
    new Set([
      ...orders.map((o) => o.userId),
      ...subs.map((s) => s.userId),
      ...feedback.map((f) => f.investorUserId),
    ])
  );
  const profiles = await listProfilesByUserIds(userIds);
  const who = (id: string) => {
    const p = profiles.get(id);
    return { name: p?.displayName ?? id.slice(0, 8), email: p?.email ?? null };
  };
  const subById = new Map(submissions.map((s) => [s.id, s]));

  // MRR: monthly price, annual/12. Pilots and inactive rows contribute 0.
  let mrrCents = 0;
  const activeBySide = { founder: 0, investor: 0 };
  for (const s of subs) {
    if (!isSubscriptionActive(s)) continue;
    const plan = getPlan(s.side, s.plan);
    if (!plan) continue;
    activeBySide[s.side]++;
    if (s.cadence === "annual" && plan.price.annual) mrrCents += plan.price.annual / 12;
    else if (plan.price.monthly) mrrCents += plan.price.monthly;
  }

  return (
    <AdminPage
      adminName={user.displayName}
      stats={{
        mrrCents: Math.round(mrrCents),
        activeFounders: activeBySide.founder,
        activeInvestors: activeBySide.investor,
        openReviews: orders.filter((o) => o.status === "paid" || o.status === "in_progress").length,
      }}
      orders={orders.map((o) => {
        const sub = o.submissionId ? subById.get(o.submissionId) : null;
        return {
          id: o.id,
          status: o.status,
          founder: who(o.userId),
          companyName: sub?.data.companyName ?? null,
          slug: sub?.slug ?? null,
          deckUrl: o.deckUrl ?? sub?.data.pitchDeckUrl ?? null,
          wantsCall: o.wantsCall,
          notes: o.founderNotes,
          memoUrl: o.memoUrl,
          memoText: o.memoText,
          createdAt: o.createdAt,
          deliveredAt: o.deliveredAt,
        };
      })}
      subscribers={subs.map((s) => ({
        id: s.id,
        user: who(s.userId),
        side: s.side,
        plan: getPlan(s.side, s.plan)?.name ?? s.plan,
        status: s.status,
        active: isSubscriptionActive(s),
        cadence: s.cadence,
        renewsAt: s.trialEnd ?? s.currentPeriodEnd,
        seats: s.seats,
        updatedAt: s.updatedAt,
      }))}
      feedback={feedback.map((f) => ({
        id: f.id,
        investor: who(f.investorUserId),
        companyName: subById.get(f.submissionId)?.data.companyName ?? "—",
        useful: f.useful,
        note: f.note,
        createdAt: f.createdAt,
      }))}
    />
  );
}
