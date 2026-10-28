import { stackServerApp } from "@/stack";
import { getFounderEntitlement } from "@/lib/billing/entitlements";
import { listUpcomingEvents, listRsvps } from "@/lib/insforge/founder-tools";
import { EventsView, type EventCard } from "./events-client";

export const metadata = { title: "Events · Laelapx" };
export const dynamic = "force-dynamic";

export default async function EventsPage() {
  const user = await stackServerApp.getUser({ or: "redirect" });
  const ent = await getFounderEntitlement(user.id);
  const f = ent.plan.features;

  const events = await listUpcomingEvents();
  const rsvps = await listRsvps(events.map((e) => e.id));

  const cards: EventCard[] = events.map((e) => {
    const going = (rsvps.get(e.id) ?? []).includes(user.id);
    const eligible = e.kind === "in_person" ? f.inPersonEvents : f.communityEvents;
    const count = rsvps.get(e.id)?.length ?? 0;
    return {
      id: e.id,
      title: e.title,
      description: e.description,
      kind: e.kind,
      startsAt: e.startsAt,
      durationMin: e.durationMin,
      location: e.location,
      // The join link is only sent to founders who are eligible AND going.
      joinUrl: going && eligible ? e.joinUrl : null,
      spotsLeft: e.capacity === null ? null : Math.max(0, e.capacity - count),
      going,
      eligible,
      requiredPlan: e.kind === "in_person" ? "Laelapx+" : "Founder+",
    };
  });

  return (
    <EventsView
      firstName={user.displayName?.split(" ")[0] || "you"}
      profileImageUrl={user.profileImageUrl}
      planBadge={{ name: ent.plan.name, tone: ent.isPaid ? "paid" : "neutral" }}
      events={cards}
      isPaid={ent.isPaid}
    />
  );
}
