-- Migration 0007: persisted Fundability Snapshot on each submission.
--
-- Stores the LLM-scored snapshot directly on the submissions row so we
-- don't recompute it on every dashboard load. The snapshot is invalidated
-- (set to NULL) whenever the founder edits their submission via the app's
-- update path — the next dashboard view will lazily recompute and persist.
--
-- Columns:
--   scored_snapshot         JSONB    — full Snapshot payload from buildSnapshotLlm()
--   scored_for_updated_at   TIMESTAMPTZ — value of submissions.updated_at at the
--                                        time of scoring. Used as a guard so a
--                                        score from a stale edit can never serve
--                                        a newer submission.

ALTER TABLE submissions
  ADD COLUMN IF NOT EXISTS scored_snapshot JSONB,
  ADD COLUMN IF NOT EXISTS scored_for_updated_at TIMESTAMPTZ;

-- No index needed — every read goes via id/slug which already has indexes.
