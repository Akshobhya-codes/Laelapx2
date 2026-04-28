-- Laelapx initial schema (migration 0002).
-- Migration 0001 was a no-op smoke test.
--
-- Tables:
--   submissions       — founder-side startup submissions (Devpost-style entries)
--   investors         — investor profile / thesis
--   saves             — investor saved a startup (LinkedIn-style)
--   connect_requests  — investor → founder connect requests
--
-- Conventions:
--   - PKs are UUIDs, generated server-side
--   - Timestamps in UTC (TIMESTAMPTZ)
--   - Owners reference Stack Auth user ids as TEXT (not foreign keys)
--   - Arrays stored as JSONB for flexibility (sectors, milestones, founders)

-- Drop the smoke table from migration 0001 (no-op if it doesn't exist)
DROP TABLE IF EXISTS _laelapx_smoke;

-- ─── SUBMISSIONS ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,

  -- Basics
  company_name TEXT NOT NULL,
  one_liner TEXT NOT NULL,
  website_url TEXT NOT NULL,
  logo_url TEXT,
  founded_year INT NOT NULL,
  hq_city TEXT NOT NULL,
  hq_country TEXT NOT NULL,
  stage TEXT NOT NULL,
  sectors JSONB NOT NULL DEFAULT '[]'::jsonb,

  -- Problem & solution
  problem_description TEXT NOT NULL,
  why_now TEXT NOT NULL,
  solution_description TEXT NOT NULL,
  demo_video_url TEXT,

  -- Market
  icp_description TEXT NOT NULL,
  tam_usd BIGINT NOT NULL,
  tam_reasoning TEXT NOT NULL,
  competitors_and_edge TEXT NOT NULL,
  defensibility TEXT NOT NULL,

  -- Traction
  product_stage TEXT NOT NULL,
  launched BOOLEAN NOT NULL,
  customer_count INT NOT NULL,
  mrr_usd BIGINT,
  mom_growth_pct REAL,
  milestones JSONB NOT NULL DEFAULT '[]'::jsonb,

  -- Team
  founders_data JSONB NOT NULL DEFAULT '[]'::jsonb,
  why_this_team TEXT NOT NULL,
  team_size INT NOT NULL,
  advisors TEXT,

  -- Ask
  raised_to_date_usd BIGINT,
  raised_from_whom TEXT,
  raising_usd BIGINT NOT NULL,
  round_type TEXT NOT NULL,
  use_of_funds TEXT NOT NULL,
  target_close_date TEXT,
  pitch_deck_url TEXT,

  -- Public-page settings
  show_financials_public BOOLEAN NOT NULL DEFAULT TRUE,
  open_to_investor_contact BOOLEAN NOT NULL DEFAULT TRUE,

  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_submissions_owner ON submissions(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_submissions_stage ON submissions(stage);
CREATE INDEX IF NOT EXISTS idx_submissions_created ON submissions(created_at DESC);

-- ─── INVESTORS ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS investors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id TEXT NOT NULL UNIQUE,
  fund_name TEXT NOT NULL,
  partner_name TEXT,
  partner_title TEXT,
  hq TEXT,
  thesis_one_liner TEXT NOT NULL,
  stages JSONB NOT NULL DEFAULT '[]'::jsonb,
  sectors JSONB NOT NULL DEFAULT '[]'::jsonb,
  check_size_min_usd BIGINT,
  check_size_max_usd BIGINT,
  notable_portfolio JSONB DEFAULT '[]'::jsonb,
  website_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_investors_owner ON investors(owner_user_id);

-- ─── SAVES (investor saved a startup) ────────────────────────────────────
CREATE TABLE IF NOT EXISTS saves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  investor_user_id TEXT NOT NULL,
  submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  saved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(investor_user_id, submission_id)
);

CREATE INDEX IF NOT EXISTS idx_saves_investor ON saves(investor_user_id);
CREATE INDEX IF NOT EXISTS idx_saves_submission ON saves(submission_id);

-- ─── CONNECT REQUESTS ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS connect_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  investor_user_id TEXT NOT NULL,
  submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending',  -- pending | accepted | declined
  message TEXT,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_connects_investor ON connect_requests(investor_user_id);
CREATE INDEX IF NOT EXISTS idx_connects_submission ON connect_requests(submission_id);
