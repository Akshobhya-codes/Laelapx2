"use server";

import { revalidatePath } from "next/cache";
import { stackServerApp } from "@/stack";
import { getFounderEntitlement } from "@/lib/billing/entitlements";
import { requireAdmin, adminEmails } from "@/lib/billing/admin";
import { getSubmissionBySlug } from "@/lib/insforge/submissions";
import {
  getEvent,
  listRsvps,
  addRsvp,
  removeRsvp,
  createEvent,
  deleteEvent,
  addSupportMessage,
  markSupportRead,
  listDeckReviews,
  countDeckReviewsSince,
  saveDeckReview,
  type EventKind,
} from "@/lib/insforge/founder-tools";
import { createNotification } from "@/lib/insforge/notifications";
import { sendEmail } from "@/lib/email/sender";
import { supportFromFounderEmail, supportReplyEmail } from "@/lib/email/billing-templates";
import {
  fetchDeckPdf,
  reviewDeck,
  DeckFetchError,
  DECK_REVIEWS_PER_MONTH,
} from "@/lib/scoring/deck-review";

type Result = { ok: true } | { ok: false; error: string };

/* ─── EVENTS ─────────────────────────────────────────────────────────── */

/** In-person events need Laelapx+; everything else needs Founder+. */
function eventAllowed(kind: EventKind, f: { communityEvents: boolean; inPersonEvents: boolean }) {
  return kind === "in_person" ? f.inPersonEvents : f.communityEvents;
}

export async function rsvpAction(eventId: string, going: boolean): Promise<Result> {
  const user = await stackServerApp.getUser({ or: "redirect" });
  const event = await getEvent(eventId);
  if (!event) return { ok: false, error: "Event not found." };

  if (!going) {
    await removeRsvp(eventId, user.id);
    revalidatePath("/events");
    return { ok: true };
  }

  const ent = await getFounderEntitlement(user.id);
  if (!eventAllowed(event.kind, ent.plan.features)) {
    return {
      ok: false,
      error: event.kind === "in_person" ? "In-person events are part of Laelapx+." : "Events are part of Founder+ and Laelapx+.",
    };
  }
  if (new Date(event.startsAt).getTime() < Date.now()) return { ok: false, error: "This event already started." };
  if (event.capacity !== null) {
    const rsvps = (await listRsvps([eventId])).get(eventId) ?? [];
    if (!rsvps.includes(user.id) && rsvps.length >= event.capacity) {
      return { ok: false, error: "This event is full." };
    }
  }
  await addRsvp(eventId, user.id);
  revalidatePath("/events");
  return { ok: true };
}

export async function adminCreateEventAction(input: {
  title: string;
  description: string;
  kind: EventKind;
  startsAt: string;
  durationMin: number;
  location: string;
  joinUrl: string;
  capacity: number | null;
}): Promise<Result> {
  const admin = await requireAdmin();
  const kinds: EventKind[] = ["education", "workshop", "community", "in_person"];
  if (!input.title.trim()) return { ok: false, error: "Title is required." };
  if (!kinds.includes(input.kind)) return { ok: false, error: "Pick an event type." };
  const starts = new Date(input.startsAt);
  if (Number.isNaN(starts.getTime())) return { ok: false, error: "Pick a start time." };
  if (input.joinUrl.trim() && !/^https:\/\//.test(input.joinUrl.trim())) {
    return { ok: false, error: "The join link must start with https://." };
  }
  await createEvent({
    title: input.title.trim().slice(0, 140),
    description: input.description.trim().slice(0, 2000) || null,
    kind: input.kind,
    startsAt: starts.toISOString(),
    durationMin: Math.max(15, Math.min(600, Math.round(input.durationMin || 60))),
    location: input.location.trim().slice(0, 200) || (input.kind === "in_person" ? null : "Online"),
    joinUrl: input.joinUrl.trim() || null,
    capacity: input.capacity && input.capacity > 0 ? Math.round(input.capacity) : null,
    createdByUserId: admin.id,
  });
  revalidatePath("/admin");
  revalidatePath("/events");
  return { ok: true };
}

export async function adminDeleteEventAction(eventId: string): Promise<Result> {
  await requireAdmin();
  await deleteEvent(eventId);
  revalidatePath("/admin");
  revalidatePath("/events");
  return { ok: true };
}

/* ─── SUPPORT ────────────────────────────────────────────────────────── */

