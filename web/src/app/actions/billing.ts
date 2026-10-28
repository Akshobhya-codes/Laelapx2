"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { stackServerApp } from "@/stack";
import {
  getPlan,
  FOUNDER_REVIEW,
  PILOT_DAYS,
  INVESTOR_PLANS,
  type Cadence,
  type Side,
} from "@/lib/billing/plans";
import {
  isStripeConfigured,
  createSubscriptionCheckout,
  createReviewCheckout,
  createPortalSession,
  createStripeCustomer,
} from "@/lib/billing/stripe";
import {
  getStripeCustomerId,
  saveStripeCustomerId,
  getSubscription,
  upsertSubscription,
  createReviewOrder,
  updateReviewOrder,
  ensureTeam,
  getTeamByOwner,
  listTeamMembers,
  inviteTeamMember,
  removeTeamMember,
  upsertPilotFeedback,
  saveInvestorNote,
} from "@/lib/insforge/billing";
import { getInvestorEntitlement } from "@/lib/billing/entitlements";
import { getSubmissionBySlug } from "@/lib/insforge/submissions";
import { getInvestorByOwner } from "@/lib/insforge/investors";
import { createNotification } from "@/lib/insforge/notifications";
import { sendEmail } from "@/lib/email/sender";
import {
  teamInviteEmail,
  reviewDeliveredEmail,
} from "@/lib/email/billing-templates";
import { requireAdmin } from "@/lib/billing/admin";

/* ─── HELPERS ────────────────────────────────────────────────────────── */

async function ensureCustomer(user: {
  id: string;
  primaryEmail: string | null;
  displayName: string | null;
}): Promise<string> {
  const existing = await getStripeCustomerId(user.id);
  if (existing) return existing;
  const id = await createStripeCustomer({
    userId: user.id,
    email: user.primaryEmail,
    name: user.displayName,
  });
  await saveStripeCustomerId({
    userId: user.id,
    stripeCustomerId: id,
    email: user.primaryEmail,
  });
  return id;
}

function returnPathFor(side: Side): string {
  return `/billing?side=${side}`;
}

/* ─── CHECKOUT ───────────────────────────────────────────────────────── */

/**
 * Send the user to Stripe Checkout for a plan. Redirects, so the caller
 * should let the redirect error propagate.
 */
export async function startCheckoutAction(
  side: Side,
  planId: string,
  cadence: Cadence
): Promise<never> {
  const user = await stackServerApp.getUser({ or: "redirect" });
  const plan = getPlan(side, planId);
  if (!plan) throw new Error("Unknown plan");
  if (plan.contactOnly) throw new Error("This plan is arranged by contacting us");
  if ((plan.price[cadence] ?? 0) === 0) throw new Error("This plan has no checkout");
  if (!isStripeConfigured()) {
    throw new Error("Payments aren't configured yet. Add STRIPE_SECRET_KEY to .env.local.");
  }

  // One live subscription per side. Changes go through the portal, which
  // prorates correctly; a second Checkout would double-bill.
  const current = await getSubscription(user.id, side);
  if (
    current?.stripeSubscriptionId &&
    (current.status === "active" || current.status === "past_due" || current.status === "trialing")
  ) {
    redirect(`/billing?side=${side}&notice=use-portal`);
  }

  const customerId = await ensureCustomer(user);
  const url = await createSubscriptionCheckout({
    customerId,
    userId: user.id,
    side,
    planId: plan.id,
    cadence,
    returnPath: returnPathFor(side),
  });
  redirect(url);
}

/** Stripe's hosted portal: change plan, update card, cancel. */
export async function openPortalAction(side: Side): Promise<never> {
  const user = await stackServerApp.getUser({ or: "redirect" });
  if (!isStripeConfigured()) throw new Error("Payments aren't configured yet.");
  const customerId = await ensureCustomer(user);
  const url = await createPortalSession({
    customerId,
    returnPath: returnPathFor(side),
  });
  redirect(url);
}

/* ─── PILOT ──────────────────────────────────────────────────────────── */

/** Free investor pilot: no Stripe, just a trialing row that expires. */
export async function startPilotAction(): Promise<never> {
  const user = await stackServerApp.getUser({ or: "redirect" });
  const existing = await getSubscription(user.id, "investor");
  if (existing?.hasUsedPilot || existing?.plan === "pilot") {
    throw new Error("The pilot can only be used once.");
  }
  if (existing && (existing.status === "active" || existing.status === "trialing")) {
    throw new Error("You already have an active plan.");
  }
  const trialEnd = new Date(Date.now() + PILOT_DAYS * 24 * 60 * 60 * 1000).toISOString();
  await upsertSubscription({
    userId: user.id,
    side: "investor",
    plan: "pilot",
    status: "trialing",
    cadence: null,
    trialEnd,
    hasUsedPilot: true,
    seats: INVESTOR_PLANS.pilot.features.seats,
  });
  revalidatePath("/funder");
  revalidatePath("/funder/discover");
  revalidatePath("/billing");
  redirect("/funder/discover?pilot=started");
}

/* ─── FOUNDER REVIEW ($499 one-time) ─────────────────────────────────── */

