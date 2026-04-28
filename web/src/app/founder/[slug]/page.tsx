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
import { buildSnapshot } from "@/lib/scoring/rubric";
import { matchInvestors } from "@/lib/investors/mock";
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
  const snapshot = buildSnapshot(data);
  const matches = matchInvestors(data, 6);
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

      <MatchesSection matches={matches} />

      <Suspense fallback={<AudienceSkeleton />}>
        <Audience submission={stored} />
      </Suspense>
    </DashboardShell>
  );
}
