import { stackServerApp } from "@/stack";
import { listAllSubmissions } from "@/lib/insforge/submissions";
import {
  getInvestorByOwner,
  thesisFitScore,
} from "@/lib/insforge/investors";
import { getInvestorEngagementMap } from "@/lib/insforge/audience";
import { buildSnapshot } from "@/lib/scoring/rubric";
import { Discover } from "./discover";

export const metadata = { title: "Discover startups · Laelapx" };
export const dynamic = "force-dynamic";

export default async function DiscoverPage() {
  const user = await stackServerApp.getUser({ or: "redirect" });

  const [thesis, submissions, engagement] = await Promise.all([
    getInvestorByOwner(user.id),
    listAllSubmissions({ limit: 100 }),
    getInvestorEngagementMap(user.id),
  ]);

  const cards = submissions.map((s) => {
    const snap = buildSnapshot(s.data);
    const fit = thesis
      ? thesisFitScore(thesis.data, s)
      : { score: 0, reasons: [] };
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
    };
  });

  // Sort by thesis fit when a thesis exists, else by composite score.
  cards.sort((a, b) =>
    thesis ? b.fit - a.fit : b.score - a.score
  );

  return (
    <Discover
      displayName={user.displayName}
      profileImageUrl={user.profileImageUrl}
      thesis={thesis ? { fundName: thesis.data.fundName } : null}
      cards={cards}
    />
  );
}
