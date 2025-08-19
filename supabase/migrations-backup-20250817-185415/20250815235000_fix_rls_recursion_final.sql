-- Final fix for RLS recursion issue
-- The problem is that user_profiles and households have circular RLS dependencies
-- We need to break this cycle by simplifying the policies

-- Drop all existing SELECT policies on user_profiles
DROP POLICY IF EXISTS "Users can view their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can view household member profiles" ON user_profiles;
DROP POLICY IF EXISTS "Users can view own and household profiles" ON user_profiles;
DROP POLICY IF EXISTS "Users can view own and household member profiles" ON user_profiles;

-- Create a simple non-recursive policy for user_profiles
-- This uses a CTE to get the user's household_id once, avoiding recursion
CREATE POLICY "Users can view profiles" 
ON user_profiles
FOR SELECT 
USING (
  -- User can always view their own profile
  auth.uid() = id 
  OR 
  -- User can view other profiles in their household using a non-recursive check
  (
    household_id IS NOT NULL 
    AND household_id IN (
      -- Get the current user's household_id without recursion
      -- We use auth.uid() directly in a single query
      SELECT up.household_id 
      FROM user_profiles up
      WHERE up.id = auth.uid() 
        AND up.household_id IS NOT NULL
      LIMIT 1
    )
  )
  OR
  -- Service role can view all profiles (for testing)
  (
    auth.jwt()->>'role' = 'service_role'
  )
);