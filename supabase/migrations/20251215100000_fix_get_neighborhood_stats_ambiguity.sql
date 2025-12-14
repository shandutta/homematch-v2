-- Fix get_neighborhood_stats ambiguous column references
-- In plpgsql, RETURN TABLE column names are also variables; qualify CTE columns to avoid ambiguity.

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
    COALESCE(stats.total_properties, 'NaN'::double precision),
    COALESCE(stats.avg_price, 'NaN'::double precision),
    COALESCE(stats.median_price, 'NaN'::double precision),
    COALESCE(stats.price_range_min, 'NaN'::double precision),
    COALESCE(stats.price_range_max, 'NaN'::double precision),
    COALESCE(stats.avg_bedrooms, 'NaN'::double precision),
    COALESCE(stats.avg_bathrooms, 'NaN'::double precision),
    COALESCE(stats.avg_square_feet, 'NaN'::double precision)
  FROM stats;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_neighborhood_stats(uuid) TO authenticated;

