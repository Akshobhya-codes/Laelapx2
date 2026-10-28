#!/usr/bin/env node
// Create (or verify) the Stripe products and prices for every plan.
//
//   node scripts/stripe-setup.mjs
//
// Idempotent: prices are matched by lookup_key, so running it twice does
// nothing the second time. Run it once against the test account and once
// against live. Reads STRIPE_SECRET_KEY from .env.local.
//
// Plans come straight from src/lib/billing/plans.ts (Node 24 loads .ts
// directly), so this never drifts from what the app sells.

import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import Stripe from "stripe";
import {
  FOUNDER_PLANS,
  INVESTOR_PLANS,
  FOUNDER_REVIEW,
  REVIEW_LOOKUP_KEY,
  priceLookupKey,
} from "../src/lib/billing/plans.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadEnv() {
  const text = readFileSync(resolve(__dirname, "..", ".env.local"), "utf8");
  const env = {};
  for (const line of text.split(/\r?\n/)) {
    if (!line || line.startsWith("#")) continue;
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m) env[m[1]] = m[2].trim().replace(/^(['"])(.*)\1$/s, "$2");
  }
  return env;
}

const env = loadEnv();
const key = env.STRIPE_SECRET_KEY;
if (!key) {
  console.error("STRIPE_SECRET_KEY missing in .env.local");
  process.exit(1);
}
const stripe = new Stripe(key);
const mode = key.startsWith("sk_test_") ? "TEST" : "LIVE";
console.log(`→ Stripe ${mode} account\n`);

async function findPrice(lookupKey) {
  const res = await stripe.prices.list({ lookup_keys: [lookupKey], limit: 1 });
  return res.data[0] ?? null;
}

async function findProduct(planKey) {
  // Products carry metadata.plan so we can find them again.
  const res = await stripe.products.search({ query: `metadata['plan']:'${planKey}'` });
  return res.data[0] ?? null;
}

/**
 * Resolve a plan's product. Prices are checked first: lookup_key reads are
 * exact and immediate, whereas products.search is eventually consistent and
 * can miss a product created moments ago — which would make a re-run create
 * a duplicate.
 */
async function ensureProduct(planKey, name, description, lookupKeys = []) {
  for (const key of lookupKeys) {
    const price = await findPrice(key);
    if (price) return { id: typeof price.product === "string" ? price.product : price.product.id };
  }
  const existing = await findProduct(planKey);
  if (existing) return existing;
  return stripe.products.create({ name, description, metadata: { plan: planKey } });
}

async function ensureRecurringPrice(product, lookupKey, cents, interval) {
  const existing = await findPrice(lookupKey);
  if (existing) {
    if (existing.unit_amount !== cents) {
      console.log(`  ! ${lookupKey}: exists at $${existing.unit_amount / 100}, plan says $${cents / 100}. Prices are immutable in Stripe — archive it in the dashboard and re-run to recreate.`);
    } else {
      console.log(`  = ${lookupKey}  $${cents / 100}/${interval}`);
    }
    return existing;
  }
  const price = await stripe.prices.create({
    product: product.id,
    currency: "usd",
    unit_amount: cents,
    recurring: { interval: interval === "monthly" ? "month" : "year" },
    lookup_key: lookupKey,
  });
  console.log(`  + ${lookupKey}  $${cents / 100}/${interval}`);
  return price;
}

let created = 0;

for (const plan of [...Object.values(FOUNDER_PLANS), ...Object.values(INVESTOR_PLANS)]) {
  const paid = (plan.price.monthly ?? 0) > 0 || (plan.price.annual ?? 0) > 0;
  if (!paid || plan.contactOnly || plan.trialDays) continue;

  console.log(`${plan.name} (${plan.side})`);
  const product = await ensureProduct(
    plan.id,
    `Laelapx ${plan.name}`,
    plan.tagline,
    [priceLookupKey(plan.id, "monthly"), priceLookupKey(plan.id, "annual")]
  );
  if (plan.price.monthly) {
    await ensureRecurringPrice(product, priceLookupKey(plan.id, "monthly"), plan.price.monthly, "monthly");
    created++;
  }
  if (plan.price.annual) {
    await ensureRecurringPrice(product, priceLookupKey(plan.id, "annual"), plan.price.annual, "annual");
    created++;
  }
}

// One-time Founder Review.
console.log(`${FOUNDER_REVIEW.name} (one-time)`);
const reviewProduct = await ensureProduct(
  FOUNDER_REVIEW.id,
  `Laelapx ${FOUNDER_REVIEW.name}`,
  "Human deck review, written memo, optional call, fundraising-readiness plan.",
  [REVIEW_LOOKUP_KEY]
);
const existingReview = await findPrice(REVIEW_LOOKUP_KEY);
if (existingReview) {
  console.log(`  = ${REVIEW_LOOKUP_KEY}  $${existingReview.unit_amount / 100}`);
} else {
  await stripe.prices.create({
    product: reviewProduct.id,
    currency: "usd",
    unit_amount: FOUNDER_REVIEW.priceCents,
    lookup_key: REVIEW_LOOKUP_KEY,
  });
  console.log(`  + ${REVIEW_LOOKUP_KEY}  $${FOUNDER_REVIEW.priceCents / 100}`);
}

// ─── Customer portal: one configuration per side ────────────────────────
// The portal is where people switch plans and cancel. A single shared
// configuration would let a founder switch into an investor plan, which the
// webhook can't attribute (the subscription's `side` metadata wouldn't match
// the plan). So each side gets its own configuration listing only its own
// plans, found again by metadata.laelapx_side.
console.log(`\nCustomer portal`);

async function pricesForSide(plans) {
  const products = [];
  for (const plan of plans) {
    if (plan.contactOnly || plan.trialDays || !(plan.price.monthly > 0)) continue;
    const priceIds = [];
    let product = null;
    for (const cadence of ["monthly", "annual"]) {
      if (!plan.price[cadence]) continue;
      const p = await findPrice(priceLookupKey(plan.id, cadence));
      if (p) {
        priceIds.push(p.id);
        product = typeof p.product === "string" ? p.product : p.product.id;
      }
    }
    if (product && priceIds.length) products.push({ product, prices: priceIds });
  }
  return products;
}

async function ensurePortal(side, plans) {
  const products = await pricesForSide(plans);
  const features = {
    customer_update: { enabled: true, allowed_updates: ["email", "address", "tax_id"] },
    invoice_history: { enabled: true },
    payment_method_update: { enabled: true },
    subscription_cancel: { enabled: true, mode: "at_period_end" },
    subscription_update: {
      enabled: true,
      default_allowed_updates: ["price"],
      proration_behavior: "create_prorations",
      products,
    },
  };
  const business_profile = {
    headline: side === "founder" ? "Manage your Laelapx founder plan" : "Manage your Laelapx investor plan",
    privacy_policy_url: "https://laelapx.com/privacy",
    terms_of_service_url: "https://laelapx.com/terms",
  };
  const existing = (await stripe.billingPortal.configurations.list({ active: true, limit: 100 })).data.find(
    (c) => c.metadata?.laelapx_side === side
  );
  if (existing) {
    // Re-sync so the plan list follows plans.ts.
    await stripe.billingPortal.configurations.update(existing.id, { features, business_profile });
    console.log(`  = ${side} portal  ${existing.id}  (${products.length} plans)`);
    return;
  }
  const c = await stripe.billingPortal.configurations.create({
    features,
    business_profile,
    metadata: { laelapx_side: side },
  });
  console.log(`  + ${side} portal  ${c.id}  (${products.length} plans)`);
}

await ensurePortal("founder", Object.values(FOUNDER_PLANS));
await ensurePortal("investor", Object.values(INVESTOR_PLANS));

console.log(`\nDone. ${created + 1} prices verified on the ${mode} account.`);
