import "server-only";
import Stripe from "stripe";
import {
  priceLookupKey,
  REVIEW_LOOKUP_KEY,
  type Cadence,
  type PlanId,
} from "./plans";

/**
 * Server-only Stripe client. Lazy like the OpenAI and Insforge clients, so
 * builds and pages that never touch billing don't need the key.
 *
 * Checkout and the customer portal are Stripe-hosted, so there is no
 * publishable key and no Stripe.js on the client. The only two secrets are
 * STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET.
 */
let _stripe: Stripe | null = null;

export function isStripeConfigured(): boolean {
  return !!process.env.STRIPE_SECRET_KEY;
}

export function getStripe(): Stripe {
  if (_stripe) return _stripe;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error(
      "STRIPE_SECRET_KEY missing. Add it to web/.env.local and restart dev."
    );
  }
  _stripe = new Stripe(key, { typescript: true });
  return _stripe;
}

export function isTestMode(): boolean {
  return (process.env.STRIPE_SECRET_KEY ?? "").startsWith("sk_test_");
}

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ||
  (process.env.NODE_ENV === "production"
    ? "https://app.laelapx.com"
    : "http://localhost:3000");

/* ─── PRICES ─────────────────────────────────────────────────────────── */

/**
 * Prices are found by lookup_key, which scripts/stripe-setup.mjs assigns
 * when it creates them. No price ids in env, so test and live accounts both
 * work from the same code.
 */
export async function findPriceByLookupKey(
  lookupKey: string
): Promise<Stripe.Price | null> {
  const stripe = getStripe();
  const res = await stripe.prices.list({
    lookup_keys: [lookupKey],
    active: true,
    limit: 1,
  });
  return res.data[0] ?? null;
}

/* ─── CHECKOUT ───────────────────────────────────────────────────────── */

export async function createSubscriptionCheckout(input: {
  customerId: string;
  userId: string;
  side: "founder" | "investor";
  planId: PlanId;
  cadence: Cadence;
  /** Where Stripe sends the user back. */
  returnPath: string;
}): Promise<string> {
  const stripe = getStripe();
  const lookupKey = priceLookupKey(input.planId, input.cadence);
  const price = await findPriceByLookupKey(lookupKey);
  if (!price) {
    throw new Error(
      `No Stripe price with lookup_key "${lookupKey}". Run: node scripts/stripe-setup.mjs`
    );
  }

  const metadata = {
    userId: input.userId,
    side: input.side,
    planId: input.planId,
    cadence: input.cadence,
  };

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: input.customerId,
    client_reference_id: input.userId,
    line_items: [{ price: price.id, quantity: 1 }],
    allow_promotion_codes: true,
    // Metadata on the subscription itself survives plan changes made in
    // the portal, so the webhook can always attribute it to a user + side.
    subscription_data: { metadata },
    metadata,
    success_url: `${APP_URL}${input.returnPath}&checkout=success`,
    cancel_url: `${APP_URL}${input.returnPath}&checkout=cancelled`,
  });
  if (!session.url) throw new Error("Stripe did not return a checkout URL");
  return session.url;
}

export async function createReviewCheckout(input: {
  customerId: string;
  userId: string;
  orderId: string;
  returnPath: string;
}): Promise<string> {
  const stripe = getStripe();
  const price = await findPriceByLookupKey(REVIEW_LOOKUP_KEY);
  if (!price) {
    throw new Error(
      `No Stripe price with lookup_key "${REVIEW_LOOKUP_KEY}". Run: node scripts/stripe-setup.mjs`
    );
  }
  const metadata = {
    userId: input.userId,
    kind: "founder_review",
    orderId: input.orderId,
  };
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer: input.customerId,
    client_reference_id: input.userId,
    line_items: [{ price: price.id, quantity: 1 }],
    payment_intent_data: { metadata },
    metadata,
    success_url: `${APP_URL}${input.returnPath}&review=paid`,
    cancel_url: `${APP_URL}${input.returnPath}&review=cancelled`,
  });
  if (!session.url) throw new Error("Stripe did not return a checkout URL");
  return session.url;
}

/* ─── PORTAL ─────────────────────────────────────────────────────────── */

/**
 * Each side has its own portal configuration (created by
 * scripts/stripe-setup.mjs, tagged metadata.laelapx_side) so a founder can
 * only switch between founder plans and an investor between investor plans.
 */
async function portalConfigurationFor(side: "founder" | "investor"): Promise<string | undefined> {
  const stripe = getStripe();
  const configs = await stripe.billingPortal.configurations.list({ active: true, limit: 100 });
  return configs.data.find((c) => c.metadata?.laelapx_side === side)?.id;
}

export async function createPortalSession(input: {
  customerId: string;
  returnPath: string;
  side: "founder" | "investor";
}): Promise<string> {
  const stripe = getStripe();
  const configuration = await portalConfigurationFor(input.side);
  if (!configuration) {
    throw new Error("Stripe customer portal isn't set up. Run: node scripts/stripe-setup.mjs");
  }
  const session = await stripe.billingPortal.sessions.create({
    customer: input.customerId,
    configuration,
    return_url: `${APP_URL}${input.returnPath}`,
  });
  return session.url;
}

