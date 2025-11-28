-- Fix function overloading issue by removing the zero-parameter version
-- and keeping only the one-parameter version with hardening logic
--
-- Root cause: Three migrations created two function overloads:
-- 1. create_household_for_user() - no parameters
-- 2. create_household_for_user(p_name TEXT DEFAULT NULL) - one parameter
--
-- PostgreSQL can't disambiguate when calling without arguments since both match.

-- Drop the zero-parameter overload
DROP FUNCTION IF EXISTS public.create_household_for_user();

-- Update the one-parameter version with hardening logic
CREATE OR REPLACE FUNCTION public.create_household_for_user(p_name TEXT DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_household_id uuid;
  current_user_id uuid;
  auth_email text;
  display_name text;
  existing_household_id uuid;
BEGIN
  -- Derive current user id from JWT
  current_user_id := auth.uid();

  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Ensure the auth user still exists to prevent FK violations from stale sessions
  SELECT
    email,
    COALESCE(
      raw_user_meta_data->>'display_name',
      SPLIT_PART(email, '@', 1)
    )
  INTO auth_email, display_name
  FROM auth.users
  WHERE id = current_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Your session is no longer valid. Please sign in again.'
      USING ERRCODE = 'P0002', HINT = 'auth user missing';
  END IF;

  -- Guarantee a profile row exists so we can safely update household_id
  INSERT INTO user_profiles (
    id,
    email,
    display_name,
    onboarding_completed,
    preferences
  )
  VALUES (
    current_user_id,
    auth_email,
    display_name,
    false,
    '{}'::jsonb
  )
  ON CONFLICT (id) DO NOTHING;

  -- Check if the user already belongs to a household
  SELECT household_id
  INTO existing_household_id
  FROM user_profiles
  WHERE id = current_user_id;

  IF existing_household_id IS NOT NULL THEN
    RAISE EXCEPTION 'User already belongs to a household';
  END IF;

  -- Create the household with optional name
  INSERT INTO households (name, created_by, user_count)
  VALUES (p_name, current_user_id, 1)
  RETURNING id INTO new_household_id;

  -- Link the user profile to the new household
  UPDATE user_profiles
  SET household_id = new_household_id
  WHERE id = current_user_id;

  RETURN new_household_id;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.create_household_for_user(TEXT) TO authenticated;

COMMENT ON FUNCTION public.create_household_for_user(TEXT) IS
  'Creates a household for the current user with optional name, validating auth user presence and provisioning user_profiles before linking.';
