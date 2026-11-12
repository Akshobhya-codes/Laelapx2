// Fill the external_funds table (db/0012) by running fund research for every
// (stage, sectors) group that has a submission.
//
//   npm run fund-network:backfill            # run it
//   npm run fund-network:backfill -- --dry   # list the groups only
//
// Costs one SerpAPI search per group plus up to 8 short LLM extractions.
// Safe to re-run: funds upsert by domain.
//
// Runs outside Next.js, so it calls the uncached pipeline (discover.ts), not
// the dashboard's cached matcher. The "react-server" condition lets the
// server-only modules load.

import { listAllSubmissions } from "@/lib/insforge/submissions";
import { upsertExternalFunds } from "@/lib/insforge/fund-network";
import { discoverFunds } from "@/lib/external-funds/discover";

const dry = process.argv.includes("--dry");

const subs = await listAllSubmissions({ limit: 1000 });
const groups = new Map<string, { stage: string; sectors: string[] }>();
for (const s of subs) {
  const sectors = [...s.data.sectors];
  const key = `${s.data.stage}::${[...sectors].sort().join("|")}`;
  if (!groups.has(key)) groups.set(key, { stage: s.data.stage, sectors });
}

console.log(`${subs.length} submissions -> ${groups.size} research groups${dry ? " (dry run)" : ""}`);
let total = 0;
for (const [key, g] of groups) {
  if (dry) {
    console.log(`  . ${key}`);
    continue;
  }
  try {
    const funds = await discoverFunds(g.stage, g.sectors);
    const saved = await upsertExternalFunds(funds);
    total += saved;
    console.log(`  + ${key}: ${funds.length} funds found, ${saved} saved`);
    for (const f of funds) console.log(`      ${f.fundName}`);
  } catch (err) {
    console.log(`  ! ${key}: ${err instanceof Error ? err.message : err}`);
  }
}
if (!dry) console.log(`\n${total} fund rows written`);
