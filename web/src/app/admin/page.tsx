import { notFound } from "next/navigation";
import { stackServerApp } from "@/stack";
import { isAdminEmail } from "@/lib/billing/admin";
import {
  listAllReviewOrders,
  listAllSubscriptions,
  listAllPilotFeedback,
} from "@/lib/insforge/billing";
import { listSupportInbox, listAllEvents, listRsvps } from "@/lib/insforge/founder-tools";
import { listProfilesByUserIds } from "@/lib/insforge/profiles";
import { listAllSubmissions } from "@/lib/insforge/submissions";
import { getPlan } from "@/lib/billing/plans";
import { isSubscriptionActive } from "@/lib/billing/entitlements";
import { AdminPage, type Tab } from "./admin-client";

export const metadata = { title: "Admin · Laelapx" };
export const dynamic = "force-dynamic";

const TABS: Tab[] = ["reviews", "support", "events", "subscribers", "pilot"];

/** Request-time clock read, kept out of the component body. */
const isPast = (iso: string) => new Date(iso).getTime() < Date.now();

export default async function Admin({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; thread?: string }>;
}) {
  const user = await stackServerApp.getUser({ or: "redirect" });
  // 404 rather than 403: non-admins shouldn't learn the route exists.
  if (!isAdminEmail(user.primaryEmail)) notFound();
  const sp = await searchParams;

  const [orders, subs, feedback, submissions, inbox, events] = await Promise.all([
    listAllReviewOrders(),
    listAllSubscriptions(),
    listAllPilotFeedback(),
    listAllSubmissions({ limit: 500 }),
    listSupportInbox(),
    listAllEvents(),
  ]);
  const rsvps = await listRsvps(events.map((e) => e.id));

  const userIds = Array.from(
    new Set([
      ...orders.map((o) => o.userId),
      ...subs.map((s) => s.userId),
      ...feedback.map((f) => f.investorUserId),
      ...inbox.map((t) => t.threadUserId),
      ...Array.from(rsvps.values()).flat(),
    ])
  );
  const profiles = await listProfilesByUserIds(userIds);
  const who = (id: string) => {
    const p = profiles.get(id);
    return { name: p?.displayName ?? id.slice(0, 8), email: p?.email ?? null };
  };
  const subById = new Map(submissions.map((s) => [s.id, s]));
  const founderPlanOf = (id: string) => {
    const s = subs.find((x) => x.userId === id && x.side === "founder");
    return s && isSubscriptionActive(s) ? getPlan("founder", s.plan)?.name ?? s.plan : "Free";
  };

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

  const initialTab: Tab = TABS.includes(sp.tab as Tab) ? (sp.tab as Tab) : "reviews";

  return (
    <AdminPage
      adminName={user.displayName}
      initialTab={initialTab}
      initialThread={sp.thread ?? null}
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
      support={inbox.map((t) => ({
        threadUserId: t.threadUserId,
        founder: who(t.threadUserId),
        plan: founderPlanOf(t.threadUserId),
        unread: t.unreadByTeam,
        lastAt: t.lastAt,
        messages: t.messages.map((m) => ({ id: m.id, fromTeam: m.fromTeam, body: m.body, createdAt: m.createdAt })),
      }))}
      events={events.map((e) => ({
        id: e.id,
        title: e.title,
        kind: e.kind,
        startsAt: e.startsAt,
        location: e.location,
        capacity: e.capacity,
        attendees: (rsvps.get(e.id) ?? []).map(who),
        past: isPast(e.startsAt),
      }))}
    />
  );
}
