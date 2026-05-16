-- Cleanup before audit_followups_s2_s5_s6_i2 (20260513060000).
--
-- audit_followups' S2 step UPDATEs properties to re-sync is_active with
-- listing_status, and its S5 step UPDATEs bathrooms=0 rows to NULL. An
-- UPDATE re-checks every CHECK constraint on each touched row, including the
-- NOT VALID safety constraints added in 20260507225000. Production carries
-- pre-existing dirty rows that fail those constraints and would abort the
-- UPDATEs:
--   - 320 rows with square_feet = 0  (fail chk_properties_square_feet_positive)
--   - 370 rows with price = 0        (fail chk_properties_price_positive)
-- All are clean zeros -- no negatives or other out-of-range values exist.
--
-- square_feet = 0 is the legacy ingest "unknown" sentinel, the same meaning
-- bathrooms = 0 carries (audit S5 collapses that one to NULL). Apply the same
-- sentinel-to-NULL treatment: square_feet is already nullable and
-- chk_properties_square_feet_positive already permits NULL.
--
-- price = 0 is not a recoverable value -- a $0 listing is not a real
-- listing. These 370 rows are junk ingest and are deleted outright.
-- user_property_interactions' property FK has no ON DELETE action (audit S6
-- adds CASCADE, but that runs after this migration), so the few interaction
-- rows pointing at junk listings are removed first. property_vibes and
-- household_property_resolutions already cascade on delete.

BEGIN;

-- Remove interaction rows referencing junk $0 listings so the property
-- delete below is not blocked by user_property_interactions' FK (NO ACTION).
DELETE FROM public.user_property_interactions
 WHERE property_id IN (SELECT id FROM public.properties WHERE price = 0);

-- Delete the junk $0-price listings. property_vibes and
-- household_property_resolutions rows cascade automatically.
DELETE FROM public.properties
 WHERE price = 0;

-- Collapse the square_feet "unknown" sentinel to NULL on surviving rows.
UPDATE public.properties
   SET square_feet = NULL
 WHERE square_feet = 0;

COMMIT;
