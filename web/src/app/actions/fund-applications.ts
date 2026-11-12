"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { stackServerApp } from "@/stack";
import { CONCIERGE } from "@/lib/billing/plans";
import { getFounderEntitlement } from "@/lib/billing/entitlements";
import { createConciergeCheckout, createStripeCustomer, isStripeConfigured } from "@/lib/billing/stripe";
import { getStripeCustomerId, saveStripeCustomerId } from "@/lib/insforge/billing";
import { getSubmissionBySlug } from "@/lib/insforge/submissions";
import {
  createApplication,
  getExternalFund,
  getKickoff,
  kickoffIsPaid,
  listApplicationsForSubmission,
  updateApplication,
  upsertKickoff,
} from "@/lib/insforge/fund-network";
import { requireAdmin } from "@/lib/billing/admin";
import type { ApplicationStatus, KickoffStatus } from "@/lib/insforge/fund-network";

/**
 * Applying to out-of-network funds (Laelapx+). Two ways:
 *   - the founder applies themselves: we record it and hand back the link;
 *   - the Laelapx team applies for them: paid per application via Checkout,
 *     plus a one-time kickoff call the first time.
 */

/** Owner + plan check shared by both paths. */
async function authorize(slug: string, domain: string) {
  const user = await stackServerApp.getUser({ or: "redirect" });
  const sub = await getSubmissionBySlug(slug);
  if (!sub || sub.ownerUserId !== user.id) throw new Error("Not your submission");
  const ent = await getFounderEntitlement(user.id);
  if (!ent.plan.features[CONCIERGE.requiredFeature]) {
    throw new Error("Applying to outside funds is part of Laelapx+.");
  }
  const fund = await getExternalFund(domain);
  if (!fund) throw new Error("Fund not found");
  return { user, sub, fund };
}

/** Founder applies themselves. Records it once, returns the URL to open. */
export async function recordSelfApplicationAction(slug: string, domain: string): Promise<{ url: string }> {
  const { user, sub, fund } = await authorize(slug, domain);
  const existing = await listApplicationsForSubmission(sub.id);
  if (!existing.some((a) => a.fundDomain === domain && a.mode === "self")) {
    await createApplication({
      founderUserId: user.id,
      submissionId: sub.id,
      fundDomain: domain,
      mode: "self",
      status: "applied",
      amountCents: 0,
    });
    revalidatePath(`/founder/${slug}`);
  }
  return { url: fund.applyUrl || fund.websiteUrl };
}

async function ensureCustomer(user: { id: string; primaryEmail: string | null; displayName: string | null }): Promise<string> {
  const existing = await getStripeCustomerId(user.id);
  if (existing) return existing;
  const id = await createStripeCustomer({ userId: user.id, email: user.primaryEmail, name: user.displayName });
  await saveStripeCustomerId({ userId: user.id, stripeCustomerId: id, email: user.primaryEmail });
  return id;
}

/** Ask the Laelapx team to apply. Sends the founder to Stripe Checkout. */
export async function requestConciergeApplicationAction(input: {
  slug: string;
  domain: string;
  notes: string;
}): Promise<never> {
  if (!isStripeConfigured()) throw new Error("Payments aren't configured yet.");
  const { user, sub, fund } = await authorize(input.slug, input.domain);

  const existing = await listApplicationsForSubmission(sub.id);
  const active = existing.find(
    (a) => a.fundDomain === input.domain && a.mode === "concierge" && a.status !== "awaiting_payment"
  );
  if (active) throw new Error("We're already applying to this fund for you.");

  const kickoff = await getKickoff(user.id);
  const kickoffCents = kickoffIsPaid(kickoff) ? null : CONCIERGE.kickoffCents;

  const app = await createApplication({
    founderUserId: user.id,
    submissionId: sub.id,
    fundDomain: input.domain,
    mode: "concierge",
    status: "awaiting_payment",
    amountCents: CONCIERGE.applicationCents + (kickoffCents ?? 0),
    founderNotes: input.notes.trim().slice(0, 2000) || null,
  });
  if (kickoffCents) {
    await upsertKickoff(user.id, { status: "awaiting_payment", amountCents: kickoffCents });
  }

  const customerId = await ensureCustomer(user);
  const { url, sessionId } = await createConciergeCheckout({
    customerId,
    userId: user.id,
    applicationId: app.id,
    fundName: fund.fundName,
    applicationCents: CONCIERGE.applicationCents,
    kickoffCents,
    returnPath: `/founder/${input.slug}`,
  });
  await updateApplication(app.id, { stripeCheckoutSessionId: sessionId });
  redirect(url);
}

/* ─── ADMIN ──────────────────────────────────────────────────────────── */

export async function adminUpdateApplicationAction(input: {
  id: string;
  status: ApplicationStatus;
  adminNotes: string | null;
}): Promise<void> {
  await requireAdmin();
  await updateApplication(input.id, { status: input.status, adminNotes: input.adminNotes });
  revalidatePath("/admin");
}

export async function adminUpdateKickoffAction(input: {
  founderUserId: string;
  status: KickoffStatus;
  scheduledFor: string | null;
  adminNotes: string | null;
}): Promise<void> {
  await requireAdmin();
  await upsertKickoff(input.founderUserId, {
    status: input.status,
    scheduledFor: input.scheduledFor,
    adminNotes: input.adminNotes,
  });
  revalidatePath("/admin");
}
