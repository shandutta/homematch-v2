-- Property Vibes review queries (Supabase SQL Editor)
-- Goal: after running `scripts/backfill-vibes.ts` for ~10 properties, use these
-- to quickly verify what changed and review the generated output.

-- ============================================================================
-- 1) Latest generated vibes (quick skim)
-- ============================================================================
SELECT
  pv.created_at AS vibes_created_at,
  p.id AS property_id,
  p.zpid,
  p.city,
  p.state,
  p.price,
  COALESCE(array_length(p.images, 1), 0) AS property_image_count,
  COALESCE(array_length(pv.images_analyzed, 1), 0) AS images_analyzed_count,
  pv.tagline,
  pv.vibe_statement,
  pv.suggested_tags,
  pv.generation_cost_usd,
  pv.model_used,
  ('https://www.zillow.com/homedetails/' || p.zpid || '_zpid/') AS zillow_url
FROM public.property_vibes pv
JOIN public.properties p ON p.id = pv.property_id
ORDER BY pv.created_at DESC
LIMIT 10;

-- ============================================================================
-- 2) Deep dive one property
-- ============================================================================
-- Replace the UUID below with a `property_id` from query #1.
SELECT
  p.id AS property_id,
  p.zpid,
  p.address,
  p.city,
  p.state,
  p.zip_code,
  p.price,
  COALESCE(array_length(p.images, 1), 0) AS property_image_count,
  pv.id AS vibes_id,
  pv.tagline,
  pv.vibe_statement,
  pv.primary_vibes,
  pv.aesthetics,
  pv.feature_highlights,
  pv.lifestyle_fits,
  pv.emotional_hooks,
  pv.suggested_tags,
  pv.images_analyzed,
  pv.input_data,
  pv.model_used,
  pv.generation_cost_usd,
  pv.confidence,
  pv.created_at AS vibes_created_at,
  ('https://www.zillow.com/homedetails/' || p.zpid || '_zpid/') AS zillow_url
FROM public.properties p
LEFT JOIN public.property_vibes pv ON pv.property_id = p.id
WHERE p.id = '00000000-0000-0000-0000-000000000000';

-- ============================================================================
-- 3) Find properties missing full galleries
-- ============================================================================
SELECT
  p.id AS property_id,
  p.zpid,
  p.city,
  p.state,
  COALESCE(array_length(p.images, 1), 0) AS property_image_count,
  p.updated_at,
  ('https://www.zillow.com/homedetails/' || p.zpid || '_zpid/') AS zillow_url
FROM public.properties p
WHERE p.zpid IS NOT NULL
ORDER BY COALESCE(array_length(p.images, 1), 0) ASC, p.updated_at DESC
LIMIT 50;

