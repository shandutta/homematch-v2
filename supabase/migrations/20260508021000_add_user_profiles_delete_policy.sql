-- Phase 1 RLS closure: allow authenticated users to delete their own profile row.
-- Safe to re-run in local/reset workflows.

DROP POLICY IF EXISTS "Users can delete their own profile" ON public.user_profiles;

CREATE POLICY "Users can delete their own profile"
  ON public.user_profiles
  FOR DELETE
  USING (auth.uid() = id);
