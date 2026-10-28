import type { StoredSubmission } from "@/lib/insforge/submissions";
import type { FounderPlan } from "./plans";
import { buildSnapshot } from "@/lib/scoring/rubric";

/**
 * When does a founder's startup show up in investor discovery?
 *
 * From the plan sheet: a paying founder is visible to investors only when
 *   1. the founder consents,
 *   2. the profile meets platform completeness,
 *   3. it meets the fundability / quality threshold,
 *   4. it meets the investor's own fit criteria (that's the matching itself).
 *
 * Free-tier founders are never surfaced ("No investor visibility"). Their
 * public page (/s/[slug]) still works — it's a link they share themselves.
 *
 * These are platform-side gates, and they do not change anyone's score.
 */

/** Completeness: fraction of the fields an investor expects to see. */
export function completenessScore(s: StoredSubmission): number {
  const d = s.data;
  const checks: boolean[] = [
    !!d.logoUrl,
    !!d.demoVideoUrl,
    !!d.pitchDeckUrl,
    d.founders.length > 0 && d.founders.every((f) => (f.oneLineBio?.length ?? 0) > 30),
    d.founders.some((f) => !!f.linkedinUrl),
    d.milestones.length >= 3,
    (d.advisors?.trim().length ?? 0) > 0,
    (d.raisedFromWhom?.trim().length ?? 0) > 0 || (d.raisedToDateUsd ?? 0) === 0,
    !!d.targetCloseDate,
    d.tamReasoning.trim().length >= 60,
    d.competitorsAndEdge.trim().length >= 100,
    d.useOfFunds.trim().length >= 60,
    d.icpDescription.trim().length >= 60,
  ];
  const met = checks.filter(Boolean).length;
  return met / checks.length;
}

/** Thresholds. Tunable in one place. */
export const VISIBILITY_THRESHOLDS = {
  /** Fraction of completeness checks that must pass. */
  completeness: 0.7,
  /** Minimum composite fundability score — "Borderline" and above. */
  fundability: 45,
};

export type VisibilityVerdict = {
  visible: boolean;
  /** Human-readable reasons it is NOT visible, for the founder dashboard. */
  blockers: string[];
  completeness: number;
  fundability: number;
};

export function investorVisibility(
  s: StoredSubmission,
  plan: FounderPlan
): VisibilityVerdict {
  const completeness = completenessScore(s);
  const fundability =
    s.scoredSnapshot?.composite ?? buildSnapshot(s.data).composite;
  const blockers: string[] = [];

  if (!plan.features.investorVisibility) {
    blockers.push("Investor visibility is part of Founder+ and Laelapx+.");
  }
  if (!s.data.openToInvestorContact) {
    blockers.push("You haven't opted in. Turn on \"Open to investor contact\" in your submission.");
  }
  if (completeness < VISIBILITY_THRESHOLDS.completeness) {
    blockers.push(
      `Profile is ${Math.round(completeness * 100)}% complete; ${Math.round(
        VISIBILITY_THRESHOLDS.completeness * 100
      )}% is the bar. Add the deck, demo, founder bios and LinkedIn, and at least three milestones.`
    );
  }
  if (fundability < VISIBILITY_THRESHOLDS.fundability) {
    blockers.push(
      `Fundability score is ${fundability}; ${VISIBILITY_THRESHOLDS.fundability} is the bar. Close the gaps below to cross it.`
    );
  }

  return { visible: blockers.length === 0, blockers, completeness, fundability };
}
