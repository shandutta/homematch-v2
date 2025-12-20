begin;

create or replace function public.backfill_property_coordinates_city_centroid(
  batch_limit integer default null
)
returns integer
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  updated_count integer := 0;
begin
  with candidates as (
    select
      id,
      city,
      state,
      case lower(replace(city, ' ', ''))
        when 'sanjose' then 'San Jose'
        when 'paloalto' then 'Palo Alto'
        when 'walnutcreek' then 'Walnut Creek'
        else city
      end as normalized_city
    from properties
    where is_active = true
      and coordinates is null
    order by created_at desc
    limit coalesce(batch_limit, 1000000)
  ),
  city_neighborhood_centroids as (
    select
      lower(city) as city_key,
      lower(state) as state_key,
      st_centroid(st_union(bounds)) as centroid
    from neighborhoods
    where bounds is not null
    group by lower(city), lower(state)
  ),
  city_property_centroids as (
    select
      lower(city) as city_key,
      lower(state) as state_key,
      st_setsrid(
        st_makepoint(avg(st_x(coordinates)), avg(st_y(coordinates))),
        4326
      ) as centroid
    from properties
    where coordinates is not null
    group by lower(city), lower(state)
  ),
  city_centroids as (
    select * from city_neighborhood_centroids
    union all
    select cp.*
    from city_property_centroids cp
    where not exists (
      select 1
      from city_neighborhood_centroids cn
      where cn.city_key = cp.city_key
        and cn.state_key = cp.state_key
    )
  ),
  state_centroids as (
    select
      lower(state) as state_key,
      st_setsrid(
        st_makepoint(avg(st_x(coordinates)), avg(st_y(coordinates))),
        4326
      ) as centroid
    from properties
    where coordinates is not null
    group by lower(state)
  ),
  matches as (
    select
      c.id,
      coalesce(cc.centroid, sc.centroid) as centroid
    from candidates c
    left join city_centroids cc
      on cc.city_key = lower(c.normalized_city)
     and cc.state_key = lower(c.state)
    left join state_centroids sc
      on sc.state_key = lower(c.state)
    where coalesce(cc.centroid, sc.centroid) is not null
  )
  update properties p
  set coordinates = m.centroid,
      updated_at = now()
  from matches m
  where p.id = m.id;

  get diagnostics updated_count = row_count;
  return updated_count;
end;
$$;

revoke all on function public.backfill_property_coordinates_city_centroid(integer) from public;
grant execute on function public.backfill_property_coordinates_city_centroid(integer) to service_role;

comment on function public.backfill_property_coordinates_city_centroid is
  'Backfills missing property coordinates using the centroid of city neighborhood bounds or existing property coordinates for that city/state.';

commit;
