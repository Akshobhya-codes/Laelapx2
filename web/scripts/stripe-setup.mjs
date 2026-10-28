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

async function ensureProduct(planKey, name, description) {
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
    plan.tagline
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
  "Human deck review, written memo, optional call, fundraising-readiness plan."
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

console.log(`\nDone. ${created + 1} prices verified on the ${mode} account.`);
console.log(`Next: enable the customer portal once at https://dashboard.stripe.com/${mode === "TEST" ? "test/" : ""}settings/billing/portal`);
