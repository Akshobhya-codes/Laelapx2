import "server-only";
import { unstable_cache } from "next/cache";
import type { StoredSubmission } from "@/lib/insforge/submissions";
import { thesisFitScore } from "@/lib/insforge/investors";
import { upsertExternalFunds } from "@/lib/insforge/fund-network";
import { discoverFunds } from "./discover";
import type { ExternalFund, ExternalFundMatch } from "./types";

const CACHE_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

function bucketKey(stage: string, sectors: string[]): string {
  const sortedSectors = [...sectors].sort().join("|") || "any";
  return `${stage}::${sortedSectors}`;
}

/**
 * Build a fund corpus for a given (stage, sectors) bucket. Cached for 7 days
 * across all founders in the bucket. First founder pays the latency; everyone
 * else hits cache. Every fund found is also recorded in `external_funds`
 * (the fund network behind the homepage marquee and fund applications).
 */
const buildBucket = unstable_cache(
  async (stage: string, sectors: string[]): Promise<ExternalFund[]> => {
    const funds = await discoverFunds(stage, sectors);
    await upsertExternalFunds(funds);
    return funds;
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

export { bucketKey };
