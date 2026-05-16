-- Deactivate stray test / integration-fixture properties that landed in
-- production after 20260513030002_seed_001_deactivate_test_properties.
--
-- These rows were created 2026-05-11..2026-05-14 (integration-test runs and
-- search fixtures) and left is_active = true, so they surface in the live
-- swipe deck. Every offending row has city 'Test City' or 'Search City'
-- (e.g. 'Interaction Test <hex>', '123 UniqueNameTest123 Lane',
-- '456 Common St') — no genuine listing uses those city names, so that
-- predicate is exact.
--
-- listing_status is the canonical field: the sync_property_is_active trigger
-- (20260513060000) derives is_active from it, so updating is_active directly
-- would be reverted by the trigger. Setting listing_status = 'off_market'
-- flips is_active to false and satisfies chk_properties_is_active_matches_status.

BEGIN;

UPDATE public.properties
   SET listing_status = 'off_market'
 WHERE city IN ('Test City', 'Search City')
   AND listing_status <> 'off_market';

COMMIT;

-- DOWN:
-- No-op. Reactivating test fixtures is not desirable; if needed, set
-- listing_status back to 'active' for the specific rows by id.
