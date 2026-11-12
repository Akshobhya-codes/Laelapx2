-- Migration 0011: app_users — one row per person who has signed up.
--
-- Stack Auth is the source of truth for accounts; this table mirrors it so
-- the team can see every sign-up in the database (and join it against
-- submissions, investors, subscriptions) without calling Stack's API.
--
-- Unlike `profiles` (0006), which is the public LinkedIn-style profile and is
-- only created when someone reaches certain pages, this table is internal
-- and is meant to contain EVERY account:
--   - upserted whenever a user lands on /welcome (every sign-up and sign-in
--     redirects there) and when they pick a role;
--   - backfilled / re-synced from Stack Auth by scripts/sync-app-users.mjs,
--     which also catches anyone who never reached /welcome and marks
--     accounts deleted in Stack.
--
-- Owners are Stack Auth user ids as TEXT, matching the convention in 0002.

CREATE TABLE IF NOT EXISTS app_users (
  user_id TEXT PRIMARY KEY,                    -- Stack Auth user id
  email TEXT,
  email_verified BOOLEAN NOT NULL DEFAULT FALSE,
  display_name TEXT,
  profile_image_url TEXT,
  role TEXT CHECK (role IN ('founder', 'investor')), -- NULL = hasn't picked yet
  auth_methods JSONB NOT NULL DEFAULT '[]'::jsonb,   -- e.g. ["password","google"]
  country_code TEXT,
  signed_up_at TIMESTAMPTZ,                    -- from Stack Auth
  last_active_at TIMESTAMPTZ,                  -- from Stack Auth
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), -- first time we recorded them
  last_synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ                       -- set when the account no longer exists in Stack
);

CREATE INDEX IF NOT EXISTS idx_app_users_signed_up ON app_users(signed_up_at DESC);
CREATE INDEX IF NOT EXISTS idx_app_users_email ON app_users(LOWER(email));
CREATE INDEX IF NOT EXISTS idx_app_users_role ON app_users(role);
