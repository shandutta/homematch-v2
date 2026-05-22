-- Applied via Supabase MCP apply_migration (version 20260522011900); this file
-- mirrors it for repo/drift parity.
--
-- Official SF/Oakland/San Jose boundary datasets are MultiPolygon
-- (islands/exclaves). Widen neighborhoods.bounds from Polygon -> MultiPolygon;
-- existing Polygons auto-wrap via ST_Multi. st_covers + the GIST index work
-- unchanged on MultiPolygon. (bounds_backup legacy column left untouched.)
ALTER TABLE public.neighborhoods
  ALTER COLUMN bounds TYPE geometry(MultiPolygon, 4326) USING ST_Multi(bounds);

-- Helper used by scripts/import-neighborhoods.ts (service_role) to load a
-- neighborhood polygon from GeoJSON: parse -> force SRID 4326 -> MakeValid ->
-- extract polygons -> MultiPolygon. SECURITY DEFINER so the service role can
-- run the spatial ops; not exposed to anon/authenticated.
CREATE OR REPLACE FUNCTION public.import_neighborhood_polygon(
  p_name text, p_city text, p_state text, p_geojson jsonb
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions
AS $func$
DECLARE new_id uuid;
BEGIN
  INSERT INTO public.neighborhoods (name, city, state, bounds, city_state_key)
  VALUES (
    p_name, p_city, p_state,
    ST_Multi(ST_CollectionExtract(
      ST_MakeValid(ST_SetSRID(ST_GeomFromGeoJSON(p_geojson::text), 4326)), 3)),
    lower(p_city) || '|' || lower(p_state)
  )
  RETURNING id INTO new_id;
  RETURN new_id;
END
$func$;

REVOKE ALL ON FUNCTION public.import_neighborhood_polygon(text,text,text,jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.import_neighborhood_polygon(text,text,text,jsonb) TO service_role;
