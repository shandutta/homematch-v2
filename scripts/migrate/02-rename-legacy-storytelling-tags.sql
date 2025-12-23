-- Renames legacy couple-focused tags to less-hokey wording (no regen required).
--
-- Recommended rollout:
-- 1) Deploy app code that can display BOTH old + new tags (aliasing).
-- 2) Run this SQL on staging, verify UI + any downstream consumers.
-- 3) Run on production.
--
-- This updates:
-- - property_vibes.suggested_tags (TEXT[])
-- - property_vibes.lifestyle_fits (JSONB array, .category field)

-- Preview impacted rows
select
  count(*) filter (
    where suggested_tags @> array['Love Nest']::text[]
  ) as rows_with_suggested_love_nest,
  count(*) filter (
    where suggested_tags @> array['Urban Love Nest']::text[]
  ) as rows_with_suggested_urban_love_nest,
  count(*) filter (
    where lifestyle_fits @> '[{"category":"Love Nest"}]'::jsonb
  ) as rows_with_fit_love_nest,
  count(*) filter (
    where lifestyle_fits @> '[{"category":"Urban Love Nest"}]'::jsonb
  ) as rows_with_fit_urban_love_nest
from property_vibes;

-- 1) suggested_tags array replacements
update property_vibes
set suggested_tags =
  array_replace(
    array_replace(suggested_tags, 'Urban Love Nest', 'City Hideaway'),
    'Love Nest',
    'Shared Retreat'
  )
where suggested_tags && array['Urban Love Nest', 'Love Nest']::text[];

-- 2) lifestyle_fits JSONB category replacements
update property_vibes pv
set lifestyle_fits = (
  select coalesce(
    jsonb_agg(
      case
        when elem->>'category' = 'Urban Love Nest'
          then jsonb_set(elem, '{category}', to_jsonb('City Hideaway'::text))
        when elem->>'category' = 'Love Nest'
          then jsonb_set(elem, '{category}', to_jsonb('Shared Retreat'::text))
        else elem
      end
    ),
    '[]'::jsonb
  )
  from jsonb_array_elements(pv.lifestyle_fits) as elem
)
where pv.lifestyle_fits @> '[{"category":"Urban Love Nest"}]'::jsonb
   or pv.lifestyle_fits @> '[{"category":"Love Nest"}]'::jsonb;

-- Verify (should be 0)
select
  count(*) filter (
    where suggested_tags @> array['Love Nest']::text[]
  ) as remaining_suggested_love_nest,
  count(*) filter (
    where suggested_tags @> array['Urban Love Nest']::text[]
  ) as remaining_suggested_urban_love_nest,
  count(*) filter (
    where lifestyle_fits @> '[{"category":"Love Nest"}]'::jsonb
  ) as remaining_fit_love_nest,
  count(*) filter (
    where lifestyle_fits @> '[{"category":"Urban Love Nest"}]'::jsonb
  ) as remaining_fit_urban_love_nest
from property_vibes;

-- Rollback (if needed)
-- update property_vibes
-- set suggested_tags =
--   array_replace(
--     array_replace(suggested_tags, 'City Hideaway', 'Urban Love Nest'),
--     'Shared Retreat',
--     'Love Nest'
--   )
-- where suggested_tags && array['City Hideaway', 'Shared Retreat']::text[];
--
-- update property_vibes pv
-- set lifestyle_fits = (
--   select coalesce(
--     jsonb_agg(
--       case
--         when elem->>'category' = 'City Hideaway'
--           then jsonb_set(elem, '{category}', to_jsonb('Urban Love Nest'::text))
--         when elem->>'category' = 'Shared Retreat'
--           then jsonb_set(elem, '{category}', to_jsonb('Love Nest'::text))
--         else elem
--       end
--     ),
--     '[]'::jsonb
--   )
--   from jsonb_array_elements(pv.lifestyle_fits) as elem
-- )
-- where pv.lifestyle_fits @> '[{"category":"City Hideaway"}]'::jsonb
--    or pv.lifestyle_fits @> '[{"category":"Shared Retreat"}]'::jsonb;
