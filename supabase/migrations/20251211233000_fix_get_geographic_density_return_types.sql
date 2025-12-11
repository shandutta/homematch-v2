-- Fix return type mismatch for get_geographic_density
-- count() returns bigint by default, but RPC types expect integer

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
  bbox := st_setsrid(
    st_makeenvelope(west_lng, south_lat, east_lng, north_lat),
    4326
  );

  return query
  with grid_cells as (
    select (st_squaregrid(grid_size_deg, bbox)).geom as cell_geom
  )
  select
    st_centroid(c.cell_geom) as grid_center,
    count(p.price)::integer as property_count,
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

grant execute on function public.get_geographic_density(
  double precision,
  double precision,
  double precision,
  double precision,
  double precision
) to authenticated;

comment on function public.get_geographic_density is
  'Returns property density analysis within a bounding box using a grid system';

