-- Tightens the GRANT EXECUTE on the three D1 follow-up RPCs introduced
-- in 20260515001555. The original migration granted to both `service_role`
-- AND `authenticated` so that future routes calling without the
-- service-role hop wouldn't be denied.
--
-- Codex review caught the explicit `authenticated` grant as P1: SECURITY
-- DEFINER functions that accept a caller-supplied `p_user_id` and don't
-- verify it against `auth.uid()` must not be reachable by any role that
-- a low-privilege client can assume. Investigating the fix surfaced a
-- second, latent issue: Postgres auto-grants EXECUTE to PUBLIC on every
-- new function unless explicitly revoked, so even the `anon` role
-- (which uses the public anon key the browser ships with) had EXECUTE
-- via the default. So the tighter revoke covers PUBLIC + anon +
-- authenticated; only service_role retains execute.
--
-- In our deployment Clerk replaces Supabase auth, so no real end-user
-- ends up with the `authenticated` role today — but the moment one
-- ever does (or a test user JWT leaks), they could call these RPCs
-- with any victim UUID and write to another user's interactions,
-- bypassing the Clerk session check that lives in the API route.
--
-- The right model: trust boundary stays at the route layer (verified
-- Clerk session resolves user_id), route hops through the service-role
-- client, and only the service role can execute these functions at
-- the DB layer. If we ever want to expose them to non-admin roles,
-- the RPCs themselves need to enforce `p_user_id = auth.uid()`.

begin;

revoke execute on function public.upsert_user_interaction_for_user_id(
  uuid, uuid, uuid, text
) from public, anon, authenticated;

revoke execute on function public.delete_user_interaction_for_user_id(
  uuid, uuid
) from public, anon, authenticated;

revoke execute on function public.reset_user_interactions_for_user_id(
  uuid
) from public, anon, authenticated;

commit;
