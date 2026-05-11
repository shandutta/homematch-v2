-- Optimize 22 RLS policies flagged by the Supabase `auth_rls_initplan` advisor.
--
-- Background: a policy expression containing a bare `auth.uid()` (or
-- `current_setting()`) is treated as a volatile function and re-evaluated for
-- every row the policy checks. Wrapping the call in `(select auth.uid())`
-- turns it into a stable scalar evaluated once per query, yielding a
-- substantial perf win on large tables.
--
-- Reference: reports/home-match-revival/audit-2026-05-11/full-app-audit-and-remediation-plan-2026-05-11.md
-- Section 6 (S1 + S3) and the advisor link:
-- https://supabase.com/docs/guides/database/database-linter?lint=0003_auth_rls_initplan
--
-- This migration also adds the 4 missing FK covering indexes (S3) called out
-- in the same audit section.
--
-- All statements are idempotent (DROP POLICY IF EXISTS, CREATE INDEX IF NOT
-- EXISTS) so reset/replay is safe.

BEGIN;

-- ============================================================================
-- 1. user_property_interactions (5 policies)
-- ============================================================================

DROP POLICY IF EXISTS "Users can view their own interactions" ON public.user_property_interactions;
CREATE POLICY "Users can view their own interactions" ON public.user_property_interactions
  FOR SELECT USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert their own interactions" ON public.user_property_interactions;
CREATE POLICY "Users can insert their own interactions" ON public.user_property_interactions
  FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update their own interactions" ON public.user_property_interactions;
CREATE POLICY "Users can update their own interactions" ON public.user_property_interactions
  FOR UPDATE USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete their own interactions" ON public.user_property_interactions;
CREATE POLICY "Users can delete their own interactions" ON public.user_property_interactions
  FOR DELETE USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Household members can access mutual likes function" ON public.user_property_interactions;
CREATE POLICY "Household members can access mutual likes function" ON public.user_property_interactions
  FOR SELECT
  USING (
    household_id IN (
      SELECT household_id
      FROM public.user_profiles
      WHERE id = (SELECT auth.uid())
    )
  );

-- ============================================================================
-- 2. user_profiles (3 policies)
-- ============================================================================

DROP POLICY IF EXISTS "Users can view their own profile" ON public.user_profiles;
CREATE POLICY "Users can view their own profile" ON public.user_profiles
  FOR SELECT USING ((SELECT auth.uid()) = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.user_profiles;
CREATE POLICY "Users can update their own profile" ON public.user_profiles
  FOR UPDATE USING ((SELECT auth.uid()) = id);

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.user_profiles;
CREATE POLICY "Users can insert their own profile" ON public.user_profiles
  FOR INSERT WITH CHECK ((SELECT auth.uid()) = id);

-- Also wrap the DELETE policy added in 20260508021000 — same footgun, not yet
-- on the advisor's cached list but it will appear on the next run.
DROP POLICY IF EXISTS "Users can delete their own profile" ON public.user_profiles;
CREATE POLICY "Users can delete their own profile" ON public.user_profiles
  FOR DELETE USING ((SELECT auth.uid()) = id);

-- ============================================================================
-- 3. saved_searches (4 policies)
-- ============================================================================

DROP POLICY IF EXISTS "Users can view their own searches" ON public.saved_searches;
CREATE POLICY "Users can view their own searches" ON public.saved_searches
  FOR SELECT USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert their own searches" ON public.saved_searches;
CREATE POLICY "Users can insert their own searches" ON public.saved_searches
  FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update their own searches" ON public.saved_searches;
CREATE POLICY "Users can update their own searches" ON public.saved_searches
  FOR UPDATE USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete their own searches" ON public.saved_searches;
CREATE POLICY "Users can delete their own searches" ON public.saved_searches
  FOR DELETE USING ((SELECT auth.uid()) = user_id);

-- ============================================================================
-- 4. households (3 policies)
-- ============================================================================

DROP POLICY IF EXISTS "Users can view their household" ON public.households;
CREATE POLICY "Users can view their household" ON public.households
  FOR SELECT USING (
    id IN (
      SELECT household_id
      FROM public.user_profiles
      WHERE id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can update their household" ON public.households;
CREATE POLICY "Users can update their household" ON public.households
  FOR UPDATE USING (
    id IN (
      SELECT household_id
      FROM public.user_profiles
      WHERE id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can create households" ON public.households;
CREATE POLICY "Users can create households" ON public.households
  FOR INSERT WITH CHECK ((SELECT auth.uid()) = created_by);

-- ============================================================================
-- 5. household_invitations (3 policies)
-- ============================================================================

DROP POLICY IF EXISTS "Users can view their household invitations" ON public.household_invitations;
CREATE POLICY "Users can view their household invitations" ON public.household_invitations
  FOR SELECT USING (
    household_id IN (
      SELECT household_id
      FROM public.user_profiles
      WHERE id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can create invitations for their household" ON public.household_invitations;
CREATE POLICY "Users can create invitations for their household" ON public.household_invitations
  FOR INSERT WITH CHECK (
    (SELECT auth.uid()) = created_by
    AND household_id IN (
      SELECT household_id
      FROM public.user_profiles
      WHERE id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can update their own invitations" ON public.household_invitations;
CREATE POLICY "Users can update their own invitations" ON public.household_invitations
  FOR UPDATE USING ((SELECT auth.uid()) = created_by);

-- ============================================================================
-- 6. household_property_resolutions (4 policies)
-- ============================================================================

DROP POLICY IF EXISTS "Household members can view property resolutions" ON public.household_property_resolutions;
CREATE POLICY "Household members can view property resolutions"
  ON public.household_property_resolutions
  FOR SELECT
  USING (
    household_id IN (
      SELECT household_id
      FROM public.user_profiles
      WHERE id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Household members can create property resolutions" ON public.household_property_resolutions;
CREATE POLICY "Household members can create property resolutions"
  ON public.household_property_resolutions
  FOR INSERT
  WITH CHECK (
    resolved_by = (SELECT auth.uid())
    AND household_id IN (
      SELECT household_id
      FROM public.user_profiles
      WHERE id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Household members can update property resolutions" ON public.household_property_resolutions;
CREATE POLICY "Household members can update property resolutions"
  ON public.household_property_resolutions
  FOR UPDATE
  USING (
    household_id IN (
      SELECT household_id
      FROM public.user_profiles
      WHERE id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Household members can delete property resolutions" ON public.household_property_resolutions;
CREATE POLICY "Household members can delete property resolutions"
  ON public.household_property_resolutions
  FOR DELETE
  USING (
    household_id IN (
      SELECT household_id
      FROM public.user_profiles
      WHERE id = (SELECT auth.uid())
    )
  );

-- ============================================================================
-- 7. Unindexed foreign keys (audit S3 — 4 covering indexes)
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_household_invitations_accepted_by
  ON public.household_invitations (accepted_by);

CREATE INDEX IF NOT EXISTS idx_household_invitations_created_by
  ON public.household_invitations (created_by);

CREATE INDEX IF NOT EXISTS idx_household_property_resolutions_resolved_by
  ON public.household_property_resolutions (resolved_by);

CREATE INDEX IF NOT EXISTS idx_households_created_by
  ON public.households (created_by);

COMMIT;
