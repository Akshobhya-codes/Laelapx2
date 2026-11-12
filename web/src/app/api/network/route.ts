import { listMarqueeFunds } from "@/lib/insforge/fund-network";

/**
 * Public list behind the homepage marquee: partners first, then the outside
 * funds our research has matched to founders (db/0012, toggleable in admin).
 * Cached at the edge for an hour; a database problem returns partners only.
 */

export const dynamic = "force-dynamic";

/** Firms Laelapx actually works with. Keep this list true. */
const PARTNERS = [
  { name: "Brokd", logo: null as string | null, url: null as string | null },
  { name: "Linda Mar Ventures", logo: "/logos/linda-mar-ventures.png", url: "https://www.lindamarventures.com" },
];

export async function GET() {
  let funds: { name: string; domain: string }[] = [];
  try {
    funds = (await listMarqueeFunds(40))
      .filter((f) => f.fundName.length <= 48)
      .map((f) => ({ name: f.fundName, domain: f.domain }));
  } catch {
    funds = [];
  }
  return Response.json(
    { partners: PARTNERS, funds },
    { headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" } }
  );
}
