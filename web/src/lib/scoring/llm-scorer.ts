import "server-only";
import type { Submission } from "@/lib/submission/schema";
import type { Framework, Section, FrameworkStage } from "./frameworks";
import { getFrameworkForStage } from "./frameworks";
import { completeJson } from "@/lib/ai/openai";

/* ─── OUTPUT TYPES ──────────────────────────────────────────────────────── */

export type SubCriterionScore = {
  id: string;
  name: string;
  rating: 1 | 2 | 3 | 4 | 5;
  reasoning: string;
  /** Empty string when the score is 4 or 5. */
  improvement: string;
};

export type SectionScore = {
  id: string;
  name: string;
  weight: number;
  /** 0–100, derived as avg(subCriteria.rating) × 5. */
  score: number;
  subCriteria: SubCriterionScore[];
};

export type ScoredGap = {
  sectionId: string;
  sectionName: string;
  subCriterionId: string;
  subCriterionName: string;
  severity: "high" | "medium" | "low";
  rating: 1 | 2 | 3 | 4 | 5;
  why: string;
  closing: string;
};

export type ScoredSubmission = {
  /** The framework stage actually used (may differ from the submission's
   *  stage if its framework is still a pending stub — we fall back to
   *  Pre-Seed). */
  frameworkStage: FrameworkStage;
  /** Composite 0–100. */
  composite: number;
  rating: "Below threshold" | "Borderline" | "Above average" | "Strong";
  sections: SectionScore[];
  /** Top gaps, sorted by severity (high → low) then by lowest rating. */
  topGaps: ScoredGap[];
};

/* ─── LLM PROMPT ────────────────────────────────────────────────────────── */

const SYSTEM = `You are a venture capital analyst evaluating a startup submission against a stage-specific rubric.

You will receive (1) a framework with weighted sections, each containing sub-criteria with explicit 1-5 scoring guides, red flags, green flags, an exemplar, and AI evaluation notes; and (2) the founder's submission as structured Q&A.

For every sub-criterion, return:
- rating: integer 1-5 chosen by mapping the submission to the rubric tier. Be strict: 5 is reserved for genuinely exceptional answers, 3 is "competent for stage." Default to lower scores when evidence is thin.
- reasoning: ONE sentence (max 180 chars) citing the specific submission text that drove the rating. Quote the founder's words when possible. No hype, no generalities.
- improvement: ONE sentence (max 180 chars) the founder should act on, ONLY if rating ≤ 3. Empty string otherwise.

Voice rules:
- Institutional, terse, evidence-based. No emojis. No "great" / "amazing" / "incredible."
- Match the brand: confident, anti-hype, honest intelligence.
- Reference specific numbers, names, sectors from the submission. Never generic advice.
- Apply each section's "aiNotes" guidance literally.

Output strict JSON with shape:
{ "sections": { "<section_id>": { "<sub_criterion_id>": { "rating": <1-5>, "reasoning": "...", "improvement": "..." } } } }`;

function serializeSubmission(s: Submission): string {
  const founders = s.founders
    .map(
      (f, i) =>
        `  Founder ${i + 1}: ${f.name} (${f.role})${
          f.oneLineBio ? ` — ${f.oneLineBio}` : ""
        }${f.linkedinUrl ? ` [LinkedIn: ${f.linkedinUrl}]` : ""}`
    )
    .join("\n");
  return [
    `## Basics`,
    `Company: ${s.companyName}`,
    `One-liner: ${s.oneLiner}`,
    `Website: ${s.websiteUrl || "(none)"}`,
    `HQ: ${s.hqCity}, ${s.hqCountry}`,
    `Founded: ${s.foundedYear}`,
    `Stage: ${s.stage}`,
    `Sectors: ${s.sectors.join(", ")}`,
    ``,
    `## Problem`,
    s.problemDescription,
    ``,
    `## Why now`,
    s.whyNow,
    ``,
    `## Solution`,
    s.solutionDescription,
    s.demoVideoUrl ? `Demo: ${s.demoVideoUrl}` : ``,
    ``,
    `## Market`,
    `ICP: ${s.icpDescription}`,
    `TAM: $${s.tamUsd.toLocaleString()} — ${s.tamReasoning}`,
    `Competition / edge: ${s.competitorsAndEdge}`,
    `Defensibility: ${s.defensibility}`,
    ``,
    `## Traction`,
    `Product stage: ${s.productStage}${s.launched ? " (launched)" : ""}`,
    `Customers: ${s.customerCount}`,
    s.mrrUsd !== undefined && s.mrrUsd !== null
      ? `MRR: $${s.mrrUsd.toLocaleString()}`
      : `MRR: not reported`,
    s.momGrowthPct !== undefined && s.momGrowthPct !== null
      ? `MoM growth: ${s.momGrowthPct}%`
      : `MoM growth: not reported`,
    `Milestones:`,
    ...s.milestones.map((m) => `  - ${m}`),
    ``,
    `## Team`,
    founders,
    `Team size: ${s.teamSize}`,
    `Why this team: ${s.whyThisTeam}`,
    s.advisors ? `Advisors: ${s.advisors}` : ``,
    ``,
    `## Ask`,
    `Raising: $${s.raisingUsd.toLocaleString()} (${s.roundType})`,
    s.raisedToDateUsd && s.raisedToDateUsd > 0
      ? `Raised to date: $${s.raisedToDateUsd.toLocaleString()}${
          s.raisedFromWhom ? ` from ${s.raisedFromWhom}` : ""
        }`
      : `Raised to date: $0`,
    `Use of funds: ${s.useOfFunds}`,
    s.targetCloseDate ? `Target close: ${s.targetCloseDate}` : ``,
    s.pitchDeckUrl ? `Deck: ${s.pitchDeckUrl}` : `Deck: not provided`,
  ]
    .filter((l) => l !== "" || true)
    .join("\n");
}

