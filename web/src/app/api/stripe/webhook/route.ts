import type Stripe from "stripe";
import { after } from "next/server";
import {
  getStripe,
  constructWebhookEvent,
  planFromStripeSubscription,
  periodEndFromStripeSubscription,
} from "@/lib/billing/stripe";
import { getPlan, type Side } from "@/lib/billing/plans";
import {
  claimBillingEvent,
  releaseBillingEvent,
  upsertSubscription,
  getUserIdByStripeCustomer,
  getSubscriptionByStripeId,
  getReviewOrder,
  updateReviewOrder,
  type SubscriptionStatus,
} from "@/lib/insforge/billing";
import { createNotification } from "@/lib/insforge/notifications";
import { getSubmissionBySlug } from "@/lib/insforge/submissions";
import { getInsforge } from "@/lib/insforge/client";
import { stackServerApp } from "@/stack";
import { sendEmail } from "@/lib/email/sender";
import {
  reviewOrderAdminEmail,
  reviewOrderReceiptEmail,
  subscriptionStartedEmail,
} from "@/lib/email/billing-templates";
import { adminEmails } from "@/lib/billing/admin";
import { FOUNDER_REVIEW } from "@/lib/billing/plans";

/**
 * Stripe → Laelapx. The only writer of subscription state for paid plans.
 *
 * Stripe signs every delivery; we verify against STRIPE_WEBHOOK_SECRET
 * using the raw body (so no JSON parsing before verification). Each event
 * id is recorded first, so Stripe's retries can't double-apply.
 *
 * Local dev: `stripe listen --forward-to localhost:3000/api/stripe/webhook`
 * prints the whsec_ to put in .env.local.
 */
export async function POST(req: Request) {
  const signature = req.headers.get("stripe-signature");
  if (!signature) return new Response("Missing signature", { status: 400 });

  const raw = await req.text();
  let event: Stripe.Event;
  try {
    event = constructWebhookEvent(raw, signature);
  } catch (err) {
    console.error("[stripe] bad signature:", err);
    return new Response("Bad signature", { status: 400 });
  }

  if (await claimBillingEvent(event.id, event.type)) {
    return Response.json({ received: true, duplicate: true });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await onCheckoutCompleted(event.data.object);
        break;
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
        await syncSubscription(event.data.object, event.type);
        break;
      default:
        // Other events are fine to ignore; Stripe sends many.
        break;
    }
  } catch (err) {
    // 500 makes Stripe retry, which is what we want for a transient DB error.
    // Release the claim first, or the retry would be skipped as a duplicate
    // and the event silently lost.
    console.error(`[stripe] ${event.type} failed:`, err);
    await releaseBillingEvent(event.id).catch(() => {});
    return new Response("Handler error", { status: 500 });
  }

  return Response.json({ received: true });
}

/* ─── CHECKOUT ───────────────────────────────────────────────────────── */

async function onCheckoutCompleted(session: Stripe.Checkout.Session) {
  if (session.mode === "subscription" && session.subscription) {
    // The subscription.created event usually lands first, but order isn't
    // guaranteed. Re-syncing is idempotent.
    const id =
      typeof session.subscription === "string"
        ? session.subscription
        : session.subscription.id;
    const sub = await getStripe().subscriptions.retrieve(id);
    await syncSubscription(sub, "checkout.session.completed");
    return;
  }

  if (session.mode === "payment" && session.metadata?.kind === "founder_review") {
    await onReviewPaid(session);
  }
}

async function onReviewPaid(session: Stripe.Checkout.Session) {
  const orderId = session.metadata?.orderId;
  if (!orderId) return;
  const order = await getReviewOrder(orderId);
  if (!order) return;
  if (order.status !== "pending_payment") return; // already handled

  const paymentIntentId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id ?? null;

  await updateReviewOrder(orderId, {
    status: "paid",
    stripeCheckoutSessionId: session.id,
    stripePaymentIntentId: paymentIntentId,
    paidAt: new Date().toISOString(),
  });

  // The payment is recorded; acknowledge Stripe now. Emails to the team and
  // the founder take seconds over SMTP and run after the response, so the
  // webhook never approaches Stripe's timeout.
  after(() => notifyReviewPaid(order, session).catch((e) => console.error("[stripe] review notify failed:", e)));
}