/* ─── CUSTOMERS ──────────────────────────────────────────────────────── */

export async function createStripeCustomer(input: {
  userId: string;
  email: string | null;
  name: string | null;
}): Promise<string> {
  const stripe = getStripe();
  const customer = await stripe.customers.create({
    email: input.email ?? undefined,
    name: input.name ?? undefined,
    metadata: { userId: input.userId },
  });
  return customer.id;
}

/* ─── PAYMENT HISTORY ────────────────────────────────────────────────── */

export type PaymentRecord = {
  id: string;
  date: string;
  description: string;
  /** e.g. "First payment", "Renewal", "Plan change (prorated)". */
  reason: string | null;
  amountCents: number;
  status: "paid" | "open" | "refunded" | "failed" | "void";
  /** Stripe-hosted receipt / invoice page. */
  receiptUrl: string | null;
  pdfUrl: string | null;
};

const REASON: Record<string, string> = {
  subscription_create: "First payment",
  subscription_cycle: "Renewal",
  subscription_update: "Plan change (prorated)",
  manual: "Manual",
};

/**
 * Every charge on a customer, newest first: subscription invoices plus
 * one-time Founder Review payments (which have no invoice). Read straight
 * from Stripe, so it always matches what the card was actually charged.
 */
export async function listPaymentHistory(customerId: string): Promise<PaymentRecord[]> {
  const stripe = getStripe();
  const [invoices, intents] = await Promise.all([
    stripe.invoices.list({ customer: customerId, limit: 24 }),
    stripe.paymentIntents.list({ customer: customerId, limit: 24, expand: ["data.latest_charge"] }),
  ]);

  const fromInvoices: PaymentRecord[] = invoices.data
    .filter((i) => i.status !== "draft")
    .map((i) => {
      const line = i.lines.data[0]?.description ?? "Subscription";
      return {
        id: i.id ?? i.number ?? String(i.created),
        date: new Date(i.created * 1000).toISOString(),
        // "1 × Laelapx Laelapx+ (at $30.00 / month)" → "Laelapx+ (at $30.00 / month)"
        description: line.replace(/^\d+\s*×\s*/, "").replace(/^Laelapx\s+(?=\S)/, ""),
        reason: i.billing_reason ? REASON[i.billing_reason] ?? null : null,
        amountCents: i.status === "paid" ? i.amount_paid : i.amount_due,
        status: i.status === "paid" ? "paid" : i.status === "void" || i.status === "uncollectible" ? "void" : "open",
        receiptUrl: i.hosted_invoice_url ?? null,
        pdfUrl: i.invoice_pdf ?? null,
      };
    });

  // One-time payments (Founder Review). Subscription charges are already
  // covered by their invoices above, so only our tagged checkouts are added.
  const fromIntents: PaymentRecord[] = intents.data
    .filter((p) => p.metadata?.kind === "founder_review" && p.status !== "canceled" && p.status !== "requires_payment_method")
    .map((p) => {
      const charge = typeof p.latest_charge === "object" ? p.latest_charge : null;
      const refunded = !!charge?.refunded;
      return {
        id: p.id,
        date: new Date(p.created * 1000).toISOString(),
        description: "Founder Review",
        reason: "One-time",
        amountCents: p.amount,
        status: refunded ? "refunded" : p.status === "succeeded" ? "paid" : "failed",
        receiptUrl: charge?.receipt_url ?? null,
        pdfUrl: null,
      };
    });

  return [...fromInvoices, ...fromIntents].sort((a, b) => (a.date < b.date ? 1 : -1));
}

/* ─── WEBHOOK ────────────────────────────────────────────────────────── */

export function constructWebhookEvent(
  rawBody: string,
  signature: string
): Stripe.Event {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) throw new Error("STRIPE_WEBHOOK_SECRET missing");
  return getStripe().webhooks.constructEvent(rawBody, signature, secret);
}

/**
 * Read the plan id back off a Stripe subscription. The price's lookup_key
 * is the source of truth (it follows plan changes made in the portal);
 * metadata is the fallback for anything created before lookup keys.
 */
export function planFromStripeSubscription(sub: Stripe.Subscription): {
  planId: string | null;
  cadence: Cadence | null;
} {
  const item = sub.items.data[0];
  const key = item?.price?.lookup_key ?? null;
  if (key) {
    const m = key.match(/^(.+)_(monthly|annual)$/);
    if (m) return { planId: m[1], cadence: m[2] as Cadence };
  }
  const planId = (sub.metadata?.planId as string | undefined) ?? null;
  const cadence = (sub.metadata?.cadence as Cadence | undefined) ?? null;
  return { planId, cadence };
}

/** Billing period end moved onto subscription items in the 2025 API. */
export function periodEndFromStripeSubscription(
  sub: Stripe.Subscription
): string | null {
  const end = sub.items.data[0]?.current_period_end;
  return end ? new Date(end * 1000).toISOString() : null;
}
