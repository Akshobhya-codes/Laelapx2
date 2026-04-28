import { stackServerApp } from "@/stack";
import { getInvestorByOwner, thesisFitScore } from "@/lib/insforge/investors";
import { listAllSubmissions } from "@/lib/insforge/submissions";
import { FunderHome } from "./funder-home";

export const metadata = { title: "Investor workspace · Laelapx" };
export const dynamic = "force-dynamic";

export default async function FunderHomePage() {
  const user = await stackServerApp.getUser({ or: "redirect" });

  const [thesis, allSubs] = await Promise.all([
    getInvestorByOwner(user.id),
    listAllSubmissions({ limit: 200 }),
  ]);

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

  if (thesis) {
    const ranked = allSubs
      .map((s) => ({
        s,
        fit: thesisFitScore(thesis.data, s).score,
      }))
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
      }}
      topMatches={topMatches}
    />
  );
}
