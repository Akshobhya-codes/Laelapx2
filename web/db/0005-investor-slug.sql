-- Add a unique slug to investors so they have public profile URLs at /v/[slug].

ALTER TABLE investors ADD COLUMN IF NOT EXISTS slug TEXT;

-- Backfill any existing rows with a slug derived from fund_name
-- (lowercase, alphanumerics only, hyphenated, with random suffix to avoid collision).
UPDATE investors
SET slug =
  LOWER(REGEXP_REPLACE(fund_name, '[^a-zA-Z0-9]+', '-', 'g'))
  || '-' || SUBSTR(MD5(id::text), 1, 6)
WHERE slug IS NULL;

ALTER TABLE investors ALTER COLUMN slug SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_investors_slug ON investors(slug);
