-- Create a SECURITY DEFINER function for household creation
-- This bypasses RLS and handles both household creation and profile update atomically

CREATE OR REPLACE FUNCTION public.create_household_for_user()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_household_id uuid;
  current_user_id uuid;
BEGIN
  -- Get the current user's ID
  current_user_id := auth.uid();

  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Check if user already has a household
  IF EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = current_user_id AND household_id IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'User already belongs to a household';
  END IF;

  -- Create the household
  INSERT INTO households (created_by, user_count)
  VALUES (current_user_id, 1)
  RETURNING id INTO new_household_id;

  -- Update the user's profile
  UPDATE user_profiles
  SET household_id = new_household_id
  WHERE id = current_user_id;

  RETURN new_household_id;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.create_household_for_user() TO authenticated;
