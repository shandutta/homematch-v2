-- Consolidated RPC Functions Migration
-- Contains only legitimate, best-practice functionality that doesn't duplicate production
-- Provides 18 geographic search, analytics, and utility functions for real estate platform

-- =============================================================================
-- GEOGRAPHIC RPC FUNCTIONS
-- Core geographic search and location-based functionality using PostGIS
-- =============================================================================

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

-- =============================================================================
-- ANALYTICS RPC FUNCTIONS
-- Market trends and analytics functions for PropertyAnalyticsService
-- =============================================================================

-- Function: get_neighborhood_stats
-- Get comprehensive statistics for a neighborhood
CREATE OR REPLACE FUNCTION get_neighborhood_stats(neighborhood_uuid uuid)
RETURNS TABLE (
  neighborhood_id uuid,
  neighborhood_name text,
  neighborhood_city text,
  neighborhood_state text,
  total_properties bigint,
  avg_price numeric,
  median_price numeric,
  min_price integer,
  max_price integer,
  avg_bedrooms numeric,
  avg_bathrooms numeric,
  avg_square_feet numeric,
  property_type_distribution jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  neighborhood_exists boolean;
BEGIN
  -- Check if neighborhood exists
  SELECT EXISTS(SELECT 1 FROM neighborhoods WHERE id = neighborhood_uuid) INTO neighborhood_exists;
  
  IF NOT neighborhood_exists THEN
    RETURN;
  END IF;

  -- Return comprehensive neighborhood statistics
  RETURN QUERY
  WITH property_stats AS (
    SELECT 
      p.price,
      p.bedrooms,
      p.bathrooms,
      p.square_feet,
      p.property_type
    FROM properties p
    WHERE p.neighborhood_id = neighborhood_uuid 
      AND p.is_active = true
  ),
  percentiles AS (
    SELECT 
      percentile_cont(0.5) WITHIN GROUP (ORDER BY price) as median_price_calc
    FROM property_stats
  ),
  type_dist AS (
    SELECT 
      jsonb_object_agg(
        COALESCE(property_type, 'unknown'), 
        type_count
      ) as type_distribution
    FROM (
      SELECT 
        property_type, 
        COUNT(*) as type_count
      FROM property_stats
      GROUP BY property_type
    ) t
  )
  SELECT 
    neighborhood_uuid,
    n.name,
    n.city,
    n.state,
    COUNT(ps.price) as total_properties,
    ROUND(AVG(ps.price)::numeric, 2) as avg_price,
    ROUND(p.median_price_calc::numeric, 2) as median_price,
    MIN(ps.price) as min_price,
    MAX(ps.price) as max_price,
    ROUND(AVG(ps.bedrooms)::numeric, 1) as avg_bedrooms,
    ROUND(AVG(ps.bathrooms)::numeric, 1) as avg_bathrooms,
    ROUND(AVG(ps.square_feet)::numeric, 0) as avg_square_feet,
    COALESCE(td.type_distribution, '{}'::jsonb) as property_type_distribution
  FROM neighborhoods n
  CROSS JOIN property_stats ps
  CROSS JOIN percentiles p
  CROSS JOIN type_dist td
  WHERE n.id = neighborhood_uuid
  GROUP BY n.id, n.name, n.city, n.state, p.median_price_calc, td.type_distribution;
END;
$$;

-- Function: get_market_trends
-- Get market trends over time
CREATE OR REPLACE FUNCTION get_market_trends(
  timeframe text DEFAULT 'monthly',
  months_back integer DEFAULT 12
)
RETURNS TABLE (
  period text,
  avg_price numeric,
  total_listings bigint,
  price_change_percent numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  date_format text;
  interval_text text;
BEGIN
  -- Set date format and interval based on timeframe
  CASE timeframe
    WHEN 'weekly' THEN
      date_format := 'YYYY-"W"WW';
      interval_text := (months_back * 4)::text || ' weeks';
    WHEN 'quarterly' THEN
      date_format := 'YYYY-"Q"Q';
      interval_text := (months_back / 3)::text || ' months';
    ELSE -- monthly
      date_format := 'YYYY-MM';
      interval_text := months_back::text || ' months';
  END CASE;

  -- Return market trends
  RETURN QUERY
  WITH trends AS (
    SELECT 
      TO_CHAR(p.created_at, date_format) as period_key,
      AVG(p.price) as period_avg_price,
      COUNT(*) as period_total_listings,
      LAG(AVG(p.price)) OVER (ORDER BY TO_CHAR(p.created_at, date_format)) as prev_avg_price
    FROM properties p
    WHERE 
      p.is_active = true
      AND p.created_at >= NOW() - INTERVAL '1 month' * months_back
    GROUP BY TO_CHAR(p.created_at, date_format)
    ORDER BY TO_CHAR(p.created_at, date_format)
  )
  SELECT 
    t.period_key,
    ROUND(t.period_avg_price::numeric, 2),
    t.period_total_listings,
    CASE 
      WHEN t.prev_avg_price IS NOT NULL AND t.prev_avg_price > 0 THEN
        ROUND(((t.period_avg_price - t.prev_avg_price) / t.prev_avg_price * 100)::numeric, 2)
      ELSE 0::numeric
    END as price_change_percent
  FROM trends t
  ORDER BY t.period_key;
END;
$$;

-- Function: get_similar_properties
-- Find properties similar to a given property based on characteristics
CREATE OR REPLACE FUNCTION get_similar_properties(
  target_property_id uuid,
  radius_km double precision DEFAULT 5,
  result_limit integer DEFAULT 10
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
  similarity_score numeric,
  distance_km double precision
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  target_property RECORD;
  target_point geometry(point, 4326);
BEGIN
  -- Get the target property details
  SELECT p.* INTO target_property
  FROM properties p 
  WHERE p.id = target_property_id AND p.is_active = true;
  
  -- If property doesn't exist, return empty result
  IF target_property IS NULL THEN
    RETURN;
  END IF;
  
  target_point := target_property.coordinates;
  
  -- Return similar properties with similarity scoring
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
    -- Similarity score based on multiple factors (0-100)
    ROUND((
      -- Property type match (30 points)
      CASE WHEN p.property_type = target_property.property_type THEN 30 ELSE 0 END +
      -- Bedroom similarity (20 points max)
      GREATEST(0, 20 - ABS(p.bedrooms - target_property.bedrooms) * 5) +
      -- Bathroom similarity (15 points max)  
      GREATEST(0, 15 - ABS(p.bathrooms - target_property.bathrooms) * 10) +
      -- Price similarity (25 points max)
      GREATEST(0, 25 - (ABS(p.price - target_property.price)::numeric / GREATEST(p.price, target_property.price) * 100)) +
      -- Square feet similarity (10 points max)
      CASE 
        WHEN p.square_feet IS NULL OR target_property.square_feet IS NULL THEN 5
        ELSE GREATEST(0, 10 - (ABS(p.square_feet - target_property.square_feet)::numeric / GREATEST(p.square_feet, target_property.square_feet) * 100))
      END
    )::numeric, 1) as similarity_score,
    COALESCE((ST_Distance(p.coordinates::geography, target_point::geography) / 1000)::double precision, 999) as distance_km
  FROM properties p
  WHERE 
    p.id != target_property_id
    AND p.is_active = true
    AND p.coordinates IS NOT NULL
    AND (target_point IS NULL OR ST_DWithin(p.coordinates::geography, target_point::geography, radius_km * 1000))
    -- Filter to reasonable similarity (at least property type or close price)
    AND (
      p.property_type = target_property.property_type
      OR ABS(p.price - target_property.price) < target_property.price * 0.3
    )
  ORDER BY similarity_score DESC, distance_km ASC
  LIMIT result_limit;
END;
$$;

-- Function: get_property_market_comparisons
-- Get market comparisons for a property within a radius
CREATE OR REPLACE FUNCTION get_property_market_comparisons(
  target_property_id uuid,
  radius_km double precision DEFAULT 5
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
  neighborhood_id uuid,
  price_per_sqft numeric,
  distance_km double precision
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  target_property RECORD;
  target_point geometry(point, 4326);
BEGIN
  -- Get the target property details
  SELECT p.* INTO target_property
  FROM properties p 
  WHERE p.id = target_property_id AND p.is_active = true;
  
  -- If property doesn't exist, return empty result
  IF target_property IS NULL THEN
    RETURN;
  END IF;
  
  target_point := target_property.coordinates;
  
  -- Return market comparisons
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
    p.neighborhood_id,
    CASE 
      WHEN p.square_feet IS NOT NULL AND p.square_feet > 0 THEN 
        ROUND((p.price::numeric / p.square_feet), 2)
      ELSE NULL
    END as price_per_sqft,
    COALESCE((ST_Distance(p.coordinates::geography, target_point::geography) / 1000)::double precision, 999) as distance_km
  FROM properties p
  WHERE 
    p.id != target_property_id
    AND p.is_active = true
    AND p.coordinates IS NOT NULL
    AND (target_point IS NULL OR ST_DWithin(p.coordinates::geography, target_point::geography, radius_km * 1000))
    -- Similar property characteristics for valid comparison
    AND p.property_type = target_property.property_type
    AND p.bedrooms BETWEEN GREATEST(1, target_property.bedrooms - 1) AND target_property.bedrooms + 1
    AND p.bathrooms BETWEEN GREATEST(1, target_property.bathrooms - 0.5) AND target_property.bathrooms + 0.5
    -- Price within reasonable range (±40%)
    AND p.price BETWEEN target_property.price * 0.6 AND target_property.price * 1.4
  ORDER BY distance_km ASC, ABS(p.price - target_property.price) ASC
  LIMIT 20;
END;
$$;

-- Function: get_market_velocity
-- Calculate how quickly properties are selling in an area
CREATE OR REPLACE FUNCTION get_market_velocity(
  target_neighborhood_id uuid DEFAULT NULL
)
RETURNS TABLE (
  avg_days_on_market numeric,
  total_sold bigint,
  velocity_score integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  days_on_market_avg numeric;
  total_properties bigint;
  velocity integer;
BEGIN
  -- Calculate average days on market and total sold
  -- This is simplified - in reality you'd track listing dates and sale dates
  SELECT 
    AVG(EXTRACT(EPOCH FROM (updated_at - created_at)) / 86400) as avg_days,
    COUNT(*) as total_count
  INTO days_on_market_avg, total_properties
  FROM properties p
  WHERE 
    p.is_active = true
    AND (target_neighborhood_id IS NULL OR p.neighborhood_id = target_neighborhood_id)
    AND p.created_at >= NOW() - INTERVAL '6 months';
    
  -- Calculate velocity score (0-100, lower days = higher score)
  velocity := CASE 
    WHEN days_on_market_avg IS NULL THEN 50
    WHEN days_on_market_avg <= 7 THEN 95
    WHEN days_on_market_avg <= 14 THEN 85
    WHEN days_on_market_avg <= 30 THEN 70
    WHEN days_on_market_avg <= 60 THEN 50
    WHEN days_on_market_avg <= 90 THEN 30
    ELSE 10
  END;
  
  RETURN QUERY
  SELECT 
    COALESCE(ROUND(days_on_market_avg, 1), 0) as avg_days_on_market,
    COALESCE(total_properties, 0) as total_sold,
    velocity as velocity_score;
END;
$$;

-- =============================================================================
-- ADDITIONAL GEOGRAPHIC FUNCTIONS
-- Advanced geographic and map-related functionality
-- =============================================================================

-- Function: get_neighborhoods_in_bounds  
-- Get neighborhoods within a bounding box using PostGIS
CREATE OR REPLACE FUNCTION get_neighborhoods_in_bounds(
  north_lat double precision,
  south_lat double precision,
  east_lng double precision,
  west_lng double precision
)
RETURNS TABLE (
  id uuid,
  name text,
  city text,
  state text,
  metro_area text,
  bounds geometry,
  median_price integer,
  walk_score integer,
  transit_score integer,
  created_at timestamptz
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
  
  -- Return neighborhoods that intersect with the bounding box
  RETURN QUERY
  SELECT 
    n.id,
    n.name,
    n.city,
    n.state,
    n.metro_area,
    n.bounds,
    n.median_price,
    n.walk_score,
    n.transit_score,
    n.created_at
  FROM neighborhoods n
  WHERE 
    n.bounds IS NOT NULL
    AND ST_Intersects(n.bounds, bbox)
  ORDER BY n.name;
END;
$$;

-- Function: get_property_clusters
-- Get property clusters for mapping visualization
CREATE OR REPLACE FUNCTION get_property_clusters(
  north_lat double precision,
  south_lat double precision,
  east_lng double precision,
  west_lng double precision,
  zoom_level integer DEFAULT 10
)
RETURNS TABLE (
  lat double precision,
  lng double precision,
  count bigint,
  avg_price numeric,
  min_price integer,
  max_price integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  bbox geometry(polygon, 4326);
  grid_size double precision;
BEGIN
  -- Create bounding box polygon
  bbox := ST_SetSRID(ST_MakeEnvelope(west_lng, south_lat, east_lng, north_lat), 4326);
  
  -- Adjust grid size based on zoom level
  grid_size := CASE 
    WHEN zoom_level >= 15 THEN 0.001  -- ~100m
    WHEN zoom_level >= 12 THEN 0.005  -- ~500m  
    WHEN zoom_level >= 9 THEN 0.01    -- ~1km
    ELSE 0.05                         -- ~5km
  END;
  
  -- Return property clusters
  RETURN QUERY
  SELECT 
    ROUND((ST_Y(ST_Centroid(cluster_geom)))::numeric, 6)::double precision as lat,
    ROUND((ST_X(ST_Centroid(cluster_geom)))::numeric, 6)::double precision as lng,
    COUNT(*) as count,
    ROUND(AVG(p.price)::numeric, 0) as avg_price,
    MIN(p.price) as min_price,
    MAX(p.price) as max_price
  FROM (
    SELECT 
      p.*,
      ST_SnapToGrid(p.coordinates, grid_size) as cluster_geom
    FROM properties p
    WHERE 
      p.is_active = true
      AND p.coordinates IS NOT NULL
      AND ST_Within(p.coordinates, bbox)
  ) p
  GROUP BY cluster_geom
  HAVING COUNT(*) >= 1
  ORDER BY count DESC;
END;
$$;

-- Function: get_properties_in_polygon
-- Get properties within a custom polygon
CREATE OR REPLACE FUNCTION get_properties_in_polygon(
  polygon_points jsonb,
  result_limit integer DEFAULT 100
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
  coordinates geometry(point, 4326),
  neighborhood_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  polygon_geom geometry(polygon, 4326);
  polygon_wkt text;
BEGIN
  -- Build WKT polygon from JSON points
  WITH points AS (
    SELECT 
      jsonb_array_elements(polygon_points) as point
  ),
  coords AS (
    SELECT 
      (point->>'lng')::double precision as lng,
      (point->>'lat')::double precision as lat
    FROM points
  )
  SELECT 
    'POLYGON((' || string_agg(lng::text || ' ' || lat::text, ',') || 
    ',' || (array_agg(lng))[1]::text || ' ' || (array_agg(lat))[1]::text || '))'
  INTO polygon_wkt
  FROM coords;
  
  -- Create polygon geometry
  polygon_geom := ST_SetSRID(ST_GeomFromText(polygon_wkt), 4326);
  
  -- Return properties within polygon
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
    p.coordinates,
    p.neighborhood_id
  FROM properties p
  WHERE 
    p.is_active = true
    AND p.coordinates IS NOT NULL
    AND ST_Within(p.coordinates, polygon_geom)
  ORDER BY p.price DESC
  LIMIT result_limit;
END;
$$;

-- Function: get_properties_along_route
-- Get properties along a route corridor
CREATE OR REPLACE FUNCTION get_properties_along_route(
  waypoints jsonb,
  corridor_width_km double precision DEFAULT 1
)
RETURNS TABLE (
  id uuid,
  address text,
  city text,
  state text,
  price integer,
  bedrooms integer,
  bathrooms numeric(2,1),
  property_type text,
  neighborhood_id uuid,
  distance_from_route double precision
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  route_line geometry(linestring, 4326);
  route_wkt text;
  route_buffer geometry(polygon, 4326);
BEGIN
  -- Build WKT linestring from JSON waypoints
  WITH points AS (
    SELECT 
      jsonb_array_elements(waypoints) as point
  ),
  coords AS (
    SELECT 
      (point->>'lng')::double precision as lng,
      (point->>'lat')::double precision as lat
    FROM points
  )
  SELECT 
    'LINESTRING(' || string_agg(lng::text || ' ' || lat::text, ',') || ')'
  INTO route_wkt
  FROM coords;
  
  -- Create route line geometry
  route_line := ST_SetSRID(ST_GeomFromText(route_wkt), 4326);
  
  -- Create buffer around route
  route_buffer := ST_Buffer(route_line::geography, corridor_width_km * 1000)::geometry;
  
  -- Return properties within corridor
  RETURN QUERY
  SELECT 
    p.id,
    p.address,
    p.city,
    p.state,
    p.price,
    p.bedrooms,
    p.bathrooms,
    p.property_type,
    p.neighborhood_id,
    (ST_Distance(p.coordinates::geography, route_line::geography) / 1000)::double precision as distance_from_route
  FROM properties p
  WHERE 
    p.is_active = true
    AND p.coordinates IS NOT NULL
    AND ST_Within(p.coordinates, route_buffer)
  ORDER BY distance_from_route ASC
  LIMIT 50;
END;
$$;

-- Function: get_geographic_density
-- Get geographic property density analysis
CREATE OR REPLACE FUNCTION get_geographic_density(
  north_lat double precision,
  south_lat double precision,
  east_lng double precision,
  west_lng double precision,
  grid_size_deg double precision DEFAULT 0.01
)
RETURNS TABLE (
  total_properties bigint,
  avg_price numeric,
  price_density jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  bbox geometry(polygon, 4326);
  total_count bigint;
  average_price numeric;
  density_data jsonb;
BEGIN
  -- Create bounding box polygon
  bbox := ST_SetSRID(ST_MakeEnvelope(west_lng, south_lat, east_lng, north_lat), 4326);
  
  -- Get total properties and average price in bounds
  SELECT 
    COUNT(*),
    AVG(p.price)
  INTO total_count, average_price
  FROM properties p
  WHERE 
    p.is_active = true
    AND p.coordinates IS NOT NULL
    AND ST_Within(p.coordinates, bbox);
  
  -- Calculate density grid
  WITH grid_cells AS (
    SELECT 
      ROUND((ST_Y(ST_Centroid(cluster_geom)))::numeric, 4) as lat,
      ROUND((ST_X(ST_Centroid(cluster_geom)))::numeric, 4) as lng,
      AVG(p.price) as avg_price,
      COUNT(*) as property_count
    FROM (
      SELECT 
        p.*,
        ST_SnapToGrid(p.coordinates, grid_size_deg) as cluster_geom
      FROM properties p
      WHERE 
        p.is_active = true
        AND p.coordinates IS NOT NULL
        AND ST_Within(p.coordinates, bbox)
    ) p
    GROUP BY cluster_geom
    HAVING COUNT(*) > 0
  )
  SELECT 
    jsonb_agg(
      jsonb_build_object(
        'lat', gc.lat,
        'lng', gc.lng, 
        'price', ROUND(gc.avg_price::numeric, 0),
        'density_score', LEAST(100, gc.property_count * 10)
      )
    )
  INTO density_data
  FROM grid_cells gc;
  
  -- Return results
  RETURN QUERY
  SELECT 
    COALESCE(total_count, 0) as total_properties,
    COALESCE(ROUND(average_price::numeric, 0), 0) as avg_price,
    COALESCE(density_data, '[]'::jsonb) as price_density;
END;
$$;

-- Function: geocode_address (stub)
-- Placeholder for address geocoding - in production would integrate with geocoding service
CREATE OR REPLACE FUNCTION geocode_address(
  address_text text
)
RETURNS TABLE (
  latitude double precision,
  longitude double precision,
  formatted_address text,
  confidence numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  -- This is a stub implementation
  -- In production, this would integrate with a geocoding service like Google Maps or MapBox
  -- For now, return empty result
  RETURN QUERY
  SELECT 
    NULL::double precision as latitude,
    NULL::double precision as longitude, 
    address_text as formatted_address,
    0::numeric as confidence
  WHERE FALSE; -- Always return empty for stub
END;
$$;

-- Function: get_nearest_amenities (stub)
-- Placeholder for amenity search - would integrate with POI database
CREATE OR REPLACE FUNCTION get_nearest_amenities(
  center_lat double precision,
  center_lng double precision,
  amenity_types text[],
  search_radius_km double precision DEFAULT 2
)
RETURNS TABLE (
  amenity_id text,
  amenity_name text,
  amenity_type text,
  distance_km double precision,
  latitude double precision,
  longitude double precision
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  -- This is a stub implementation
  -- In production, this would integrate with a POI/amenity database
  -- For now, return empty result
  RETURN QUERY
  SELECT 
    NULL::text as amenity_id,
    NULL::text as amenity_name,
    NULL::text as amenity_type,
    NULL::double precision as distance_km,
    NULL::double precision as latitude,
    NULL::double precision as longitude
  WHERE FALSE; -- Always return empty for stub
END;
$$;

-- =============================================================================
-- TESTING UTILITY FUNCTIONS
-- Utility functions for integration tests and debugging
-- =============================================================================

-- Function: check_table_exists
-- Check if specified tables exist in the public schema
CREATE OR REPLACE FUNCTION public.check_table_exists(table_names text[])
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  result json;
  current_table_name text;
  table_info json;
  tables_info json[] := '{}';
BEGIN
  -- Loop through each table name
  FOREACH current_table_name IN ARRAY table_names
  LOOP
    -- Check if table exists in public schema
    SELECT json_build_object(
      'table_name', current_table_name,
      'exists', CASE WHEN EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND information_schema.tables.table_name = current_table_name
      ) THEN true ELSE false END,
      'schema', 'public'
    ) INTO table_info;
    
    -- Add to results array
    tables_info := tables_info || table_info;
  END LOOP;
  
  -- Return as JSON array
  SELECT json_agg(t) INTO result FROM unnest(tables_info) AS t;
  
  RETURN result;
END;
$$;

-- =============================================================================
-- PERMISSIONS AND DOCUMENTATION
-- Grant appropriate permissions and add documentation
-- =============================================================================

-- Grant execute permissions to authenticated users for all functions
GRANT EXECUTE ON FUNCTION get_properties_in_bounds TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_distance TO authenticated;
GRANT EXECUTE ON FUNCTION get_walkability_score TO authenticated;
GRANT EXECUTE ON FUNCTION get_transit_score TO authenticated;
GRANT EXECUTE ON FUNCTION get_properties_by_distance TO authenticated;

GRANT EXECUTE ON FUNCTION get_neighborhood_stats TO authenticated;
GRANT EXECUTE ON FUNCTION get_market_trends TO authenticated;
GRANT EXECUTE ON FUNCTION get_similar_properties TO authenticated;
GRANT EXECUTE ON FUNCTION get_property_market_comparisons TO authenticated;
GRANT EXECUTE ON FUNCTION get_market_velocity TO authenticated;

GRANT EXECUTE ON FUNCTION get_neighborhoods_in_bounds TO authenticated;
GRANT EXECUTE ON FUNCTION get_property_clusters TO authenticated;
GRANT EXECUTE ON FUNCTION get_properties_in_polygon TO authenticated;
GRANT EXECUTE ON FUNCTION get_properties_along_route TO authenticated;
GRANT EXECUTE ON FUNCTION get_geographic_density TO authenticated;
GRANT EXECUTE ON FUNCTION geocode_address TO authenticated;
GRANT EXECUTE ON FUNCTION get_nearest_amenities TO authenticated;

GRANT EXECUTE ON FUNCTION public.check_table_exists(text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_table_exists(text[]) TO anon;

-- Add documentation comments
COMMENT ON FUNCTION get_properties_in_bounds IS 'Returns properties within a bounding box';
COMMENT ON FUNCTION calculate_distance IS 'Calculates distance in kilometers between two points using PostGIS';
COMMENT ON FUNCTION get_walkability_score IS 'Calculates walkability score based on property density and neighborhood data';
COMMENT ON FUNCTION get_transit_score IS 'Calculates transit score based on neighborhood data and property density';
COMMENT ON FUNCTION get_properties_by_distance IS 'Returns properties sorted by distance from a center point';

COMMENT ON FUNCTION get_neighborhood_stats IS 'Returns comprehensive statistics for a specific neighborhood';
COMMENT ON FUNCTION get_market_trends IS 'Returns market trends over specified timeframe with price change percentages';
COMMENT ON FUNCTION get_similar_properties IS 'Finds similar properties based on characteristics and location';
COMMENT ON FUNCTION get_property_market_comparisons IS 'Returns market comparisons for a property within specified radius';
COMMENT ON FUNCTION get_market_velocity IS 'Calculates market velocity (how quickly properties sell) for a neighborhood or overall market';

COMMENT ON FUNCTION get_neighborhoods_in_bounds IS 'Returns neighborhoods that intersect with a bounding box';
COMMENT ON FUNCTION get_property_clusters IS 'Returns property clusters for map visualization based on zoom level';
COMMENT ON FUNCTION get_properties_in_polygon IS 'Returns properties within a custom polygon defined by coordinate points';
COMMENT ON FUNCTION get_properties_along_route IS 'Returns properties within a corridor along a route defined by waypoints';
COMMENT ON FUNCTION get_geographic_density IS 'Returns property density analysis within a bounding box using a grid system';
COMMENT ON FUNCTION geocode_address IS 'Stub function for address geocoding - to be implemented with geocoding service';
COMMENT ON FUNCTION get_nearest_amenities IS 'Stub function for finding nearby amenities - to be implemented with POI database';

COMMENT ON FUNCTION public.check_table_exists IS 'Returns JSON array indicating which tables exist in the public schema';

-- =============================================================================
-- FIX USER PROFILE TRIGGER FOR TESTING
-- Fix the user profile trigger to properly handle RLS and prevent test failures
-- =============================================================================

-- Drop and recreate the trigger function with proper permissions and error handling
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
SECURITY DEFINER  -- Execute with function owner's privileges to bypass RLS
SET search_path = public
AS $$
BEGIN
  -- Insert user profile with conflict handling to prevent duplicates
  INSERT INTO public.user_profiles (id, onboarding_completed, preferences)
  VALUES (NEW.id, false, '{}'::jsonb)
  ON CONFLICT (id) DO NOTHING;  -- Prevent duplicate key errors during testing
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log error but don't fail user creation - this ensures auth users can still be created
  RAISE WARNING 'Failed to create user profile for user %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Grant necessary permissions to the postgres role that executes the function
GRANT INSERT ON public.user_profiles TO postgres;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Add documentation  
COMMENT ON FUNCTION public.handle_new_user IS 'Automatically creates user profiles when auth users are created. Includes RLS bypass and error handling for testing.';