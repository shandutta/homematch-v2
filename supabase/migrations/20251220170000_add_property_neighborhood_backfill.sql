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
begin
  with candidate_properties as (
    select
      p.id,
      p.coordinates
    from properties p
    where p.is_active = true
      and p.coordinates is not null
      and p.neighborhood_id is null
      and (target_zpids is null or p.zpid = any(target_zpids))
      and (target_ids is null or p.id = any(target_ids))
    order by p.created_at desc
    limit coalesce(batch_limit, 1000000)
  ),
  matches as (
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
  )
  update properties p
  set neighborhood_id = m.neighborhood_id,
      updated_at = now()
  from matches m
  where p.id = m.property_id;

  get diagnostics updated_count = row_count;
  return updated_count;
end;
$$;

revoke all on function public.backfill_property_neighborhoods(text[], uuid[], integer) from public;
grant execute on function public.backfill_property_neighborhoods(text[], uuid[], integer) to service_role;

comment on function public.backfill_property_neighborhoods is
  'Assigns neighborhood_id for properties using neighborhood bounds containment; optional filters on zpid/id; intended for service role backfills and ingestion.';

commit;
