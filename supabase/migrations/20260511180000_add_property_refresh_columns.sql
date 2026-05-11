-- Backfill columns that already exist on prod but never had a migration:
--   - last_refreshed_at: timestamp of the most recent Zillow refresh cycle
--   - source_fingerprint: stable hash of upstream payload so re-fetches
--     short-circuit when the source hasn't changed
--
-- These columns are referenced by the explicit-column projections introduced
-- in audit M13 (replacing select('*') in the property service layer). Without
-- this migration, a fresh `supabase db reset` produces a local schema that
-- diverges from `src/types/database.ts`, and any query that names the columns
-- returns `42703 column does not exist`. Tests against a local stack failed
-- with that error until this landed.

ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS last_refreshed_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS source_fingerprint TEXT;

CREATE INDEX IF NOT EXISTS idx_properties_last_refreshed_at
  ON public.properties (last_refreshed_at);

CREATE INDEX IF NOT EXISTS idx_properties_source_fingerprint
  ON public.properties (source_fingerprint);

COMMENT ON COLUMN public.properties.last_refreshed_at IS
  'Timestamp of the most recent Zillow refresh cycle. NULL until first refresh.';

COMMENT ON COLUMN public.properties.source_fingerprint IS
  'Stable hash of the upstream payload (e.g. Zillow JSON). Allows the refresh job to short-circuit when the source has not changed since last_refreshed_at.';
