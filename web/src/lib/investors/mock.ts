/**
 * Mock investor universe for v1. Real version pulls from Insforge `investors`
 * table seeded from OpenVC. Shape is the same so swapping is a one-line change.
 */
import type { Submission } from "@/lib/submission/schema";

export type Investor = {
  id: string;
  fundName: string;
  partner: string;
  partnerTitle: string;
  hq: string;
  thesisOneLiner: string;
  stages: ("Pre-Seed" | "Seed" | "Series A" | "Series B+")[];
  sectors: string[];
  checkSizeUsd: { min: number; max: number };
  notablePortfolio: string[];
  websiteUrl: string;
};

export const MOCK_INVESTORS: Investor[] = [
  {
    id: "inv-boxgroup",
    fundName: "BoxGroup",
    partner: "Adam Rothenberg",
    partnerTitle: "Partner",
    hq: "New York, USA",
    thesisOneLiner:
      "Pre-seed and seed checks into category-defining founders, no thesis bias.",
    stages: ["Pre-Seed", "Seed"],
    sectors: ["B2B SaaS", "Consumer", "AI/ML", "Marketplace", "DevTools", "E-commerce"],
    checkSizeUsd: { min: 100_000, max: 1_500_000 },
    notablePortfolio: ["Vercel", "Plaid", "Ramp", "Glossier"],
    websiteUrl: "https://boxgroup.com",
  },
  {
    id: "inv-hustlefund",
    fundName: "Hustle Fund",
    partner: "Eric Bahn",
    partnerTitle: "Co-founder",
    hq: "San Francisco, USA",
    thesisOneLiner: "Pre-seed for hustle-driven founders with traction-first GTM.",
    stages: ["Pre-Seed"],
    sectors: ["B2B SaaS", "AI/ML", "E-commerce", "Marketplace", "Consumer"],
    checkSizeUsd: { min: 25_000, max: 250_000 },
    notablePortfolio: ["Webflow", "Tally", "Mighty Networks"],
    websiteUrl: "https://hustlefund.vc",
  },
  {
    id: "inv-fielddata-vc",
    fundName: "Fieldwork Capital",
    partner: "Priya Mehta",
    partnerTitle: "General Partner",
    hq: "London, UK",
    thesisOneLiner:
      "Seed-stage commerce + applied AI. Founders who've shipped before.",
    stages: ["Seed", "Series A"],
    sectors: ["AI/ML", "E-commerce", "B2B SaaS", "DevTools"],
    checkSizeUsd: { min: 1_000_000, max: 5_000_000 },
    notablePortfolio: ["Patchwork", "Faire", "Klaviyo"],
    websiteUrl: "#",
  },
  {
    id: "inv-operators-collective",
    fundName: "Operators Collective",
    partner: "Mallun Yen",
    partnerTitle: "Founder",
    hq: "San Francisco, USA",
    thesisOneLiner:
      "Operators-as-LPs backing B2B founders building modern infrastructure.",
    stages: ["Seed", "Series A"],
    sectors: ["B2B SaaS", "DevTools", "Infra", "AI/ML", "Security"],
    checkSizeUsd: { min: 500_000, max: 4_000_000 },
    notablePortfolio: ["Calm", "Outschool", "Mercury"],
    websiteUrl: "https://operatorscollective.com",
  },
  {
    id: "inv-cxinflect",
    fundName: "CX Inflection",
    partner: "Jordan Reyes",
    partnerTitle: "Principal",
    hq: "Austin, USA",
    thesisOneLiner: "Customer experience + commerce automation, seed only.",
    stages: ["Seed"],
    sectors: ["E-commerce", "AI/ML", "B2B SaaS", "Consumer"],
    checkSizeUsd: { min: 750_000, max: 3_000_000 },
    notablePortfolio: ["Chord", "Aircall", "Postscript"],
    websiteUrl: "#",
  },
  {
    id: "inv-northstreet",
    fundName: "North Street",
    partner: "Maya Greene",
    partnerTitle: "Partner",
    hq: "Toronto, Canada",
    thesisOneLiner: "AI-native infrastructure. Series A only, lead checks.",
    stages: ["Series A"],
    sectors: ["AI/ML", "Infra", "DevTools", "B2B SaaS"],
    checkSizeUsd: { min: 4_000_000, max: 12_000_000 },
    notablePortfolio: ["Replicate", "Modal", "Together AI"],
    websiteUrl: "#",
  },
  {
    id: "inv-runwayseed",
    fundName: "Runway Seed",
    partner: "Diego Park",
    partnerTitle: "Managing Partner",
    hq: "Mexico City, MX",
    thesisOneLiner:
      "Pre-seed checks for technical founders shipping AI agents into legacy industries.",
    stages: ["Pre-Seed", "Seed"],
    sectors: ["AI/ML", "B2B SaaS", "DevTools", "Health", "Climate"],
    checkSizeUsd: { min: 100_000, max: 750_000 },
    notablePortfolio: ["Truora", "Kavak (early)"],
    websiteUrl: "#",
  },
];

/* ─── MATCHING ────────────────────────────────────────────────────────── */
export type InvestorMatch = {
  investor: Investor;
  fitScore: number; // 0–100
  reasons: string[]; // short bullets
};

export function matchInvestors(s: Submission, top = 6): InvestorMatch[] {
  const ranked = MOCK_INVESTORS.map((inv): InvestorMatch => {
    let score = 0;
    const reasons: string[] = [];

    // Stage overlap (0–40)
    if (inv.stages.includes(s.stage)) {
      score += 40;
      reasons.push(`Stage match — invests at ${s.stage}.`);
    } else {
      score += 5;
    }

    // Sector overlap (0–35)
    const overlap = s.sectors.filter((sec) => inv.sectors.includes(sec));
    if (overlap.length >= 2) {
      score += 35;
      reasons.push(`Sector overlap on ${overlap.slice(0, 3).join(", ")}.`);
    } else if (overlap.length === 1) {
      score += 22;
      reasons.push(`Thesis includes ${overlap[0]}.`);
    } else {
      score += 4;
    }

    // Check size fit (0–25)
    const ask = s.raisingUsd;
    const fitsCheck =
      ask >= inv.checkSizeUsd.min * 0.75 && ask <= inv.checkSizeUsd.max * 1.5;
    if (fitsCheck) {
      score += 25;
      const fmt = (n: number) =>
        n >= 1_000_000
          ? `$${(n / 1_000_000).toFixed(1)}M`
          : `$${Math.round(n / 1_000)}K`;
      reasons.push(
        `Check size fits — they write ${fmt(inv.checkSizeUsd.min)}–${fmt(inv.checkSizeUsd.max)}.`
      );
    } else {
      score += 6;
    }

    return { investor: inv, fitScore: Math.min(100, score), reasons };
  });

  return ranked.sort((a, b) => b.fitScore - a.fitScore).slice(0, top);
}
