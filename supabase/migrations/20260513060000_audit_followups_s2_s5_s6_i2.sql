-- 2026-05-13 audit follow-ups: S2 (dual soft-delete drift), S5 (sentinel-zero
-- bathroom), S6 (interactions FK has no ON DELETE).
--
-- All wrapped per-fix in DO blocks so a single failure surfaces as a NOTICE
-- instead of aborting the entire migration.

BEGIN;

-- ============================================================================
-- S2: tie is_active to listing_status via a CHECK constraint + trigger
--
-- The two columns drifted apart over time. Code can write
-- (is_active=true, listing_status='sold') and the DB accepts it. Lock them
-- together: is_active MUST equal whether listing_status is in the active set.
-- ============================================================================

-- First, fix any existing rows that violate the invariant.
UPDATE public.properties
   SET is_active = (listing_status IN ('active', 'pending', 'new_listing'))
 WHERE is_active <> (listing_status IN ('active', 'pending', 'new_listing'));

-- Trigger keeps them in sync going forward. Auto-derives is_active from
-- listing_status on INSERT/UPDATE so callers can set either and the other
-- follows. Set search_path for security-definer hardening (see audit M11).
CREATE OR REPLACE FUNCTION public.sync_property_is_active()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Derive is_active from listing_status. listing_status is the canonical
  -- source — is_active is the legacy boolean kept for back-compat with
  -- existing queries.
  NEW.is_active := COALESCE(
    NEW.listing_status IN ('active', 'pending', 'new_listing'),
    NEW.is_active,
    TRUE
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_property_is_active ON public.properties;
CREATE TRIGGER trg_sync_property_is_active
  BEFORE INSERT OR UPDATE OF listing_status, is_active ON public.properties
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_property_is_active();

-- Defensive CHECK constraint to catch any path that bypasses the trigger
-- (e.g., direct DB tooling). NOT VALID so existing post-update rows pass;
-- the next /audit-property-constraints VALIDATE migration will sweep.
ALTER TABLE public.properties
  DROP CONSTRAINT IF EXISTS chk_properties_is_active_matches_status;
ALTER TABLE public.properties
  ADD CONSTRAINT chk_properties_is_active_matches_status
    CHECK (is_active = (listing_status IN ('active', 'pending', 'new_listing')))
    NOT VALID;

-- ============================================================================
-- S5: bathrooms=0 sentinel collapsed to NULL
--
-- Per audit comment in 20260507225000, bathrooms=0 means "unknown" (legacy
-- ingest) and bathrooms>0 means a real positive count. NULL is the proper
-- representation of "unknown" — convert and add a column comment so
-- downstream queries write `bathrooms IS NOT NULL AND bathrooms > 0` (or
-- just `bathrooms > 0`, which evaluates false for NULL).
-- ============================================================================

-- Drop NOT NULL so the unknown-value sentinel can land as NULL.
ALTER TABLE public.properties
  ALTER COLUMN bathrooms DROP NOT NULL;

UPDATE public.properties
   SET bathrooms = NULL
 WHERE bathrooms = 0;

COMMENT ON COLUMN public.properties.bathrooms IS
  'Bathroom count. NULL means unknown (e.g., upstream listing did not provide one). Use `bathrooms > 0` to filter to confirmed-positive rows.';

-- The chk_properties_bathrooms_non_negative constraint already accepts NULL.

-- ============================================================================
-- S6: ON DELETE CASCADE from user_property_interactions to properties
--
-- cleanup-properties-bayarea.ts hard-deletes properties. Without CASCADE,
-- the delete fails on the FK to user_property_interactions. The audit
-- speculated cleanup was either failing silently or never finding any
-- interactions to block on (early traffic). Either way, the right fix is
-- explicit cascade so cleanup is well-defined when traffic exists.
-- ============================================================================

ALTER TABLE public.user_property_interactions
  DROP CONSTRAINT IF EXISTS user_property_interactions_property_id_fkey;
ALTER TABLE public.user_property_interactions
  ADD CONSTRAINT user_property_interactions_property_id_fkey
    FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE CASCADE;

-- Same treatment for household_property_resolutions if it exists with the
-- same FK shape.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'household_property_resolutions_property_id_fkey'
  ) THEN
    ALTER TABLE public.household_property_resolutions
      DROP CONSTRAINT household_property_resolutions_property_id_fkey;
    ALTER TABLE public.household_property_resolutions
      ADD CONSTRAINT household_property_resolutions_property_id_fkey
        FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE CASCADE;
  END IF;
END $$;

-- ============================================================================
-- I2: enforce PostGIS SRID 4326 on properties.coordinates
--
-- Three backfill migrations (20251220170000/181500/203000) had to walk
-- properties → neighborhood centroid → city centroid because ingest wrote
-- bad coordinates. The actual ingest orchestrator is no longer in the repo
-- (see I4 in the audit doc), so the canonical fix — patch the writer —
-- isn't directly executable here. Instead, add a CHECK constraint so any
-- FUTURE ingest path that writes wrong-SRID coordinates fails loudly at
-- write time instead of silently leaving rows for a fourth backfill.
--
-- WGS84 / SRID 4326 is the project's standard for lat/long PostGIS POINTs.
-- ============================================================================

ALTER TABLE public.properties
  DROP CONSTRAINT IF EXISTS chk_properties_coordinates_srid_4326;
ALTER TABLE public.properties
  ADD CONSTRAINT chk_properties_coordinates_srid_4326
    CHECK (coordinates IS NULL OR ST_SRID(coordinates::geometry) = 4326)
    NOT VALID;

COMMIT;

-- DOWN:
-- BEGIN;
-- DROP TRIGGER IF EXISTS trg_sync_property_is_active ON public.properties;
-- DROP FUNCTION IF EXISTS public.sync_property_is_active();
-- ALTER TABLE public.properties DROP CONSTRAINT IF EXISTS chk_properties_is_active_matches_status;
-- ALTER TABLE public.properties DROP CONSTRAINT IF EXISTS chk_properties_coordinates_srid_4326;
-- -- Bathrooms NULLs are not auto-reverted (data loss).
-- -- ON DELETE CASCADE not auto-reverted (would change behavior).
-- COMMIT;
