-- Close the 2 advisor lints that appeared on the new admin_role_assignments
-- table from 20260508024000_create_admin_role_assignments.sql:
--   1. unindexed_foreign_keys on (created_by)
--   2. auth_rls_initplan on admin_role_assignments_self_select
--      (auth.uid() unwrapped — same footgun fixed everywhere else by
--      20260511144002_optimize_rls_auth_uid_subselect.sql, but this policy
--      was added in the same Phase 1 closure batch and slipped through.)
--
-- Idempotent (CREATE INDEX IF NOT EXISTS, DROP POLICY IF EXISTS).

CREATE INDEX IF NOT EXISTS idx_admin_role_assignments_created_by
  ON public.admin_role_assignments (created_by);

DROP POLICY IF EXISTS admin_role_assignments_self_select ON public.admin_role_assignments;
CREATE POLICY admin_role_assignments_self_select
  ON public.admin_role_assignments
  FOR SELECT
  TO authenticated
  USING (
    (SELECT auth.uid()) = user_id
    AND enabled = true
    AND (expires_at IS NULL OR expires_at > now())
  );
