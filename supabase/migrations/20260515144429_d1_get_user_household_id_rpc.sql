-- D1 follow-up (2026-05-15): consolidate the user_profiles.household_id
-- lookup that every couples-read route does (via
-- CouplesService.getUserHousehold) into a single SECURITY DEFINER RPC.
--
-- Background: Phase 5 dropped the user_profiles self-read policy, so
-- every couples route had to pass in a service-role client to read its
-- own (or its partner's) household_id. The lookup itself is small and
-- identical across all five routes (mutual-likes / stats / activity /
-- notify / check-mutual). Pushing it into an RPC:
--
--   - Centralizes the SQL: one place to evolve the lookup if user_profiles
--     gains additional household-resolution rules (e.g. invite-pending,
--     leaving-household states).
--   - Sets up a future where the routes don't need a service-role client
--     just for this read — once the RPC enforces caller-identity in some
--     way (auth.uid() match, or a route-issued JWT claim), we can grant
--     EXECUTE to a less-privileged role. Not done yet; the route layer
--     is still the trust boundary, same pattern as the three D1 RPCs
--     landed in 20260515001555.
--
-- Function shape:
--   - returns scalar uuid (null when no profile / no household).
--   - LANGUAGE SQL STABLE: pure read, planner can cache within a query.
--   - SECURITY DEFINER + locked search_path: prevents temp-schema
--     shadowing of public.user_profiles.
--   - EXECUTE revoked from public/anon/authenticated; granted only to
--     service_role. Matches the D1 interaction RPCs' privilege model.

begin;

create or replace function public.get_user_household_id(p_user_id uuid)
returns uuid
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select household_id
  from public.user_profiles
  where id = p_user_id
  limit 1;
$$;

revoke execute on function public.get_user_household_id(uuid)
  from public, anon, authenticated;
grant execute on function public.get_user_household_id(uuid)
  to service_role;

commit;
