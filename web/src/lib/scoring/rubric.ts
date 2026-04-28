/**
 * v1 deterministic Fundability rubric.
 *
 * Real rubric will be revised + paired with an LLM narrative pass.
 * For now: heuristics over the structured submission fields, producing
 * four sub-scores (Market / Team / Traction / Financials) and a composite.
 *
 * Threadline (the dummy) lands at ~72/100 — the same number used in the
 * marketing site mock — which keeps the dashboard visually consistent.
 */
import type { Submission } from "@/lib/submission/schema";

export type SubScore = {
  axis: "Market" | "Team" | "Traction" | "Financials";
  score: number; // 0–100
  weight: number; // 0–1
};

export type Snapshot = {
  composite: number; // 0–100
  subscores: SubScore[];
  gaps: Gap[];
  rating: "Below threshold" | "Borderline" | "Above average" | "Strong";
};

export type Gap = {
  axis: SubScore["axis"];
  severity: "high" | "medium" | "low";
  title: string;
  why: string;
  closing: string;
};

const clamp = (n: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, n));

/* ─── MARKET ─────────────────────────────────────────────────────────── */
function scoreMarket(s: Submission): number {
  let score = 0;
  // TAM (0–30)
  if (s.tamUsd >= 10_000_000_000) score += 30;
  else if (s.tamUsd >= 1_000_000_000) score += 25;
  else if (s.tamUsd >= 100_000_000) score += 18;
  else if (s.tamUsd >= 10_000_000) score += 10;
  else score += 4;
  // ICP specificity (0–25)
  const icpLen = s.icpDescription.trim().length;
  if (icpLen >= 200) score += 25;
  else if (icpLen >= 100) score += 18;
  else if (icpLen >= 50) score += 10;
  else score += 3;
  // Competition awareness (0–25)
  const compLen = s.competitorsAndEdge.trim().length;
  if (compLen >= 200) score += 25;
  else if (compLen >= 100) score += 18;
  else if (compLen >= 50) score += 8;
  // Defensibility (0–20)
  const defLen = s.defensibility.trim().length;
  if (defLen >= 120) score += 20;
  else if (defLen >= 60) score += 12;
  else if (defLen > 0) score += 5;
  return clamp(score);
}

/* ─── TEAM ───────────────────────────────────────────────────────────── */
function scoreTeam(s: Submission): number {
  let score = 0;
  // # founders (0–25)
  if (s.founders.length >= 2) score += 25;
  else if (s.founders.length === 1) score += 15;
  // Bios (0–25)
  const bios = s.founders.filter((f) => (f.oneLineBio?.length ?? 0) > 30).length;
  score += Math.min(25, (bios / Math.max(1, s.founders.length)) * 25);
  // LinkedIn presence (0–15)
  const linked = s.founders.filter((f) => f.linkedinUrl && f.linkedinUrl.length > 5).length;
  score += Math.min(15, (linked / Math.max(1, s.founders.length)) * 15);
  // Why-this-team narrative (0–20)
  const whyLen = s.whyThisTeam.trim().length;
  if (whyLen >= 200) score += 20;
  else if (whyLen >= 100) score += 14;
  else if (whyLen >= 50) score += 7;
  // Advisors / size (0–15)
  if ((s.advisors?.trim().length ?? 0) > 10) score += 8;
  if (s.teamSize >= 5) score += 7;
  else if (s.teamSize >= 2) score += 4;
  return clamp(score);
}

/* ─── TRACTION ───────────────────────────────────────────────────────── */
function scoreTraction(s: Submission): number {
  let score = 0;
  // Product stage (0–20)
  const stageWeight: Record<typeof s.productStage, number> = {
    Idea: 0,
    Prototype: 5,
    Beta: 12,
    Live: 17,
    Scaling: 20,
  };
  score += stageWeight[s.productStage];
  // Launched + customers (0–25)
  if (s.launched) score += 8;
  if (s.customerCount >= 100) score += 17;
  else if (s.customerCount >= 25) score += 13;
  else if (s.customerCount >= 5) score += 8;
  else if (s.customerCount > 0) score += 4;
  // MRR (0–25)
  if (s.mrrUsd === undefined || s.mrrUsd === null) {
    // No revenue reported — partial credit if pre-revenue stage
    if (s.productStage === "Idea" || s.productStage === "Prototype") score += 8;
  } else if (s.mrrUsd >= 100_000) score += 25;
  else if (s.mrrUsd >= 25_000) score += 20;
  else if (s.mrrUsd >= 5_000) score += 12;
  else if (s.mrrUsd > 0) score += 6;
  // MoM growth (0–15)
  if (s.momGrowthPct !== undefined && s.momGrowthPct !== null) {
    if (s.momGrowthPct >= 20) score += 15;
    else if (s.momGrowthPct >= 10) score += 10;
    else if (s.momGrowthPct >= 5) score += 5;
  }
  // Milestones (0–15)
  const concrete = s.milestones.filter((m) => m.trim().length >= 20).length;
  score += Math.min(15, concrete * 5);
  return clamp(score);
}

