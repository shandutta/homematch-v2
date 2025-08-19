-- Fix trigger execution order to satisfy foreign key constraints
-- The handle_new_user trigger was inserting into user_profiles BEFORE users,
-- but user_profiles has a foreign key constraint to users table
-- This fixes the order to insert users first, then user_profiles

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER 
SET search_path = ''  -- Critical for preventing recursion
AS $$
BEGIN
  -- FIRST: Insert into users table (required by foreign key constraint)
  INSERT INTO public.users (id, email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email,
      updated_at = NOW();
  
  -- SECOND: Insert user profile (now that users record exists)
  INSERT INTO public.user_profiles (id, onboarding_completed, preferences)
  VALUES (NEW.id, false, '{}'::jsonb)
  ON CONFLICT (id) DO NOTHING;  -- Prevent duplicate key errors
  
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

-- Add comment explaining the fix
COMMENT ON FUNCTION public.handle_new_user() IS 'Fixed trigger function that inserts into users table BEFORE user_profiles to satisfy foreign key constraints';