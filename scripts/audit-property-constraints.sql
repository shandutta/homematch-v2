-- Audit: find rows that would fail the NOT VALID safety constraints added in
-- 20260507225000_add_schema_safety_constraints.sql.
--
-- Run this BEFORE applying the validation migration (20260513020000) to know
-- what data cleanup is required. Each query returns the rows that violate one
-- constraint. Empty result = clean.
--
-- Usage:
--   psql "$SUPABASE_DB_URL" -f scripts/audit-property-constraints.sql
-- or paste into Supabase SQL Editor.

\echo '=== chk_properties_listing_status violations ==='
SELECT id, address, listing_status
FROM public.properties
WHERE listing_status IS NULL
   OR listing_status NOT IN ('active', 'pending', 'sold', 'off_market', 'new_listing');

\echo '=== chk_properties_price_positive violations ==='
SELECT id, address, price
FROM public.properties
WHERE price IS NULL OR price <= 0;

\echo '=== chk_properties_bedrooms_non_negative violations ==='
SELECT id, address, bedrooms
FROM public.properties
WHERE bedrooms IS NULL OR bedrooms < 0;

\echo '=== chk_properties_bathrooms_non_negative violations ==='
SELECT id, address, bathrooms
FROM public.properties
WHERE bathrooms IS NULL OR bathrooms < 0;

\echo '=== chk_properties_square_feet_positive violations ==='
SELECT id, address, square_feet
FROM public.properties
WHERE square_feet IS NOT NULL AND square_feet <= 0;

\echo '=== chk_properties_year_built_reasonable violations ==='
SELECT id, address, year_built
FROM public.properties
WHERE year_built IS NOT NULL AND (year_built < 1700 OR year_built > 2100);

\echo '=== orphan properties_neighborhood_id_fkey rows ==='
SELECT p.id, p.address, p.neighborhood_id
FROM public.properties p
WHERE p.neighborhood_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.neighborhoods n WHERE n.id = p.neighborhood_id
  );

\echo '=== orphan user_profiles_household_id_fkey rows ==='
SELECT u.id, u.household_id
FROM public.user_profiles u
WHERE u.household_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.households h WHERE h.id = u.household_id
  );
