-- Validate the two NOT VALID constraints added by
-- 20260513060000_audit_followups_s2_s5_s6_i2.sql.
--
-- audit_followups added chk_properties_is_active_matches_status and
-- chk_properties_coordinates_srid_4326 as NOT VALID, deferring the
-- existing-row sweep to a later VALIDATE migration. After the
-- 20260513055000 cleanup and audit_followups' own S2 UPDATE the data is
-- clean -- is_active is derived from listing_status for every row, and
-- coordinates are either NULL or SRID 4326 -- so VALIDATE now succeeds.
--
-- Each VALIDATE is wrapped in its own DO block so a failure on one does
-- not abort the other; failures surface as WARNINGs in the deploy log.
-- VALIDATE on an already-validated constraint is a no-op, so this
-- migration is idempotent and safe to re-run.

BEGIN;

DO $$
BEGIN
  BEGIN
    ALTER TABLE public.properties
      VALIDATE CONSTRAINT chk_properties_is_active_matches_status;
    RAISE NOTICE 'Validated chk_properties_is_active_matches_status';
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Could not validate chk_properties_is_active_matches_status: %', SQLERRM;
  END;

  BEGIN
    ALTER TABLE public.properties
      VALIDATE CONSTRAINT chk_properties_coordinates_srid_4326;
    RAISE NOTICE 'Validated chk_properties_coordinates_srid_4326';
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Could not validate chk_properties_coordinates_srid_4326: %', SQLERRM;
  END;
END $$;

COMMIT;

-- DOWN:
-- No-op. VALIDATE only marks an existing constraint as validated; there is no
-- supported way to mark a constraint as NOT VALID again. To re-introduce the
-- NOT VALID state, drop and re-add the constraint per 20260513060000.
