/**
 * Stage-specific evaluation frameworks. Each framework defines weighted
 * sections; each section defines sub-criteria with a 1-5 rubric, red flags,
 * green flags, and an exemplar.
 *
 * Philosophy (user's words): "Judge the mind, not the metrics. Insight,
 * founder conviction, and problem quality dominate. Product may not exist."
 *
 * Final score = Σ(section_score × weight%) where
 *   section_score = avg(sub_criterion_scores) × 5  (sub-criteria are 1-5,
 *   scaled to 100 at the section level).
 */

export type FrameworkStage = "Pre-Seed" | "Seed" | "Series A" | "Series B+";

export type ScoringRubric = {
  /** 1 = worst, 5 = best. Each entry describes what that score looks like. */
  "1": string;
  "2": string;
  "3": string;
  "4": string;
  "5": string;
};

export type SubCriterion = {
  /** Short identifier — used as the score key. e.g. "pain_specificity". */
  id: string;
  /** Display name. e.g. "Pain Specificity". */
  name: string;
  /** One-paragraph explanation of what this measures and why. */
  description: string;
  /** The 1-5 scoring guide. */
  rubric: ScoringRubric;
};

export type Section = {
  /** Short identifier — e.g. "problem". */
  id: string;
  /** Display name — e.g. "Problem". */
  name: string;
  /** Weight as a fraction of 1.0. All section weights must sum to ~1.0. */
  weight: number;
  /** What this section evaluates, in one paragraph. */
  description: string;
  /** Sub-criteria. Section score = avg(sub_criterion 1-5 scores) × 5 → /100. */
  subCriteria: SubCriterion[];
  /** Patterns that signal a weak submission for this section. */
  redFlags: string[];
  /** Patterns that signal a strong submission for this section. */
  greenFlags: string[];
  /** A concrete real-company exemplar of what a strong answer looks like. */
  example: string;
  /** Fields the LLM should pull from the submission to score this section. */
  dataInputs: string[];
  /** Special instructions for the LLM scoring this section. */
  aiNotes: string;
};

export type Framework = {
  stage: FrameworkStage;
  /** Top-line statement of how this stage is judged. */
  philosophy: string;
  sections: Section[];
};
