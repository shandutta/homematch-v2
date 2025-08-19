-- Migration: 20250804053950_harden_function_search_path.sql
-- Purpose: Harden search_path and schema-qualify references for key functions flagged by Supabase Advisor.
-- Note: This file mirrors the SQL applied remotely via MCP.

-- 1) get_user_interaction_summary
CREATE OR REPLACE FUNCTION public.get_user_interaction_summary(p_user_id uuid)
RETURNS TABLE(interaction_type text, count bigint)
LANGUAGE sql
STABLE
SET search_path = pg_catalog, public
AS $$
  SELECT interaction_type, COUNT(*)::bigint AS count
  FROM public.user_property_interactions
  WHERE user_id = p_user_id
  GROUP BY interaction_type
  ORDER BY interaction_type
$$;

GRANT EXECUTE ON FUNCTION public.get_user_interaction_summary(uuid) TO authenticated;

COMMENT ON FUNCTION public.get_user_interaction_summary(uuid)
IS 'Aggregates interaction counts by type for the specified user_id. search_path hardened to pg_catalog, public.';

-- 2) handle_new_user (trigger function)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
VOLATILE
SET search_path = pg_catalog, public
AS $$
BEGIN
  INSERT INTO public.user_profiles(id)
  VALUES (NEW.id)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END
$$;

-- Recreate trigger defensively to ensure it targets updated function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

COMMENT ON FUNCTION public.handle_new_user()
IS 'Creates a user_profiles row upon new auth.users insert. search_path hardened to pg_catalog, public.';

-- 3) get_properties_within_radius
CREATE OR REPLACE FUNCTION public.get_properties_within_radius(
  center_lat double precision,
  center_lng double precision,
  radius_meters integer
)
RETURNS SETOF public.properties
LANGUAGE sql
STABLE
SET search_path = pg_catalog, public
AS $$
  SELECT p.*
  FROM public.properties AS p
  WHERE p.coordinates IS NOT NULL
    AND ST_DWithin(
      p.coordinates::geography,
      ST_SetSRID(ST_MakePoint(center_lng, center_lat), 4326)::geography,
      radius_meters
    )
$$;

GRANT EXECUTE ON FUNCTION public.get_properties_within_radius(double precision, double precision, integer) TO authenticated;

COMMENT ON FUNCTION public.get_properties_within_radius(double precision, double precision, integer)
IS 'Find properties within a radius using PostGIS. search_path hardened to pg_catalog, public. Returns SETOF public.properties.';
