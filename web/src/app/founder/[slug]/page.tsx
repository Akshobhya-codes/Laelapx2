import { Suspense } from "react";
import { notFound } from "next/navigation";
import { stackServerApp } from "@/stack";
import {
  DashboardShell,
  ScoreSection,
  MatchesSection,
  GapsSection,
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
import { LockedSection } from "@/components/billing/locked-section";
import { VisibilityCard } from "@/components/billing/visibility-card";
import { buildSnapshotLlm } from "@/lib/scoring/snapshot-llm";
import { buildSnapshot } from "@/lib/scoring/rubric";
import { matchInvestorsFromInsforge } from "@/lib/insforge/investors";
import { enrichSnapshotCached } from "@/lib/scoring/llm-narrative";
import { getSubmissionBySlug } from "@/lib/insforge/submissions";
import { getFounderEntitlement } from "@/lib/billing/entitlements";
import { investorVisibility } from "@/lib/billing/visibility";
import { FOUNDER_PLANS } from "@/lib/billing/plans";
import { DeckReviewPanel, IterationPanel } from "@/components/billing/deck-review-panel";
import {
  listDeckReviews,
  countDeckReviewsLast30Days,
  listScoreHistory,
  recordScoreHistory,
} from "@/lib/insforge/founder-tools";
import { DECK_REVIEWS_PER_MONTH } from "@/lib/scoring/deck-review";
import { historyPointFor } from "@/lib/scoring/snapshot-llm";

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
  const ent = await getFounderEntitlement(user.id);
  const f = ent.plan.features;

  /* ─── What the plan buys ─────────────────────────────────────────────
   * Free:     deterministic rubric score + rubric gaps. No LLM calls at all,
   *           so a free dashboard costs nothing to serve.
   * Founder+: the LLM-scored stage-specific report, AI narrative,
   *           prioritized gaps, and investor-fit matches.
   * Laelapx+: + market signals and external fund research.
   * The score itself is the same rubric for everyone — paying changes how
   * deep the explanation goes, not the number.
   */
  const [snapshot, matches] = await Promise.all([
    f.fullReport ? buildSnapshotLlm(stored) : Promise.resolve(buildSnapshot(data)),
    f.investorFit
      ? matchInvestorsFromInsforge(stored, { excludeOwnerUserId: user.id, top: 6 })
      : Promise.resolve([]),
  ]);
  const enrichmentPromise = f.fullReport ? enrichSnapshotCached(stored, snapshot) : null;
  const visibility = investorVisibility(
    { ...stored, scoredSnapshot: snapshot, scoredForUpdatedAt: stored.updatedAt },
    ent.plan
  );

  const plus = FOUNDER_PLANS.founder_plus.name;
  const top = FOUNDER_PLANS.laelapx_plus.name;

  // Laelapx+: deep deck review + iteration feedback.
  let deck: { reviews: Awaited<ReturnType<typeof listDeckReviews>>; remaining: number } | null = null;
  let history: Awaited<ReturnType<typeof listScoreHistory>> = [];
  if (f.deepDeckReview) {
    const [reviews, used, hist] = await Promise.all([
      listDeckReviews(stored.id),
      countDeckReviewsLast30Days(user.id),
      listScoreHistory(stored.id),
    ]);
    deck = { reviews, remaining: Math.max(0, DECK_REVIEWS_PER_MONTH - used) };
    history = hist;
    // Backfill this revision if it was scored before history existed.
    const recorded = hist.some((h) => new Date(h.submissionUpdatedAt).getTime() === new Date(stored.updatedAt).getTime());
    if (!recorded && snapshot.sections?.length) {
      const point = historyPointFor(stored, snapshot);
      await recordScoreHistory(point);
      history = [
        ...hist,
        { submissionUpdatedAt: point.submissionUpdatedAt, composite: point.composite, rating: point.rating, sections: point.sections, createdAt: new Date().toISOString() },
      ];
    }
  }

  return (
    <DashboardShell
      data={data}
      snapshot={snapshot}
      displayName={user.displayName}
      profileImageUrl={user.profileImageUrl}
      planBadge={{ name: ent.plan.name, tone: ent.isPaid ? "paid" : "neutral" }}
    >
      {enrichmentPromise ? (
        <Suspense fallback={<NarrativeSkeleton />}>
          <NarrativeBlock promise={enrichmentPromise} />
        </Suspense>
      ) : null}

      <ScoreSection snapshot={snapshot} />

      {enrichmentPromise ? (
        <Suspense fallback={<GapsSkeleton />}>
          <GapsBlock promise={enrichmentPromise} fallbackGaps={snapshot.gaps} />
        </Suspense>
      ) : (
        <>
          <GapsSection gaps={snapshot.gaps} />
          <LockedSection
            eyebrow="Full fundability report"
            title="See the whole picture, section by section."
            blurb="The full report scores every section of your submission against a stage-specific rubric, explains the composite in plain English, and ranks the fixes by how much each one moves the needle."
            planName={plus}
            bullets={[
              "Stage-specific rubric (pre-seed, seed, Series A, B+)",
              "AI narrative explaining your score",
              "Prioritized fixes with concrete next steps",
            ]}
          />
        </>
      )}

      {f.researchTools ? (
        <Suspense fallback={<MarketSignalsSkeleton />}>
          <MarketSignalsBlock submission={stored} />
        </Suspense>
      ) : (
        <LockedSection
          eyebrow="Market signals"
          title="What's moving in your market this month."
          blurb="Funding rounds, launches, and exits in your sector and stage, pulled from the web and matched to your submission."
          planName={top}
          compact
        />
      )}

      {f.investorFit ? (
        <MatchesSection matches={matches} />
      ) : (
        <LockedSection
          eyebrow="Investor-fit analysis"
          title="Which investors on Laelapx already fit."
          blurb="Every investor thesis on the platform, scored against your stage, sector, round size, and traction — with the reasons for each match."
          planName={plus}
          bullets={["Fit score per investor", "Why they match (or don't)", "Eligible for investor visibility, with your consent"]}
        />
      )}

      <VisibilityCard
        visible={visibility.visible}
        blockers={visibility.blockers}
        completeness={visibility.completeness}
        fundability={visibility.fundability}
        editHref={`/founder/${stored.slug}/edit`}
        isPaid={ent.isPaid}
      />

      {deck ? (
        <>
          <DeckReviewPanel
            slug={stored.slug}
            hasDeck={!!data.pitchDeckUrl}
            remaining={deck.remaining}
            perMonth={DECK_REVIEWS_PER_MONTH}
            reviews={deck.reviews.map((r) => ({
              id: r.id,
              status: r.status,
              deckScore: r.deckScore,
              review: r.review,
              error: r.error,
              createdAt: r.createdAt,
            }))}
          />
          <IterationPanel
            history={history.map((h) => ({ at: h.submissionUpdatedAt, composite: h.composite, sections: h.sections }))}
          />
        </>
      ) : (
        <LockedSection
          eyebrow="Deep deck review + iteration feedback"
          title="Your deck read slide by slide, and every revision tracked."
          blurb="We read the actual PDF the way an investor would, score how ready it is, and name the fixes. Each time you revise, you see what improved — on the deck and on your fundability score."
          planName={top}
          bullets={["Slide-by-slide verdicts", "Top fixes, ranked", "Score history across revisions", "Ongoing async support from the team"]}
        />
      )}

      {f.researchTools ? (
        <Suspense fallback={<ExternalFundsSkeleton />}>
          <ExternalFundsBlock submission={stored} />
        </Suspense>
      ) : (
        <LockedSection
          eyebrow="External fund research"
          title="VCs beyond Laelapx whose public thesis matches yours."
          blurb="We search the web for funds writing checks at your stage in your sector, read their published criteria, and rank them against your submission."
          planName={top}
          compact
        />
      )}

      <Suspense fallback={<AudienceSkeleton />}>
        <Audience submission={stored} />
      </Suspense>
    </DashboardShell>
  );
}
