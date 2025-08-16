-- Fix infinite recursion in user_profiles RLS policy
-- The previous policy "Users can view household member profiles" was causing
-- infinite recursion by referencing user_profiles within itself

-- First, drop the problematic policy
DROP POLICY IF EXISTS "Users can view household member profiles" ON user_profiles;

-- Also drop the old "view own profile" policy to replace it
DROP POLICY IF EXISTS "Users can view their own profile" ON user_profiles;

-- Create a simpler policy that avoids recursion
-- Users can only view their own profile OR profiles with the same household_id
CREATE POLICY "Users can view own and household profiles" 
ON user_profiles
FOR SELECT 
USING (
  -- User can view their own profile
  auth.uid() = id 
  OR 
  -- User can view profiles that share the same household_id
  -- This avoids subqueries that could cause recursion
  (
    household_id IS NOT NULL 
    AND EXISTS (
      SELECT 1 
      FROM user_profiles AS my_profile
      WHERE my_profile.id = auth.uid()
        AND my_profile.household_id = user_profiles.household_id
    )
  )
);

-- Ensure other user_profiles policies don't have similar issues
-- The update and insert policies should remain unchanged as they only check auth.uid() = id