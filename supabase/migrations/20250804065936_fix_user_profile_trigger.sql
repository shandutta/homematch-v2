-- Fix user profile trigger that should have been created in 20250730080404
-- This ensures test users can be created properly

-- First, let's make sure the function exists
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert user profile with default values
  INSERT INTO public.user_profiles (id, onboarding_completed, preferences)
  VALUES (NEW.id, false, '{}'::jsonb);
  RETURN NEW;
EXCEPTION
  WHEN others THEN
    -- Log the error and still return NEW to avoid blocking user creation
    RAISE NOTICE 'Error in handle_new_user trigger: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO authenticated;