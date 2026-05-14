-- Phase 5 of the Supabase-auth elimination (audit 2026-05-13).
--
-- Drop every remaining RLS policy that keys off `auth.uid()`. Clerk is
-- now the sole identity provider and Clerk users hold no Supabase
-- session, so `auth.uid()` is NULL on the anon-key client. Every one of
-- these policies therefore returns 0 rows / blocks every Clerk write
-- already — Phases 1, 2, 2b moved the corresponding routes onto
-- `getServiceRoleClient({ approvedCapability: ... })` with an
-- explicitly-resolved `user_profiles.id` so the writes still succeed
-- under service-role (which bypasses RLS by design).
--
-- After this migration, the seven affected tables keep RLS enabled but
-- have no permitting policy for `anon` / `authenticated` / `public`.
-- That is the intentional lockdown:
--   - service_role bypasses RLS (route layer + capability allowlist).
--   - anon-key + authenticated reads return 0 rows / RLS-deny, the same
--     end-state as today's auth.uid()=NULL behavior, just made explicit.
-- The `user_profiles_auth_admin_full_access` policy on `user_profiles`
-- (for the `supabase_auth_admin` role) is left in place — it gates the
-- legacy Supabase auth-user trigger, not the application path, and is
-- orthogonal to Clerk migration.
--
-- Also retires `admin_role_assignments`. A3 of the 2026-05-13 audit
-- removed the admin-runtime authorization fallback that consumed it;
-- no live caller queries the table (confirmed by
-- `__tests__/unit/database/admin-role-assignments-migration.test.ts`'s
-- source scan). Dropping it also removes its FKs into `auth.users`,
-- closing one of the last cross-schema links from public→auth.

begin;

-- admin_role_assignments: policy + table (FKs into auth.users go with it).
drop policy if exists admin_role_assignments_self_select
  on public.admin_role_assignments;
drop table if exists public.admin_role_assignments;

-- household_invitations
drop policy if exists "Users can create invitations for their household"
  on public.household_invitations;
drop policy if exists "Users can update their own invitations"
  on public.household_invitations;
drop policy if exists "Users can view their household invitations"
  on public.household_invitations;

-- household_property_resolutions
drop policy if exists "Household members can create property resolutions"
  on public.household_property_resolutions;
drop policy if exists "Household members can delete property resolutions"
  on public.household_property_resolutions;
drop policy if exists "Household members can update property resolutions"
  on public.household_property_resolutions;
drop policy if exists "Household members can view property resolutions"
  on public.household_property_resolutions;

-- households
drop policy if exists "Users can create households" on public.households;
drop policy if exists "Users can update their household" on public.households;
drop policy if exists "Users can view their household" on public.households;

-- saved_searches
drop policy if exists "Users can delete their own searches"
  on public.saved_searches;
drop policy if exists "Users can insert their own searches"
  on public.saved_searches;
drop policy if exists "Users can update their own searches"
  on public.saved_searches;
drop policy if exists "Users can view their own searches"
  on public.saved_searches;

-- user_profiles
drop policy if exists "Users can delete their own profile" on public.user_profiles;
drop policy if exists "Users can insert their own profile" on public.user_profiles;
drop policy if exists "Users can update their own profile" on public.user_profiles;
drop policy if exists "Users can view their own profile" on public.user_profiles;

-- user_property_interactions
drop policy if exists "Users can delete their own interactions"
  on public.user_property_interactions;
drop policy if exists "Users can insert their own interactions"
  on public.user_property_interactions;
drop policy if exists "Users can update their own interactions"
  on public.user_property_interactions;
drop policy if exists "Users can view own and household interactions"
  on public.user_property_interactions;

commit;

-- DOWN:
-- The down migration is intentionally not provided. Recreating these
-- policies after Phase 1+2 routes have moved to service-role would not
-- restore the original behavior — the routes pass an explicit user_id
-- under service-role, which bypasses the policy entirely. Rolling back
-- requires a coordinated revert of Phases 1, 2, 2b code paths.
--
-- For admin_role_assignments specifically, the DOWN body in
-- 20260508024000_create_admin_role_assignments.sql still applies.
