-- Applied via Supabase MCP apply_migration (version 20260522013732); mirrored
-- here for repo/drift parity.
--
-- Repeatable geo-correctness gate used by scripts/validate-neighborhoods.ts
-- (and runnable before any property re-ingest). Returns a JSON verdict:
-- per-city counts, geometry validity/type/SRID invariants, inside-polygon
-- assignment accuracy (sampled), and the 3 downtown known-point assignments.
CREATE OR REPLACE FUNCTION public.validate_neighborhood_coverage()
RETURNS jsonb
LANGUAGE sql SECURITY DEFINER SET search_path = public, extensions
AS $func$
WITH bay AS (
  SELECT name, city, bounds FROM public.neighborhoods
  WHERE bounds IS NOT NULL
    AND ST_Y(ST_Centroid(bounds)) BETWEEN 36.9 AND 38.6
    AND ST_X(ST_Centroid(bounds)) BETWEEN -123.2 AND -121.2
),
pts AS (
  SELECT b.city AS src_city, (ST_Dump(ST_GeneratePoints(b.bounds, 3))).geom AS pt
  FROM bay b
),
acc AS (
  SELECT count(*) AS total,
    count(*) FILTER (WHERE EXISTS (
      SELECT 1 FROM public.neighborhoods n
      WHERE n.bounds IS NOT NULL AND ST_Covers(n.bounds, p.pt)
        AND upper(n.city) = upper(p.src_city))) AS same_city
  FROM pts p
)
SELECT jsonb_build_object(
  'sf_count', (SELECT count(*) FROM public.neighborhoods WHERE city='San Francisco'),
  'oakland_count', (SELECT count(*) FROM public.neighborhoods WHERE city='Oakland'),
  'san_jose_count', (SELECT count(*) FROM public.neighborhoods WHERE city='San Jose'),
  'bay_neighborhoods', (SELECT count(*) FROM bay),
  'invalid_bounds', (SELECT count(*) FROM public.neighborhoods WHERE bounds IS NOT NULL AND NOT ST_IsValid(bounds)),
  'non_multipolygon', (SELECT count(*) FROM public.neighborhoods WHERE bounds IS NOT NULL AND GeometryType(bounds) <> 'MULTIPOLYGON'),
  'distinct_srids', (SELECT array_agg(DISTINCT ST_SRID(bounds)) FROM public.neighborhoods WHERE bounds IS NOT NULL),
  'inside_accuracy_pct', (SELECT round(100.0*same_city/NULLIF(total,0), 2) FROM acc),
  'sample_points', (SELECT total FROM acc),
  'downtown', jsonb_build_object(
    'sf', (SELECT n.name FROM public.neighborhoods n WHERE n.bounds IS NOT NULL AND ST_Covers(n.bounds, ST_SetSRID(ST_MakePoint(-122.3937,37.7955),4326)) ORDER BY ST_Area(n.bounds) LIMIT 1),
    'oakland', (SELECT n.name FROM public.neighborhoods n WHERE n.bounds IS NOT NULL AND ST_Covers(n.bounds, ST_SetSRID(ST_MakePoint(-122.2729,37.8049),4326)) ORDER BY ST_Area(n.bounds) LIMIT 1),
    'san_jose', (SELECT n.name FROM public.neighborhoods n WHERE n.bounds IS NOT NULL AND ST_Covers(n.bounds, ST_SetSRID(ST_MakePoint(-121.8863,37.3382),4326)) ORDER BY ST_Area(n.bounds) LIMIT 1)
  )
)
$func$;

REVOKE ALL ON FUNCTION public.validate_neighborhood_coverage() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.validate_neighborhood_coverage() TO service_role;
