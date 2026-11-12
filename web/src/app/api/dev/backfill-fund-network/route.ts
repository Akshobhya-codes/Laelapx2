import { listAllSubmissions } from "@/lib/insforge/submissions";
import { upsertExternalFunds } from "@/lib/insforge/fund-network";
import { discoverFunds } from "@/lib/external-funds/discover";

/**
 * Fill `external_funds` (db/0012) by running fund research for every
 * (stage, sectors) group that has a submission. LOCAL DEVELOPMENT ONLY —
 * returns 404 in production. Run with the dev server up:
 *
 *   curl -X POST http://localhost:3000/api/dev/backfill-fund-network
 *
 * Costs one SerpAPI search per group plus up to 8 short LLM extractions.
 * Safe to re-run: funds upsert by domain.
 */
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST() {
  if (process.env.NODE_ENV === "production") {
    return new Response("Not found", { status: 404 });
  }
  const subs = await listAllSubmissions({ limit: 1000 });
  const groups = new Map<string, { stage: string; sectors: string[] }>();
  for (const s of subs) {
    const key = `${s.data.stage}::${[...s.data.sectors].sort().join("|")}`;
    if (!groups.has(key)) groups.set(key, { stage: s.data.stage, sectors: [...s.data.sectors] });
  }

  const report: { group: string; found: string[]; saved: number; error?: string }[] = [];
  for (const [group, g] of groups) {
    try {
      const funds = await discoverFunds(g.stage, g.sectors);
      const saved = await upsertExternalFunds(funds);
      report.push({ group, found: funds.map((f) => `${f.fundName} (${f.websiteUrl})`), saved });
    } catch (err) {
      report.push({ group, found: [], saved: 0, error: err instanceof Error ? err.message : String(err) });
    }
  }
  return Response.json({ groups: groups.size, report });
}
