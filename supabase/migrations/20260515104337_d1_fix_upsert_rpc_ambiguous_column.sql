-- D1 follow-up: fix the upsert_user_interaction_for_user_id RPC introduced
-- in 20260515001555. Two bugs from the original:
--
-- 1. RETURNS TABLE(user_id uuid, property_id uuid, household_id uuid,
--    interaction_type text, created_at timestamptz, updated_at timestamptz)
--    declares those column names as PL/pgSQL VARIABLES in scope throughout
--    the function body. That shadowed the target table's column refs and
--    produced
--      42702: column reference "user_id" is ambiguous
--    the moment the executor reached `on conflict (user_id, property_id)`.
--
-- 2. The CASE update of `upi.updated_at` referenced a column that does
--    not exist on user_property_interactions, producing
--      42703: column upi.updated_at does not exist
--    on the next CI run after the 42702 fix.
--
-- Fix: replace the named-column RETURNS TABLE with
--   RETURNS SETOF public.user_property_interactions
-- which doesn't introduce shadowing variables and returns the full row
-- shape — same shape callers got from the prior
-- `.from().upsert().select()`. Drop the bogus updated_at update; the
-- column doesn't exist and there's no per-row last-modified to track on
-- this table (created_at stays at first-insert time on conflict).
--
-- We edited the original 20260515001555 in place so a fresh CI run sees
-- the corrected SQL, but prod's schema_migrations already records that
-- version as applied so `supabase db push` won't re-run it. This
-- standalone fix-up migration carries the correction forward to prod.

begin;

-- DROP + CREATE rather than CREATE OR REPLACE: Postgres refuses to change
-- the return type of an existing function (42P13), and this fix swaps
-- RETURNS TABLE(...) for RETURNS SETOF user_property_interactions.
drop function if exists public.upsert_user_interaction_for_user_id(
  uuid, uuid, uuid, text
);

create function public.upsert_user_interaction_for_user_id(
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

-- Restate the privilege state: only service_role should hold EXECUTE.
-- CREATE OR REPLACE FUNCTION preserves existing privileges in Postgres,
-- but spelling it out here makes the intent explicit and is a no-op if
-- already correct.
revoke execute on function public.upsert_user_interaction_for_user_id(
  uuid, uuid, uuid, text
) from public, anon, authenticated;
grant execute on function public.upsert_user_interaction_for_user_id(
  uuid, uuid, uuid, text
) to service_role;

commit;
