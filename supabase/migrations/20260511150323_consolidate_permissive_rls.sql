-- Consolidate 7 duplicate permissive RLS policies flagged by the
-- `multiple_permissive_policies` Supabase advisor.
--
-- Background: when a table has multiple permissive policies covering the same
-- (role, action) pair, Postgres must evaluate ALL of them for every row that
-- the action touches. The OR-combined predicate is logically equivalent to a
-- single policy with the same conditions joined by `OR`, but a single policy
-- is faster because Postgres can plan and short-circuit once.
--
-- Reference: reports/home-match-revival/audit-2026-05-11/full-app-audit-and-remediation-plan-2026-05-11.md
-- Section 7 (S2) and the advisor link:
-- https://supabase.com/docs/guides/database/database-linter?lint=0006_multiple_permissive_policies
--
-- Advisor-flagged duplicates (7 total):
--   1) properties — anon SELECT:
--      "Anyone can view active properties" (added 2025-07-28, no role
--      restriction => applies to anon)
--      vs
--      "properties_anon_marketing_read" (added 2025-08-01, TO anon)
--
--   2-7) user_property_interactions — SELECT, 6 lints (anon, authenticated,
--        authenticator, cli_login_postgres, dashboard_user,
--        supabase_privileged_role):
--      "Users can view their own interactions" (own rows)
--      vs
--      "Household members can access mutual likes function" (household rows)
--
-- Consolidation strategy:
--   - `properties`: collapse to a single anon policy (marketing read, the
--     stricter listing_status='active' check) and a single authenticated
--     policy with the same predicate. Public listing remains unchanged.
--   - `user_property_interactions`: collapse the two SELECT policies into one
--     `TO authenticated` policy whose USING clause is the OR of both
--     predicates. Auth-only because anon should never read interactions.
--
-- All statements are idempotent (DROP POLICY IF EXISTS, CREATE POLICY).

BEGIN;

-- ============================================================================
-- 1. public.properties — collapse anon SELECT duplicates
-- ============================================================================

-- Drop the original role-unrestricted policy. It was redundant with the
-- marketing-read policy on anon and effectively unused for authenticated users
-- (callers go through the broader authenticated read path).
DROP POLICY IF EXISTS "Anyone can view active properties" ON public.properties;

-- Drop and recreate the anon marketing-read policy to make it the SOLE anon
-- SELECT policy. Predicate unchanged.
DROP POLICY IF EXISTS properties_anon_marketing_read ON public.properties;
CREATE POLICY properties_anon_marketing_read
  ON public.properties
  FOR SELECT
  TO anon
  USING (
    listing_status = 'active'
    AND COALESCE(is_active, true) = true
  );

-- Add an explicit authenticated SELECT policy with the same predicate so app
-- users continue to see all active listings (previously served by "Anyone can
-- view active properties").
DROP POLICY IF EXISTS "Authenticated users can view active properties" ON public.properties;
CREATE POLICY "Authenticated users can view active properties"
  ON public.properties
  FOR SELECT
  TO authenticated
  USING (
    COALESCE(is_active, true) = true
  );

-- ============================================================================
-- 2. public.user_property_interactions — collapse SELECT duplicates
-- ============================================================================

-- Drop both overlapping SELECT policies.
DROP POLICY IF EXISTS "Users can view their own interactions" ON public.user_property_interactions;
DROP POLICY IF EXISTS "Household members can access mutual likes function" ON public.user_property_interactions;

-- Create a single consolidated SELECT policy. USING is the OR of both
-- previous predicates: the user owns the row, OR the row belongs to a
-- household the user is a member of (mutual-likes / shared activity feed).
-- Wrap auth.uid() in (SELECT …) per the auth_rls_initplan optimization
-- (matches Sprint 1 pattern).
CREATE POLICY "Users can view own and household interactions"
  ON public.user_property_interactions
  FOR SELECT
  TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR household_id IN (
      SELECT household_id
      FROM public.user_profiles
      WHERE id = (SELECT auth.uid())
    )
  );

COMMIT;
