import type { Framework, FrameworkStage } from "./types";
import { PRE_SEED_FRAMEWORK } from "./pre-seed";
import { SEED_FRAMEWORK } from "./seed";
import { SERIES_A_FRAMEWORK } from "./series-a";
import { SERIES_B_PLUS_FRAMEWORK } from "./series-b-plus";

export type { Framework, Section, SubCriterion, FrameworkStage } from "./types";
export {
  PRE_SEED_FRAMEWORK,
  SEED_FRAMEWORK,
  SERIES_A_FRAMEWORK,
  SERIES_B_PLUS_FRAMEWORK,
};

const REGISTRY: Record<FrameworkStage, Framework> = {
  "Pre-Seed": PRE_SEED_FRAMEWORK,
  Seed: SEED_FRAMEWORK,
  "Series A": SERIES_A_FRAMEWORK,
  "Series B+": SERIES_B_PLUS_FRAMEWORK,
};

/**
 * Return the framework for a given stage. While later-stage rubrics are
 * being authored, their `sections` will be empty — in that case we fall
 * back to PRE_SEED_FRAMEWORK so the dashboard always has something to
 * render. The returned framework's `stage` field reflects the fallback
 * so the UI knows what was actually used.
 */
export function getFrameworkForStage(stage: FrameworkStage): Framework {
  const f = REGISTRY[stage];
  if (f.sections.length === 0) {
    return PRE_SEED_FRAMEWORK;
  }
  return f;
}

/**
 * Validate that section weights sum to ~1.0. Throws if any framework is
 * mis-weighted. Call this in tests or at startup. Off by default to avoid
 * crashing the prod dashboard on a typo in a draft rubric.
 */
export function assertFrameworkWeightsValid(f: Framework): void {
  if (f.sections.length === 0) return; // pending stub
  const sum = f.sections.reduce((a, s) => a + s.weight, 0);
  if (Math.abs(sum - 1.0) > 0.01) {
    throw new Error(
      `Framework "${f.stage}" section weights sum to ${sum.toFixed(4)}, expected 1.0`
    );
  }
}
