-- Stripe subscription state (migration 0007).
--
-- Backfilled into the migration set from the 2026-07-24 dump of the original
-- Insforge project. The table was originally created ad-hoc via raw SQL on
-- 2026-05-28 rather than through scripts/migrate.mjs, so it existed in the
-- live database but not in db/ — this file closes that drift.
--
-- One row per paying user. `side` mirrors the founder/investor split used
-- everywhere else; `user_id` is a Stack Auth user id as TEXT, matching the
-- convention in 0002 (owners are not foreign keys).

CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL UNIQUE,
  side TEXT NOT NULL CHECK (side IN ('founder', 'investor')),
  plan TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN (
    'trialing', 'active', 'past_due', 'canceled',
    'incomplete', 'incomplete_expired', 'unpaid'
  )),
  cadence TEXT CHECK (cadence IN ('monthly', 'annual')),

  -- Stripe linkage
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  stripe_price_id TEXT,

  current_period_end TIMESTAMPTZ,
  trial_end TIMESTAMPTZ,
  has_used_pilot BOOLEAN NOT NULL DEFAULT FALSE,
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Webhook handlers look rows up by Stripe ids, not by user_id.
CREATE INDEX IF NOT EXISTS subscriptions_stripe_customer_id_idx
  ON subscriptions(stripe_customer_id);

CREATE INDEX IF NOT EXISTS subscriptions_stripe_subscription_id_idx
  ON subscriptions(stripe_subscription_id);
