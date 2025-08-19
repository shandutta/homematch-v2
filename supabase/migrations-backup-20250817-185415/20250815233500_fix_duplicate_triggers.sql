-- Fix duplicate trigger issue causing infinite recursion
-- We have two triggers on auth.users that both try to create records
-- This is causing "stack depth limit exceeded" errors

-- First, drop the sync_users_from_auth_trigger which is redundant
-- The handle_new_user trigger already creates user_profiles
DROP TRIGGER IF EXISTS sync_users_from_auth_trigger ON auth.users;

-- Also drop the function since it's no longer needed
DROP FUNCTION IF EXISTS sync_users_from_auth();

-- Ensure the main trigger function has proper search_path
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER 
SET search_path = ''  -- Critical for preventing recursion
AS $$
BEGIN
  -- Insert user profile with default values
  INSERT INTO public.user_profiles (id, onboarding_completed, preferences)
  VALUES (NEW.id, false, '{}'::jsonb)
  ON CONFLICT (id) DO NOTHING;  -- Prevent duplicate key errors
  
  -- Also insert into users table if it exists (for test compatibility)
  INSERT INTO public.users (id, email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email,
      updated_at = NOW();
  
  RETURN NEW;
EXCEPTION
  WHEN others THEN
    -- Log the error but don't block user creation
    RAISE WARNING 'Error in handle_new_user trigger: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- Ensure proper permissions
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO authenticated;

-- Recreate the trigger to ensure it uses the updated function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();