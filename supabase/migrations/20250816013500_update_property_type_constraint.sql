-- Update property_type check constraint to match production schema
-- This migration updates the property type values to align with the application code

-- First, drop the existing constraint
ALTER TABLE properties DROP CONSTRAINT IF EXISTS properties_property_type_check;

-- Add the new constraint with updated property types
ALTER TABLE properties ADD CONSTRAINT properties_property_type_check 
  CHECK (property_type IN (
    'single_family', 
    'condo', 
    'townhome', 
    'multi_family', 
    'manufactured', 
    'land', 
    'other'
  ));

-- Update any existing data with old property types to new ones
-- This handles the migration of existing data
UPDATE properties 
SET property_type = CASE 
  WHEN property_type = 'house' THEN 'single_family'
  WHEN property_type = 'townhouse' THEN 'townhome'
  WHEN property_type = 'apartment' THEN 'multi_family'
  -- condo stays the same
  ELSE property_type
END
WHERE property_type IN ('house', 'townhouse', 'apartment');