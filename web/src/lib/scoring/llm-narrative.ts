import type { Submission } from "@/lib/submission/schema";
import type { Gap, Snapshot } from "./rubric";
import { completeJson, completeText } from "@/lib/ai/openai";

/**
 * Real LLM-generated narrative + gap analysis for a submission.
 * Replaces the placeholder GAP_LIBRARY in rubric.ts.
 *
 * Designed to fail soft: if OpenAI is down or the key is bad, callers can
 * fall back to the rubric's deterministic gaps without crashing the page.
 */

const VOICE_RULES = `Voice rules — strict:
- Institutional, declarative, terse. No hype. No emojis. No superlatives.
- Match the brand of the marketing site: confident, anti-hype, "honest intelligence."
- Never use phrases like "great", "amazing", "incredible", "you crushed it."
- Never recommend "tell a story" or "be passionate." Recommend specific concrete actions.
- Reference exact numbers, names, sectors, competitors from the submission. Don't speak in generalities.`;

/* ─── NARRATIVE: 2–3 sentence Snapshot summary ────────────────────────── */
export async function generateNarrative(
  s: Submission,
  snap: Snapshot
): Promise<string> {
  const subscoreLine = snap.subscores
    .map((sub) => `${sub.axis} ${sub.score}`)
    .join(", ");
  const lowest = [...snap.subscores].sort((a, b) => a.score - b.score)[0];
  const highest = [...snap.subscores].sort((a, b) => b.score - a.score)[0];

  const system = `You are Laelapx, a fundability-intelligence service.
Write a 2–3 sentence Snapshot summary for the founder dashboard explaining
their composite Fundability Score in plain English.

${VOICE_RULES}

Structure:
1. Lead with a one-clause read of where they stand at this stage (use the rating).
2. Cite the specific axis driving the read (the highest or lowest score) with a real reason from the submission.
3. End with the one thing they should focus on next, concretely.`;

  const user = `Composite: ${snap.composite}/100 (${snap.rating})
Sub-scores: ${subscoreLine}
Highest axis: ${highest.axis} ${highest.score}
Lowest axis: ${lowest.axis} ${lowest.score}

Company: ${s.companyName}
Stage: ${s.stage}
Sector: ${s.sectors.join(", ")}
Raising: $${s.raisingUsd.toLocaleString()} (${s.roundType})
Customers: ${s.customerCount}, MRR: ${s.mrrUsd ? `$${s.mrrUsd.toLocaleString()}` : "n/a"}, MoM: ${s.momGrowthPct ?? "n/a"}%
Founders: ${s.founders.map((f) => `${f.name} (${f.role})`).join(", ")}
Problem: ${s.problemDescription.slice(0, 280)}
Defensibility: ${s.defensibility.slice(0, 200)}

Write the 2–3 sentence summary now. No preamble, no headings, just the prose.`;

  return completeText({ system, user, temperature: 0.4, maxTokens: 200 });
}

/* ─── GAPS: LLM-generated gap analysis ────────────────────────────────── */

type GapJson = {
  axis: "Market" | "Team" | "Traction" | "Financials";
  severity: "high" | "medium" | "low";
  title: string;
  why: string;
  closing: string;
};

function isValidGap(x: unknown): x is GapJson {
  if (!x || typeof x !== "object") return false;
  const g = x as Record<string, unknown>;
  return (
    ["Market", "Team", "Traction", "Financials"].includes(g.axis as string) &&
    ["high", "medium", "low"].includes(g.severity as string) &&
    typeof g.title === "string" && g.title.length > 5 &&
    typeof g.why === "string" && g.why.length > 10 &&
    typeof g.closing === "string" && g.closing.length > 10
  );
}

export async function generateGaps(
  s: Submission,
  snap: Snapshot
): Promise<Gap[]> {
  const subscoreLine = snap.subscores
    .map((sub) => `${sub.axis}: ${sub.score}`)
    .join(", ");
  const lowestTwo = [...snap.subscores].sort((a, b) => a.score - b.score).slice(0, 2);

  const system = `You are Laelapx, a fundability-intelligence service.
Generate specific gap analysis for a startup's submission — gaps that would
cause an early-stage investor to pass at the cold-deck stage.

${VOICE_RULES}

Output rules:
- Return exactly 3 to 4 gaps as JSON.
- Format: { "gaps": [ { "axis": ..., "severity": ..., "title": ..., "why": ..., "closing": ... } ] }
- "axis" must be one of: "Market" | "Team" | "Traction" | "Financials"
- "severity" must be one of: "high" | "medium" | "low"
- "title" — 4–8 words, declarative, no question marks
- "why" — exactly one sentence explaining why an investor cares (cite the specific issue)
- "closing" — exactly one sentence with a SPECIFIC fix that references the founder's actual data

Pick gaps primarily from the LOWEST-scoring axes. Be concrete — quote actual numbers,
competitor names, or details from the submission. Never write generic advice that could
apply to any startup.`;

  const user = `Submission:
${JSON.stringify(
  {
    companyName: s.companyName,
    oneLiner: s.oneLiner,
    stage: s.stage,
    sectors: s.sectors,
    problemDescription: s.problemDescription,
    whyNow: s.whyNow,
    solutionDescription: s.solutionDescription,
    icpDescription: s.icpDescription,
    tamUsd: s.tamUsd,
    tamReasoning: s.tamReasoning,
    competitorsAndEdge: s.competitorsAndEdge,
    defensibility: s.defensibility,
    productStage: s.productStage,
    launched: s.launched,
    customerCount: s.customerCount,
    mrrUsd: s.mrrUsd,
    momGrowthPct: s.momGrowthPct,
    milestones: s.milestones,
    founders: s.founders,
    whyThisTeam: s.whyThisTeam,
    teamSize: s.teamSize,
    advisors: s.advisors,
    raisedToDateUsd: s.raisedToDateUsd,
    raisedFromWhom: s.raisedFromWhom,
    raisingUsd: s.raisingUsd,
    roundType: s.roundType,
    useOfFunds: s.useOfFunds,
  },
  null,
  2
)}

Sub-scores: ${subscoreLine}
Lowest two axes (target most gaps here): ${lowestTwo.map((s) => s.axis).join(", ")}

Return the JSON object now.`;

  const result = await completeJson<{ gaps: unknown[] }>({
    system,
    user,
    temperature: 0.55,
    maxTokens: 1400,
  });

  const arr = Array.isArray(result?.gaps) ? result.gaps : [];
  return arr.filter(isValidGap);
}

/* ─── COMBINED ENRICHMENT ─────────────────────────────────────────────── */
export type Enrichment = {
  narrative: string;
  gaps: Gap[];
};

export async function enrichSnapshot(
  s: Submission,
  snap: Snapshot
): Promise<Enrichment> {
  const [narrative, gaps] = await Promise.all([
    generateNarrative(s, snap).catch((e) => {
      console.error("[narrative] failed:", e);
      return "";
    }),
    generateGaps(s, snap).catch((e) => {
      console.error("[gaps] failed:", e);
      return [] as Gap[];
    }),
  ]);
  return { narrative, gaps };
}
