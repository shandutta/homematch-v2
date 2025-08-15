-- Additional RPC Functions Migration
-- Implements remaining geographic and analytics functions

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

-- Add comments for documentation
COMMENT ON FUNCTION get_neighborhoods_in_bounds IS 'Returns neighborhoods that intersect with a bounding box';
COMMENT ON FUNCTION get_property_clusters IS 'Returns property clusters for map visualization based on zoom level';
COMMENT ON FUNCTION get_properties_in_polygon IS 'Returns properties within a custom polygon defined by coordinate points';
COMMENT ON FUNCTION get_properties_along_route IS 'Returns properties within a corridor along a route defined by waypoints';
COMMENT ON FUNCTION geocode_address IS 'Stub function for address geocoding - to be implemented with geocoding service';
COMMENT ON FUNCTION get_geographic_density IS 'Returns property density analysis within a bounding box using a grid system';
COMMENT ON FUNCTION get_nearest_amenities IS 'Stub function for finding nearby amenities - to be implemented with POI database';