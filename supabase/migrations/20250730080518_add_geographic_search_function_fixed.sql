-- Create RPC function for geographic property search
-- Fixed version that matches production schema

CREATE OR REPLACE FUNCTION get_properties_within_radius(
  center_lat DOUBLE PRECISION,
  center_lng DOUBLE PRECISION,
  radius_km DOUBLE PRECISION
)
RETURNS TABLE (
  id UUID,
  address TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  price INTEGER,
  bedrooms INTEGER,
  bathrooms NUMERIC,
  square_feet INTEGER,
  property_type TEXT,
  listing_status TEXT,
  coordinates GEOMETRY(POINT, 4326),
  neighborhood_id UUID,
  property_hash TEXT,
  is_active BOOLEAN,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  -- Additional computed fields
  neighborhood_name TEXT,
  distance_km DOUBLE PRECISION
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.address,
    p.city,
    p.state,
    p.zip_code,
    p.price,
    p.bedrooms,
    p.bathrooms,
    p.square_feet,
    p.property_type,
    p.listing_status,
    p.coordinates,
    p.neighborhood_id,
    p.property_hash,
    p.is_active,
    p.created_at,
    p.updated_at,
    n.name as neighborhood_name,
    ST_Distance(
      p.coordinates::geography, 
      ST_SetSRID(ST_Point(center_lng, center_lat), 4326)::geography
    ) / 1000.0 as distance_km
  FROM properties p
  LEFT JOIN neighborhoods n ON p.neighborhood_id = n.id
  WHERE ST_DWithin(
    p.coordinates::geography,
    ST_SetSRID(ST_Point(center_lng, center_lat), 4326)::geography,
    radius_km * 1000 -- Convert km to meters
  )
  AND p.is_active = true
  ORDER BY distance_km ASC;
END;
$$;

-- Add spatial index for better performance
CREATE INDEX IF NOT EXISTS idx_properties_coordinates_geography 
  ON properties USING GIST((coordinates::geography));

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_properties_within_radius TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION get_properties_within_radius IS 
  'Returns all active properties within a given radius (in kilometers) from a center point, ordered by distance. Used for geographic property searches.';