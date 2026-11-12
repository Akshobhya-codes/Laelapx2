import "server-only";
import type { StoredSubmission } from "@/lib/insforge/submissions";
import { buildSnapshot } from "@/lib/scoring/rubric";
import { currentWeekStart } from "./entitlements";

/**
 * Pure aggregations for /funder/analytics (Institutional and up).
 *
 * Quarterly insights are platform-wide, so they follow a minimum group size:
 * any bucket with fewer than K companies is folded away, so no aggregate can
 * be traced back to a single founder's numbers.
 */

export const MIN_GROUP = 3;

export function weeklyCounts(isoDates: string[], weeks = 12): { label: string; value: number; detail: string }[] {
  const start = currentWeekStart();
  start.setUTCDate(start.getUTCDate() - (weeks - 1) * 7);
  const buckets = Array.from({ length: weeks }, (_, i) => {
    const d = new Date(start);
    d.setUTCDate(d.getUTCDate() + i * 7);
    return { start: d, value: 0 };
  });
  for (const iso of isoDates) {
    const t = new Date(iso).getTime();
    const idx = Math.floor((t - start.getTime()) / (7 * 24 * 60 * 60 * 1000));
    if (idx >= 0 && idx < weeks) buckets[idx].value++;
  }
  const fmt = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
  return buckets.map((b) => ({
    label: fmt(b.start),
    value: b.value,
    detail: `Week of ${fmt(b.start)}`,
  }));
}

export function median(xs: number[]): number | null {
  if (xs.length === 0) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2);
}

export function quarterOf(d: Date): { year: number; q: number; start: Date; end: Date; label: string } {
  const q = Math.floor(d.getUTCMonth() / 3);
  const start = new Date(Date.UTC(d.getUTCFullYear(), q * 3, 1));
  const end = new Date(Date.UTC(d.getUTCFullYear(), q * 3 + 3, 1));
  return { year: d.getUTCFullYear(), q: q + 1, start, end, label: `Q${q + 1} ${d.getUTCFullYear()}` };
}

export type QuarterInsights = {
  label: string;
  previousLabel: string;
  newThisQuarter: number;
  newLastQuarter: number;
  medianAskUsd: number | null;
  medianScore: number | null;
  sectors: { sector: string; thisQuarter: number; lastQuarter: number; medianAskUsd: number | null }[];
  stages: { stage: string; count: number; medianAskUsd: number | null; medianScore: number | null }[];
  foldedSectors: number;
};

export function quarterlyInsights(all: StoredSubmission[], now = new Date()): QuarterInsights {
  const cur = quarterOf(now);
  const prev = quarterOf(new Date(cur.start.getTime() - 24 * 60 * 60 * 1000));
  const inRange = (s: StoredSubmission, a: Date, b: Date) => {
    const t = new Date(s.createdAt).getTime();
    return t >= a.getTime() && t < b.getTime();
  };
  const thisQ = all.filter((s) => inRange(s, cur.start, cur.end));
  const lastQ = all.filter((s) => inRange(s, prev.start, prev.end));
  const scoreOf = (s: StoredSubmission) => s.scoredSnapshot?.composite ?? buildSnapshot(s.data).composite;

  // Sectors: a company counts toward every sector it lists.
  const sectorNames = new Set<string>();
  for (const s of [...thisQ, ...lastQ]) s.data.sectors.forEach((x) => sectorNames.add(x));
  let folded = 0;
  const sectors = Array.from(sectorNames)
    .map((sector) => {
      const a = thisQ.filter((s) => s.data.sectors.includes(sector as never));
      const b = lastQ.filter((s) => s.data.sectors.includes(sector as never));
      return {
        sector,
        thisQuarter: a.length,
        lastQuarter: b.length,
        medianAskUsd: a.length >= MIN_GROUP ? median(a.map((s) => s.data.raisingUsd)) : null,
      };
    })
    .filter((r) => {
      const ok = r.thisQuarter >= MIN_GROUP || r.lastQuarter >= MIN_GROUP;
      if (!ok) folded++;
      return ok;
    })
    .sort((x, y) => y.thisQuarter - x.thisQuarter);

  const stageNames = ["Pre-Seed", "Seed", "Series A", "Series B+"];
  const stages = stageNames
    .map((stage) => {
      const g = all.filter((s) => s.data.stage === stage);
      const enough = g.length >= MIN_GROUP;
      return {
        stage,
        count: g.length,
        medianAskUsd: enough ? median(g.map((s) => s.data.raisingUsd)) : null,
        medianScore: enough ? median(g.map(scoreOf)) : null,
      };
    });

  return {
    label: cur.label,
    previousLabel: prev.label,
    newThisQuarter: thisQ.length,
    newLastQuarter: lastQ.length,
    medianAskUsd: thisQ.length >= MIN_GROUP ? median(thisQ.map((s) => s.data.raisingUsd)) : null,
    medianScore: thisQ.length >= MIN_GROUP ? median(thisQ.map(scoreOf)) : null,
    sectors,
    stages,
    foldedSectors: folded,
  };
}
