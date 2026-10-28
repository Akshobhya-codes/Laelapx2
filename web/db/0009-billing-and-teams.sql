-- Billing, team seats, founder review orders, pilot feedback (migration 0009).
--
-- Builds on 0008-subscriptions.sql. Plan definitions (prices, features,
-- limits) live in src/lib/billing/plans.ts — the database only records WHICH
-- plan a user is on and what state Stripe says it's in.
--
-- Conventions follow 0002: user ids are Stack Auth ids stored as TEXT,
-- never foreign keys.

-- ─── SUBSCRIPTIONS: one per (user, side), not one per user ───────────────
-- A person can be a founder and an investor (operator-VCs are already
-- handled in the app). The original table only allowed one row per user.
ALTER TABLE subscriptions DROP CONSTRAINT IF EXISTS subscriptions_user_id_key;
ALTER TABLE subscriptions DROP CONSTRAINT IF EXISTS subscriptions_user_side_key;
ALTER TABLE subscriptions ADD CONSTRAINT subscriptions_user_side_key UNIQUE (user_id, side);

-- Seats on the plan (investor team plans). Entitlement checks read this
-- rather than the plan table so a custom Elite deal can carry its own count.
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS seats INT NOT NULL DEFAULT 1;

CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_sub
  ON subscriptions(stripe_subscription_id);

-- ─── STRIPE CUSTOMERS: one Stripe customer per person, across both sides ─
CREATE TABLE IF NOT EXISTS stripe_customers (
  user_id TEXT PRIMARY KEY,
  stripe_customer_id TEXT NOT NULL UNIQUE,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── BILLING EVENTS: webhook idempotency ─────────────────────────────────
-- Stripe retries webhooks; every event id is recorded so a redelivery is a
-- no-op instead of a double-write.
CREATE TABLE IF NOT EXISTS billing_events (
  stripe_event_id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── TEAMS (investor side) ───────────────────────────────────────────────
-- A team is owned by the user who holds the subscription. Members share the
-- owner's plan, weekly profile quota, and pipeline. Invites are by email and
-- activate the first time that email signs in.
CREATE TABLE IF NOT EXISTS teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  -- NULL until the invitee signs in; matched on email at that point.
  user_id TEXT,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'member')),
  status TEXT NOT NULL DEFAULT 'invited' CHECK (status IN ('invited', 'active', 'removed')),
  invited_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  joined_at TIMESTAMPTZ,
  UNIQUE(team_id, email)
);

CREATE INDEX IF NOT EXISTS idx_team_members_user ON team_members(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_team_members_email ON team_members(LOWER(email));

-- ─── PROFILE UNLOCKS: the weekly quota ledger ────────────────────────────
-- One row the first time an investor account opens a founder's full profile.
-- `account_user_id` is the subscription holder (the team owner for members),
-- so a team shares one quota. Re-opening an unlocked profile costs nothing.
CREATE TABLE IF NOT EXISTS profile_unlocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_user_id TEXT NOT NULL,
  viewer_user_id TEXT NOT NULL,
  submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(account_user_id, submission_id)
);

CREATE INDEX IF NOT EXISTS idx_unlocks_account_time
  ON profile_unlocks(account_user_id, unlocked_at DESC);

-- ─── FOUNDER REVIEW ORDERS: the $499 human service ──────────────────────
-- Paid through Stripe Checkout (one-time). Worked by the Laelapx team from
-- /admin; the founder watches status from /billing.
CREATE TABLE IF NOT EXISTS founder_review_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  submission_id UUID REFERENCES submissions(id) ON DELETE SET NULL,
  stripe_checkout_session_id TEXT UNIQUE,
  stripe_payment_intent_id TEXT,
  amount_cents INT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending_payment' CHECK (status IN (
    'pending_payment', 'paid', 'in_progress', 'delivered', 'refunded'
  )),
  wants_call BOOLEAN NOT NULL DEFAULT FALSE,
  founder_notes TEXT,            -- what the founder wants us to focus on
  deck_url TEXT,                 -- snapshot of the deck link at order time
  memo_url TEXT,                 -- delivered written memo (link)
  memo_text TEXT,                -- or the memo inline
  reviewer_user_id TEXT,         -- which team member took it
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  paid_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_review_orders_user ON founder_review_orders(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_review_orders_status ON founder_review_orders(status, created_at);

-- ─── PILOT FEEDBACK: "track whether the matches are useful" ─────────────
CREATE TABLE IF NOT EXISTS pilot_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  investor_user_id TEXT NOT NULL,
  submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  useful BOOLEAN NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(investor_user_id, submission_id)
);

-- ─── INVESTOR NOTES: per-founder notes (Syndicate and up) ────────────────
CREATE TABLE IF NOT EXISTS investor_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_user_id TEXT NOT NULL,     -- team owner, so notes are shared
  author_user_id TEXT NOT NULL,
  submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  -- Light CRM stage. Free text so a fund can use its own vocabulary.
  stage TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_investor_notes_account
  ON investor_notes(account_user_id, submission_id, updated_at DESC);
