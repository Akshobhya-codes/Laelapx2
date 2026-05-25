import type { Stage, Sector } from "@/lib/insforge/investors";

/**
 * A VC fund discovered by web search + LLM extraction. Lives entirely outside
 * Laelapx (we have no relationship with them). Surfaced on the founder
 * dashboard under "External funds — apply directly" with an explicit CTA to
 * the fund's own application form.
 */
export type ExternalFund = {
  fundName: string;
  partnerName?: string;
  partnerTitle?: string;
  hq?: string;
  thesisOneLiner: string;
  stages: Stage[];
  sectors: Sector[];
  checkSizeMinUsd?: number;
  checkSizeMaxUsd?: number;
  websiteUrl: string;
  /**
   * Direct link to the fund's "submit a pitch" / application form. Empty
   * string means we couldn't find one — the card falls back to the website.
   */
  applyUrl: string;
  /**
   * The page we extracted from. Useful for debugging stale entries and for
   * showing "via fundsite.com/thesis" attribution to founders.
   */
  sourceUrl: string;
};

export type ExternalFundMatch = {
  fund: ExternalFund;
  fitScore: number;
  reasons: string[];
};
