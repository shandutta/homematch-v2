-- Geographic RPC Functions Migration
-- Implements the core geographic functions needed by GeographicService

-- Function: get_properties_within_radius
-- Get properties within a specified radius of a point using PostGIS
-- Drop any existing versions first to avoid conflicts
DROP FUNCTION IF EXISTS public.get_properties_within_radius(double precision, double precision, double precision);
DROP FUNCTION IF EXISTS public.get_properties_within_radius(double precision, double precision, integer);
DROP FUNCTION IF EXISTS get_properties_within_radius(double precision, double precision, double precision);
DROP FUNCTION IF EXISTS get_properties_within_radius(double precision, double precision, integer);

CREATE OR REPLACE FUNCTION get_properties_within_radius(
  center_lat double precision,
  center_lng double precision,
  radius_km double precision,
  result_limit integer DEFAULT 50
)
RETURNS TABLE (
  id uuid,
  address text,
  city text,
  state text,
  zip_code text,
  price integer,
  bedrooms integer,
  bathrooms numeric(2,1),
  square_feet integer,
  property_type text,
  images text[],
  description text,
  coordinates geometry(point, 4326),
  neighborhood_id uuid,
  amenities text[],
  year_built integer,
  lot_size_sqft integer,
  parking_spots integer,
  listing_status text,
  is_active boolean,
  created_at timestamptz,
  updated_at timestamptz,
  distance_km double precision
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  center_point geometry(point, 4326);
BEGIN
  -- Create the center point
  center_point := ST_SetSRID(ST_MakePoint(center_lng, center_lat), 4326);
  
  -- Return properties within radius, ordered by distance
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
    p.images,
    p.description,
    p.coordinates,
    p.neighborhood_id,
    p.amenities,
    p.year_built,
    p.lot_size_sqft,
    p.parking_spots,
    p.listing_status,
    p.is_active,
    p.created_at,
    p.updated_at,
    (ST_Distance(p.coordinates::geography, center_point::geography) / 1000)::double precision as distance_km
  FROM properties p
  WHERE 
    p.is_active = true
    AND p.coordinates IS NOT NULL
    AND ST_DWithin(p.coordinates::geography, center_point::geography, radius_km * 1000)
  ORDER BY p.coordinates <-> center_point
  LIMIT result_limit;
END;
$$;

-- Function: get_properties_in_bounds
-- Get properties within a bounding box
CREATE OR REPLACE FUNCTION get_properties_in_bounds(
  north_lat double precision,
  south_lat double precision,
  east_lng double precision,
  west_lng double precision,
  result_limit integer DEFAULT 100
)
RETURNS TABLE (
  id uuid,
  address text,
  city text,
  state text,
  zip_code text,
  price integer,
  bedrooms integer,
  bathrooms numeric(2,1),
  square_feet integer,
  property_type text,
  images text[],
  description text,
  coordinates geometry(point, 4326),
  neighborhood_id uuid,
  amenities text[],
  year_built integer,
  lot_size_sqft integer,
  parking_spots integer,
  listing_status text,
  is_active boolean,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  bbox geometry(polygon, 4326);
BEGIN
  -- Create bounding box polygon
  bbox := ST_SetSRID(ST_MakeEnvelope(west_lng, south_lat, east_lng, north_lat), 4326);
  
  -- Return properties within bounds
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
    p.images,
    p.description,
    p.coordinates,
    p.neighborhood_id,
    p.amenities,
    p.year_built,
    p.lot_size_sqft,
    p.parking_spots,
    p.listing_status,
    p.is_active,
    p.created_at,
    p.updated_at
  FROM properties p
  WHERE 
    p.is_active = true
    AND p.coordinates IS NOT NULL
    AND ST_Within(p.coordinates, bbox)
  ORDER BY p.price DESC
  LIMIT result_limit;
END;
$$;

-- Function: calculate_distance
-- Calculate distance between two points using PostGIS
CREATE OR REPLACE FUNCTION calculate_distance(
  lat1 double precision,
  lng1 double precision,
  lat2 double precision,
  lng2 double precision
)
RETURNS double precision
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  point1 geometry(point, 4326);
  point2 geometry(point, 4326);
  distance_meters double precision;
BEGIN
  -- Create points
  point1 := ST_SetSRID(ST_MakePoint(lng1, lat1), 4326);
  point2 := ST_SetSRID(ST_MakePoint(lng2, lat2), 4326);
  
  -- Calculate distance in meters and convert to kilometers
  distance_meters := ST_Distance(point1::geography, point2::geography);
  
  RETURN (distance_meters / 1000)::double precision;
END;
$$;

-- Function: get_walkability_score
-- Calculate walkability score based on nearby amenities and transit
-- This is a simplified version - could be enhanced with real amenity data
CREATE OR REPLACE FUNCTION get_walkability_score(
  center_lat double precision,
  center_lng double precision
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  center_point geometry(point, 4326);
  property_density integer;
  neighborhood_score integer;
  base_score integer;
BEGIN
  -- Create the center point
  center_point := ST_SetSRID(ST_MakePoint(center_lng, center_lat), 4326);
  
  -- Calculate property density within 1km (higher density = more walkable)
  SELECT COUNT(*)::integer INTO property_density
  FROM properties p
  WHERE 
    p.is_active = true
    AND p.coordinates IS NOT NULL
    AND ST_DWithin(p.coordinates::geography, center_point::geography, 1000);
  
  -- Get neighborhood walk_score if available
  SELECT COALESCE(n.walk_score, 50)::integer INTO neighborhood_score
  FROM neighborhoods n
  WHERE ST_Contains(n.bounds, center_point)
  LIMIT 1;
  
  -- If no neighborhood score, use property density as proxy
  IF neighborhood_score IS NULL THEN
    neighborhood_score := 50; -- Default neutral score
  END IF;
  
  -- Calculate base score from property density (0-20 properties = 0-40 points)
  base_score := LEAST(40, property_density * 2);
  
  -- Combine neighborhood score (60%) with density score (40%)
  RETURN GREATEST(0, LEAST(100, 
    (neighborhood_score * 0.6 + base_score * 0.4)::integer
  ));
END;
$$;

-- Function: get_transit_score
-- Calculate transit score based on neighborhood data and property density
CREATE OR REPLACE FUNCTION get_transit_score(
  center_lat double precision,
  center_lng double precision
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  center_point geometry(point, 4326);
  neighborhood_score integer;
  property_density integer;
  base_score integer;
BEGIN
  -- Create the center point
  center_point := ST_SetSRID(ST_MakePoint(center_lng, center_lat), 4326);
  
  -- Get neighborhood transit_score if available
  SELECT COALESCE(n.transit_score, 30)::integer INTO neighborhood_score
  FROM neighborhoods n
  WHERE ST_Contains(n.bounds, center_point)
  LIMIT 1;
  
  -- Calculate property density within 2km (indicator of transit viability)
  SELECT COUNT(*)::integer INTO property_density
  FROM properties p
  WHERE 
    p.is_active = true
    AND p.coordinates IS NOT NULL
    AND ST_DWithin(p.coordinates::geography, center_point::geography, 2000);
  
  -- If no neighborhood score, use default
  IF neighborhood_score IS NULL THEN
    neighborhood_score := 30; -- Default lower score for transit
  END IF;
  
  -- Calculate base score from property density (0-30 properties = 0-30 points)
  base_score := LEAST(30, property_density);
  
  -- Combine neighborhood score (70%) with density score (30%)
  RETURN GREATEST(0, LEAST(100, 
    (neighborhood_score * 0.7 + base_score * 0.3)::integer
  ));
END;
$$;

-- Function: get_properties_by_distance
-- Get properties sorted by distance from a point
CREATE OR REPLACE FUNCTION get_properties_by_distance(
  center_lat double precision,
  center_lng double precision,
  max_distance_km double precision DEFAULT 10,
  result_limit integer DEFAULT 20
)
RETURNS TABLE (
  id uuid,
  address text,
  city text,
  state text,
  price integer,
  bedrooms integer,
  bathrooms numeric(2,1),
  square_feet integer,
  property_type text,
  images text[],
  neighborhood_id uuid,
  distance_km double precision
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  center_point geometry(point, 4326);
BEGIN
  -- Create the center point
  center_point := ST_SetSRID(ST_MakePoint(center_lng, center_lat), 4326);
  
  -- Return properties ordered by distance
  RETURN QUERY
  SELECT 
    p.id,
    p.address,
    p.city,
    p.state,
    p.price,
    p.bedrooms,
    p.bathrooms,
    p.square_feet,
    p.property_type,
    p.images,
    p.neighborhood_id,
    (ST_Distance(p.coordinates::geography, center_point::geography) / 1000)::double precision as distance_km
  FROM properties p
  WHERE 
    p.is_active = true
    AND p.coordinates IS NOT NULL
    AND ST_DWithin(p.coordinates::geography, center_point::geography, max_distance_km * 1000)
  ORDER BY p.coordinates <-> center_point
  LIMIT result_limit;
END;
$$;

-- Add comments for documentation
COMMENT ON FUNCTION get_properties_within_radius IS 'Returns properties within specified radius of a point, ordered by distance';
COMMENT ON FUNCTION get_properties_in_bounds IS 'Returns properties within a bounding box';
COMMENT ON FUNCTION calculate_distance IS 'Calculates distance in kilometers between two points using PostGIS';
COMMENT ON FUNCTION get_walkability_score IS 'Calculates walkability score based on property density and neighborhood data';
COMMENT ON FUNCTION get_transit_score IS 'Calculates transit score based on neighborhood data and property density';
COMMENT ON FUNCTION get_properties_by_distance IS 'Returns properties sorted by distance from a center point';