function serializeFramework(f: Framework): string {
  const sectionBlocks = f.sections.map((s) => serializeSection(s)).join("\n\n");
  return `FRAMEWORK: ${f.stage}
Philosophy: ${f.philosophy}

${sectionBlocks}`;
}

function serializeSection(s: Section): string {
  const subs = s.subCriteria
    .map(
      (sc) => `  - ${sc.id} ("${sc.name}"): ${sc.description}
    Rubric:
      1 = ${sc.rubric["1"]}
      2 = ${sc.rubric["2"]}
      3 = ${sc.rubric["3"]}
      4 = ${sc.rubric["4"]}
      5 = ${sc.rubric["5"]}`
    )
    .join("\n");
  return `### Section: ${s.id} ("${s.name}", weight ${(s.weight * 100).toFixed(
    0
  )}%)
${s.description}
Red flags: ${s.redFlags.join(" | ")}
Green flags: ${s.greenFlags.join(" | ")}
Example: ${s.example}
AI notes: ${s.aiNotes}
Sub-criteria:
${subs}`;
}

/* ─── SCORING ───────────────────────────────────────────────────────────── */

type LlmOutput = {
  sections: Record<string, Record<string, {
    rating: number;
    reasoning: string;
    improvement?: string;
  }>>;
};

const MAX_SCORE_PER_SUB = 5;

function clampRating(n: unknown): 1 | 2 | 3 | 4 | 5 {
  const x = typeof n === "number" ? Math.round(n) : 3;
  if (x <= 1) return 1;
  if (x >= 5) return 5;
  return x as 2 | 3 | 4;
}

function composeSectionScore(subs: SubCriterionScore[]): number {
  if (subs.length === 0) return 0;
  const avg =
    subs.reduce((a, s) => a + s.rating, 0) / subs.length;
  // 1-5 average → 0-100. (avg / 5) × 100.
  return Math.round((avg / MAX_SCORE_PER_SUB) * 100);
}

function ratingFor(composite: number): ScoredSubmission["rating"] {
  if (composite >= 85) return "Strong";
  if (composite >= 65) return "Above average";
  if (composite >= 45) return "Borderline";
  return "Below threshold";
}

function deriveGaps(sections: SectionScore[]): ScoredGap[] {
  const gaps: ScoredGap[] = [];
  for (const sec of sections) {
    for (const sub of sec.subCriteria) {
      if (sub.rating >= 4) continue;
      const severity: ScoredGap["severity"] =
        sub.rating <= 2 ? "high" : sub.rating === 3 ? "medium" : "low";
      gaps.push({
        sectionId: sec.id,
        sectionName: sec.name,
        subCriterionId: sub.id,
        subCriterionName: sub.name,
        severity,
        rating: sub.rating,
        why: sub.reasoning,
        closing: sub.improvement || "Tighten this dimension per the rubric tier above your current score.",
      });
    }
  }
  // Sort: high → medium → low; within each, lowest rating first.
  const sevOrder = { high: 0, medium: 1, low: 2 } as const;
  gaps.sort(
    (a, b) =>
      sevOrder[a.severity] - sevOrder[b.severity] || a.rating - b.rating
  );
  return gaps;
}

/**
 * Score a submission with the LLM against its stage-specific framework.
 * Throws if the LLM call fails — callers should wrap in try/catch and fall
 * back to the deterministic rubric.
 */
export async function scoreSubmissionWithLlm(
  s: Submission
): Promise<ScoredSubmission> {
  const framework = getFrameworkForStage(s.stage);
  const prompt = `${serializeFramework(framework)}

## SUBMISSION

${serializeSubmission(s)}

Return strict JSON keyed by section_id then sub_criterion_id.`;

  const raw = await completeJson<LlmOutput>({
    system: SYSTEM,
    user: prompt,
    temperature: 0.2,
    maxTokens: 2200,
  });

  const sections: SectionScore[] = framework.sections.map((sec) => {
    const subCriteria: SubCriterionScore[] = sec.subCriteria.map((sc) => {
      const entry = raw.sections?.[sec.id]?.[sc.id];
      const rating = clampRating(entry?.rating);
      const reasoning =
        entry?.reasoning?.trim() || "(no reasoning returned)";
      const improvement = rating <= 3 ? entry?.improvement?.trim() || "" : "";
      return { id: sc.id, name: sc.name, rating, reasoning, improvement };
    });
    return {
      id: sec.id,
      name: sec.name,
      weight: sec.weight,
      score: composeSectionScore(subCriteria),
      subCriteria,
    };
  });

  const composite = Math.round(
    sections.reduce((acc, s) => acc + s.score * s.weight, 0)
  );

  return {
    frameworkStage: framework.stage,
    composite,
    rating: ratingFor(composite),
    sections,
    topGaps: deriveGaps(sections).slice(0, 6),
  };
}
