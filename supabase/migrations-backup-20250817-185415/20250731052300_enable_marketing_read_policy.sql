-- Migration: Enable anon read policy for marketing properties
-- Created at: 2025-07-31 05:23:00 UTC

begin;

-- Ensure RLS is enabled (safe if already enabled)
alter table if exists public.properties enable row level security;

-- Create or replace policy to allow anon SELECT of active listings for marketing
do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'properties'
      and policyname = 'properties_anon_marketing_read'
  ) then
    create policy properties_anon_marketing_read
    on public.properties
    for select
    to anon
    using (
      listing_status = 'active'
      and coalesce(is_active, true) = true
    );
  end if;
end
$$;

commit;
