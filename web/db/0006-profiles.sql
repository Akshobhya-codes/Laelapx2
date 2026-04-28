-- People profiles (LinkedIn-style). One row per Stack Auth user.
-- Created lazily on first sign-in; mirrors display_name + image so we can
-- search/list users without hitting Stack Auth's API on every read.

CREATE TABLE IF NOT EXISTS profiles (
  user_id TEXT PRIMARY KEY,                   -- Stack Auth user id
  slug TEXT UNIQUE NOT NULL,                  -- /u/[slug]
  display_name TEXT NOT NULL,                 -- cached from Stack Auth
  email TEXT,                                 -- cached, used for emails
  profile_image_url TEXT,                     -- cached from Stack Auth
  headline TEXT,                              -- "ex-Shopify, building Threadline"
  bio TEXT,                                   -- longer about
  location TEXT,                              -- city, country
  website_url TEXT,                           -- personal site
  linkedin_url TEXT,
  twitter_url TEXT,

  -- Privacy controls (LinkedIn-style)
  visibility TEXT NOT NULL DEFAULT 'public',  -- 'public' | 'hidden'
  searchable BOOLEAN NOT NULL DEFAULT TRUE,   -- show in global search
  show_startups BOOLEAN NOT NULL DEFAULT TRUE,
  show_fund BOOLEAN NOT NULL DEFAULT TRUE,
  show_email BOOLEAN NOT NULL DEFAULT FALSE,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_profiles_searchable
  ON profiles(searchable, display_name) WHERE searchable;
CREATE INDEX IF NOT EXISTS idx_profiles_slug
  ON profiles(slug);
