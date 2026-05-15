-- D1 follow-up (2026-05-15): consolidate the three user-interaction
-- write paths (upsert / single-property delete / reset-all-for-user)
-- into SECURITY DEFINER RPCs. Phase 2 routed these through
-- service-role with an explicit user_id in the WHERE clause — that
-- works, but every route carries the same boilerplate (capability
-- guard, write client, ignoreDuplicates rules, cache invalidation).
-- The RPCs:
--   - own the upsert/delete SQL (ignoreDuplicates rules for view
--     interactions live in one place, not three).
--   - run SECURITY DEFINER, scoped to the caller-supplied p_user_id.
--     The route layer is still the trust boundary (Clerk session
--     verified there); the RPC just owns the SQL.
--   - GRANT EXECUTE TO authenticated AND service_role. service_role
--     bypasses GRANTs anyway; the authenticated grant is there for
--     future routes that might want to skip the service-role hop
--     once the route layer can vouch for the caller via a stricter
--     mechanism than "trust the user_id".
--
-- Each function returns the row(s) the caller needs for downstream
-- cache invalidation (household_id) so the route stays a thin shim.

begin;

-- ---------------------------------------------------------------
-- 1) upsert_user_interaction_for_user_id
-- ---------------------------------------------------------------
-- Mirrors the route's UPSERT behavior:
--   - view: do nothing if a row already exists for (user_id, property_id)
--   - like / dislike / skip: override any existing row (including a view)
-- Returns the row that ended up in the table (the existing one for a
-- view-after-decision, or the newly-inserted/updated row otherwise).
--
-- Returns SETOF user_property_interactions rather than RETURNS TABLE(...)
-- with named columns. In PL/pgSQL a RETURNS TABLE column list shadows the
-- target table's columns inside the function body, which produces 42702
-- "column reference is ambiguous" on `on conflict (user_id, property_id)`.
-- SETOF avoids the shadowing and hands back the full row shape, which is
-- also what the original `.from().upsert().select()` returned, so callers
-- see no change.
create or replace function public.upsert_user_interaction_for_user_id(
  p_user_id uuid,
  p_property_id uuid,
  p_household_id uuid,
  p_interaction_type text
)
returns setof public.user_property_interactions
language plpgsql
volatile
security definer
set search_path = pg_catalog, public
as $$
declare
  v_is_overriding boolean := p_interaction_type <> 'view';
begin
  -- Schema enforces UNIQUE(user_id, property_id); a view arriving after
  -- a like/dislike/skip is a no-op. Any other type clobbers.
  -- user_property_interactions has no updated_at column — created_at
  -- stays at the first-insert time on conflict.
  insert into public.user_property_interactions as upi
    (user_id, property_id, household_id, interaction_type)
  values
    (p_user_id, p_property_id, p_household_id, p_interaction_type)
  on conflict (user_id, property_id) do update
    set interaction_type = case
          when v_is_overriding then excluded.interaction_type
          else upi.interaction_type
        end,
        household_id = case
          when v_is_overriding then excluded.household_id
          else upi.household_id
        end;

  return query
    select upi.*
    from public.user_property_interactions upi
    where upi.user_id = p_user_id
      and upi.property_id = p_property_id;
end;
$$;

grant execute on function public.upsert_user_interaction_for_user_id(
  uuid, uuid, uuid, text
) to authenticated, service_role;

comment on function public.upsert_user_interaction_for_user_id(
  uuid, uuid, uuid, text
) is 'D1 follow-up: consolidates POST /api/interactions upsert logic. view-after-decision is a no-op; like/dislike/skip overrides. Trust boundary is the caller (route verifies Clerk session).';

-- ---------------------------------------------------------------
-- 2) delete_user_interaction_for_user_id
-- ---------------------------------------------------------------
-- Single-property delete. Returns the deleted row's household_id so
-- the caller can clear the couples cache.
create or replace function public.delete_user_interaction_for_user_id(
  p_user_id uuid,
  p_property_id uuid
)
returns table(
  deleted_household_id uuid
)
language sql
volatile
security definer
set search_path = pg_catalog, public
as $$
  delete from public.user_property_interactions
  where user_id = p_user_id
    and property_id = p_property_id
  returning household_id;
$$;

grant execute on function public.delete_user_interaction_for_user_id(
  uuid, uuid
) to authenticated, service_role;

comment on function public.delete_user_interaction_for_user_id(
  uuid, uuid
) is 'D1 follow-up: single-property DELETE for /api/interactions. Returns the deleted row''s household_id for cache invalidation.';

-- ---------------------------------------------------------------
-- 3) reset_user_interactions_for_user_id
-- ---------------------------------------------------------------
-- Reset-all-for-user. Returns each deleted row's household_id (with
-- duplicates) so the caller can clear caches for every distinct
-- household the user touched.
create or replace function public.reset_user_interactions_for_user_id(
  p_user_id uuid
)
returns table(
  deleted_household_id uuid
)
language sql
volatile
security definer
set search_path = pg_catalog, public
as $$
  delete from public.user_property_interactions
  where user_id = p_user_id
  returning household_id;
$$;

grant execute on function public.reset_user_interactions_for_user_id(
  uuid
) to authenticated, service_role;

comment on function public.reset_user_interactions_for_user_id(
  uuid
) is 'D1 follow-up: reset-all DELETE for /api/interactions/reset. Returns deleted rows'' household_ids for cache invalidation.';

commit;
