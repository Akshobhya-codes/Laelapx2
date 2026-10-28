/**
 * Shared pipeline vocabulary for the investor CRM (Syndicate and up).
 * A plain module so both server actions and client widgets can import it —
 * "use server" files may only export async functions.
 */
export const PIPELINE_STAGES = ["New", "Reviewing", "Meeting", "Diligence", "Passed", "Invested"] as const;
export type PipelineStage = (typeof PIPELINE_STAGES)[number];

export const MEETING_KINDS = [
  { id: "intro", label: "Intro" },
  { id: "follow_up", label: "Follow-up" },
  { id: "partner", label: "Partner meeting" },
  { id: "diligence", label: "Diligence" },
  { id: "other", label: "Other" },
] as const;

export const DECISIONS = [
  { id: "advance", label: "Advance" },
  { id: "hold", label: "Hold" },
  { id: "pass", label: "Pass" },
] as const;
