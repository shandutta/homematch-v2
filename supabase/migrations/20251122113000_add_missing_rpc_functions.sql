-- Restore RPC helpers expected by integration tests and services
BEGIN;

-- ============================================================================
-- check_table_exists(table_names text[])
-- ============================================================================
CREATE OR REPLACE FUNCTION public.check_table_exists(table_names text[])
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result json;
  current_table_name text;
  table_info json;
  tables_info json[] := '{}';
BEGIN
  FOREACH current_table_name IN ARRAY table_names LOOP
    SELECT json_build_object(
      'table_name', current_table_name,
      'exists',
        EXISTS (
          SELECT 1
          FROM information_schema.tables
          WHERE table_schema = 'public'
            AND information_schema.tables.table_name = current_table_name
        ),
      'schema', 'public'
    )
    INTO table_info;

    tables_info := tables_info || table_info;
  END LOOP;

  SELECT json_agg(t) INTO result FROM unnest(tables_info) AS t;
  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_table_exists(text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_table_exists(text[]) TO anon;

-- ============================================================================
-- get_properties_within_radius(center_lat, center_lng, radius_km, result_limit)
-- ============================================================================
DROP FUNCTION IF EXISTS public.get_properties_within_radius(double precision, double precision, integer);
DROP FUNCTION IF EXISTS public.get_properties_within_radius(double precision, double precision, double precision);

CREATE OR REPLACE FUNCTION public.get_properties_within_radius(
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
  center_point := ST_SetSRID(ST_MakePoint(center_lng, center_lat), 4326);

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
    (ST_Distance(p.coordinates::geography, center_point::geography) / 1000)::double precision AS distance_km
  FROM properties p
  WHERE 
    p.is_active = true
    AND p.coordinates IS NOT NULL
    AND ST_DWithin(p.coordinates::geography, center_point::geography, radius_km * 1000)
  ORDER BY p.coordinates <-> center_point
  LIMIT result_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_properties_within_radius(double precision, double precision, double precision, integer) TO authenticated;

-- ============================================================================
-- calculate_distance(lat1, lng1, lat2, lng2)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.calculate_distance(
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
  point1 := ST_SetSRID(ST_MakePoint(lng1, lat1), 4326);
  point2 := ST_SetSRID(ST_MakePoint(lng2, lat2), 4326);

  distance_meters := ST_Distance(point1::geography, point2::geography);
  RETURN (distance_meters / 1000)::double precision;
END;
$$;

GRANT EXECUTE ON FUNCTION public.calculate_distance(double precision, double precision, double precision, double precision) TO authenticated;

-- ============================================================================
-- get_neighborhood_stats(neighborhood_uuid uuid)
-- Returns NaN-like values for non-existent neighborhoods to satisfy tests
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_neighborhood_stats(neighborhood_uuid uuid)
RETURNS TABLE (
  total_properties double precision,
  avg_price double precision,
  median_price double precision,
  price_range_min double precision,
  price_range_max double precision,
  avg_bedrooms double precision,
  avg_bathrooms double precision,
  avg_square_feet double precision
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  neighborhood_exists boolean;
BEGIN
  SELECT EXISTS(SELECT 1 FROM neighborhoods WHERE id = neighborhood_uuid)
  INTO neighborhood_exists;

  IF NOT neighborhood_exists THEN
    RETURN QUERY
    SELECT
      'NaN'::double precision,
      'NaN'::double precision,
      'NaN'::double precision,
      'NaN'::double precision,
      'NaN'::double precision,
      'NaN'::double precision,
      'NaN'::double precision,
      'NaN'::double precision;
    RETURN;
  END IF;

  RETURN QUERY
  WITH stats AS (
    SELECT 
      COUNT(*)::double precision AS total_properties,
      AVG(price)::double precision AS avg_price,
      percentile_cont(0.5) WITHIN GROUP (ORDER BY price) AS median_price,
      MIN(price)::double precision AS price_range_min,
      MAX(price)::double precision AS price_range_max,
      AVG(bedrooms)::double precision AS avg_bedrooms,
      AVG(bathrooms)::double precision AS avg_bathrooms,
      AVG(square_feet)::double precision AS avg_square_feet
    FROM properties
    WHERE neighborhood_id = neighborhood_uuid
      AND is_active = true
  )
  SELECT
    COALESCE(total_properties, 'NaN'::double precision),
    COALESCE(avg_price, 'NaN'::double precision),
    COALESCE(median_price, 'NaN'::double precision),
    COALESCE(price_range_min, 'NaN'::double precision),
    COALESCE(price_range_max, 'NaN'::double precision),
    COALESCE(avg_bedrooms, 'NaN'::double precision),
    COALESCE(avg_bathrooms, 'NaN'::double precision),
    COALESCE(avg_square_feet, 'NaN'::double precision)
  FROM stats;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_neighborhood_stats(uuid) TO authenticated;

COMMIT;
