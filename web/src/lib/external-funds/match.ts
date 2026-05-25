import "server-only";
import { unstable_cache } from "next/cache";
import type { StoredSubmission } from "@/lib/insforge/submissions";
import { thesisFitScore } from "@/lib/insforge/investors";
import { buildVcQuery, serpSearch } from "./serp";
import { fetchAndCleanPage } from "./scrape";
import { extractFund } from "./extract";
import type { ExternalFund, ExternalFundMatch } from "./types";

const CACHE_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

function bucketKey(stage: string, sectors: string[]): string {
  const sortedSectors = [...sectors].sort().join("|") || "any";
  return `${stage}::${sortedSectors}`;
}

/**
 * Build a fund corpus for a given (stage, sectors) bucket. Cached for 7 days
 * across all founders in the bucket. First founder pays the latency; everyone
 * else hits cache.
 */
const buildBucket = unstable_cache(
  async (stage: string, sectors: string[]): Promise<ExternalFund[]> => {
    const query = buildVcQuery({ stage, sectors });
    const results = await serpSearch(query, { num: 10 });
    if (results.length === 0) return [];

    // Drop obvious non-fund domains we can't filter via SERP exclusions alone.
    const filtered = results.filter((r) => isLikelyFundUrl(r.url));

    const pages = await Promise.all(
      filtered.slice(0, 8).map((r) => fetchAndCleanPage(r.url))
    );

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
  },
  ["external-funds-v1"],
  { revalidate: CACHE_TTL_SECONDS }
);

/**
 * Match a founder's submission against the cached external-fund corpus for
 * their bucket. Re-scored per submission so two founders in the same bucket
 * see different rankings based on their specific raise size + sector mix.
 */
export async function matchExternalFunds(
  submission: StoredSubmission,
  opts: { top?: number; minScore?: number } = {}
): Promise<ExternalFundMatch[]> {
  const top = opts.top ?? 6;
  const minScore = opts.minScore ?? 45;
  const stage = submission.data.stage;
  const sectors = submission.data.sectors;
  const corpus = await buildBucket(stage, sectors);

  return corpus
    .map((fund) => {
      const { score, reasons } = thesisFitScore(
        {
          fundName: fund.fundName,
          thesisOneLiner: fund.thesisOneLiner,
          stages: fund.stages,
          sectors: fund.sectors,
          checkSizeMinUsd: fund.checkSizeMinUsd,
          checkSizeMaxUsd: fund.checkSizeMaxUsd,
        },
        submission
      );
      return { fund, fitScore: score, reasons };
    })
    .filter((m) => m.fitScore >= minScore)
    .sort((a, b) => b.fitScore - a.fitScore)
    .slice(0, top);
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

function isLikelyFundUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return !FUND_HOST_BLOCKLIST.some(
      (b) => host === b || host.endsWith(`.${b}`)
    );
  } catch {
    return false;
  }
}

export { bucketKey };
