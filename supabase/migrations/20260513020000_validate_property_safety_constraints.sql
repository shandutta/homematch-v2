-- Validate the safety constraints added NOT VALID in
-- 20260507225000_add_schema_safety_constraints.sql.
--
-- NOT VALID constraints only check new/updated rows. Until VALIDATE runs, any
-- pre-existing row that violates them stays in the table undetected. This
-- migration runs VALIDATE for each one, surfacing violations.
--
-- Each VALIDATE is wrapped in its own DO block so a failure on one constraint
-- (because the data is dirty) does not abort the others. Failures are
-- RAISEd as NOTICEs so the deploy log captures them; the migration itself
-- always succeeds. The team can then run scripts/audit-property-constraints.sql
-- to enumerate the violating rows and clean them up.
--
-- After data cleanup, re-running this migration is idempotent: VALIDATE on an
-- already-validated constraint is a no-op.

BEGIN;

DO $$
BEGIN
  BEGIN
    ALTER TABLE public.properties VALIDATE CONSTRAINT chk_properties_listing_status;
    RAISE NOTICE 'Validated chk_properties_listing_status';
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Could not validate chk_properties_listing_status: %', SQLERRM;
  END;

  BEGIN
    ALTER TABLE public.properties VALIDATE CONSTRAINT chk_properties_price_positive;
    RAISE NOTICE 'Validated chk_properties_price_positive';
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Could not validate chk_properties_price_positive: %', SQLERRM;
  END;

  BEGIN
    ALTER TABLE public.properties VALIDATE CONSTRAINT chk_properties_bedrooms_non_negative;
    RAISE NOTICE 'Validated chk_properties_bedrooms_non_negative';
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Could not validate chk_properties_bedrooms_non_negative: %', SQLERRM;
  END;

  BEGIN
    ALTER TABLE public.properties VALIDATE CONSTRAINT chk_properties_bathrooms_non_negative;
    RAISE NOTICE 'Validated chk_properties_bathrooms_non_negative';
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Could not validate chk_properties_bathrooms_non_negative: %', SQLERRM;
  END;

  BEGIN
    ALTER TABLE public.properties VALIDATE CONSTRAINT chk_properties_square_feet_positive;
    RAISE NOTICE 'Validated chk_properties_square_feet_positive';
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Could not validate chk_properties_square_feet_positive: %', SQLERRM;
  END;

  BEGIN
    ALTER TABLE public.properties VALIDATE CONSTRAINT chk_properties_year_built_reasonable;
    RAISE NOTICE 'Validated chk_properties_year_built_reasonable';
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Could not validate chk_properties_year_built_reasonable: %', SQLERRM;
  END;

  BEGIN
    ALTER TABLE public.properties VALIDATE CONSTRAINT properties_neighborhood_id_fkey;
    RAISE NOTICE 'Validated properties_neighborhood_id_fkey';
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Could not validate properties_neighborhood_id_fkey: %', SQLERRM;
  END;

  BEGIN
    ALTER TABLE public.user_profiles VALIDATE CONSTRAINT user_profiles_household_id_fkey;
    RAISE NOTICE 'Validated user_profiles_household_id_fkey';
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Could not validate user_profiles_household_id_fkey: %', SQLERRM;
  END;
END $$;

COMMIT;

-- DOWN:
-- No-op. VALIDATE only marks an existing constraint as validated; there is no
-- supported way to mark a constraint as NOT VALID again. If you need to
-- re-introduce the NOT VALID state, drop and re-add the constraint per
-- 20260507225000.
