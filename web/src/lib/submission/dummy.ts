import type { Submission } from "./schema";

/**
 * Blank starter values for a fresh submission. Required-field-shaped so
 * react-hook-form's resolver doesn't choke on undefined.
 */
export const EMPTY_SUBMISSION: Submission = {
  companyName: "",
  oneLiner: "",
  websiteUrl: "",
  logoUrl: "",
  foundedYear: new Date().getFullYear(),
  hqCity: "",
  hqCountry: "",
  stage: "Pre-Seed",
  sectors: [],
  problemDescription: "",
  whyNow: "",
  solutionDescription: "",
  demoVideoUrl: "",
  icpDescription: "",
  tamUsd: 0,
  tamReasoning: "",
  competitorsAndEdge: "",
  defensibility: "",
  productStage: "Idea",
  launched: false,
  customerCount: 0,
  mrrUsd: undefined,
  momGrowthPct: undefined,
  milestones: [""],
  founders: [{ name: "", role: "", linkedinUrl: "", oneLineBio: "" }],
  whyThisTeam: "",
  teamSize: 1,
  advisors: undefined,
  raisedToDateUsd: undefined,
  raisedFromWhom: undefined,
  raisingUsd: 0,
  roundType: "Pre-Seed",
  useOfFunds: "",
  targetCloseDate: undefined,
  pitchDeckUrl: "",
  showFinancialsPublic: true,
  openToInvestorContact: true,
};

/**
 * Realistic-looking fake startup so testing the form is one click.
 * Threadline — AI customer-support agent for DTC e-commerce brands.
 */
export const DUMMY_SUBMISSION: Submission = {
  companyName: "Threadline",
  oneLiner:
    "AI customer-support agent that resolves 70% of DTC tickets without a human.",
  websiteUrl: "https://threadline.ai",
  logoUrl: "",
  foundedYear: 2024,
  hqCity: "Brooklyn",
  hqCountry: "USA",
  stage: "Seed",
  sectors: ["B2B SaaS", "AI/ML", "E-commerce"],

  problemDescription:
    "DTC brands receive thousands of repetitive support tickets — sizing, returns, order status — and either burn margin on a CX team or annoy customers with bad chatbots. Existing AI support tools hallucinate on product details and can't take real actions like issuing refunds or editing orders.",
  whyNow:
    "LLMs are finally good enough to ground answers in a brand's actual product catalog and policy docs, and Shopify/Stripe APIs are mature enough to let an AI agent take real action — refund, replace, edit order — safely. Two years ago neither was true.",
  solutionDescription:
    "Threadline plugs into Shopify, Gorgias, and Klaviyo. It ingests every product page, return policy, and past ticket, then handles 70% of incoming support autonomously — including refunds and replacements within configurable rules. Brands cut CX headcount by half, customers get instant resolution.",
  demoVideoUrl: "https://www.loom.com/share/threadline-demo",

  icpDescription:
    "DTC e-commerce brands doing $5M–$100M in revenue with 5+ FTE customer support headcount. Beachhead: Shopify Plus brands in apparel and home goods.",
  tamUsd: 8_000_000_000,
  tamReasoning:
    "250K Shopify Plus brands × avg $32K/yr CX automation spend = $8B serviceable market.",
  competitorsAndEdge:
    "Gorgias AI is bolted onto a legacy ticketing UI and won't take action. Intercom Fin is built for SaaS, not commerce. Siena is closest but slower (45-day implementation vs our 4-day) and doesn't ground in product data.",
  defensibility:
    "Proprietary brand-policy fine-tuning on every customer's data + native action APIs into Shopify/Stripe. Switching cost compounds with each ticket resolved — the agent gets sharper.",

  productStage: "Live",
  launched: true,
  customerCount: 27,
  mrrUsd: 35_000,
  momGrowthPct: 22,
  milestones: [
    "Closed first 10 paid pilots in 8 weeks.",
    "Hit $35K MRR within 6 months of launch.",
    "Signed Glossier as design-partner.",
  ],

  founders: [
    {
      name: "Maya Chen",
      role: "CEO",
      linkedinUrl: "https://linkedin.com/in/mayachen",
      oneLineBio:
        "ex-Shopify PM, built returns flow used by 40K merchants.",
    },
    {
      name: "Daniel Roth",
      role: "CTO",
      linkedinUrl: "https://linkedin.com/in/danielroth",
      oneLineBio: "ex-Anthropic research, MIT '19.",
    },
  ],
  whyThisTeam:
    "Maya knows the merchant pain firsthand — she ran returns infra at Shopify. Daniel built one of the first production-deployed RAG systems at Anthropic. We've been working together since college and shipped 3 products to scale before this one.",
  teamSize: 6,
  advisors: "Alex Heath (ex-Stripe), Operators Collective",

  raisedToDateUsd: 850_000,
  raisedFromWhom: "BoxGroup, Hustle Fund, angels (pre-seed)",
  raisingUsd: 3_500_000,
  roundType: "Seed",
  useOfFunds:
    "60% engineering hires (3 senior eng), 25% GTM (1 head of sales + tooling), 15% inference + infra costs.",
  targetCloseDate: "2026-09-30",
  pitchDeckUrl: "https://docsend.com/v/threadline-seed",

  showFinancialsPublic: true,
  openToInvestorContact: true,
};
