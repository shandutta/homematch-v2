-- Fix geographic function conflicts by dropping all versions and creating the canonical version
-- This resolves the "function name is not unique" error that prevents database deployment

-- Drop all existing versions of get_properties_within_radius
DROP FUNCTION IF EXISTS public.get_properties_within_radius(double precision, double precision, double precision);
DROP FUNCTION IF EXISTS public.get_properties_within_radius(double precision, double precision, integer);
DROP FUNCTION IF EXISTS public.get_properties_within_radius(double precision, double precision, double precision, integer);
DROP FUNCTION IF EXISTS get_properties_within_radius(double precision, double precision, double precision);
DROP FUNCTION IF EXISTS get_properties_within_radius(double precision, double precision, integer);
DROP FUNCTION IF EXISTS get_properties_within_radius(double precision, double precision, double precision, integer);

-- Create the canonical version with all parameters
CREATE OR REPLACE FUNCTION public.get_properties_within_radius(
  center_lat double precision,
  center_lng double precision,
  radius_km double precision,
  result_limit integer DEFAULT 50
)
RETURNS SETOF public.properties
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT p.*
  FROM public.properties p
  WHERE p.is_active = true
    AND p.coordinates IS NOT NULL
    AND ST_DWithin(
      p.coordinates::geography,
      ST_MakePoint(center_lng, center_lat)::geography,
      radius_km * 1000  -- Convert km to meters
    )
  ORDER BY 
    ST_Distance(
      p.coordinates::geography,
      ST_MakePoint(center_lng, center_lat)::geography
    )
  LIMIT result_limit;
END;
$$;

-- Add comment for documentation
COMMENT ON FUNCTION public.get_properties_within_radius IS 'Returns properties within a specified radius (in kilometers) from a center point, ordered by distance';