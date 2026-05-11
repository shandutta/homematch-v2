-- Harden SECURITY DEFINER functions against mutable search_path injection.
--
-- This migration intentionally uses metadata changes instead of
-- function body replacement so the currently deployed function bodies and
-- grants are preserved while making the elevated execution context explicit.
-- Keep `extensions` after pg_catalog/public because the geographic RPCs call
-- PostGIS helpers installed in Supabase's extensions schema.

begin;

alter function public.handle_new_user()
  set search_path = pg_catalog, public, extensions;

alter function public.get_properties_in_bounds(
  double precision,
  double precision,
  double precision,
  double precision,
  integer
) set search_path = pg_catalog, public, extensions;

alter function public.get_walkability_score(
  double precision,
  double precision
) set search_path = pg_catalog, public, extensions;

alter function public.get_transit_score(
  double precision,
  double precision
) set search_path = pg_catalog, public, extensions;

alter function public.get_properties_by_distance(
  double precision,
  double precision,
  double precision,
  integer
) set search_path = pg_catalog, public, extensions;

alter function public.get_neighborhoods_in_bounds(
  double precision,
  double precision,
  double precision,
  double precision
) set search_path = pg_catalog, public, extensions;

alter function public.get_property_clusters(
  double precision,
  double precision,
  double precision,
  double precision,
  integer
) set search_path = pg_catalog, public, extensions;

alter function public.get_properties_in_polygon(
  jsonb,
  integer
) set search_path = pg_catalog, public, extensions;

alter function public.get_properties_along_route(
  jsonb,
  double precision
) set search_path = pg_catalog, public, extensions;

alter function public.get_geographic_density(
  double precision,
  double precision,
  double precision,
  double precision,
  double precision
) set search_path = pg_catalog, public, extensions;

alter function public.get_nearest_amenities(
  double precision,
  double precision,
  text[],
  double precision
) set search_path = pg_catalog, public, extensions;

alter function public.backfill_property_neighborhoods(
  text[],
  uuid[],
  integer
) set search_path = pg_catalog, public, extensions;

alter function public.backfill_property_coordinates_city_centroid(
  integer
) set search_path = pg_catalog, public, extensions;

commit;

-- DOWN:
-- ALTER FUNCTION public.handle_new_user() RESET search_path;
-- ALTER FUNCTION public.get_properties_in_bounds(double precision, double precision, double precision, double precision, integer) RESET search_path;
-- ALTER FUNCTION public.get_walkability_score(double precision, double precision) RESET search_path;
-- ALTER FUNCTION public.get_transit_score(double precision, double precision) RESET search_path;
-- ALTER FUNCTION public.get_properties_by_distance(double precision, double precision, double precision, integer) RESET search_path;
-- ALTER FUNCTION public.get_neighborhoods_in_bounds(double precision, double precision, double precision, double precision) RESET search_path;
-- ALTER FUNCTION public.get_property_clusters(double precision, double precision, double precision, double precision, integer) RESET search_path;
-- ALTER FUNCTION public.get_properties_in_polygon(jsonb, integer) RESET search_path;
-- ALTER FUNCTION public.get_properties_along_route(jsonb, double precision) RESET search_path;
-- ALTER FUNCTION public.get_geographic_density(double precision, double precision, double precision, double precision, double precision) RESET search_path;
-- ALTER FUNCTION public.get_nearest_amenities(double precision, double precision, text[], double precision) RESET search_path;
-- ALTER FUNCTION public.backfill_property_neighborhoods(text[], uuid[], integer) RESET search_path;
-- ALTER FUNCTION public.backfill_property_coordinates_city_centroid(integer) RESET search_path;
