import type { StoredSubmission } from "@/lib/insforge/submissions";
import type { CustomCriteria } from "@/lib/insforge/investor-workspace";
import { buildSnapshot } from "@/lib/scoring/rubric";

/**
 * Custom criteria (Emerging Fund and up): hard filters on top of the thesis.
 * Pure — no I/O — so Discover, the funder home, and the pipeline all screen
 * identically. Returns why each hidden founder was screened out, so the UI
 * can say "12 hidden by your criteria" instead of silently shrinking.
 */
export function failsCriteria(s: StoredSubmission, c: CustomCriteria): string | null {
  const d = s.data;
  if (c.launchedOnly && !d.launched) return "Not launched";
  if (c.minMrrUsd !== null && (d.mrrUsd ?? 0) < c.minMrrUsd) return "Below MRR floor";
  if (c.minCustomers !== null && d.customerCount < c.minCustomers) return "Below customer floor";
  if (c.minScore !== null) {
    const score = s.scoredSnapshot?.composite ?? buildSnapshot(d).composite;
    if (score < c.minScore) return "Below score floor";
  }
  if (c.countries.length > 0) {
    const hq = d.hqCountry.trim().toLowerCase();
    if (!c.countries.some((x) => x.trim().toLowerCase() === hq)) return "Outside HQ countries";
  }
  if (c.productStages.length > 0 && !c.productStages.includes(d.productStage)) {
    return "Product stage not in list";
  }
  if (c.keywords.length > 0) {
    const hay = `${d.oneLiner} ${d.problemDescription} ${d.solutionDescription} ${d.sectors.join(" ")}`.toLowerCase();
    if (!c.keywords.some((k) => hay.includes(k.trim().toLowerCase()))) return "No keyword match";
  }
  return null;
}

export function applyCriteria(
  subs: StoredSubmission[],
  c: CustomCriteria
): { kept: StoredSubmission[]; hidden: number } {
  const kept = subs.filter((s) => failsCriteria(s, c) === null);
  return { kept, hidden: subs.length - kept.length };
}
