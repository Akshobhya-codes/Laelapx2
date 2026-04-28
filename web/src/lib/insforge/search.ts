import "server-only";
import { getInsforge } from "./client";
import { searchProfiles, type StoredProfile } from "./profiles";

export type StartupHit = {
  kind: "startup";
  slug: string;
  companyName: string;
  oneLiner: string;
  stage: string;
  hq: string;
};

export type FundHit = {
  kind: "fund";
  slug: string;
  fundName: string;
  partnerName: string | null;
  thesisOneLiner: string;
  hq: string | null;
};

export type PersonHit = {
  kind: "person";
  slug: string;
  displayName: string;
  headline: string | null;
  profileImageUrl: string | null;
};

export type SearchHit = StartupHit | FundHit | PersonHit;

export type SearchResults = {
  startups: StartupHit[];
  funds: FundHit[];
  people: PersonHit[];
  total: number;
};

function escapeIlike(s: string): string {
  return s.replace(/([%_])/g, "\\$1");
}

/**
 * Combined fulltext-ish search across submissions, investors, and profiles.
 * Uses ILIKE for v1 — Postgres handles it fine at our scale; we'll graduate
 * to tsvector / pg_trgm once we have real volume.
 */
export async function searchAll(
  query: string,
  perGroup = 8
): Promise<SearchResults> {
  const empty: SearchResults = {
    startups: [],
    funds: [],
    people: [],
    total: 0,
  };
  const trimmed = query.trim();
  if (trimmed.length < 1) return empty;

  const client = getInsforge();
  const q = `%${escapeIlike(trimmed)}%`;

  const [subsRes, fundsRes, profiles] = await Promise.all([
    // Startups: match company_name OR one_liner.
    client.database
      .from("submissions")
      .select("slug, company_name, one_liner, stage, hq_city, hq_country")
      .or(`company_name.ilike.${q},one_liner.ilike.${q}`)
      .limit(perGroup),
    // Funds: match fund_name OR partner_name OR thesis_one_liner.
    client.database
      .from("investors")
      .select(
        "slug, fund_name, partner_name, thesis_one_liner, hq"
      )
      .or(
        `fund_name.ilike.${q},partner_name.ilike.${q},thesis_one_liner.ilike.${q}`
      )
      .limit(perGroup),
    // People: dedicated profile search (already filters searchable + visible).
    searchProfiles(trimmed, perGroup),
  ]);

  type SubRow = {
    slug: string;
    company_name: string;
    one_liner: string;
    stage: string;
    hq_city: string;
    hq_country: string;
  };
  type InvRow = {
    slug: string;
    fund_name: string;
    partner_name: string | null;
    thesis_one_liner: string;
    hq: string | null;
  };

  const startups: StartupHit[] = ((subsRes.data ?? []) as SubRow[]).map(
    (s) => ({
      kind: "startup",
      slug: s.slug,
      companyName: s.company_name,
      oneLiner: s.one_liner,
      stage: s.stage,
      hq: `${s.hq_city}, ${s.hq_country}`,
    })
  );

  const funds: FundHit[] = ((fundsRes.data ?? []) as InvRow[]).map((i) => ({
    kind: "fund",
    slug: i.slug,
    fundName: i.fund_name,
    partnerName: i.partner_name,
    thesisOneLiner: i.thesis_one_liner,
    hq: i.hq,
  }));

  const people: PersonHit[] = profiles.map((p: StoredProfile) => ({
    kind: "person",
    slug: p.slug,
    displayName: p.displayName,
    headline: p.headline,
    profileImageUrl: p.profileImageUrl,
  }));

  return {
    startups,
    funds,
    people,
    total: startups.length + funds.length + people.length,
  };
}
