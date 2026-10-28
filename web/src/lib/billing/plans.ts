/**
 * Subscription plans — the single source of truth.
 *
 * Everything that gates a feature, renders a price, or creates a Stripe
 * product reads from this file. Changing a price or a limit here is the
 * whole change: the pricing page, the entitlement checks, and
 * `scripts/stripe-setup.mjs` all follow.
 *
 * Prices are the top of each range in the plan sheet. Stripe prices are
 * matched by `lookup_key` (e.g. "founder_plus_monthly"), so no price ids
 * live in env.
 *
 * Deliberately a plain data module (no "server-only"): the pricing page
 * and the client-side upgrade prompts import it too. Nothing secret here.
 */

export type Side = "founder" | "investor";
export type Cadence = "monthly" | "annual";

export type FounderPlanId = "free" | "founder_plus" | "laelapx_plus";
export type InvestorPlanId =
  | "pilot"
  | "angel"
  | "syndicate"
  | "micro_fund"
  | "emerging_fund"
  | "institutional"
  | "elite";
export type PlanId = FounderPlanId | InvestorPlanId;

export type FounderFeatures = {
  /** Deterministic rubric score + rubric gaps. Everyone. */
  basicScore: true;
  /** LLM-scored stage-specific report, AI narrative, section breakdown. */
  fullReport: boolean;
  /** Gaps ranked by impact with concrete fixes. */
  prioritizedFixes: boolean;
  /** Thesis-fit matches against investors on the platform. */
  investorFit: boolean;
  /** Eligible to be surfaced to investors (still requires consent + thresholds). */
  investorVisibility: boolean;
  /** Founder education sessions, pitch-readiness workshops, community events. */
  communityEvents: boolean;
  /** Market signals + external fund discovery (web-researched VCs). */
  researchTools: boolean;
  /** Deep deck review with iteration feedback. */
  deepDeckReview: boolean;
  /** Ongoing async support channel. */
  asyncSupport: boolean;
  /** In-person event invitations. */
  inPersonEvents: boolean;
};

export type InvestorFeatures = {
  /** Founder profiles the account may unlock per week. null = unlimited. */
  weeklyProfiles: number | null;
  /** Hard cap over the whole plan period (pilot only). null = none. */
  totalProfiles: number | null;
  /** Team seats including the owner. */
  seats: number;
  filters: boolean;
  notes: boolean;
  lightCrm: boolean;
  pipelineDashboard: boolean;
  teamAccess: boolean;
  customCriteria: boolean;
  sharedPipeline: boolean;
  meetingTracking: boolean;
  priorityReview: boolean;
  analytics: boolean;
  partnerWorkflow: boolean;
  quarterlyInsights: boolean;
  intelligenceLayer: boolean;
  ecosystemMaps: boolean;
  apiIntegrations: boolean;
  customReporting: boolean;
};

export type Price = {
  /** USD cents. */
  monthly: number | null;
  annual: number | null;
};

type PlanBase = {
  name: string;
  tagline: string;
  /** Who it's for — shown under the name on the pricing page. */
  audience: string;
  price: Price;
  /** Bullet list for the pricing card, in display order. */
  highlights: string[];
  /** Free trial length in days, if any. */
  trialDays?: number;
  /** "Contact sales" instead of checkout. */
  contactOnly?: boolean;
  /** Visual emphasis on the pricing page. */
  recommended?: boolean;
};

export type FounderPlan = PlanBase & {
  id: FounderPlanId;
  side: "founder";
  features: FounderFeatures;
};

export type InvestorPlan = PlanBase & {
  id: InvestorPlanId;
  side: "investor";
  features: InvestorFeatures;
};

export type Plan = FounderPlan | InvestorPlan;

const usd = (dollars: number) => Math.round(dollars * 100);

/* ─── FOUNDER ────────────────────────────────────────────────────────── */

export const FOUNDER_PLANS: Record<FounderPlanId, FounderPlan> = {
  free: {
    id: "free",
    side: "founder",
    name: "Free",
    tagline: "Submit, learn, and see where you stand.",
    audience: "Every founder",
    price: { monthly: 0, annual: 0 },
    highlights: [
      "Basic fundability score",
      "Simple feedback on your submission",
      "Public startup page you can share",
      "No investor visibility",
    ],
    features: {
      basicScore: true,
      fullReport: false,
      prioritizedFixes: false,
      investorFit: false,
      investorVisibility: false,
      communityEvents: false,
      researchTools: false,
      deepDeckReview: false,
      asyncSupport: false,
      inPersonEvents: false,
    },
  },
  founder_plus: {
    id: "founder_plus",
    side: "founder",
    name: "Founder+",
    tagline: "The full report, and a path to the investors who fit.",
    audience: "Founders actively raising",
    price: { monthly: usd(15), annual: usd(100) },
    recommended: true,
    highlights: [
      "Full fundability report",
      "Prioritized fixes",
      "Investor-fit analysis",
      "Founder education sessions, pitch-readiness workshops, and curated community events",
      "Optional visibility to relevant investors*",
    ],
    features: {
      basicScore: true,
      fullReport: true,
      prioritizedFixes: true,
      investorFit: true,
      investorVisibility: true,
      communityEvents: true,
      researchTools: false,
      deepDeckReview: false,
      asyncSupport: false,
      inPersonEvents: false,
    },
  },
  laelapx_plus: {
    id: "laelapx_plus",
    side: "founder",
    name: "Laelapx+",
    tagline: "Every founder tool we have, plus hands-on help.",
    audience: "Founders who want us in the loop",
    price: { monthly: usd(30), annual: usd(250) },
    highlights: [
      "Everything in Founder+",
      "Full access to available Laelapx founder tools",
      "Deep deck review with iteration feedback",
      "Ongoing async support",
      "In-person event invitations",
      "Optional visibility to relevant investors*",
    ],
    features: {
      basicScore: true,
      fullReport: true,
      prioritizedFixes: true,
      investorFit: true,
      investorVisibility: true,
      communityEvents: true,
      researchTools: true,
      deepDeckReview: true,
      asyncSupport: true,
      inPersonEvents: true,
    },
  },
};

