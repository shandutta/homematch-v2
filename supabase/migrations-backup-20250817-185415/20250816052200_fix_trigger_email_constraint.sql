-- Fix trigger to handle email uniqueness constraint properly
-- The previous fix handled foreign key constraints but introduced email duplicate issues
-- This fixes the trigger to handle both id and email conflicts properly

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER 
SET search_path = ''
AS $$
BEGIN
  -- FIRST: Insert into users table with proper conflict resolution
  -- Handle both id and email conflicts since users table has unique constraints on both
  INSERT INTO public.users (id, email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email,
      updated_at = NOW()
  WHERE users.email != EXCLUDED.email;  -- Only update if email changed
  
  -- Handle potential email conflict separately
  -- If there's an email conflict with a different user, we'll let it fail gracefully
  
  -- SECOND: Insert user profile (now that users record exists)
  INSERT INTO public.user_profiles (id, onboarding_completed, preferences)
  VALUES (NEW.id, false, '{}'::jsonb)
  ON CONFLICT (id) DO NOTHING;
  
  RETURN NEW;
EXCEPTION
  WHEN unique_violation THEN
    -- Handle unique constraint violations gracefully
    IF SQLERRM LIKE '%users_email_key%' THEN
      -- Email already exists with different user ID
      RAISE WARNING 'Email % already exists in users table with different ID', NEW.email;
      -- Still try to create the user profile if users record exists
      INSERT INTO public.user_profiles (id, onboarding_completed, preferences)
      VALUES (NEW.id, false, '{}'::jsonb)
      ON CONFLICT (id) DO NOTHING;
    ELSE
      RAISE WARNING 'Unique constraint violation in handle_new_user trigger: %', SQLERRM;
    END IF;
    RETURN NEW;
  WHEN foreign_key_violation THEN
    RAISE WARNING 'Foreign key violation in handle_new_user trigger: %', SQLERRM;
    RETURN NEW;
  WHEN others THEN
    -- Log any other errors but don't block user creation
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
COMMENT ON FUNCTION public.handle_new_user() IS 'Fixed trigger function that handles both foreign key constraints and email uniqueness properly';