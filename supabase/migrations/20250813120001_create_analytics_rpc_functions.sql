-- Property Analytics RPC Functions Migration
-- Implements market trends and analytics functions needed by PropertyAnalyticsService

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
-- Get market trends over time (simplified version using created_at for demonstration)
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

-- Add comments for documentation
COMMENT ON FUNCTION get_neighborhood_stats IS 'Returns comprehensive statistics for a specific neighborhood';
COMMENT ON FUNCTION get_market_trends IS 'Returns market trends over specified timeframe with price change percentages';
COMMENT ON FUNCTION get_similar_properties IS 'Finds similar properties based on characteristics and location';
COMMENT ON FUNCTION get_property_market_comparisons IS 'Returns market comparisons for a property within specified radius';
COMMENT ON FUNCTION get_market_velocity IS 'Calculates market velocity (how quickly properties sell) for a neighborhood or overall market';