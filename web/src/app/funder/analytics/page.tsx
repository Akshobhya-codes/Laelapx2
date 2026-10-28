import { loadInvestorPage, listAccountPeople } from "@/lib/billing/investor-page";
import {
  listUnlocks,
  listPipelineEntries,
  listMeetings,
  listConnectsByInvestors,
} from "@/lib/insforge/investor-workspace";
import { getSubmissionsByIds, listAllSubmissions } from "@/lib/insforge/submissions";
import { weeklyCounts, quarterlyInsights } from "@/lib/billing/analytics";
import { PIPELINE_STAGES } from "@/lib/billing/pipeline";
import { AnalyticsView } from "./analytics-client";

export const metadata = { title: "Analytics · Laelapx" };
export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  const { user, ent, planBadge } = await loadInvestorPage();
  const f = ent.active ? ent.plan?.features : undefined;

  if (!f?.analytics) {
    return (
      <AnalyticsView
        displayName={user.displayName}
        profileImageUrl={user.profileImageUrl}
        planBadge={planBadge}
        locked
        data={null}
      />
    );
  }

  const acct = ent.accountUserId;
  const people = await listAccountPeople(acct);
  const ids = people.map((p) => p.userId);

  const [unlocks, entries, meetings, connects, all] = await Promise.all([
    listUnlocks(acct),
    listPipelineEntries(acct),
    listMeetings(acct),
    listConnectsByInvestors(ids),
    listAllSubmissions({ limit: 500 }),
  ]);

  const openedIds = Array.from(new Set(unlocks.map((u) => u.submissionId)));
  const opened = await getSubmissionsByIds(openedIds);

  // Funnel: each step counts unique companies.
  const worked = new Set(Array.from(entries.values()).filter((e) => e.stage).map((e) => e.submissionId));
  const met = new Set(meetings.map((m) => m.submissionId));
  const advanced = new Set(Array.from(entries.values()).filter((e) => e.decision === "advance").map((e) => e.submissionId));
  const connected = new Set(connects.filter((c) => c.status === "accepted").map((c) => c.submissionId));

  // Pipeline by stage, in board order.
  const stageCounts = new Map<string, number>(PIPELINE_STAGES.map((s) => [s, 0]));
  for (const e of entries.values()) if (e.stage && stageCounts.has(e.stage)) stageCounts.set(e.stage, stageCounts.get(e.stage)! + 1);

  // Deal-flow mix of what the team opened: top sectors, rest folded into Other.
  const sectorCounts = new Map<string, number>();
  for (const s of opened) for (const sec of s.data.sectors) sectorCounts.set(sec, (sectorCounts.get(sec) ?? 0) + 1);
  const sortedSectors = Array.from(sectorCounts.entries()).sort((a, b) => b[1] - a[1]);
  const topSectors = sortedSectors.slice(0, 6).map(([label, value]) => ({ label, value }));
  const otherCount = sortedSectors.slice(6).reduce((n, [, v]) => n + v, 0);
  if (otherCount > 0) topSectors.push({ label: "Other", value: otherCount });

  const team = people.map((p) => ({
    name: p.name,
    isOwner: p.isOwner,
    opened: unlocks.filter((u) => u.viewerUserId === p.userId).length,
    meetings: meetings.filter((m) => m.authorUserId === p.userId).length,
    connects: connects.filter((c) => c.investorUserId === p.userId).length,
    accepted: connects.filter((c) => c.investorUserId === p.userId && c.status === "accepted").length,
  }));

  const sent = connects.length;
  const accepted = connects.filter((c) => c.status === "accepted").length;
  const declined = connects.filter((c) => c.status === "declined").length;
  const decidedConnects = accepted + declined;

  return (
    <AnalyticsView
      displayName={user.displayName}
      profileImageUrl={user.profileImageUrl}
      planBadge={planBadge}
      locked={false}
      data={{
        teamName: ent.teamName,
        weekly: weeklyCounts(unlocks.map((u) => u.unlockedAt)),
        totals: {
          opened: openedIds.length,
          meetings: meetings.length,
          connectsSent: sent,
          acceptRate: decidedConnects > 0 ? Math.round((accepted / decidedConnects) * 100) : null,
          pending: connects.filter((c) => c.status === "pending").length,
        },
        funnel: [
          { label: "Opened", value: openedIds.length },
          { label: "On the pipeline", value: worked.size },
          { label: "Met", value: met.size },
          { label: "Advanced", value: advanced.size },
          { label: "Connected", value: connected.size },
        ],
        stages: Array.from(stageCounts.entries()).map(([label, value]) => ({ label, value })),
        sectors: topSectors,
        team,
        insights: quarterlyInsights(all),
      }}
    />
  );
}
