-- Restore geographic RPC functions and add missing user profile column used by services/tests
begin;

-- user_profiles.full_name was referenced by services/tests but missing in the consolidated schema
alter table user_profiles
add column if not exists full_name text;

-- Backfill full_name from display_name or email prefix for existing rows
update user_profiles
set full_name = coalesce(display_name, split_part(email, '@', 1))
where full_name is null;

-- Ensure handle_new_user trigger populates full_name for new signups
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.user_profiles (
    id,
    email,
    display_name,
    full_name,
    onboarding_completed,
    preferences
  )
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    false,
    '{}'::jsonb
  );
  return new;
end;
$$ language plpgsql security definer;

-- Geographic RPCs expected by GeographicService and integration tests
-- Drop existing versions to avoid signature conflicts
drop function if exists public.get_properties_in_bounds(double precision, double precision, double precision, double precision, integer);
drop function if exists public.get_walkability_score(double precision, double precision);
drop function if exists public.get_transit_score(double precision, double precision);
drop function if exists public.get_geographic_density(double precision, double precision, double precision, double precision, double precision);
drop function if exists public.get_property_clusters(double precision, double precision, double precision, double precision, integer);
drop function if exists public.get_properties_by_distance(double precision, double precision, double precision, integer);
drop function if exists public.get_neighborhoods_in_bounds(double precision, double precision, double precision, double precision);
drop function if exists public.get_properties_in_polygon(jsonb, integer);
drop function if exists public.get_properties_along_route(jsonb, double precision);
drop function if exists public.get_nearest_amenities(double precision, double precision, text[], double precision);

