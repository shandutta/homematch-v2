-- Neighborhood Vibes review queries (Supabase SQL Editor)
-- Goal: after running `scripts/backfill-neighborhood-vibes.ts`, use these to
-- quickly verify coverage and skim the generated output.

-- ============================================================================
-- 0) Pick neighborhoods to backfill (missing vibes)
-- ============================================================================
-- Tip: add a state filter (e.g. `AND n.state = 'CA'`) to focus on California.
SELECT
  n.id AS neighborhood_id,
  n.name,
  n.city,
  n.state,
  n.metro_area,
  n.created_at
FROM public.neighborhoods n
LEFT JOIN public.neighborhood_vibes nv ON nv.neighborhood_id = n.id
WHERE nv.neighborhood_id IS NULL
  -- AND n.state = 'CA'
ORDER BY n.created_at DESC
LIMIT 25;

-- ============================================================================
-- 0b) Coverage snapshot (CA only)
-- ============================================================================
-- Tip: add a state filter (e.g. `WHERE n.state = 'CA'`) to focus on California.
SELECT
  COUNT(*) FILTER (WHERE nv.neighborhood_id IS NOT NULL) AS neighborhoods_with_vibes,
  COUNT(*) FILTER (WHERE nv.neighborhood_id IS NULL) AS neighborhoods_missing_vibes,
  COUNT(*) AS total_neighborhoods_considered
FROM public.neighborhoods n
LEFT JOIN public.neighborhood_vibes nv ON nv.neighborhood_id = n.id
-- WHERE n.state = 'CA';

-- ============================================================================
-- 1) Latest generated vibes (quick skim)
-- ============================================================================
-- Tip: add a state filter (e.g. `WHERE n.state = 'CA'`) to focus on California.
SELECT
  nv.created_at AS vibes_created_at,
  n.id AS neighborhood_id,
  n.name,
  n.city,
  n.state,
  n.metro_area,
  nv.tagline,
  nv.vibe_statement,
  nv.suggested_tags,
  nv.generation_cost_usd,
  nv.model_used
FROM public.neighborhood_vibes nv
JOIN public.neighborhoods n ON n.id = nv.neighborhood_id
-- WHERE n.state = 'CA'
ORDER BY nv.created_at DESC
LIMIT 25;

-- ============================================================================
-- 2) Deep dive one neighborhood
-- ============================================================================
-- Replace the UUID below with a `neighborhood_id` from query #1.
SELECT
  n.id AS neighborhood_id,
  n.name,
  n.city,
  n.state,
  n.metro_area,
  n.walk_score,
  n.transit_score,
  n.median_price,
  nv.id AS vibes_id,
  nv.tagline,
  nv.vibe_statement,
  nv.neighborhood_themes,
  nv.local_highlights,
  nv.resident_fits,
  nv.suggested_tags,
  nv.input_data,
  nv.raw_output,
  nv.model_used,
  nv.generation_cost_usd,
  nv.confidence,
  nv.created_at AS vibes_created_at
FROM public.neighborhoods n
LEFT JOIN public.neighborhood_vibes nv ON nv.neighborhood_id = n.id
WHERE n.id = '00000000-0000-0000-0000-000000000000';

-- ============================================================================
-- 3) Tag distribution (CA only)
-- ============================================================================
-- Tip: add a state filter (e.g. `WHERE n.state = 'CA'`) to focus on California.
SELECT
  tag,
  COUNT(*) AS uses
FROM public.neighborhood_vibes nv
JOIN public.neighborhoods n ON n.id = nv.neighborhood_id,
  UNNEST(nv.suggested_tags) AS tag
-- WHERE n.state = 'CA'
GROUP BY tag
ORDER BY uses DESC, tag ASC
LIMIT 200;
