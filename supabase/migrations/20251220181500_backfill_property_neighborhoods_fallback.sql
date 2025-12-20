begin;

create or replace function public.backfill_property_neighborhoods(
  target_zpids text[] default null,
  target_ids uuid[] default null,
  batch_limit integer default null
)
returns integer
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  updated_count integer := 0;
  city_radius_m integer := 25000;
begin
  with candidate_properties as (
    select
      p.id,
      p.coordinates,
      p.city,
      p.state
    from properties p
    where p.is_active = true
      and p.coordinates is not null
      and p.neighborhood_id is null
      and (target_zpids is null or p.zpid = any(target_zpids))
      and (target_ids is null or p.id = any(target_ids))
    order by p.created_at desc
    limit coalesce(batch_limit, 1000000)
  ),
  primary_matches as (
    select
      c.id as property_id,
      n.id as neighborhood_id
    from candidate_properties c
    join lateral (
      select n.id
      from neighborhoods n
      where n.bounds is not null
        and st_covers(n.bounds, c.coordinates)
      order by st_area(n.bounds) asc nulls last
      limit 1
    ) n on true
  ),
  city_matches as (
    select
      c.id as property_id,
      n.id as neighborhood_id
    from candidate_properties c
    join lateral (
      select n.id
      from neighborhoods n
      where n.bounds is not null
        and n.city = c.city
        and n.state = c.state
        and st_dwithin(
          n.bounds::geography,
          c.coordinates::geography,
          city_radius_m
        )
      order by
        st_distance(n.bounds::geography, c.coordinates::geography) asc,
        st_area(n.bounds) asc nulls last
      limit 1
    ) n on true
    where not exists (
      select 1 from primary_matches pm where pm.property_id = c.id
    )
  ),
  unmatched as (
    select c.*
    from candidate_properties c
    where not exists (
      select 1 from primary_matches pm where pm.property_id = c.id
    )
      and not exists (
        select 1 from city_matches cm where cm.property_id = c.id
      )
  ),
  citywide_targets as (
    select distinct city, state
    from unmatched
  ),
  existing_citywide as (
    select id, city, state
    from neighborhoods
    where bounds is null
      and name = city || ' (Citywide)'
  ),
  inserted_citywide as (
    insert into neighborhoods (
      name,
      city,
      state,
      metro_area,
      bounds,
      median_price,
      walk_score,
      transit_score
    )
    select
      city || ' (Citywide)',
      city,
      state,
      null,
      null,
      null,
      null,
      null
    from citywide_targets t
    where not exists (
      select 1
      from existing_citywide e
      where e.city = t.city and e.state = t.state
    )
    returning id, city, state
  ),
  citywide_pool as (
    select * from existing_citywide
    union all
    select * from inserted_citywide
  ),
  citywide_matches as (
    select
      u.id as property_id,
      p.id as neighborhood_id
    from unmatched u
    join citywide_pool p
      on p.city = u.city
     and p.state = u.state
  ),
  final_matches as (
    select * from primary_matches
    union all
    select * from city_matches
    union all
    select * from citywide_matches
  )
  update properties p
  set neighborhood_id = fm.neighborhood_id,
      updated_at = now()
  from final_matches fm
  where p.id = fm.property_id;

  get diagnostics updated_count = row_count;
  return updated_count;
end;
$$;

revoke all on function public.backfill_property_neighborhoods(text[], uuid[], integer) from public;
grant execute on function public.backfill_property_neighborhoods(text[], uuid[], integer) to service_role;

comment on function public.backfill_property_neighborhoods is
  'Assigns neighborhood_id using bounds containment, then nearest neighborhood within 25km in the same city/state; remaining properties get a citywide fallback neighborhood.';

commit;
