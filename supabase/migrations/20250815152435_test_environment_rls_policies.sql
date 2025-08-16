-- Test Environment RLS Policies
-- These policies enable proper testing while maintaining security
-- They should only be applied in test/development environments

-- Allow service role to bypass RLS for all tables (test setup/teardown)
-- Service role already bypasses RLS by default, but let's be explicit

-- User Property Interactions: Allow household members to view each other's interactions
DROP POLICY IF EXISTS "Household members can view all household interactions" ON user_property_interactions;
CREATE POLICY "Household members can view all household interactions" 
ON user_property_interactions
FOR SELECT 
USING (
  household_id IN (
    SELECT household_id 
    FROM user_profiles 
    WHERE id = auth.uid() AND household_id IS NOT NULL
  )
);

-- User Property Interactions: Allow users to insert with household_id
DROP POLICY IF EXISTS "Users can insert interactions with household_id" ON user_property_interactions;
CREATE POLICY "Users can insert interactions with household_id" 
ON user_property_interactions
FOR INSERT 
WITH CHECK (
  auth.uid() = user_id 
  AND (
    household_id IS NULL 
    OR household_id IN (
      SELECT household_id 
      FROM user_profiles 
      WHERE id = auth.uid()
    )
  )
);

-- Properties: Allow authenticated users to insert properties (for testing)
-- Only in test environment - remove for production
DROP POLICY IF EXISTS "Authenticated users can insert properties for testing" ON properties;
CREATE POLICY "Authenticated users can insert properties for testing" 
ON properties
FOR INSERT 
WITH CHECK (
  auth.uid() IS NOT NULL
);

-- Properties: Allow authenticated users to update properties (for testing)
DROP POLICY IF EXISTS "Authenticated users can update properties for testing" ON properties;
CREATE POLICY "Authenticated users can update properties for testing" 
ON properties
FOR UPDATE 
USING (
  auth.uid() IS NOT NULL
);

-- Properties: Allow authenticated users to delete properties (for testing)
DROP POLICY IF EXISTS "Authenticated users can delete properties for testing" ON properties;
CREATE POLICY "Authenticated users can delete properties for testing" 
ON properties
FOR DELETE 
USING (
  auth.uid() IS NOT NULL
);

-- User Profiles: Allow users to view household members' profiles
-- NOTE: This policy was removed to prevent infinite recursion
-- The fix is applied in migration 20250815234500_fix_user_profiles_rls_recursion.sql
-- DO NOT recreate the recursive policy here

-- Households: Allow users to insert households (for testing)
DROP POLICY IF EXISTS "Authenticated users can create households for testing" ON households;
CREATE POLICY "Authenticated users can create households for testing" 
ON households
FOR INSERT 
WITH CHECK (
  auth.uid() IS NOT NULL
);

-- Create a function to check if we're in test mode
-- This can be used to conditionally apply policies
CREATE OR REPLACE FUNCTION is_test_environment()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if the database URL contains 'localhost' or '127.0.0.1'
  -- Or check for a specific test database name pattern
  RETURN current_database() LIKE '%test%' 
    OR current_setting('app.environment', true) = 'test'
    OR EXISTS (
      SELECT 1 
      FROM pg_stat_activity 
      WHERE application_name LIKE '%test%'
      LIMIT 1
    );
END;
$$;

-- Add a comment to identify test-specific policies
COMMENT ON POLICY "Authenticated users can insert properties for testing" ON properties 
IS 'TEST ONLY: Remove for production';
COMMENT ON POLICY "Authenticated users can update properties for testing" ON properties 
IS 'TEST ONLY: Remove for production';
COMMENT ON POLICY "Authenticated users can delete properties for testing" ON properties 
IS 'TEST ONLY: Remove for production';
COMMENT ON POLICY "Authenticated users can create households for testing" ON households 
IS 'TEST ONLY: Remove for production';