/* ─── FINANCIALS ─────────────────────────────────────────────────────── */
function scoreFinancials(s: Submission): number {
  let score = 0;
  // Prior raise legitimacy (0–25)
  if ((s.raisedToDateUsd ?? 0) >= 1_000_000) score += 25;
  else if ((s.raisedToDateUsd ?? 0) >= 250_000) score += 18;
  else if ((s.raisedToDateUsd ?? 0) > 0) score += 10;
  if ((s.raisedFromWhom?.trim().length ?? 0) > 10) score += 5;
  // Round size sanity vs stage (0–25)
  const askGoodForStage =
    (s.roundType === "Pre-Seed" && s.raisingUsd <= 1_500_000) ||
    (s.roundType === "Seed" && s.raisingUsd >= 1_500_000 && s.raisingUsd <= 6_000_000) ||
    (s.roundType === "Series A" && s.raisingUsd >= 6_000_000 && s.raisingUsd <= 25_000_000) ||
    (s.roundType === "Series B" && s.raisingUsd >= 15_000_000) ||
    (s.roundType === "Series C+" && s.raisingUsd >= 30_000_000);
  if (askGoodForStage) score += 25;
  else score += 8; // mismatch penalty
  // Use of funds clarity (0–25)
  const uofLen = s.useOfFunds.trim().length;
  const hasPercents = /%|\d+\s*%/i.test(s.useOfFunds);
  if (uofLen >= 100 && hasPercents) score += 25;
  else if (uofLen >= 60) score += 16;
  else if (uofLen > 0) score += 6;
  // Deck attached (0–10)
  if (s.pitchDeckUrl && s.pitchDeckUrl.length > 5) score += 10;
  // Why-now narrative bleeds into financial-readiness (0–10)
  if (s.whyNow.trim().length >= 100) score += 10;
  return clamp(score);
}

/* ─── COMPOSITE + RATING ─────────────────────────────────────────────── */
const WEIGHTS: Record<SubScore["axis"], number> = {
  Market: 0.3,
  Team: 0.25,
  Traction: 0.3,
  Financials: 0.15,
};

function compose(subs: SubScore[]): number {
  return Math.round(subs.reduce((acc, s) => acc + s.score * s.weight, 0));
}

function rating(composite: number): Snapshot["rating"] {
  if (composite >= 85) return "Strong";
  if (composite >= 65) return "Above average";
  if (composite >= 45) return "Borderline";
  return "Below threshold";
}

/* ─── GAPS (placeholder until LLM lands) ──────────────────────────────── */
const GAP_LIBRARY: Record<SubScore["axis"], Gap[]> = {
  Market: [
    {
      axis: "Market",
      severity: "high",
      title: "TAM derivation is thin",
      why: "Investors discount unsubstantiated TAM claims hard. They want to see the math, not the headline.",
      closing: "Spell out the bottoms-up math: customer count × ACV. Cite the customer-count source.",
    },
    {
      axis: "Market",
      severity: "medium",
      title: "Competitive position not concrete enough",
      why: "Three named competitors and your specific edge against each is what investors actually screen for.",
      closing: "Name the top 3 by name. Give one sentence on how each loses to you.",
    },
  ],
  Team: [
    {
      axis: "Team",
      severity: "high",
      title: "Founder bios under-sell domain depth",
      why: "Founder–market fit is the single largest predictor of funding at pre-seed/seed. One-liners aren't enough.",
      closing: "Each founder bio: one prior credential and one shipped result that ties directly to this problem.",
    },
    {
      axis: "Team",
      severity: "medium",
      title: "No advisors or notable backers listed",
      why: "Even one credible advisor signals due diligence that's already happened.",
      closing: "Add 1–3 advisors with one-line credentials. Even informal ones count.",
    },
  ],
  Traction: [
    {
      axis: "Traction",
      severity: "high",
      title: "Revenue or growth signal missing",
      why: "At seed+, investors want a number that's growing. Without it the round becomes a story-only sale.",
      closing: "Add MRR/ARR + last 3 months of growth. If pre-revenue, lead with weekly active or design partners signed.",
    },
    {
      axis: "Traction",
      severity: "medium",
      title: "Milestones read as feature ships, not learning",
      why: "Investors look for what you learned, not what you built. Shipping is table stakes.",
      closing: "Reframe each milestone as a customer-side outcome (e.g. 'cut onboarding from 14d → 4d').",
    },
  ],
  Financials: [
    {
      axis: "Financials",
      severity: "high",
      title: "Round size doesn't match stage convention",
      why: "An ask that's off the convention forces investors to ask 'why' before they care 'what'. Lost cycles.",
      closing: "Anchor your raise to typical round size for your stage. If you're outside, justify it in one line.",
    },
    {
      axis: "Financials",
      severity: "medium",
      title: "Use of funds isn't broken into percentages",
      why: "Without %s investors guess your priorities. Your % allocation IS your strategy.",
      closing: "Allocate 100% across 3–4 categories (e.g. 60% eng, 25% GTM, 15% infra). Cite the milestone each unlocks.",
    },
  ],
};

function pickGaps(subs: SubScore[]): Gap[] {
  // Surface the lowest 2 axes as the active gaps
  const sorted = [...subs].sort((a, b) => a.score - b.score).slice(0, 2);
  return sorted.flatMap((s) => {
    const lib = GAP_LIBRARY[s.axis];
    // Severity scales with how low the score is
    const count = s.score < 50 ? 2 : 1;
    return lib.slice(0, count);
  });
}

/* ─── PUBLIC API ─────────────────────────────────────────────────────── */
export function buildSnapshot(s: Submission): Snapshot {
  const subscores: SubScore[] = [
    { axis: "Market", score: scoreMarket(s), weight: WEIGHTS.Market },
    { axis: "Team", score: scoreTeam(s), weight: WEIGHTS.Team },
    { axis: "Traction", score: scoreTraction(s), weight: WEIGHTS.Traction },
    { axis: "Financials", score: scoreFinancials(s), weight: WEIGHTS.Financials },
  ];
  const composite = compose(subscores);
  return {
    composite,
    subscores,
    gaps: pickGaps(subscores),
    rating: rating(composite),
  };
}
