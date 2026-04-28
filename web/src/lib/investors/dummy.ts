import type { ThesisInput } from "./thesis-schema";

/**
 * Pre-filled thesis used as the default when no investor profile exists yet.
 * Lets the user click straight through the thesis form to test the flow.
 */
export const DUMMY_THESIS: ThesisInput = {
  fundName: "Atlas Ventures",
  partnerName: "Sara Patel",
  partnerTitle: "Partner",
  hq: "New York, USA",
  thesisOneLiner:
    "Seed-stage B2B AI infrastructure. We back technical founders building primitives others rely on.",
  stages: ["Seed", "Series A"],
  sectors: ["B2B SaaS", "AI/ML", "DevTools", "Infra"],
  checkSizeMinUsd: 500_000,
  checkSizeMaxUsd: 3_000_000,
  notablePortfolio: "Replicate, Modal, LangChain, Mintlify",
  websiteUrl: "https://atlas.vc",
};
