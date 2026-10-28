-- Plan features (migration 0010): the tools the paid tiers promise.
--
-- Investor side: custom criteria (Emerging+), meeting tracking (Emerging+),
-- partner workflow on the pipeline (Institutional+), and the timestamp that
-- powers priority review (Emerging+ see newly visible founders first).
--
-- Founder side: events + RSVPs (Founder+; in-person needs Laelapx+), async
-- support threads (Laelapx+), deep deck reviews and score history for
-- iteration feedback (Laelapx+).
--
-- Which plan unlocks what lives in src/lib/billing/plans.ts, not here.

-- ─── PRIORITY REVIEW ─────────────────────────────────────────────────────
-- Set the first time a submission is observed as investor-visible. Accounts
-- with priorityReview see it immediately; everyone else after a fixed window.
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS first_visible_at TIMESTAMPTZ;

-- ─── CUSTOM CRITERIA (Emerging Fund and up) ─────────────────────────────
-- Hard filters layered on top of the thesis. One row per investor account
-- (the team owner), so the whole team screens the same way.
CREATE TABLE IF NOT EXISTS investor_criteria (
  account_user_id TEXT PRIMARY KEY,
  min_mrr_usd BIGINT,
  min_customers INT,
  min_score INT,
  launched_only BOOLEAN NOT NULL DEFAULT FALSE,
  countries JSONB NOT NULL DEFAULT '[]'::jsonb,       -- HQ countries, empty = any
  product_stages JSONB NOT NULL DEFAULT '[]'::jsonb,  -- empty = any
  keywords JSONB NOT NULL DEFAULT '[]'::jsonb,        -- any-match on one-liner/problem/solution
  updated_by_user_id TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── MEETING TRACKING (Emerging Fund and up) ────────────────────────────
CREATE TABLE IF NOT EXISTS investor_meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_user_id TEXT NOT NULL,
  author_user_id TEXT NOT NULL,
  submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  met_on DATE NOT NULL,
  kind TEXT NOT NULL DEFAULT 'intro' CHECK (kind IN ('intro', 'follow_up', 'partner', 'diligence', 'other')),
  attendees TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_meetings_account
  ON investor_meetings(account_user_id, submission_id, met_on DESC);

-- ─── PARTNER WORKFLOW (Institutional and up) ────────────────────────────
-- A deal on the shared pipeline can be assigned to a teammate and carries a
-- partner decision. Stored on the note row, which is already one per
-- (account, submission).
ALTER TABLE investor_notes ADD COLUMN IF NOT EXISTS assigned_to_user_id TEXT;
ALTER TABLE investor_notes ADD COLUMN IF NOT EXISTS decision TEXT;
ALTER TABLE investor_notes ADD COLUMN IF NOT EXISTS decided_by_user_id TEXT;
ALTER TABLE investor_notes ADD COLUMN IF NOT EXISTS decided_at TIMESTAMPTZ;
ALTER TABLE investor_notes DROP CONSTRAINT IF EXISTS investor_notes_decision_check;
ALTER TABLE investor_notes ADD CONSTRAINT investor_notes_decision_check
  CHECK (decision IS NULL OR decision IN ('advance', 'hold', 'pass'));

-- Notes become optional once a deal can sit on the pipeline without one.
ALTER TABLE investor_notes ALTER COLUMN body SET DEFAULT '';

-- ─── EVENTS (Founder+; in-person needs Laelapx+) ────────────────────────
CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  kind TEXT NOT NULL CHECK (kind IN ('education', 'workshop', 'community', 'in_person')),
  starts_at TIMESTAMPTZ NOT NULL,
  duration_min INT NOT NULL DEFAULT 60,
  location TEXT,          -- city/venue for in-person; "Online" otherwise
  join_url TEXT,          -- only revealed to RSVP'd, eligible founders
  capacity INT,           -- NULL = unlimited
  created_by_user_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_events_starts ON events(starts_at);

CREATE TABLE IF NOT EXISTS event_rsvps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(event_id, user_id)
);

-- ─── ASYNC SUPPORT (Laelapx+) ───────────────────────────────────────────
-- One thread per founder, keyed by their user id. Team replies come from
-- anyone in ADMIN_EMAILS.
CREATE TABLE IF NOT EXISTS support_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_user_id TEXT NOT NULL,
  sender_user_id TEXT NOT NULL,
  from_team BOOLEAN NOT NULL DEFAULT FALSE,
  body TEXT NOT NULL,
  read_by_founder BOOLEAN NOT NULL DEFAULT FALSE,
  read_by_team BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_support_thread
  ON support_messages(thread_user_id, created_at);

-- ─── DEEP DECK REVIEW + ITERATION FEEDBACK (Laelapx+) ───────────────────
CREATE TABLE IF NOT EXISTS deck_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  requested_by_user_id TEXT NOT NULL,
  deck_url TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('ok', 'unreadable', 'error')),
  deck_score INT,
  review JSONB,
  error TEXT,
  model TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_deck_reviews_submission
  ON deck_reviews(submission_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_deck_reviews_user
  ON deck_reviews(requested_by_user_id, created_at DESC);

-- One row per scored revision of a submission, so the founder can see how
-- each edit moved the score.
CREATE TABLE IF NOT EXISTS score_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  submission_updated_at TIMESTAMPTZ NOT NULL,
  composite INT NOT NULL,
  rating TEXT NOT NULL,
  sections JSONB NOT NULL DEFAULT '[]'::jsonb,   -- [{id, name, score}]
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(submission_id, submission_updated_at)
);