/** One-time, human-delivered. Not a subscription. */
export const FOUNDER_REVIEW = {
  id: "founder_review" as const,
  name: "Founder Review",
  priceCents: usd(499),
  highlights: [
    "Human deck review",
    "Written memo",
    "Optional 30–45 minute call",
    "Fundraising-readiness plan",
  ],
  /** Target turnaround shown to the founder after purchase. */
  turnaroundDays: 5,
};

/* ─── INVESTOR ───────────────────────────────────────────────────────── */

const INVESTOR_BASE: InvestorFeatures = {
  weeklyProfiles: 0,
  totalProfiles: null,
  seats: 1,
  filters: false,
  notes: false,
  lightCrm: false,
  pipelineDashboard: false,
  teamAccess: false,
  customCriteria: false,
  sharedPipeline: false,
  meetingTracking: false,
  priorityReview: false,
  analytics: false,
  partnerWorkflow: false,
  quarterlyInsights: false,
  intelligenceLayer: false,
  ecosystemMaps: false,
  apiIntegrations: false,
  customReporting: false,
};

export const PILOT_DAYS = 60;

export const INVESTOR_PLANS: Record<InvestorPlanId, InvestorPlan> = {
  pilot: {
    id: "pilot",
    side: "investor",
    name: "Pilot",
    tagline: "Test the matching on real founders. Tell us if it's useful.",
    audience: "Angels and small funds trying it out",
    price: { monthly: 0, annual: null },
    trialDays: PILOT_DAYS,
    highlights: [
      `Free for ${PILOT_DAYS} days`,
      "15 founder profiles matched to your stated criteria",
      "Basic matching",
      "Feedback loop — we track whether the matches were useful",
    ],
    features: {
      ...INVESTOR_BASE,
      weeklyProfiles: null,
      totalProfiles: 15,
    },
  },
  angel: {
    id: "angel",
    side: "investor",
    name: "Angel",
    tagline: "A steady stream of founders who match your criteria.",
    audience: "Individual angels",
    price: { monthly: usd(299), annual: null },
    highlights: [
      "5 founder profiles per week, matched to your criteria",
      "Investor profile",
      "Founder snapshots",
    ],
    features: {
      ...INVESTOR_BASE,
      weeklyProfiles: 5,
    },
  },
  syndicate: {
    id: "syndicate",
    side: "investor",
    name: "Syndicate",
    tagline: "More flow, plus the tools to track it.",
    audience: "Syndicate leads and solo GPs",
    price: { monthly: usd(750), annual: null },
    recommended: true,
    highlights: [
      "10 founder profiles per week",
      "Filters",
      "Notes on every founder",
      "Light CRM",
    ],
    features: {
      ...INVESTOR_BASE,
      weeklyProfiles: 10,
      filters: true,
      notes: true,
      lightCrm: true,
    },
  },
  micro_fund: {
    id: "micro_fund",
    side: "investor",
    name: "Micro Fund",
    tagline: "Built for a small team running a real pipeline.",
    audience: "Funds under $25M AUM",
    price: { monthly: usd(1500), annual: null },
    highlights: [
      "20 founder profiles per week",
      "Team access — 2 seats",
      "Pipeline dashboard",
      "Filters, notes, and light CRM",
    ],
    features: {
      ...INVESTOR_BASE,
      weeklyProfiles: 20,
      seats: 2,
      filters: true,
      notes: true,
      lightCrm: true,
      pipelineDashboard: true,
      teamAccess: true,
    },
  },
  emerging_fund: {
    id: "emerging_fund",
    side: "investor",
    name: "Emerging Fund",
    tagline: "Custom criteria and a pipeline the whole team shares.",
    audience: "Funds with $25M–$100M AUM",
    price: { monthly: usd(4000), annual: null },
    highlights: [
      "40 founder profiles per week",
      "4 account seats",
      "Custom matching criteria",
      "Shared pipeline and meeting tracking",
      "Priority review for investor-fit matching, based on objective platform criteria",
    ],
    features: {
      ...INVESTOR_BASE,
      weeklyProfiles: 40,
      seats: 4,
      filters: true,
      notes: true,
      lightCrm: true,
      pipelineDashboard: true,
      teamAccess: true,
      customCriteria: true,
      sharedPipeline: true,
      meetingTracking: true,
      priorityReview: true,
    },
  },
  institutional: {
    id: "institutional",
    side: "investor",
    name: "Institutional Fund",
    tagline: "Partner-level workflow with analytics on top.",
    audience: "Funds with $100M–$500M AUM",
    price: { monthly: usd(8000), annual: null },
    highlights: [
      "Unlimited founder profiles",
      "Multi-seat access — 10 seats",
      "Analytics",
      "Partner workflow",
      "Quarterly insights",
    ],
    features: {
      ...INVESTOR_BASE,
      weeklyProfiles: null,
      seats: 10,
      filters: true,
      notes: true,
      lightCrm: true,
      pipelineDashboard: true,
      teamAccess: true,
      customCriteria: true,
      sharedPipeline: true,
      meetingTracking: true,
      priorityReview: true,
      analytics: true,
      partnerWorkflow: true,
      quarterlyInsights: true,
    },
  },
  elite: {
    id: "elite",
    side: "investor",
    name: "Elite / Enterprise",
    tagline: "A proprietary intelligence layer, shaped to your firm.",
    audience: "Funds with $500M+ AUM",
    price: { monthly: usd(10000), annual: null },
    contactOnly: true,
    highlights: [
      "Everything in Institutional",
      "Proprietary intelligence layer",
      "Ecosystem maps",
      "API and CRM integrations",
      "Custom reporting",
    ],
    features: {
      ...INVESTOR_BASE,
      weeklyProfiles: null,
      seats: 25,
      filters: true,
      notes: true,
      lightCrm: true,
      pipelineDashboard: true,
      teamAccess: true,
      customCriteria: true,
      sharedPipeline: true,
      meetingTracking: true,
      priorityReview: true,
      analytics: true,
      partnerWorkflow: true,
      quarterlyInsights: true,
      intelligenceLayer: true,
      ecosystemMaps: true,
      apiIntegrations: true,
      customReporting: true,
    },
  },
};

