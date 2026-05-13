-- HOUSEHOLD-001: Clerk-aware household-creation RPC.
--
-- The existing create_household_for_user(TEXT) RPC reads auth.uid() and queries
-- auth.users to populate user_profiles for first-time users. Neither works for
-- Clerk-authenticated users (auth.uid() is null on the anon-key client; Clerk
-- users have no auth.users row). The entire matching feature has been broken
-- end-to-end for every Clerk signup as a result.
--
-- This adds a parallel RPC that takes an explicit p_user_id and skips the
-- auth.users dependency. The caller (an API route handler) MUST verify the
-- Clerk session before invoking. The function still validates that the
-- user_profiles row exists, so a forged p_user_id can only target rows that
-- have already been bootstrapped by the Clerk webhook or ensureUserProfile
-- helper.
--
-- The original RPC is left in place for legacy Supabase users.

CREATE OR REPLACE FUNCTION public.create_household_by_user_id(
  p_user_id UUID,
  p_name TEXT DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_household_id uuid;
  existing_household_id uuid;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'p_user_id is required';
  END IF;

  -- Verify the profile row exists. Caller (API route) is responsible for
  -- bootstrapping it via ensureUserProfileForCurrentClerkUser BEFORE invoking.
  IF NOT EXISTS (SELECT 1 FROM user_profiles WHERE id = p_user_id) THEN
    RAISE EXCEPTION 'No profile found for user_id %', p_user_id
      USING ERRCODE = 'P0002', HINT = 'call ensure-profile before creating household';
  END IF;

  -- Already in a household? Bail.
  SELECT household_id INTO existing_household_id
  FROM user_profiles WHERE id = p_user_id;

  IF existing_household_id IS NOT NULL THEN
    RAISE EXCEPTION 'User already belongs to a household';
  END IF;

  -- Create the household + link.
  INSERT INTO households (name, created_by, user_count)
  VALUES (p_name, p_user_id, 1)
  RETURNING id INTO new_household_id;

  UPDATE user_profiles
  SET household_id = new_household_id
  WHERE id = p_user_id;

  RETURN new_household_id;
END;
$$;

COMMENT ON FUNCTION public.create_household_by_user_id(UUID, TEXT) IS
  'Clerk-aware variant of create_household_for_user. Caller (Next.js API route) verifies the Clerk session and passes the resolved user_profiles.id explicitly. Legacy create_household_for_user remains for Supabase-auth users.';

-- Authenticated calls from the anon key would still bypass auth.uid()-based RLS,
-- so grant execute only to the service_role used by the Clerk-aware API route.
REVOKE EXECUTE ON FUNCTION public.create_household_by_user_id(UUID, TEXT) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_household_by_user_id(UUID, TEXT) TO service_role;
