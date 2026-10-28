import { stackServerApp } from "@/stack";
import {
  getInvestorByOwner,
  thesisFitScore,
} from "@/lib/insforge/investors";
import { getInvestorEngagementMap } from "@/lib/insforge/audience";
import { buildSnapshot } from "@/lib/scoring/rubric";
import { getInvestorEntitlement } from "@/lib/billing/entitlements";
import { listInvestorVisibleSubmissions } from "@/lib/billing/discovery";
import { applyCriteria } from "@/lib/billing/criteria";
import { listUnlockedSubmissionIds } from "@/lib/insforge/billing";
import { getCustomCriteria, hasAnyCriteria, EMPTY_CRITERIA } from "@/lib/insforge/investor-workspace";
import { Discover, type DiscoverAccess } from "./discover";

export const metadata = { title: "Discover startups · Laelapx" };
export const dynamic = "force-dynamic";

export default async function DiscoverPage({
  searchParams,
}: {
  searchParams: Promise<{ pilot?: string }>;
}) {
  const user = await stackServerApp.getUser({ or: "redirect" });
  const sp = await searchParams;

  const [thesis, ent] = await Promise.all([
    getInvestorByOwner(user.id),
    getInvestorEntitlement({ userId: user.id, email: user.primaryEmail }),
  ]);
  const f = ent.active ? ent.plan?.features : undefined;

  const baseAccess: DiscoverAccess = {
    active: ent.active,
    planId: ent.plan?.id ?? null,
    planName: ent.plan?.name ?? null,
    pilotExhausted: ent.pilotExhausted,
    expired: !ent.active && !!ent.subscription,
    isTeamMember: ent.isTeamMember,
    teamName: ent.teamName,
    quota: ent.quota,
    justStartedPilot: sp.pilot === "started",
    filters: !!f?.filters,
    criteriaHidden: 0,
    hasCriteria: false,
    heldBack: 0,
    priority: !!f?.priorityReview,
  };

  // No plan → the page explains how to get one; nothing is fetched or
  // surfaced. Discovery is the product investors pay for.
  if (!ent.active) {
    return (
      <Discover
        displayName={user.displayName}
        profileImageUrl={user.profileImageUrl}
        thesis={thesis ? { fundName: thesis.data.fundName } : null}
        cards={[]}
        access={baseAccess}
      />
    );
  }

  const [visible, engagement, unlocked, criteria] = await Promise.all([
    listInvestorVisibleSubmissions({ limit: 200, priority: !!f?.priorityReview }),
    getInvestorEngagementMap(user.id),
    listUnlockedSubmissionIds(ent.accountUserId),
    f?.customCriteria ? getCustomCriteria(ent.accountUserId) : Promise.resolve(EMPTY_CRITERIA),
  ]);

  const mine = visible.submissions.filter((s) => s.ownerUserId !== user.id);
  const { kept, hidden } = applyCriteria(mine, criteria);

  const cards = kept.map((s) => {
    const snap = s.scoredSnapshot ?? buildSnapshot(s.data);
    const fit = thesis ? thesisFitScore(thesis.data, s) : { score: 0, reasons: [] };
    const eng = engagement.get(s.id);
    return {
      slug: s.slug,
      name: s.data.companyName,
      oneLiner: s.data.oneLiner,
      stage: s.data.stage,
      sectors: s.data.sectors.slice(0, 4),
      hq: `${s.data.hqCity}, ${s.data.hqCountry}`,
      score: snap.composite,
      fit: fit.score,
      fitReasons: fit.reasons,
      raisingUsd: s.data.raisingUsd,
      roundType: s.data.roundType,
      productStage: s.data.productStage,
      launched: s.data.launched,
      isSaved: !!eng?.isSaved,
      connectStatus: eng?.connectStatus ?? null,
      conversationId: eng?.conversationId ?? null,
      unlocked: unlocked.has(s.id),
      priorityNew: visible.priorityIds.has(s.id),
    };
  });

  // Priority-window founders first for accounts that have it, then by
  // thesis fit (or composite score when there's no thesis).
  cards.sort(
    (a, b) =>
      Number(b.priorityNew) - Number(a.priorityNew) ||
      (thesis ? b.fit - a.fit : b.score - a.score)
  );

  return (
    <Discover
      displayName={user.displayName}
      profileImageUrl={user.profileImageUrl}
      thesis={thesis ? { fundName: thesis.data.fundName } : null}
      cards={cards}
      access={{
        ...baseAccess,
        criteriaHidden: hidden,
        hasCriteria: hasAnyCriteria(criteria),
        heldBack: visible.heldBack,
      }}
    />
  );
}
