"use server";

import { revalidatePath } from "next/cache";
import { stackServerApp } from "@/stack";
import { getInvestorEntitlement, type InvestorEntitlement } from "@/lib/billing/entitlements";
import type { InvestorFeatures } from "@/lib/billing/plans";
import { getSubmissionBySlug } from "@/lib/insforge/submissions";
import { getTeamByOwner, listTeamMembers, isProfileUnlocked } from "@/lib/insforge/billing";
import {
  saveCustomCriteria,
  addMeeting,
  deleteMeeting,
  patchPipelineEntry,
  type MeetingKind,
  type Decision,
} from "@/lib/insforge/investor-workspace";
import { createNotification } from "@/lib/insforge/notifications";
import { PIPELINE_STAGES } from "@/lib/billing/pipeline";

/**
 * Investor workspace actions. Each one resolves the entitlement on the
 * server and checks the specific feature flag — the UI hiding a button is
 * never the only gate.
 */

type Result = { ok: true } | { ok: false; error: string };

const FEATURE_PLAN: Partial<Record<keyof InvestorFeatures, string>> = {
  customCriteria: "Emerging Fund",
  meetingTracking: "Emerging Fund",
  lightCrm: "Syndicate",
  partnerWorkflow: "Institutional Fund",
};

async function requireFeature(
  feature: keyof InvestorFeatures
): Promise<{ user: { id: string; displayName: string | null }; ent: InvestorEntitlement } | { error: string }> {
  const user = await stackServerApp.getUser({ or: "redirect" });
  const ent = await getInvestorEntitlement({ userId: user.id, email: user.primaryEmail });
  if (!ent.active || !ent.plan) return { error: "You need an active investor plan." };
  if (!ent.plan.features[feature]) {
    return { error: `That's part of ${FEATURE_PLAN[feature] ?? "a higher plan"} and up.` };
  }
  return { user, ent };
}

/** Only deals the account has actually opened can go on its pipeline. */
async function resolveUnlockedDeal(ent: InvestorEntitlement, slug: string) {
  const sub = await getSubmissionBySlug(slug);
  if (!sub) return null;
  if (!(await isProfileUnlocked(ent.accountUserId, sub.id))) return null;
  return sub;
}

/* ─── CUSTOM CRITERIA ────────────────────────────────────────────────── */

const clean = (xs: string[]) =>
  Array.from(new Set(xs.map((x) => x.trim()).filter(Boolean))).slice(0, 25);

export async function saveCriteriaAction(input: {
  minMrrUsd: number | null;
  minCustomers: number | null;
  minScore: number | null;
  launchedOnly: boolean;
  countries: string[];
  productStages: string[];
  keywords: string[];
}): Promise<Result> {
  const r = await requireFeature("customCriteria");
  if ("error" in r) return { ok: false, error: r.error };
  const nonNeg = (n: number | null) => (n === null || !Number.isFinite(n) ? null : Math.max(0, Math.round(n)));
  await saveCustomCriteria(r.ent.accountUserId, r.user.id, {
    minMrrUsd: nonNeg(input.minMrrUsd),
    minCustomers: nonNeg(input.minCustomers),
    minScore: input.minScore === null ? null : Math.min(100, nonNeg(input.minScore) ?? 0),
    launchedOnly: !!input.launchedOnly,
    countries: clean(input.countries),
    productStages: clean(input.productStages),
    keywords: clean(input.keywords),
  });
  revalidatePath("/funder/criteria");
  revalidatePath("/funder/discover");
  revalidatePath("/funder");
  return { ok: true };
}

/* ─── MEETINGS ───────────────────────────────────────────────────────── */

const KINDS: MeetingKind[] = ["intro", "follow_up", "partner", "diligence", "other"];

