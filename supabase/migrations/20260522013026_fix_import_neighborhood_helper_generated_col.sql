-- Applied via Supabase MCP apply_migration (version 20260522013026); mirrored
-- here for repo/drift parity.
--
-- city_state_key is a GENERATED column; the prior helper tried to INSERT into
-- it ("cannot insert a non-DEFAULT value"). Drop it from the column list and
-- let Postgres compute it.
CREATE OR REPLACE FUNCTION public.import_neighborhood_polygon(
  p_name text, p_city text, p_state text, p_geojson jsonb
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions
AS $func$
DECLARE new_id uuid;
BEGIN
  INSERT INTO public.neighborhoods (name, city, state, bounds)
  VALUES (
    p_name, p_city, p_state,
    ST_Multi(ST_CollectionExtract(
      ST_MakeValid(ST_SetSRID(ST_GeomFromGeoJSON(p_geojson::text), 4326)), 3))
  )
  RETURNING id INTO new_id;
  RETURN new_id;
END
$func$;
