-- Applied via Supabase MCP apply_migration (version 20260522014235); mirrored
-- here for repo/drift parity.
--
-- The geo gate (scripts/validate-neighborhoods.ts) was false-failing: its
-- invalid_bounds check counted ALL rows nationwide, so 2 out-of-region cruft
-- polygons (Ocoee FL, Timberwood Park / San Antonio TX -- mislabeled state='CA',
-- failing ST_IsValid with "Ring Self-intersection") tripped a Bay-Area gate even
-- though they are GIST-pruned from every Bay query and can never affect
-- assignment. This migration (1) repairs those geometries non-destructively and
-- (2) scopes the gate's hard structural checks to the Bay Area set the app
-- actually assigns against, keeping global counts as informational *_global
-- fields so future out-of-region cruft stays visible without failing the gate.

-- (1) Repair the only invalid polygons in the table. Non-destructive:
-- ST_MakeValid keeps the rows; ST_CollectionExtract(...,3)+ST_Multi keep them
-- MULTIPOLYGON. Idempotent (WHERE NOT ST_IsValid) so re-running is a no-op.
UPDATE public.neighborhoods
SET bounds = ST_Multi(ST_CollectionExtract(ST_MakeValid(bounds), 3))
WHERE bounds IS NOT NULL AND NOT ST_IsValid(bounds);

-- (2) Redefine the gate so hard checks measure the Bay Area set only.
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
  -- Hard checks: Bay Area set only (the rows the app uses for assignment).
  'invalid_bounds', (SELECT count(*) FROM bay WHERE NOT ST_IsValid(bounds)),
  'non_multipolygon', (SELECT count(*) FROM bay WHERE GeometryType(bounds) <> 'MULTIPOLYGON'),
  -- Informational: same checks across ALL rows nationwide.
  'invalid_bounds_global', (SELECT count(*) FROM public.neighborhoods WHERE bounds IS NOT NULL AND NOT ST_IsValid(bounds)),
  'non_multipolygon_global', (SELECT count(*) FROM public.neighborhoods WHERE bounds IS NOT NULL AND GeometryType(bounds) <> 'MULTIPOLYGON'),
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
