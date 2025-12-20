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
  fallback_radius_m integer := 5000;
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
  fallback_matches as (
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
          fallback_radius_m
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
  final_matches as (
    select * from primary_matches
    union all
    select * from fallback_matches
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
  'Assigns neighborhood_id using bounds containment, then falls back to nearest neighborhood in the same city/state within 5km when containment fails.';

commit;
