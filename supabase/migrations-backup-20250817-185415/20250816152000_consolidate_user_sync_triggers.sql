-- Consolidate user sync triggers - fix the confusion between multiple trigger functions
-- This migration ensures only one correct trigger exists that properly syncs users

-- Drop all existing triggers to start clean
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS sync_users_from_auth_trigger ON auth.users;

-- Drop conflicting functions
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP FUNCTION IF EXISTS public.sync_users_from_auth();

-- Create the definitive trigger function that handles the foreign key constraint properly
CREATE OR REPLACE FUNCTION public.handle_auth_user_created()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER 
SET search_path = ''
AS $$
BEGIN
  -- STEP 1: Insert into users table FIRST (required by foreign key constraints)
  INSERT INTO public.users (id, email, created_at, updated_at)
  VALUES (NEW.id, NEW.email, NEW.created_at, NOW())
  ON CONFLICT (id) DO UPDATE SET 
    email = EXCLUDED.email,
    updated_at = NOW();
  
  -- STEP 2: Insert user profile AFTER users record exists (satisfies foreign key)
  INSERT INTO public.user_profiles (id, onboarding_completed, preferences)
  VALUES (NEW.id, false, '{}'::jsonb)
  ON CONFLICT (id) DO NOTHING;
  
  RETURN NEW;
EXCEPTION
  WHEN others THEN
    -- Log error but don't block user creation in auth.users
    RAISE WARNING 'Error in handle_auth_user_created trigger: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- Create the single definitive trigger
CREATE TRIGGER auth_user_sync_trigger
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_auth_user_created();

-- Ensure proper permissions
GRANT EXECUTE ON FUNCTION public.handle_auth_user_created() TO service_role;
GRANT EXECUTE ON FUNCTION public.handle_auth_user_created() TO authenticated;

-- Sync any existing auth users that might not be in the users table
INSERT INTO public.users (id, email, created_at, updated_at)
SELECT id, email, created_at, NOW()
FROM auth.users
ON CONFLICT (id) DO UPDATE SET 
  email = EXCLUDED.email,
  updated_at = NOW();

-- Add comment explaining this definitive solution
COMMENT ON FUNCTION public.handle_auth_user_created() IS 'Definitive trigger function that syncs auth.users to users table and creates user_profiles, fixing foreign key constraint issues';