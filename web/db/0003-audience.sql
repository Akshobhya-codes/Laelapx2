-- Audience layer: profile views, with dedup-by-recency at insert time.
-- (saves + connect_requests already exist from migration 0002.)
--
-- One row per (signed-in viewer, submission, "session"). Anonymous viewers
-- get viewer_user_id = NULL. We dedup by "if same viewer hit the same
-- submission within the last hour, skip the insert" via the recordView()
-- function in lib/insforge/audience.ts — we don't enforce in SQL because
-- we want anon double-views to also count.

CREATE TABLE IF NOT EXISTS profile_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  viewer_user_id TEXT,             -- nullable for anonymous viewers
  viewer_role TEXT,                -- 'investor' | 'founder' | 'anonymous'
  referrer TEXT,                   -- optional source (e.g. 'discover' | 'direct')
  viewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_views_submission ON profile_views(submission_id, viewed_at DESC);
CREATE INDEX IF NOT EXISTS idx_views_viewer ON profile_views(viewer_user_id, submission_id, viewed_at DESC);

-- Backfill: nothing to backfill, table is empty.
