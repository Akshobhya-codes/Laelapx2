import "server-only";
import type { Snapshot, SubScore, Gap } from "./rubric";
import { buildSnapshot } from "./rubric";
import { scoreSubmissionWithLlm } from "./llm-scorer";
import type { ScoredSubmission, SectionScore, ScoredGap } from "./llm-scorer";
import {
  persistScoredSnapshot,
  type StoredSubmission,
} from "@/lib/insforge/submissions";

/**
 * Build a Fundability Snapshot using the LLM-driven, stage-specific rubric.
 *
 * Persistence (migration 0007): the score is stored on the submissions row
 * (`scored_snapshot` + `scored_for_updated_at`). We re-use that cached score
 * whenever it's still valid for the current submission revision. The score
 * is invalidated atomically in `updateSubmission` whenever the founder edits
 * the submission, so the next dashboard view triggers a fresh LLM call.
 *
 * Fails soft: if the LLM call errors, falls back to the deterministic
 * `buildSnapshot()` so the dashboard never crashes. We do NOT persist a
 * deterministic fallback — that way the next dashboard load will retry the
 * LLM call instead of forever serving a stale fallback.
 */
export async function buildSnapshotLlm(
  stored: StoredSubmission
): Promise<Snapshot> {
  // Cache hit: a previous score was computed for THIS revision of the
  // submission. Return it immediately, no LLM call.
  if (
    stored.scoredSnapshot &&
    stored.scoredForUpdatedAt === stored.updatedAt
  ) {
    return stored.scoredSnapshot;
  }

  // Cache miss: either no score has ever been computed, or the founder
  // edited the submission and the previous score is stale.
  try {
    const scored = await scoreSubmissionWithLlm(stored.data);
    const snapshot = scoredToSnapshot(scored);
    // Fire-and-forget persistence so we don't block the dashboard render on
    // the write. Worst case: a transient write failure → recompute next load.
    void persistScoredSnapshot(stored.id, snapshot, stored.updatedAt);
    return snapshot;
  } catch {
    return buildSnapshot(stored.data);
  }
}

/* ─── ADAPTER: ScoredSubmission → Snapshot ─────────────────────────────── */

/**
 * Section-ID → legacy 4-axis mapping. The legacy SubScore/Gap types are
 * still typed to {Market|Team|Traction|Financials}; we map the new rubric's
 * 8 sections onto those so the legacy fields remain valid for any UI that
 * hasn't migrated to the new shape yet.
 */
function legacyAxis(sectionId: string): SubScore["axis"] {
  switch (sectionId) {
    case "market":
    case "problem":
    case "solution":
    case "product":
      return "Market";
    case "team":
      return "Team";
    case "traction":
    case "gtm":
      return "Traction";
    case "ask":
      return "Financials";
    default:
      return "Market";
  }
}

function scoredToSnapshot(scored: ScoredSubmission): Snapshot {
  const subscores = deriveLegacySubscores(scored.sections);
  const gaps = deriveLegacyGaps(scored.topGaps);
  return {
    composite: scored.composite,
    rating: scored.rating,
    subscores,
    gaps,
    sections: scored.sections,
    topGaps: scored.topGaps,
    frameworkStage: scored.frameworkStage,
  };
}

function deriveLegacySubscores(sections: SectionScore[]): SubScore[] {
  const buckets: Record<SubScore["axis"], { score: number; weight: number }> = {
    Market: { score: 0, weight: 0 },
    Team: { score: 0, weight: 0 },
    Traction: { score: 0, weight: 0 },
    Financials: { score: 0, weight: 0 },
  };
  for (const sec of sections) {
    const axis = legacyAxis(sec.id);
    buckets[axis].score += sec.score * sec.weight;
    buckets[axis].weight += sec.weight;
  }
  return (Object.keys(buckets) as SubScore["axis"][]).map((axis) => {
    const b = buckets[axis];
    return {
      axis,
      score: b.weight > 0 ? Math.round(b.score / b.weight) : 0,
      weight: b.weight,
    };
  });
}

function deriveLegacyGaps(topGaps: ScoredGap[]): Gap[] {
  return topGaps.slice(0, 6).map((g) => ({
    axis: legacyAxis(g.sectionId),
    severity: g.severity,
    title: `${g.sectionName}: ${g.subCriterionName}`,
    why: g.why,
    closing: g.closing,
  }));
}
