-- Fix user_profiles UPDATE policy to properly enforce RLS
-- The original policy was not being enforced correctly
--
-- Issue: User A could update User B's profile despite RLS policy
-- Root cause: UPDATE policy needs explicit WITH CHECK clause

BEGIN;

-- Drop the existing policy
DROP POLICY IF EXISTS "Users can update their own profile" ON user_profiles;

-- Recreate with explicit USING and WITH CHECK clauses
-- USING: Controls which existing rows can be seen/accessed for UPDATE
-- WITH CHECK: Controls what values the updated row can have
CREATE POLICY "Users can update their own profile" ON user_profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Verify RLS is enabled (should already be, but ensure it)
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Force RLS for table owners (extra security measure)
ALTER TABLE user_profiles FORCE ROW LEVEL SECURITY;

COMMIT;
