import { z } from "zod";

export const STAGES = [
  "Pre-Seed",
  "Seed",
  "Series A",
  "Series B+",
] as const;

export const ROUND_TYPES = [
  "Pre-Seed",
  "Seed",
  "Series A",
  "Series B",
  "Series C+",
  "Bridge",
] as const;

export const PRODUCT_STAGES = [
  "Idea",
  "Prototype",
  "Beta",
  "Live",
  "Scaling",
] as const;

export const SECTORS = [
  "B2B SaaS",
  "Consumer",
  "Marketplace",
  "Fintech",
  "AI/ML",
  "Climate",
  "Health",
  "Bio",
  "Hardware",
  "DevTools",
  "Security",
  "Infra",
  "Education",
  "E-commerce",
  "Web3",
  "Robotics",
  "Defense",
  "Media",
  "Gaming",
  "Other",
] as const;

export const founderSchema = z.object({
  name: z.string().min(1, "Name required"),
  role: z.string().min(1, "Role required"),
  linkedinUrl: z
    .string()
    .url("Must be a URL")
    .or(z.literal(""))
    .optional(),
  oneLineBio: z.string().max(160, "Keep it under 160 chars").optional(),
});

export const submissionSchema = z.object({
  // Step 1 — Basics
  companyName: z.string().min(2, "Company name required"),
  oneLiner: z
    .string()
    .min(10, "Give us at least a sentence")
    .max(80, "Keep it under 80 characters"),
  websiteUrl: z.string().url("Must be a valid URL"),
  logoUrl: z.string().url().optional().or(z.literal("")),
  foundedYear: z
    .number({ message: "Year required" })
    .int()
    .min(1900)
    .max(new Date().getFullYear() + 1),
  hqCity: z.string().min(1, "City required"),
  hqCountry: z.string().min(1, "Country required"),
  stage: z.enum(STAGES),
  sectors: z.array(z.enum(SECTORS)).min(1, "Pick at least one sector"),

  // Step 2 — Problem & Solution
  problemDescription: z.string().min(40, "Tell us more"),
  whyNow: z.string().min(20, "Tell us more"),
  solutionDescription: z.string().min(40, "Tell us more"),
  demoVideoUrl: z.string().url().optional().or(z.literal("")),

  // Step 3 — Market & competition
  icpDescription: z.string().min(20, "Describe your ICP"),
  tamUsd: z
    .number({ message: "TAM required (USD)" })
    .int()
    .nonnegative(),
  tamReasoning: z.string().min(10, "How did you compute it?"),
  competitorsAndEdge: z.string().min(40, "Name competitors + your edge"),
  defensibility: z.string().min(20, "Why is this defensible?"),

  // Step 4 — Traction
  productStage: z.enum(PRODUCT_STAGES),
  launched: z.boolean(),
  customerCount: z.number().int().nonnegative(),
  mrrUsd: z.number().int().nonnegative().optional(),
  momGrowthPct: z.number().min(-100).max(10000).optional(),
  milestones: z
    .array(z.string().min(3))
    .min(1, "Add at least one milestone")
    .max(5),

  // Step 5 — Team
  founders: z.array(founderSchema).min(1, "Add at least one founder"),
  whyThisTeam: z.string().min(20, "Tell us why this team"),
  teamSize: z.number().int().min(1),
  advisors: z.string().optional(),

  // Step 6 — Ask
  raisedToDateUsd: z.number().int().nonnegative().optional(),
  raisedFromWhom: z.string().optional(),
  raisingUsd: z.number().int().nonnegative(),
  roundType: z.enum(ROUND_TYPES),
  useOfFunds: z.string().min(20, "Tell us where the money goes"),
  targetCloseDate: z.string().optional(),
  pitchDeckUrl: z.string().url().optional().or(z.literal("")),

  // Hidden / settings
  showFinancialsPublic: z.boolean(),
  openToInvestorContact: z.boolean(),
});

export type Submission = z.infer<typeof submissionSchema>;
export type Founder = z.infer<typeof founderSchema>;

export const STEPS = [
  { id: "basics", title: "Basics", subtitle: "Who and where" },
  { id: "problem-solution", title: "Problem & solution", subtitle: "The thesis" },
  { id: "market", title: "Market", subtitle: "Why this, why now" },
  { id: "traction", title: "Traction", subtitle: "Proof to date" },
  { id: "team", title: "Team", subtitle: "Who's building this" },
  { id: "ask", title: "The ask", subtitle: "Round + funds" },
] as const;

export type StepId = (typeof STEPS)[number]["id"];
