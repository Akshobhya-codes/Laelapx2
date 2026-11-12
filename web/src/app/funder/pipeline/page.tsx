import { loadInvestorPage, listAccountPeople } from "@/lib/billing/investor-page";
import { listUnlockedSubmissionIds } from "@/lib/insforge/billing";
import { getSubmissionsByIds } from "@/lib/insforge/submissions";
import { getInvestorByOwner, thesisFitScore } from "@/lib/insforge/investors";
import { listPipelineEntries, listMeetings } from "@/lib/insforge/investor-workspace";
import { PipelineBoard, type PipelineCard } from "./pipeline-client";

export const metadata = { title: "Pipeline · Laelapx" };
export const dynamic = "force-dynamic";

export default async function PipelinePage() {
  const { user, ent, planBadge } = await loadInvestorPage();
  const f = ent.active ? ent.plan?.features : undefined;

  if (!f?.pipelineDashboard) {
    return (
      <PipelineBoard
        displayName={user.displayName}
        profileImageUrl={user.profileImageUrl}
        planBadge={planBadge}
        locked
        cards={[]}
        people={[]}
        can={{ move: false, assign: false, decide: false, meetings: false }}
        currentUserId={user.id}
        teamName={null}
      />
    );
  }

  // The pipeline is everything the account has opened — shared by the team.
  const unlockedIds = Array.from(await listUnlockedSubmissionIds(ent.accountUserId));
  const [subs, entries, meetings, people, thesis] = await Promise.all([
    getSubmissionsByIds(unlockedIds),
    listPipelineEntries(ent.accountUserId),
    f.meetingTracking ? listMeetings(ent.accountUserId) : Promise.resolve([]),
    listAccountPeople(ent.accountUserId),
    getInvestorByOwner(ent.accountUserId),
  ]);

  const meetingsBySub = new Map<string, { count: number; last: string | null }>();
  for (const m of meetings) {
    const cur = meetingsBySub.get(m.submissionId) ?? { count: 0, last: null };
    cur.count++;
    if (!cur.last || m.metOn > cur.last) cur.last = m.metOn;
    meetingsBySub.set(m.submissionId, cur);
  }
  const nameOf = new Map(people.map((p) => [p.userId, p.name]));

  const cards: PipelineCard[] = subs.map((s) => {
    const e = entries.get(s.id);
    const mt = meetingsBySub.get(s.id);
    return {
      slug: s.slug,
      name: s.data.companyName,
      oneLiner: s.data.oneLiner,
      stage: s.data.stage,
      raisingUsd: s.data.raisingUsd,
      fit: thesis ? thesisFitScore(thesis.data, s).score : null,
      pipelineStage: e?.stage ?? null,
      note: e?.body ? e.body.slice(0, 160) : null,
      assignedTo: e?.assignedToUserId ?? null,
      decision: e?.decision ?? null,
      decidedBy: e?.decidedByUserId ? nameOf.get(e.decidedByUserId) ?? "Teammate" : null,
      decidedAt: e?.decidedAt ?? null,
      meetings: mt?.count ?? 0,
      lastMeeting: mt?.last ?? null,
      updatedAt: e?.updatedAt ?? null,
    };
  });

  return (
    <PipelineBoard
      displayName={user.displayName}
      profileImageUrl={user.profileImageUrl}
      planBadge={planBadge}
      locked={false}
      cards={cards}
      people={people}
      can={{
        move: f.lightCrm,
        assign: f.partnerWorkflow && people.length > 1,
        decide: f.partnerWorkflow,
        meetings: f.meetingTracking,
      }}
      currentUserId={user.id}
      teamName={ent.teamName}
    />
  );
}
