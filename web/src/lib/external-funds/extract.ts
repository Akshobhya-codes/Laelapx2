import "server-only";
import { completeJson } from "@/lib/ai/openai";
import { STAGES, SECTORS } from "@/lib/submission/schema";
import type { ExternalFund } from "./types";
import type { Stage, Sector } from "@/lib/insforge/investors";

type LlmExtraction = {
  is_vc_fund: boolean;
  fund_name: string;
  partner_name?: string;
  partner_title?: string;
  hq?: string;
  thesis_one_liner?: string;
  stages?: string[];
  sectors?: string[];
  check_size_min_usd?: number;
  check_size_max_usd?: number;
  apply_url?: string;
};

const SYSTEM = `You read a venture capital fund's marketing page and extract structured data about the fund. You return strict JSON.

Rules:
- If the page is NOT a venture-fund marketing page (it's a portfolio company, news article, blog, accelerator program, founder's personal blog, etc.), set is_vc_fund=false and leave other fields empty.
- thesis_one_liner: paraphrase or quote their public investment thesis in ONE sentence (max 160 chars). Do NOT fabricate.
- stages: array from this exact set: ${STAGES.join(", ")}. Map "early-stage" → ["Pre-Seed","Seed"], "growth" → ["Series B+"], "Series A/B" → ["Series A","Series B+"]. Empty if not stated.
- sectors: array from this exact set: ${SECTORS.join(", ")}. Map "enterprise software" → "B2B SaaS", "AI" → "AI/ML", "developer tools" → "DevTools", "cyber" → "Security", "infrastructure" → "Infra", "biotech" → "Bio", "climate tech" → "Climate", "healthtech" → "Health", "edtech" → "Education", "consumer tech" → "Consumer". Use "Other" only if nothing fits. Empty array if the fund is sector-agnostic.
- check_size_min_usd / check_size_max_usd: convert "$500K - $2M" → 500000 / 2000000. Omit both if not stated.
- partner_name: only if a SPECIFIC named partner appears as the contact for inbound deals. Don't extract a generic "team@" address.
- apply_url: only if the page itself or candidate links contain a clear "submit a pitch / apply / send us your deck" link. Empty string if no clear apply form.

Return ONLY the JSON object. No commentary.`;

/**
 * Run a single LLM extraction over a scraped fund page. Fails soft — returns
 * null if the page isn't a VC fund or extraction is too sparse to be useful.
 */
export async function extractFund(args: {
  pageText: string;
  sourceUrl: string;
  candidateApplyUrls: string[];
}): Promise<ExternalFund | null> {
  const user = `Source URL: ${args.sourceUrl}
Candidate apply URLs found on page: ${
    args.candidateApplyUrls.length > 0
      ? args.candidateApplyUrls.join(", ")
      : "(none)"
  }

Page text:
"""
${args.pageText}
"""`;

  let raw: LlmExtraction;
  try {
    raw = await completeJson<LlmExtraction>({
      system: SYSTEM,
      user,
      temperature: 0.2,
      maxTokens: 600,
    });
  } catch {
    return null;
  }

  if (!raw.is_vc_fund) return null;
  if (!raw.fund_name || !raw.thesis_one_liner) return null;

  const stages = (raw.stages ?? []).filter((s): s is Stage =>
    (STAGES as readonly string[]).includes(s)
  );
  const sectors = (raw.sectors ?? []).filter((s): s is Sector =>
    (SECTORS as readonly string[]).includes(s)
  );

  // Don't surface funds with zero structured signal — they'll match noisily.
  if (stages.length === 0 && sectors.length === 0) return null;

  const websiteUrl = originOf(args.sourceUrl);
  const applyUrl =
    raw.apply_url && /^https?:\/\//.test(raw.apply_url)
      ? raw.apply_url
      : args.candidateApplyUrls[0] ?? "";

  return {
    fundName: raw.fund_name.trim(),
    partnerName: raw.partner_name?.trim() || undefined,
    partnerTitle: raw.partner_title?.trim() || undefined,
    hq: raw.hq?.trim() || undefined,
    thesisOneLiner: raw.thesis_one_liner.trim().slice(0, 200),
    stages,
    sectors,
    checkSizeMinUsd:
      typeof raw.check_size_min_usd === "number" && raw.check_size_min_usd > 0
        ? raw.check_size_min_usd
        : undefined,
    checkSizeMaxUsd:
      typeof raw.check_size_max_usd === "number" && raw.check_size_max_usd > 0
        ? raw.check_size_max_usd
        : undefined,
    websiteUrl,
    applyUrl,
    sourceUrl: args.sourceUrl,
  };
}

function originOf(u: string): string {
  try {
    return new URL(u).origin;
  } catch {
    return u;
  }
}