export async function orderFounderReviewAction(input: {
  slug: string | null;
  wantsCall: boolean;
  notes: string;
}): Promise<never> {
  const user = await stackServerApp.getUser({ or: "redirect" });
  if (!isStripeConfigured()) throw new Error("Payments aren't configured yet.");

  let submissionId: string | null = null;
  let deckUrl: string | null = null;
  if (input.slug) {
    const sub = await getSubmissionBySlug(input.slug);
    if (!sub || sub.ownerUserId !== user.id) throw new Error("Not your submission");
    submissionId = sub.id;
    deckUrl = sub.data.pitchDeckUrl || null;
  }

  const order = await createReviewOrder({
    userId: user.id,
    submissionId,
    amountCents: FOUNDER_REVIEW.priceCents,
    wantsCall: input.wantsCall,
    founderNotes: input.notes.trim() || null,
    deckUrl,
  });

  const customerId = await ensureCustomer(user);
  const url = await createReviewCheckout({
    customerId,
    userId: user.id,
    orderId: order.id,
    returnPath: returnPathFor("founder"),
  });
  redirect(url);
}

/* ─── TEAM SEATS ─────────────────────────────────────────────────────── */

export async function inviteTeammateAction(
  email: string
): Promise<{ ok: boolean; error?: string }> {
  const user = await stackServerApp.getUser({ or: "redirect" });
  const ent = await getInvestorEntitlement({ userId: user.id, email: user.primaryEmail });
  if (!ent.active || !ent.plan) return { ok: false, error: "You need an active investor plan." };
  if (ent.isTeamMember) return { ok: false, error: "Only the account owner can invite teammates." };
  if (!ent.plan.features.teamAccess) {
    return { ok: false, error: `Team seats start at Micro Fund. ${ent.plan.name} is a single seat.` };
  }

  const trimmed = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return { ok: false, error: "Enter a valid email." };
  if (trimmed === (user.primaryEmail ?? "").toLowerCase()) return { ok: false, error: "That's you." };

  const inv = await getInvestorByOwner(user.id);
  const team = await ensureTeam({
    ownerUserId: user.id,
    name: inv?.data.fundName ?? `${user.displayName ?? "Your"} team`,
    ownerEmail: user.primaryEmail,
  });
  const members = await listTeamMembers(team.id);
  const occupied = members.filter((m) => m.email.toLowerCase() !== trimmed).length;
  if (occupied >= ent.seats) {
    return { ok: false, error: `All ${ent.seats} seats are in use. Remove someone or upgrade.` };
  }

  await inviteTeamMember({ teamId: team.id, email: trimmed });

  const tpl = teamInviteEmail({
    inviterName: user.displayName ?? "A teammate",
    teamName: team.name,
    planName: ent.plan.name,
  });
  await sendEmail({ to: trimmed, subject: tpl.subject, html: tpl.html });

  revalidatePath("/billing");
  return { ok: true };
}

export async function removeTeammateAction(memberId: string): Promise<void> {
  const user = await stackServerApp.getUser({ or: "redirect" });
  const team = await getTeamByOwner(user.id);
  if (!team) throw new Error("No team");
  await removeTeamMember(memberId, team.id);
  revalidatePath("/billing");
}

/* ─── PILOT FEEDBACK + NOTES ─────────────────────────────────────────── */

export async function pilotFeedbackAction(input: {
  slug: string;
  useful: boolean;
  note: string;
}): Promise<void> {
  const user = await stackServerApp.getUser({ or: "redirect" });
  const sub = await getSubmissionBySlug(input.slug);
  if (!sub) throw new Error("Submission not found");
  await upsertPilotFeedback({
    investorUserId: user.id,
    submissionId: sub.id,
    useful: input.useful,
    note: input.note.trim() || null,
  });
  revalidatePath(`/s/${input.slug}`);
}

export async function saveNoteAction(input: {
  slug: string;
  body: string;
  stage: string | null;
}): Promise<{ ok: boolean; error?: string }> {
  const user = await stackServerApp.getUser({ or: "redirect" });
  const ent = await getInvestorEntitlement({ userId: user.id, email: user.primaryEmail });
  if (!ent.active || !ent.plan?.features.notes) {
    return { ok: false, error: "Notes are part of Syndicate and up." };
  }
  const sub = await getSubmissionBySlug(input.slug);
  if (!sub) return { ok: false, error: "Submission not found" };
  await saveInvestorNote({
    accountUserId: ent.accountUserId,
    authorUserId: user.id,
    submissionId: sub.id,
    body: input.body.trim(),
    stage: input.stage,
  });
  revalidatePath(`/s/${input.slug}`);
  return { ok: true };
}

/* ─── ADMIN: review queue ────────────────────────────────────────────── */

export async function adminUpdateReviewOrderAction(input: {
  orderId: string;
  status: "paid" | "in_progress" | "delivered" | "refunded";
  memoUrl?: string;
  memoText?: string;
}): Promise<void> {
  const admin = await requireAdmin();
  const patch: Parameters<typeof updateReviewOrder>[1] = {
    status: input.status,
    reviewerUserId: admin.id,
  };
  if (input.memoUrl !== undefined) patch.memoUrl = input.memoUrl.trim() || null;
  if (input.memoText !== undefined) patch.memoText = input.memoText.trim() || null;
  if (input.status === "delivered") patch.deliveredAt = new Date().toISOString();

  const order = await updateReviewOrder(input.orderId, patch);

  if (input.status === "delivered") {
    await createNotification({
      userId: order.userId,
      kind: "review_delivered",
      payload: { message: "Your Founder Review is ready." },
      href: "/billing?side=founder",
    });
    const founder = await stackServerApp.getUser(order.userId);
    if (founder?.primaryEmail) {
      const tpl = reviewDeliveredEmail({
        founderFirstName: founder.displayName?.split(" ")[0] || "there",
        memoUrl: order.memoUrl,
      });
      await sendEmail({ to: founder.primaryEmail, subject: tpl.subject, html: tpl.html });
    }
  }
  revalidatePath("/admin");
  revalidatePath("/billing");
}
