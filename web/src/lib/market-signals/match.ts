import "server-only";
import { unstable_cache } from "next/cache";
import { completeJson } from "@/lib/ai/openai";
import { serpSearch, type SerpResult } from "@/lib/external-funds/serp";
import type { StoredSubmission } from "@/lib/insforge/submissions";

/**
 * Live market context for a founder's dashboard. Surfaces sector news,
 * recent fundings, and competitor moves — then asks the LLM to extract the
 * 3-5 most relevant signals as actionable bullets the founder should know.
 *
 * Cached per (stage, sectors) bucket for 7 days so the SERP+LLM cost only
 * fires for the first founder in each bucket per week.
 */

export type MarketSignal = {
  /** One-line headline-style insight. */
  headline: string;
  /** Why this matters to the founder, in 1-2 sentences. */
  why: string;
  /** Optional source URL — the article/page the signal came from. */
  sourceUrl?: string;
  /** Optional source name — e.g. "TechCrunch" or "fund.com". */
  sourceName?: string;
  /** "trend" | "competitor" | "funding" | "regulation" — used for badge colour. */
  tag: "trend" | "competitor" | "funding" | "regulation";
};

export async function getMarketSignals(
  stored: StoredSubmission
): Promise<MarketSignal[]> {
  const stage = stored.data.stage;
  const sectors = stored.data.sectors;
  try {
    return await getCached(stage, sectors);
  } catch {
    return [];
  }
}

const getCached = unstable_cache(
  async (stage: string, sectors: string[]): Promise<MarketSignal[]> => {
    if (sectors.length === 0) return [];

    const primarySector = sectors[0];
    const otherSectors = sectors.slice(1, 3).join(" OR ");
    const sectorClause = otherSectors
      ? `(${primarySector} OR ${otherSectors})`
      : `"${primarySector}"`;

    const exclusions = [
      "-site:linkedin.com",
      "-site:crunchbase.com",
      "-site:pitchbook.com",
      "-site:wikipedia.org",
      "-site:reddit.com",
    ].join(" ");

    // Three parallel searches: funding news, competitor activity, sector trends.
    const queries = [
      `${sectorClause} "${stage}" funding round 2026 ${exclusions}`,
      `${sectorClause} startup launch OR raised 2026 ${exclusions}`,
      `${sectorClause} market trends ${stage} 2026 ${exclusions}`,
    ];

    const results = await Promise.all(
      queries.map((q) => serpSearch(q, { num: 5 }))
    );

    const flattened = dedupeResults(results.flat()).slice(0, 12);
    if (flattened.length === 0) return [];

    return extractSignals({ stage, sectors, snippets: flattened });
  },
  ["market-signals-v1"],
  { revalidate: 60 * 60 * 24 * 7 } // 7 days
);

function dedupeResults(rs: SerpResult[]): SerpResult[] {
  const seen = new Set<string>();
  const out: SerpResult[] = [];
  for (const r of rs) {
    try {
      const host = new URL(r.url).hostname;
      const key = `${host}::${r.title.slice(0, 60)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(r);
    } catch {
      // skip unparseable URLs
    }
  }
  return out;
}

const SYSTEM_EXTRACT = `You are a venture analyst surfacing the 3-5 most relevant LIVE MARKET SIGNALS for a founder, drawn from real headlines and snippets returned by a web search.

For each signal, return:
- headline: one short newsroom-style line (max 90 chars) summarizing the news. Quote real entities (fund names, company names) when present.
- why: 1-2 short sentences on why this matters to a founder at this specific stage in this specific sector. Concrete, anti-hype, actionable. Reference specific competitors or fund names when relevant.
- sourceUrl: the URL from the snippet you drew this signal from.
- sourceName: the website hostname (e.g. "techcrunch.com", "axios.com").
- tag: one of "funding" | "competitor" | "trend" | "regulation".

Rules:
- Skip generic listicles, definitions, opicy pieces with no news angle. Only signals with NEWS in them.
- Skip results older than ~6 months when datable from the snippet.
- Prefer mentions of named funds (signal of capital flowing) and named competitors (signal of market motion).
- Cap output at 5 signals. Fewer is better than padded.
- NEVER fabricate. If a snippet doesn't give you enough to write a real signal, drop it.

Output strict JSON: { "signals": [ { headline, why, sourceUrl, sourceName, tag }, ... ] }`;

type LlmExtraction = {
  signals: Array<{
    headline?: string;
    why?: string;
    sourceUrl?: string;
    sourceName?: string;
    tag?: string;
  }>;
};

async function extractSignals(args: {
  stage: string;
  sectors: string[];
  snippets: SerpResult[];
}): Promise<MarketSignal[]> {
  const user = `Founder context:
- Stage: ${args.stage}
- Sectors: ${args.sectors.join(", ")}

Search results (real, live, from the past week):
${args.snippets
  .map(
    (s, i) =>
      `${i + 1}. ${s.title}\n   URL: ${s.url}\n   Snippet: ${s.snippet}`
  )
  .join("\n\n")}

Return JSON with up to 5 high-signal items.`;

  let raw: LlmExtraction;
  try {
    raw = await completeJson<LlmExtraction>({
      system: SYSTEM_EXTRACT,
      user,
      temperature: 0.25,
      maxTokens: 1200,
    });
  } catch {
    return [];
  }

  const ALLOWED_TAGS = ["funding", "competitor", "trend", "regulation"] as const;
  return (raw.signals ?? [])
    .filter(
      (s) => s.headline && s.why && s.headline.length > 6 && s.why.length > 12
    )
    .slice(0, 5)
    .map((s) => ({
      headline: s.headline!.trim().slice(0, 120),
      why: s.why!.trim().slice(0, 280),
      sourceUrl: s.sourceUrl?.trim() || undefined,
      sourceName: s.sourceName?.trim() || undefined,
      tag: (ALLOWED_TAGS as readonly string[]).includes(s.tag ?? "")
        ? (s.tag as MarketSignal["tag"])
        : "trend",
    }));
}
