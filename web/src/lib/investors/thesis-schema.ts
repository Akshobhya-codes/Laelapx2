import { z } from "zod";
import { STAGES, SECTORS } from "@/lib/submission/schema";

const STAGE_VALUES = ["Pre-Seed", "Seed", "Series A", "Series B+"] as const;

export const thesisSchema = z.object({
  fundName: z.string().min(2, "Fund name required"),
  partnerName: z.string().min(2, "Partner name required"),
  partnerTitle: z.string().optional(),
  hq: z.string().optional(),
  thesisOneLiner: z
    .string()
    .min(10, "Tell us more")
    .max(180, "Keep it under 180 chars"),
  stages: z.array(z.enum(STAGE_VALUES)).min(1, "Pick at least one stage"),
  sectors: z.array(z.enum(SECTORS)).min(1, "Pick at least one sector"),
  checkSizeMinUsd: z.number().int().nonnegative().optional(),
  checkSizeMaxUsd: z.number().int().nonnegative().optional(),
  notablePortfolio: z.string().optional(), // comma-separated, parsed to array on save
  websiteUrl: z
    .string()
    .url("Must be a valid URL")
    .or(z.literal(""))
    .optional(),
});

export type ThesisInput = z.infer<typeof thesisSchema>;

export const STAGE_OPTIONS = STAGE_VALUES;
export { SECTORS, STAGES };