export async function addMeetingAction(input: {
  slug: string;
  metOn: string;
  kind: MeetingKind;
  attendees: string;
  notes: string;
}): Promise<Result> {
  const r = await requireFeature("meetingTracking");
  if ("error" in r) return { ok: false, error: r.error };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.metOn)) return { ok: false, error: "Pick a date." };
  if (!KINDS.includes(input.kind)) return { ok: false, error: "Unknown meeting type." };
  const sub = await resolveUnlockedDeal(r.ent, input.slug);
  if (!sub) return { ok: false, error: "Open this founder's profile first." };
  await addMeeting({
    accountUserId: r.ent.accountUserId,
    authorUserId: r.user.id,
    submissionId: sub.id,
    metOn: input.metOn,
    kind: input.kind,
    attendees: input.attendees.trim().slice(0, 300) || null,
    notes: input.notes.trim().slice(0, 4000) || null,
  });
  // A logged meeting implies the deal is at least at the meeting stage.
  revalidatePath(`/s/${input.slug}`);
  revalidatePath("/funder/pipeline");
  return { ok: true };
}

export async function deleteMeetingAction(meetingId: string, slug: string): Promise<Result> {
  const r = await requireFeature("meetingTracking");
  if ("error" in r) return { ok: false, error: r.error };
  await deleteMeeting(meetingId, r.ent.accountUserId);
  revalidatePath(`/s/${slug}`);
  revalidatePath("/funder/pipeline");
  return { ok: true };
}

/* ─── PIPELINE ───────────────────────────────────────────────────────── */

export async function moveDealAction(slug: string, stage: string | null): Promise<Result> {
  const r = await requireFeature("lightCrm");
  if ("error" in r) return { ok: false, error: r.error };
  if (stage !== null && !(PIPELINE_STAGES as readonly string[]).includes(stage)) {
    return { ok: false, error: "Unknown stage." };
  }
  const sub = await resolveUnlockedDeal(r.ent, slug);
  if (!sub) return { ok: false, error: "Open this founder's profile first." };
  await patchPipelineEntry({
    accountUserId: r.ent.accountUserId,
    actorUserId: r.user.id,
    submissionId: sub.id,
    stage,
  });
  revalidatePath("/funder/pipeline");
  revalidatePath(`/s/${slug}`);
  return { ok: true };
}

/* ─── PARTNER WORKFLOW ───────────────────────────────────────────────── */

export async function assignDealAction(slug: string, assigneeUserId: string | null): Promise<Result> {
  const r = await requireFeature("partnerWorkflow");
  if ("error" in r) return { ok: false, error: r.error };
  const sub = await resolveUnlockedDeal(r.ent, slug);
  if (!sub) return { ok: false, error: "Open this founder's profile first." };

  if (assigneeUserId) {
    // The assignee must be the account owner or an active teammate.
    const team = await getTeamByOwner(r.ent.accountUserId);
    const members = team ? await listTeamMembers(team.id) : [];
    const allowed = new Set([r.ent.accountUserId, ...members.filter((m) => m.status === "active" && m.userId).map((m) => m.userId!)]);
    if (!allowed.has(assigneeUserId)) return { ok: false, error: "That person isn't on your team." };
  }

  await patchPipelineEntry({
    accountUserId: r.ent.accountUserId,
    actorUserId: r.user.id,
    submissionId: sub.id,
    assignedToUserId: assigneeUserId,
  });

  if (assigneeUserId && assigneeUserId !== r.user.id) {
    await createNotification({
      userId: assigneeUserId,
      kind: "deal_assigned",
      payload: {
        startupSlug: sub.slug,
        startupName: sub.data.companyName,
        fromUserId: r.user.id,
        fromName: r.user.displayName ?? undefined,
      },
      href: `/s/${sub.slug}`,
    });
  }
  revalidatePath("/funder/pipeline");
  return { ok: true };
}

export async function decideDealAction(slug: string, decision: Decision | null): Promise<Result> {
  const r = await requireFeature("partnerWorkflow");
  if ("error" in r) return { ok: false, error: r.error };
  if (decision !== null && !["advance", "hold", "pass"].includes(decision)) {
    return { ok: false, error: "Unknown decision." };
  }
  const sub = await resolveUnlockedDeal(r.ent, slug);
  if (!sub) return { ok: false, error: "Open this founder's profile first." };
  await patchPipelineEntry({
    accountUserId: r.ent.accountUserId,
    actorUserId: r.user.id,
    submissionId: sub.id,
    decision,
    // A pass also moves the card, so the board reflects the decision.
    ...(decision === "pass" ? { stage: "Passed" } : {}),
  });
  revalidatePath("/funder/pipeline");
  return { ok: true };
}
