-- Add DB-side property stats aggregation to avoid loading all active property rows in app memory.

CREATE OR REPLACE FUNCTION public.get_property_stats()
RETURNS TABLE (
  total_properties integer,
  avg_price numeric,
  median_price numeric,
  avg_bedrooms numeric,
  avg_bathrooms numeric,
  avg_square_feet numeric,
  property_type_distribution jsonb
)
LANGUAGE sql
STABLE
SET search_path = pg_catalog, public
AS $$
  WITH active_properties AS (
    SELECT
      price,
      bedrooms,
      bathrooms,
      square_feet,
      COALESCE(property_type, 'unknown') AS property_type
    FROM public.properties
    WHERE is_active IS TRUE
      AND listing_status = 'active'
  ),
  type_counts AS (
    SELECT
      property_type,
      COUNT(*)::integer AS type_count
    FROM active_properties
    GROUP BY property_type
  )
  SELECT
    COUNT(*)::integer AS total_properties,
    COALESCE(ROUND(AVG(price)), 0) AS avg_price,
    COALESCE(
      ROUND((percentile_cont(0.5) WITHIN GROUP (ORDER BY price))::numeric),
      0
    ) AS median_price,
    COALESCE(ROUND(AVG(bedrooms)::numeric, 1), 0) AS avg_bedrooms,
    COALESCE(ROUND(AVG(bathrooms)::numeric, 1), 0) AS avg_bathrooms,
    COALESCE(ROUND(AVG(square_feet)), 0) AS avg_square_feet,
    COALESCE(
      (SELECT jsonb_object_agg(property_type, type_count) FROM type_counts),
      '{}'::jsonb
    ) AS property_type_distribution
  FROM active_properties;
$$;

GRANT EXECUTE ON FUNCTION public.get_property_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_property_stats() TO service_role;
