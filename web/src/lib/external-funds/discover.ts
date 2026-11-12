import { buildVcQuery, serpSearch } from "./serp";
import { fetchAndCleanPage } from "./scrape";
import { extractFund } from "./extract";
import type { ExternalFund } from "./types";

/**
 * The uncached fund-discovery pipeline: search the web for funds matching a
 * (stage, sectors) bucket, read each fund's page, and extract structured
 * data with the LLM. `match.ts` wraps this in a 7-day cache for the founder
 * dashboard; `scripts/backfill-fund-network.ts` calls it directly.
 *
 * Deliberately free of `next/cache` so it runs outside Next.js too.
 */
export async function discoverFunds(stage: string, sectors: string[]): Promise<ExternalFund[]> {
  const query = buildVcQuery({ stage, sectors });
  const results = await serpSearch(query, { num: 10 });
  if (results.length === 0) return [];

  // Drop obvious non-fund domains we can't filter via SERP exclusions alone.
  const filtered = results.filter((r) => isLikelyFundUrl(r.url));

  const pages = await Promise.all(filtered.slice(0, 8).map((r) => fetchAndCleanPage(r.url)));

  const extractions = await Promise.all(
    pages.map((p) =>
      p
        ? extractFund({
            pageText: p.text,
            sourceUrl: p.finalUrl,
            candidateApplyUrls: p.candidateApplyUrls,
          })
        : Promise.resolve(null)
    )
  );

  // De-duplicate by fund name (case-insensitive) — sometimes a fund has
  // multiple pages in SERP results (homepage + thesis page).
  const seen = new Set<string>();
  const out: ExternalFund[] = [];
  for (const f of extractions) {
    if (!f) continue;
    const k = f.fundName.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(f);
  }
  return out;
}

/** The fund's website domain, without "www." — the key in `external_funds`. */
export function fundDomain(fund: Pick<ExternalFund, "websiteUrl" | "sourceUrl">): string | null {
  for (const raw of [fund.websiteUrl, fund.sourceUrl]) {
    try {
      const host = new URL(raw).hostname.toLowerCase().replace(/^www\./, "");
      if (host) return host;
    } catch {
      /* try the next one */
    }
  }
  return null;
}

const FUND_HOST_BLOCKLIST = [
  "linkedin.com",
  "crunchbase.com",
  "pitchbook.com",
  "ycombinator.com",
  "wikipedia.org",
  "reddit.com",
  "medium.com",
  "forbes.com",
  "techcrunch.com",
  "bloomberg.com",
  "axios.com",
  "twitter.com",
  "x.com",
  "youtube.com",
  "facebook.com",
];

export function isLikelyFundUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return !FUND_HOST_BLOCKLIST.some((b) => host === b || host.endsWith(`.${b}`));
  } catch {
    return false;
  }
}
