-- Migration 0012: the out-of-network fund network + applications.
--
-- external_funds   Every VC fund the external-fund research (Laelapx+) has
--                  matched to a founder. Until now these lived only in a
--                  7-day Next.js cache; persisting them powers the homepage
--                  "potential investor matches" marquee and lets applications
--                  reference a fund. Keyed by the fund's website domain.
--
-- fund_applications  A founder applying to one of those funds, either
--                  themselves ('self', tracked when they click through) or by
--                  asking the Laelapx team to apply on their behalf
--                  ('concierge', paid per application).
--
-- concierge_kickoffs  The one-time paid call before the team's first
--                  application for a founder, where the team learns the
--                  company. One row per founder.

CREATE TABLE IF NOT EXISTS external_funds (
  domain TEXT PRIMARY KEY,                     -- e.g. "examplevc.com" (no www)
  fund_name TEXT NOT NULL,
  website_url TEXT NOT NULL,
  apply_url TEXT,
  source_url TEXT,
  thesis_one_liner TEXT,
  hq TEXT,
  stages JSONB NOT NULL DEFAULT '[]'::jsonb,
  sectors JSONB NOT NULL DEFAULT '[]'::jsonb,
  check_size_min_usd BIGINT,
  check_size_max_usd BIGINT,
  -- Admins can pull a fund off the homepage marquee without deleting it.
  show_in_marquee BOOLEAN NOT NULL DEFAULT TRUE,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_external_funds_marquee
  ON external_funds(show_in_marquee, last_seen_at DESC);

CREATE TABLE IF NOT EXISTS fund_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  founder_user_id TEXT NOT NULL,
  submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  fund_domain TEXT NOT NULL REFERENCES external_funds(domain) ON DELETE CASCADE,
  mode TEXT NOT NULL CHECK (mode IN ('self', 'concierge')),
  -- self:      applied
  -- concierge: awaiting_payment -> paid -> in_progress -> submitted (or canceled)
  status TEXT NOT NULL CHECK (status IN (
    'applied', 'awaiting_payment', 'paid', 'in_progress', 'submitted', 'canceled'
  )),
  amount_cents INT NOT NULL DEFAULT 0,
  stripe_checkout_session_id TEXT,
  founder_notes TEXT,
  admin_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fund_apps_founder ON fund_applications(founder_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_fund_apps_status ON fund_applications(mode, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_fund_apps_session ON fund_applications(stripe_checkout_session_id);

CREATE TABLE IF NOT EXISTS concierge_kickoffs (
  founder_user_id TEXT PRIMARY KEY,
  status TEXT NOT NULL CHECK (status IN ('awaiting_payment', 'paid', 'scheduled', 'done')),
  amount_cents INT NOT NULL DEFAULT 0,
  stripe_checkout_session_id TEXT,
  scheduled_for TIMESTAMPTZ,
  admin_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
