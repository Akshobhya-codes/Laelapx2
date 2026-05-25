import { Suspense } from "react";
import { notFound } from "next/navigation";
import { stackServerApp } from "@/stack";
import {
  DashboardShell,
  ScoreSection,
  MatchesSection,
} from "@/components/dashboard/dashboard";
import {
  NarrativeBlock,
  GapsBlock,
  NarrativeSkeleton,
  GapsSkeleton,
} from "@/components/dashboard/enriched";
import { Audience } from "@/components/dashboard/audience";
import { AudienceSkeleton } from "@/components/dashboard/audience-skeleton";
import { ExternalFundsBlock } from "@/components/dashboard/external-funds-block";
import { ExternalFundsSkeleton } from "@/components/dashboard/external-funds-section";
import { MarketSignalsBlock } from "@/components/dashboard/market-signals-block";
import { MarketSignalsSkeleton } from "@/components/dashboard/market-signals-section";
import { buildSnapshotLlm } from "@/lib/scoring/snapshot-llm";
import { matchInvestorsFromInsforge } from "@/lib/insforge/investors";
import { enrichSnapshot } from "@/lib/scoring/llm-narrative";
import { getSubmissionBySlug } from "@/lib/insforge/submissions";

type Params = { slug: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug } = await params;
  const stored = await getSubmissionBySlug(slug);
  return {
    title: stored
      ? `${stored.data.companyName} · Laelapx`
      : "Not found · Laelapx",
  };
}

export const dynamic = "force-dynamic";

export default async function CompanyHubPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const user = await stackServerApp.getUser({ or: "redirect" });
  const { slug } = await params;
  const stored = await getSubmissionBySlug(slug);
  if (!stored) notFound();

  // Authorization: only the owner can see their dashboard.
  // (Public pitch view lives at /s/[slug] for the gated investor side.)
  if (stored.ownerUserId !== user.id) notFound();

  const data = stored.data;
  // LLM-driven, stage-specific Fundability score. Cached per
  // (submissionId, updatedAt) so only the first load after an edit pays
  // the latency; subsequent loads are instant.
  const [snapshot, matches] = await Promise.all([
    buildSnapshotLlm(stored),
    matchInvestorsFromInsforge(stored, {
      excludeOwnerUserId: user.id,
      top: 6,
    }),
  ]);
  const enrichmentPromise = enrichSnapshot(data, snapshot);

  return (
    <DashboardShell
      data={data}
      snapshot={snapshot}
      displayName={user.displayName}
      profileImageUrl={user.profileImageUrl}
    >
      <Suspense fallback={<NarrativeSkeleton />}>
        <NarrativeBlock promise={enrichmentPromise} />
      </Suspense>

      <ScoreSection snapshot={snapshot} />

      <Suspense fallback={<GapsSkeleton />}>
        <GapsBlock
          promise={enrichmentPromise}
          fallbackGaps={snapshot.gaps}
        />
      </Suspense>

      <Suspense fallback={<MarketSignalsSkeleton />}>
        <MarketSignalsBlock submission={stored} />
      </Suspense>

      <MatchesSection matches={matches} />

      <Suspense fallback={<ExternalFundsSkeleton />}>
        <ExternalFundsBlock submission={stored} />
      </Suspense>

      <Suspense fallback={<AudienceSkeleton />}>
        <Audience submission={stored} />
      </Suspense>
    </DashboardShell>
  );
}