create or replace function public.get_properties_in_bounds(
  north_lat double precision,
  south_lat double precision,
  east_lng double precision,
  west_lng double precision,
  result_limit integer default 100
)
returns table (
  id uuid,
  address text,
  city text,
  state text,
  zip_code text,
  price integer,
  bedrooms integer,
  bathrooms numeric(2,1),
  square_feet integer,
  property_type text,
  images text[],
  description text,
  coordinates geometry(point, 4326),
  neighborhood_id uuid,
  amenities text[],
  year_built integer,
  lot_size_sqft integer,
  parking_spots integer,
  listing_status text,
  is_active boolean,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  bbox geometry(polygon, 4326);
begin
  bbox := st_setsrid(st_makeenvelope(west_lng, south_lat, east_lng, north_lat), 4326);

  return query
  select
    p.id,
    p.address,
    p.city,
    p.state,
    p.zip_code,
    p.price,
    p.bedrooms,
    p.bathrooms,
    p.square_feet,
    p.property_type,
    p.images,
    p.description,
    p.coordinates,
    p.neighborhood_id,
    p.amenities,
    p.year_built,
    p.lot_size_sqft,
    p.parking_spots,
    p.listing_status,
    p.is_active,
    p.created_at,
    p.updated_at
  from properties p
  where p.is_active = true
    and p.coordinates is not null
    and st_within(p.coordinates, bbox)
  order by p.price desc
  limit result_limit;
end;
$$;

create or replace function public.get_walkability_score(
  center_lat double precision,
  center_lng double precision
)
returns integer
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  center_point geometry(point, 4326);
  property_density integer;
  neighborhood_score integer;
  base_score integer;
begin
  center_point := st_setsrid(st_makepoint(center_lng, center_lat), 4326);

  select count(*)::integer
  into property_density
  from properties p
  where p.is_active = true
    and p.coordinates is not null
    and st_dwithin(p.coordinates::geography, center_point::geography, 1000);

  select coalesce(n.walk_score, 50)::integer
  into neighborhood_score
  from neighborhoods n
  where st_contains(n.bounds, center_point)
  limit 1;

  if neighborhood_score is null then
    neighborhood_score := 50;
  end if;

  base_score := least(40, property_density * 2);

  return greatest(0, least(100, (neighborhood_score * 0.6 + base_score * 0.4)::integer));
end;
$$;

create or replace function public.get_transit_score(
  center_lat double precision,
  center_lng double precision
)
returns integer
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  center_point geometry(point, 4326);
  neighborhood_score integer;
  property_density integer;
  base_score integer;
begin
  center_point := st_setsrid(st_makepoint(center_lng, center_lat), 4326);

  select coalesce(n.transit_score, 30)::integer
  into neighborhood_score
  from neighborhoods n
  where st_contains(n.bounds, center_point)
  limit 1;

  select count(*)::integer
  into property_density
  from properties p
  where p.is_active = true
    and p.coordinates is not null
    and st_dwithin(p.coordinates::geography, center_point::geography, 2000);

  if neighborhood_score is null then
    neighborhood_score := 30;
  end if;

  base_score := least(30, property_density);

  return greatest(0, least(100, (neighborhood_score * 0.7 + base_score * 0.3)::integer));
end;
$$;

create or replace function public.get_properties_by_distance(
  center_lat double precision,
  center_lng double precision,
  max_distance_km double precision default 10,
  result_limit integer default 20
)
returns table (
  id uuid,
  address text,
  city text,
  state text,
  price integer,
  bedrooms integer,
  bathrooms numeric(2,1),
  square_feet integer,
  property_type text,
  images text[],
  neighborhood_id uuid,
  distance_km double precision
)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  center_point geometry(point, 4326);
begin
  center_point := st_setsrid(st_makepoint(center_lng, center_lat), 4326);

  return query
  select
    p.id,
    p.address,
    p.city,
    p.state,
    p.price,
    p.bedrooms,
    p.bathrooms,
    p.square_feet,
    p.property_type,
    p.images,
    p.neighborhood_id,
    (st_distance(p.coordinates::geography, center_point::geography) / 1000)::double precision as distance_km
  from properties p
  where p.is_active = true
    and p.coordinates is not null
    and st_dwithin(p.coordinates::geography, center_point::geography, max_distance_km * 1000)
  order by p.coordinates <-> center_point
  limit result_limit;
end;
$$;

create or replace function public.get_neighborhoods_in_bounds(
  north_lat double precision,
  south_lat double precision,
  east_lng double precision,
  west_lng double precision
)
returns table (
  id uuid,
  name text,
  city text,
  state text,
  metro_area text,
  bounds geometry,
  median_price integer,
  walk_score integer,
  transit_score integer,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  bbox geometry(polygon, 4326);
begin
  bbox := st_setsrid(st_makeenvelope(west_lng, south_lat, east_lng, north_lat), 4326);

  return query
  select
    n.id,
    n.name,
    n.city,
    n.state,
    n.metro_area,
    n.bounds,
    n.median_price,
    n.walk_score,
    n.transit_score,
    n.created_at
  from neighborhoods n
  where n.bounds is not null
    and st_intersects(n.bounds, bbox)
  order by n.name;
end;
$$;

create or replace function public.get_property_clusters(
  north_lat double precision,
  south_lat double precision,
  east_lng double precision,
  west_lng double precision,
  zoom_level integer default 10
)
returns table (
  lat double precision,
  lng double precision,
  count bigint,
  avg_price numeric,
  min_price integer,
  max_price integer
)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  bbox geometry(polygon, 4326);
  grid_size double precision;
begin
  bbox := st_setsrid(st_makeenvelope(west_lng, south_lat, east_lng, north_lat), 4326);

  grid_size := case
    when zoom_level >= 15 then 0.001
    when zoom_level >= 12 then 0.005
    when zoom_level >= 9 then 0.01
    else 0.05
  end;

  return query
  select
    round((st_y(st_centroid(cluster_geom)))::numeric, 6)::double precision as lat,
    round((st_x(st_centroid(cluster_geom)))::numeric, 6)::double precision as lng,
    count(*) as count,
    round(avg(p.price)::numeric, 0) as avg_price,
    min(p.price) as min_price,
    max(p.price) as max_price
  from (
    select
      p.*,
      st_snaptogrid(p.coordinates, grid_size) as cluster_geom
    from properties p
    where p.is_active = true
      and p.coordinates is not null
      and st_within(p.coordinates, bbox)
  ) p
  group by cluster_geom
  having count(*) >= 1
  order by count desc;
end;
$$;

create or replace function public.get_properties_in_polygon(
  polygon_points jsonb,
  result_limit integer default 100
)
returns table (
  id uuid,
  address text,
  city text,
  state text,
  price integer,
  bedrooms integer,
  bathrooms numeric(2,1),
  square_feet integer,
  property_type text,
  images text[],
  coordinates geometry(point, 4326),
  neighborhood_id uuid
)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  polygon_geom geometry(polygon, 4326);
  polygon_wkt text;
begin
  with points as (
    select jsonb_array_elements(polygon_points) as point
  ),
  coords as (
    select
      (point->>'lng')::double precision as lng,
      (point->>'lat')::double precision as lat
    from points
  )
  select
    'POLYGON((' || string_agg(lng::text || ' ' || lat::text, ',') ||
    ',' || (array_agg(lng))[1]::text || ' ' || (array_agg(lat))[1]::text || '))'
  into polygon_wkt
  from coords;

  polygon_geom := st_setsrid(st_geomfromtext(polygon_wkt), 4326);

  return query
  select
    p.id,
    p.address,
    p.city,
    p.state,
    p.price,
    p.bedrooms,
    p.bathrooms,
    p.square_feet,
    p.property_type,
    p.images,
    p.coordinates,
    p.neighborhood_id
  from properties p
  where p.is_active = true
    and p.coordinates is not null
    and st_within(p.coordinates, polygon_geom)
  order by p.price desc
  limit result_limit;
end;
$$;

create or replace function public.get_properties_along_route(
  waypoints jsonb,
  corridor_width_km double precision default 1
)
returns table (
  id uuid,
  address text,
  city text,
  state text,
  price integer,
  bedrooms integer,
  bathrooms numeric(2,1),
  property_type text,
  neighborhood_id uuid,
  distance_from_route double precision
)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  route_line geometry(linestring, 4326);
  route_wkt text;
  route_buffer geometry(polygon, 4326);
begin
  with points as (
    select jsonb_array_elements(waypoints) as point
  ),
  coords as (
    select
      (point->>'lng')::double precision as lng,
      (point->>'lat')::double precision as lat
    from points
  )
  select
    'LINESTRING(' || string_agg(lng::text || ' ' || lat::text, ',') || ')'
  into route_wkt
  from coords;

  route_line := st_setsrid(st_geomfromtext(route_wkt), 4326);
  route_buffer := st_buffer(route_line::geography, corridor_width_km * 1000)::geometry;

  return query
  select
    p.id,
    p.address,
    p.city,
    p.state,
    p.price,
    p.bedrooms,
    p.bathrooms,
    p.property_type,
    p.neighborhood_id,
    (st_distance(p.coordinates::geography, route_line::geography) / 1000)::double precision as distance_from_route
  from properties p
  where p.is_active = true
    and p.coordinates is not null
    and st_within(p.coordinates, route_buffer)
  order by p.price desc;
end;
$$;

create or replace function public.get_geographic_density(
  north_lat double precision,
  south_lat double precision,
  east_lng double precision,
  west_lng double precision,
  grid_size_deg double precision default 0.05
)
returns table (
  grid_center geometry(point, 4326),
  property_count integer,
  avg_price numeric,
  min_price integer,
  max_price integer
)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  bbox geometry(polygon, 4326);
begin
  bbox := st_setsrid(st_makeenvelope(west_lng, south_lat, east_lng, north_lat), 4326);

  return query
  with grid_cells as (
    select (st_squaregrid(grid_size_deg, bbox)).geom as cell_geom
  )
  select
    st_centroid(c.cell_geom) as grid_center,
    count(p.price) as property_count,
    avg(p.price) as avg_price,
    min(p.price) as min_price,
    max(p.price) as max_price
  from grid_cells c
  left join properties p
    on p.is_active = true
   and p.coordinates is not null
   and st_within(p.coordinates, c.cell_geom)
  group by c.cell_geom
  order by property_count desc;
end;
$$;

-- Stub: nearest amenities (placeholder to satisfy API shape)
create or replace function public.get_nearest_amenities(
  center_lat double precision,
  center_lng double precision,
  amenity_types text[],
  radius_km double precision default 5
)
returns setof jsonb
language sql
security definer
set search_path = public, extensions
as $$
  select jsonb_build_object(
    'type', coalesce(amenity_types[1], 'unknown'),
    'name', 'Demo Amenity',
    'distance_km', 0
  )
$$;

-- Permissions for authenticated users
grant execute on function public.get_properties_in_bounds(double precision, double precision, double precision, double precision, integer) to authenticated;
grant execute on function public.get_walkability_score(double precision, double precision) to authenticated;
grant execute on function public.get_transit_score(double precision, double precision) to authenticated;
grant execute on function public.get_geographic_density(double precision, double precision, double precision, double precision, double precision) to authenticated;
grant execute on function public.get_property_clusters(double precision, double precision, double precision, double precision, integer) to authenticated;
grant execute on function public.get_properties_by_distance(double precision, double precision, double precision, integer) to authenticated;
grant execute on function public.get_neighborhoods_in_bounds(double precision, double precision, double precision, double precision) to authenticated;
grant execute on function public.get_properties_in_polygon(jsonb, integer) to authenticated;
grant execute on function public.get_properties_along_route(jsonb, double precision) to authenticated;
grant execute on function public.get_nearest_amenities(double precision, double precision, text[], double precision) to authenticated;

comment on function public.get_properties_in_bounds is 'Returns properties within a bounding box';
comment on function public.get_walkability_score is 'Calculates walkability score based on property density and neighborhood data';
comment on function public.get_transit_score is 'Calculates transit score based on neighborhood data and property density';
comment on function public.get_geographic_density is 'Returns property density analysis within a bounding box using a grid system';
comment on function public.get_property_clusters is 'Returns property clusters for mapping visualizations';
comment on function public.get_properties_by_distance is 'Returns properties ordered by distance from a center point';
comment on function public.get_neighborhoods_in_bounds is 'Returns neighborhoods that intersect a bounding box';
comment on function public.get_properties_in_polygon is 'Returns properties within an arbitrary polygon';
comment on function public.get_properties_along_route is 'Returns properties within a buffered corridor around a route';
comment on function public.get_nearest_amenities is 'Stubbed amenity lookup for local testing';

commit;
