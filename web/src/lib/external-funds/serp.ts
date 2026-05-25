import "server-only";

export type SerpResult = {
  title: string;
  url: string;
  snippet: string;
};

/**
 * SerpAPI Google search. Returns organic results only. Fails soft — if the
 * key is missing or the request errors, we return [] so the dashboard can
 * gracefully render an empty External Funds section.
 */
export async function serpSearch(
  query: string,
  opts: { num?: number } = {}
): Promise<SerpResult[]> {
  const key = process.env.SERPAPI_API_KEY;
  if (!key) return [];

  const params = new URLSearchParams({
    engine: "google",
    q: query,
    api_key: key,
    num: String(opts.num ?? 10),
    hl: "en",
  });

  try {
    const res = await fetch(`https://serpapi.com/search.json?${params}`, {
      // Don't let SerpAPI hang the whole dashboard.
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) return [];
    const json = (await res.json()) as {
      organic_results?: Array<{
        title?: string;
        link?: string;
        snippet?: string;
      }>;
    };
    return (json.organic_results ?? [])
      .filter((r) => r.link && r.title)
      .map((r) => ({
        title: r.title!,
        url: r.link!,
        snippet: r.snippet ?? "",
      }));
  } catch {
    return [];
  }
}

/**
 * Build a SERP query that surfaces VC funds whose public thesis matches the
 * founder's stage + sector mix. Excludes the obvious common funds (the user
 * said "yc and shit is too common") and platforms that block scraping.
 */
export function buildVcQuery(opts: {
  stage: string;
  sectors: string[];
}): string {
  const sectorPart = opts.sectors.slice(0, 3).join(" OR ");
  const exclusions = [
    "-site:linkedin.com",
    "-site:crunchbase.com",
    "-site:pitchbook.com",
    "-site:ycombinator.com",
    "-site:wikipedia.org",
    "-site:reddit.com",
    "-site:medium.com",
    "-site:forbes.com",
  ].join(" ");
  // Target fund websites that publish a thesis page with an application form.
  return `"${opts.stage}" "venture capital" (${sectorPart}) (thesis OR investments OR portfolio) ("submit a pitch" OR "apply" OR "contact") ${exclusions}`;
}
