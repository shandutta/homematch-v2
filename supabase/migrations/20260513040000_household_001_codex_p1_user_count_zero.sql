-- HOUSEHOLD-001 follow-up — Codex P1 from PR #37 review.
--
-- The original create_household_by_user_id inserted households with
-- user_count = 1. That looks right at first glance, but the trigger
-- `user_profiles_sync_household_user_count` increments the count whenever a
-- user_profiles row's household_id changes. The RPC's subsequent UPDATE on
-- user_profiles fires that trigger, so every freshly-created household
-- ended up at user_count = 2 with only one actual member.
--
-- Fix: insert user_count = 0 and let the trigger bring it to 1 on the
-- profile-link UPDATE.
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

  IF NOT EXISTS (SELECT 1 FROM user_profiles WHERE id = p_user_id) THEN
    RAISE EXCEPTION 'No profile found for user_id %', p_user_id
      USING ERRCODE = 'P0002', HINT = 'call ensure-profile before creating household';
  END IF;

  SELECT household_id INTO existing_household_id
  FROM user_profiles WHERE id = p_user_id;

  IF existing_household_id IS NOT NULL THEN
    RAISE EXCEPTION 'User already belongs to a household';
  END IF;

  -- user_count = 0: the user_profiles UPDATE below fires the
  -- user_profiles_sync_household_user_count trigger which will bump this
  -- to 1. Initializing at 1 here previously produced 2-member counts for
  -- new single-member households.
  INSERT INTO households (name, created_by, user_count)
  VALUES (p_name, p_user_id, 0)
  RETURNING id INTO new_household_id;

  UPDATE user_profiles
  SET household_id = new_household_id
  WHERE id = p_user_id;

  RETURN new_household_id;
END;
$$;

COMMENT ON FUNCTION public.create_household_by_user_id(UUID, TEXT) IS
  'Clerk-aware variant of create_household_for_user. Caller (Next.js API route) verifies the Clerk session and passes the resolved user_profiles.id explicitly. Inserts user_count = 0 so the user_profiles sync trigger increments it to 1 on the profile link.';

REVOKE EXECUTE ON FUNCTION public.create_household_by_user_id(UUID, TEXT) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_household_by_user_id(UUID, TEXT) TO service_role;