async function notifyReviewPaid(
  order: NonNullable<Awaited<ReturnType<typeof getReviewOrder>>>,
  session: Stripe.Checkout.Session
) {
  const founder = await stackServerApp.getUser(order.userId);
  const founderName = founder?.displayName ?? "A founder";
  const founderEmail = founder?.primaryEmail ?? session.customer_details?.email ?? null;

  // Resolve the company name for the alert.
  let companyName: string | null = null;
  if (order.submissionId) {
    const { data } = await getInsforge()
      .database.from("submissions")
      .select("slug")
      .eq("id", order.submissionId)
      .maybeSingle();
    const slug = (data as { slug: string } | null)?.slug;
    if (slug) companyName = (await getSubmissionBySlug(slug))?.data.companyName ?? null;
  }

  // Alert the team.
  const admins = adminEmails();
  if (admins.length) {
    const tpl = reviewOrderAdminEmail({
      founderName,
      founderEmail,
      companyName,
      deckUrl: order.deckUrl,
      wantsCall: order.wantsCall,
      notes: order.founderNotes,
      orderId: order.id,
    });
    await sendEmail({ to: admins.join(", "), subject: tpl.subject, html: tpl.html });
  }

  // Confirm to the founder.
  await createNotification({
    userId: order.userId,
    kind: "review_ordered",
    payload: {
      message: `Founder Review received. Expect your memo within ${FOUNDER_REVIEW.turnaroundDays} business days.`,
    },
    href: "/billing?side=founder",
  });
  if (founderEmail) {
    const tpl = reviewOrderReceiptEmail({
      founderFirstName: founderName.split(" ")[0],
      wantsCall: order.wantsCall,
      turnaroundDays: FOUNDER_REVIEW.turnaroundDays,
    });
    await sendEmail({ to: founderEmail, subject: tpl.subject, html: tpl.html });
  }
}

/* ─── SUBSCRIPTIONS ──────────────────────────────────────────────────── */

// Stripe types the status as its known literals plus an open string for
// forward compatibility, so a switch can't narrow it; check membership.
const KNOWN_STATUSES: ReadonlySet<string> = new Set<SubscriptionStatus>([
  "active", "past_due", "trialing", "canceled", "unpaid", "incomplete", "incomplete_expired",
]);

function mapStatus(s: Stripe.Subscription.Status): SubscriptionStatus {
  if (s === "paused") return "unpaid";
  return KNOWN_STATUSES.has(s) ? (s as SubscriptionStatus) : "canceled";
}

async function syncSubscription(sub: Stripe.Subscription, source: string) {
  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;

  // Attribution: metadata first (set at Checkout), customer mapping second.
  const userId =
    (sub.metadata?.userId as string | undefined) ??
    (await getUserIdByStripeCustomer(customerId));
  const side = (sub.metadata?.side as Side | undefined) ?? null;
  if (!userId || !side) {
    console.error(`[stripe] cannot attribute subscription ${sub.id} (${source})`);
    return;
  }

  const { planId, cadence } = planFromStripeSubscription(sub);
  const plan = planId ? getPlan(side, planId) : null;
  if (!plan) {
    console.error(`[stripe] unknown plan on subscription ${sub.id}: ${planId}`);
    return;
  }

  const status = source === "customer.subscription.deleted" ? "canceled" : mapStatus(sub.status);
  const before = await getSubscriptionByStripeId(sub.id);

  await upsertSubscription({
    userId,
    side,
    plan: plan.id,
    status,
    cadence,
    stripeCustomerId: customerId,
    stripeSubscriptionId: sub.id,
    stripePriceId: sub.items.data[0]?.price?.id ?? null,
    currentPeriodEnd: periodEndFromStripeSubscription(sub),
    trialEnd: sub.trial_end ? new Date(sub.trial_end * 1000).toISOString() : null,
    cancelAtPeriodEnd: sub.cancel_at_period_end,
    seats: side === "investor" && "seats" in plan.features ? plan.features.seats : 1,
  });

  // checkout.session.completed and customer.subscription.created arrive
  // together for every new subscription and both see the same "before"
  // state; only the subscription events notify, so the user hears once.
  if (source === "checkout.session.completed") return;

  // First activation (or plan change) → tell the user, after the response.
  const becameActive = status === "active" && before?.status !== "active";
  const planChanged = !!before && before.plan !== plan.id && status === "active";
  if (becameActive || planChanged) {
    after(async () => {
      try {
        const user = await stackServerApp.getUser(userId);
        await createNotification({
          userId,
          kind: "subscription_changed",
          payload: { message: `${plan.name} is active.` },
          href: `/billing?side=${side}`,
        });
        if (becameActive && user?.primaryEmail) {
          const tpl = subscriptionStartedEmail({
            firstName: user.displayName?.split(" ")[0] || "there",
            planName: plan.name,
            side,
          });
          await sendEmail({ to: user.primaryEmail, subject: tpl.subject, html: tpl.html });
        }
      } catch (e) {
        console.error("[stripe] subscription notify failed:", e);
      }
    });
  }
}