/* ─── ORDERING + LOOKUPS ─────────────────────────────────────────────── */

/** Display order, cheapest first. Also the upgrade ladder. */
export const FOUNDER_PLAN_ORDER: FounderPlanId[] = [
  "free",
  "founder_plus",
  "laelapx_plus",
];
export const INVESTOR_PLAN_ORDER: InvestorPlanId[] = [
  "pilot",
  "angel",
  "syndicate",
  "micro_fund",
  "emerging_fund",
  "institutional",
  "elite",
];

export function getPlan(side: "founder", id: string): FounderPlan | null;
export function getPlan(side: "investor", id: string): InvestorPlan | null;
export function getPlan(side: Side, id: string): Plan | null;
export function getPlan(side: Side, id: string): Plan | null {
  if (side === "founder") {
    return (FOUNDER_PLANS as Record<string, FounderPlan>)[id] ?? null;
  }
  return (INVESTOR_PLANS as Record<string, InvestorPlan>)[id] ?? null;
}

export function isPaidPlan(plan: Plan): boolean {
  return (plan.price.monthly ?? 0) > 0 && !plan.trialDays;
}

/** Stripe `lookup_key` for a plan + cadence. */
export function priceLookupKey(planId: PlanId, cadence: Cadence): string {
  return `${planId}_${cadence}`;
}

export const REVIEW_LOOKUP_KEY = "founder_review_onetime";

export function formatPrice(cents: number | null): string {
  if (cents === null) return "—";
  if (cents === 0) return "$0";
  const dollars = cents / 100;
  return dollars % 1 === 0
    ? `$${dollars.toLocaleString("en-US")}`
    : `$${dollars.toFixed(2)}`;
}

/* ─── DISCLAIMERS (verbatim from the plan sheet) ─────────────────────── */

export const DISCLAIMERS = [
  "Payment improves the depth of feedback and product features. Payment does not guarantee investor exposure, meetings, introductions, funding, or favorable scoring.",
  "Laelapx does not provide investment advice, legal advice, tax advice, valuation opinions, or recommendations to buy or sell securities. Investors are responsible for conducting their own diligence.",
  "Laelapx does not act as a broker-dealer, placement agent, finder, or investment adviser. Laelapx does not negotiate investment terms, handle investor funds, or receive compensation based on whether financing occurs.",
  "Paid status does not directly improve a company's fundability score or investor-fit score.",
  "Investor access is limited to founder-approved profiles and materials.",
];

/**
 * The conditions under which a paying founder becomes visible to investors.
 * Shown next to the "*" on the pricing page and enforced in
 * lib/billing/visibility.ts.
 */
export const VISIBILITY_CONDITIONS = [
  "the founder consents",
  "the profile meets platform completeness",
  "the profile meets platform quality and fundability thresholds — completeness of company profile, clarity of business model, deck quality, founder responsiveness, evidence supporting key claims, consistency of submitted materials",
  "the profile meets investor-fit criteria (determined by the investor)",
];
