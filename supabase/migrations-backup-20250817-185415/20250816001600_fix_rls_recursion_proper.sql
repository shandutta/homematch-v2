-- Proper fix for RLS recursion on user_profiles
-- The issue: RLS policies that reference the same table create infinite recursion
-- Solution: Use a simplified approach that avoids subqueries to user_profiles

-- Drop all existing problematic policies
DROP POLICY IF EXISTS "Users can view their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can view household member profiles" ON user_profiles;
DROP POLICY IF EXISTS "Users can view own and household profiles" ON user_profiles;
DROP POLICY IF EXISTS "Users can view own and household member profiles" ON user_profiles;
DROP POLICY IF EXISTS "Users can view profiles" ON user_profiles;

-- Create a simple, non-recursive policy for user_profiles
-- This policy only checks auth.uid() = id, avoiding any subqueries to user_profiles
CREATE POLICY "Users can view own profile" 
ON user_profiles
FOR SELECT 
USING (
  -- User can view their own profile (no recursion)
  auth.uid() = id 
  OR 
  -- Service role can view all profiles (for testing and admin operations)
  auth.jwt() ->> 'role' = 'service_role'
);

-- For household functionality, we'll handle household member visibility 
-- at the application level rather than in RLS policies to avoid recursion.
-- This is a common pattern for complex relationships that would cause RLS recursion.

-- Create separate policies for INSERT, UPDATE, DELETE that are safe
CREATE POLICY "Users can insert own profile" 
ON user_profiles
FOR INSERT 
WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile" 
ON user_profiles
FOR UPDATE 
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can delete own profile" 
ON user_profiles
FOR DELETE 
USING (auth.uid() = id);

-- Service role policies for testing (these don't cause recursion)
CREATE POLICY "Service role can manage all user profiles" 
ON user_profiles
FOR ALL
USING (auth.jwt() ->> 'role' = 'service_role')
WITH CHECK (auth.jwt() ->> 'role' = 'service_role');