export async function sendSupportMessageAction(body: string): Promise<Result> {
  const user = await stackServerApp.getUser({ or: "redirect" });
  const ent = await getFounderEntitlement(user.id);
  if (!ent.plan.features.asyncSupport) return { ok: false, error: "Async support is part of Laelapx+." };
  const text = body.trim();
  if (!text) return { ok: false, error: "Write a message first." };
  if (text.length > 5000) return { ok: false, error: "Keep it under 5,000 characters." };

  await addSupportMessage({ threadUserId: user.id, senderUserId: user.id, fromTeam: false, body: text });

  const admins = adminEmails();
  if (admins.length) {
    const tpl = supportFromFounderEmail({
      founderName: user.displayName ?? "A founder",
      founderEmail: user.primaryEmail,
      body: text,
      threadUserId: user.id,
    });
    await sendEmail({ to: admins.join(", "), subject: tpl.subject, html: tpl.html });
  }
  revalidatePath("/support");
  revalidatePath("/admin");
  return { ok: true };
}

export async function markSupportReadAction(): Promise<void> {
  const user = await stackServerApp.getUser({ or: "redirect" });
  await markSupportRead(user.id, "founder");
}

export async function adminReplySupportAction(threadUserId: string, body: string): Promise<Result> {
  const admin = await requireAdmin();
  const text = body.trim();
  if (!text) return { ok: false, error: "Write a reply first." };
  await addSupportMessage({ threadUserId, senderUserId: admin.id, fromTeam: true, body: text.slice(0, 5000) });
  await markSupportRead(threadUserId, "team");

  await createNotification({
    userId: threadUserId,
    kind: "support_reply",
    payload: { fromName: "Laelapx team", message: text.slice(0, 140) },
    href: "/support",
  });
  const founder = await stackServerApp.getUser(threadUserId);
  if (founder?.primaryEmail) {
    const tpl = supportReplyEmail({
      founderFirstName: founder.displayName?.split(" ")[0] || "there",
      body: text,
    });
    await sendEmail({ to: founder.primaryEmail, subject: tpl.subject, html: tpl.html });
  }
  revalidatePath("/admin");
  revalidatePath("/support");
  return { ok: true };
}

export async function adminMarkThreadReadAction(threadUserId: string): Promise<void> {
  await requireAdmin();
  await markSupportRead(threadUserId, "team");
  revalidatePath("/admin");
}

/* ─── DEEP DECK REVIEW ───────────────────────────────────────────────── */

export async function runDeckReviewAction(slug: string): Promise<Result> {
  const user = await stackServerApp.getUser({ or: "redirect" });
  const ent = await getFounderEntitlement(user.id);
  if (!ent.plan.features.deepDeckReview) return { ok: false, error: "Deep deck review is part of Laelapx+." };

  const sub = await getSubmissionBySlug(slug);
  if (!sub || sub.ownerUserId !== user.id) return { ok: false, error: "Not your submission." };
  const deckUrl = sub.data.pitchDeckUrl?.trim();
  if (!deckUrl) return { ok: false, error: "Add a pitch deck link to your submission first." };

  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  if ((await countDeckReviewsSince(user.id, since)) >= DECK_REVIEWS_PER_MONTH) {
    return { ok: false, error: `You've used all ${DECK_REVIEWS_PER_MONTH} deck reviews for the last 30 days.` };
  }

  const previous = (await listDeckReviews(sub.id)).find((r) => r.status === "ok") ?? null;

  let pdf: Buffer;
  try {
    pdf = await fetchDeckPdf(deckUrl);
  } catch (e) {
    const msg = e instanceof DeckFetchError ? e.message : "We couldn't download the deck.";
    await saveDeckReview({
      submissionId: sub.id,
      requestedByUserId: user.id,
      deckUrl,
      status: "unreadable",
      deckScore: null,
      review: null,
      error: msg,
      model: null,
    });
    revalidatePath(`/founder/${slug}`);
    return { ok: false, error: msg };
  }

  try {
    const { score, body, model } = await reviewDeck({ pdf, submission: sub.data, previous });
    await saveDeckReview({
      submissionId: sub.id,
      requestedByUserId: user.id,
      deckUrl,
      status: "ok",
      deckScore: score,
      review: body,
      error: null,
      model,
    });
  } catch (e) {
    console.error("[deck-review] failed:", e);
    await saveDeckReview({
      submissionId: sub.id,
      requestedByUserId: user.id,
      deckUrl,
      status: "error",
      deckScore: null,
      review: null,
      error: "The review failed on our side. It didn't count toward your limit — try again.",
      model: null,
    });
    revalidatePath(`/founder/${slug}`);
    return { ok: false, error: "The review failed on our side. Try again in a minute." };
  }

  revalidatePath(`/founder/${slug}`);
  return { ok: true };
}

/** For the admin support inbox to link a thread to its startup. */
export async function founderStartupLinkAction(slug: string): Promise<string | null> {
  await requireAdmin();
  const sub = await getSubmissionBySlug(slug);
  return sub ? `/s/${sub.slug}` : null;
}
