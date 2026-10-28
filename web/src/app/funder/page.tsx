import { stackServerApp } from "@/stack";
import { getInvestorByOwner, thesisFitScore } from "@/lib/insforge/investors";
import {
  listSavedForInvestor,
  listConnectsForInvestor,
} from "@/lib/insforge/audience";
import { getInvestorEntitlement } from "@/lib/billing/entitlements";
import { listInvestorVisibleSubmissions } from "@/lib/billing/discovery";
import { applyCriteria } from "@/lib/billing/criteria";
import { getCustomCriteria, EMPTY_CRITERIA } from "@/lib/insforge/investor-workspace";
import { FunderHome } from "./funder-home";

export const metadata = { title: "Investor workspace · Laelapx" };
export const dynamic = "force-dynamic";

export default async function FunderHomePage() {
  const user = await stackServerApp.getUser({ or: "redirect" });

  const [thesis, ent, saved, connects] = await Promise.all([
    getInvestorByOwner(user.id),
    getInvestorEntitlement({ userId: user.id, email: user.primaryEmail }),
    listSavedForInvestor(user.id),
    listConnectsForInvestor(user.id),
  ]);

  // Only investor-visible founders count — the same set Discover shows,
  // after the priority window and any custom criteria.
  const f = ent.active ? ent.plan?.features : undefined;
  let allSubs: Awaited<ReturnType<typeof listInvestorVisibleSubmissions>>["submissions"] = [];
  if (ent.active) {
    const [visible, criteria] = await Promise.all([
      listInvestorVisibleSubmissions({ limit: 200, priority: !!f?.priorityReview }),
      f?.customCriteria ? getCustomCriteria(ent.accountUserId) : Promise.resolve(EMPTY_CRITERIA),
    ]);
    allSubs = applyCriteria(visible.submissions, criteria).kept;
  }

  let topMatches: {
    slug: string;
    name: string;
    oneLiner: string;
    fit: number;
    stage: string;
    raisingUsd: number;
    roundType: string;
  }[] = [];
  let strongFitCount = 0;

  if (thesis && ent.active) {
    const ranked = allSubs
      .filter((s) => s.ownerUserId !== user.id)
      .map((s) => ({ s, fit: thesisFitScore(thesis.data, s).score }))
      .sort((a, b) => b.fit - a.fit);
    strongFitCount = ranked.filter((r) => r.fit >= 65).length;
    topMatches = ranked.slice(0, 4).map(({ s, fit }) => ({
      slug: s.slug,
      name: s.data.companyName,
      oneLiner: s.data.oneLiner,
      fit,
      stage: s.data.stage,
      raisingUsd: s.data.raisingUsd,
      roundType: s.data.roundType,
    }));
  }

  return (
    <FunderHome
      displayName={user.displayName}
      profileImageUrl={user.profileImageUrl}
      thesis={
        thesis
          ? {
              fundName: thesis.data.fundName,
              partnerName: thesis.data.partnerName,
              thesisOneLiner: thesis.data.thesisOneLiner,
              stages: thesis.data.stages,
              sectors: thesis.data.sectors,
            }
          : null
      }
      stats={{
        totalLive: allSubs.length,
        strongFit: strongFitCount,
        savedCount: saved.length,
        connectCount: connects.length,
      }}
      topMatches={topMatches}
      access={{
        active: ent.active,
        planId: ent.plan?.id ?? null,
        planName: ent.plan?.name ?? null,
        pilotExhausted: ent.pilotExhausted,
        expired: !ent.active && !!ent.subscription,
        isTeamMember: ent.isTeamMember,
        teamName: ent.teamName,
        quota: ent.quota,
        periodEndsAt: ent.periodEndsAt,
      }}
    />
  );
}
