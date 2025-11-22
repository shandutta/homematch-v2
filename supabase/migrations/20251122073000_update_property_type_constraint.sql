-- Align property_type constraint with canonical set used by ingestion/app
-- Allowed: single_family, condo, townhome, multi_family, manufactured, land, other
BEGIN;

ALTER TABLE properties DROP CONSTRAINT IF EXISTS properties_property_type_check;

-- Normalize existing rows to the canonical set
UPDATE properties
SET property_type = CASE
  WHEN property_type IN ('single_family','condo','townhome','multi_family','manufactured','land','other')
    THEN property_type
  WHEN property_type = 'house' THEN 'single_family'
  WHEN property_type = 'townhouse' THEN 'townhome'
  WHEN property_type = 'apartment' THEN 'multi_family'
  ELSE 'other'
END
WHERE property_type IS NOT NULL;

ALTER TABLE properties
ADD CONSTRAINT properties_property_type_check
CHECK (
  property_type IS NULL OR
  property_type IN ('single_family','condo','townhome','multi_family','manufactured','land','other')
);

COMMIT;
