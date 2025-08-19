. Do t-- Remote Testing Seed Setup (Manual SQL - not part of migrations)
-- Place: remote-testing/run_seed_setup.sql
-- Purpose: Create a dedicated testing role, seed and cleanup RPCs, and minimal RLS allowances (optional)
-- Execute manually in Supabase SQL Editor for your REMOTE testing project.
-- This file is intentionally outside supabase/migrations so it won't be auto-applied.

-- 1) Create a dedicated testing role (no login)
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'testing_role') then
    create role testing_role nologin;
  end if;
end $$;

-- 2) Ensure tables exist (adjust if your names/columns differ)
create table if not exists public.user_profiles (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  full_name text,
  created_at timestamptz default now()
);

create table if not exists public.properties (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  price numeric not null,
  created_at timestamptz default now()
);

-- 3) Seed function: inserts minimal deterministic data (idempotent-ish)
create or replace function public.run_seed()
returns void
language plpgsql
security definer
as $$
begin
  -- Insert only if not present
  insert into public.user_profiles (email, full_name)
  values
    ('test.user1@example.com', 'Test User One'),
    ('test.user2@example.com', 'Test User Two')
  on conflict (email) do nothing;

  insert into public.properties (title, price)
  values
    ('Test Property A', 100000),
    ('Test Property B', 250000)
  on conflict do nothing;
end;
$$;

-- 4) Cleanup function: removes only seeded rows
create or replace function public.run_seed_cleanup()
returns void
language plpgsql
security definer
as $$
begin
  delete from public.properties
  where title in ('Test Property A', 'Test Property B');

  delete from public.user_profiles
  where email in ('test.user1@example.com', 'test.user2@example.com');
end;
$$;

-- 5) Lock down execution: only allow testing_role to run these functions
revoke all on function public.run_seed() from public;
revoke all on function public.run_seed_cleanup() from public;

grant execute on function public.run_seed() to testing_role;
grant execute on function public.run_seed_cleanup() to testing_role;

-- 6) OPTIONAL: If RLS is enabled and tests need write access for the testing_role
-- Replace with tighter policies as needed. These are broad to simplify testing.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'user_profiles' and policyname = 'testing_role_user_profiles_write'
  ) then
    create policy "testing_role_user_profiles_write" on public.user_profiles
      for all
      to testing_role
      using (true)
      with check (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'properties' and policyname = 'testing_role_properties_write'
  ) then
    create policy "testing_role_properties_write" on public.properties
      for all
      to testing_role
      using (true)
      with check (true);
  end if;
end $$;

-- Usage notes:
--  - Run once to install: paste this file into Supabase SQL Editor and execute.
--  - To seed:    select public.run_seed();
--  - To cleanup: select public.run_seed_cleanup();
--  - EXECUTE is granted only to testing_role. To call from your app:
--      * Use a trusted server context with service role to set role to testing_role before calling, or
--      * Create a JWT mapping to testing_role for testing-only contexts, or
--      * Run from SQL Editor (manual) as an admin.
