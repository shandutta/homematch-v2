-- Phase 1 remediation: add DB safety constraints found by the schema audit.
-- Constraints are added NOT VALID so existing production-like rows are not rewritten
-- during migration, but new/updated rows are protected immediately.

BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_properties_listing_status'
  ) THEN
    ALTER TABLE public.properties
      ADD CONSTRAINT chk_properties_listing_status
      CHECK (listing_status IN ('active', 'pending', 'sold', 'off_market', 'new_listing'))
      NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_properties_price_positive'
  ) THEN
    ALTER TABLE public.properties
      ADD CONSTRAINT chk_properties_price_positive
      CHECK (price > 0)
      NOT VALID;
  END IF;

  -- Bedroom/bathroom zero is intentional, not a missed positive check:
  -- 0 bedrooms represents studio/loft-style listings, and 0 bathrooms is
  -- the repo's current unknown/missing-value sentinel for external ingestion
  -- and defensive API fallbacks. Keep both fields non-negative rather than
  -- positive until product introduces a separate unknown/nullable model.
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_properties_bedrooms_non_negative'
  ) THEN
    ALTER TABLE public.properties
      ADD CONSTRAINT chk_properties_bedrooms_non_negative
      CHECK (bedrooms >= 0)
      NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_properties_bathrooms_non_negative'
  ) THEN
    ALTER TABLE public.properties
      ADD CONSTRAINT chk_properties_bathrooms_non_negative
      CHECK (bathrooms >= 0)
      NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_properties_square_feet_positive'
  ) THEN
    ALTER TABLE public.properties
      ADD CONSTRAINT chk_properties_square_feet_positive
      CHECK (square_feet IS NULL OR square_feet > 0)
      NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_properties_year_built_reasonable'
  ) THEN
    ALTER TABLE public.properties
      ADD CONSTRAINT chk_properties_year_built_reasonable
      CHECK (year_built IS NULL OR (year_built >= 1700 AND year_built <= 2100))
      NOT VALID;
  END IF;
END $$;

-- Avoid dangling references if referenced entities are deleted.
ALTER TABLE public.properties
  DROP CONSTRAINT IF EXISTS properties_neighborhood_id_fkey;

ALTER TABLE public.properties
  ADD CONSTRAINT properties_neighborhood_id_fkey
  FOREIGN KEY (neighborhood_id)
  REFERENCES public.neighborhoods(id) ON DELETE SET NULL
  NOT VALID;

ALTER TABLE public.user_profiles
  DROP CONSTRAINT IF EXISTS user_profiles_household_id_fkey,
  DROP CONSTRAINT IF EXISTS fk_user_profiles_household;

ALTER TABLE public.user_profiles
  ADD CONSTRAINT user_profiles_household_id_fkey
  FOREIGN KEY (household_id)
  REFERENCES public.households(id) ON DELETE SET NULL
  NOT VALID;

COMMIT;
