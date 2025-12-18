-- Fix deadlock in households.user_count sync trigger under concurrent joins.
--
-- When user_profiles.household_id changes, Postgres performs a FK check that
-- takes a KEY SHARE lock on the referenced households row. The previous trigger
-- then attempted to UPDATE that same households row (or lock it FOR UPDATE),
-- which requires upgrading the lock and can deadlock when two users join the
-- same household concurrently.
--
-- Fix: update households.user_count incrementally in a BEFORE trigger so we
-- acquire the stronger row lock on households first (the FK check happens later),
-- and use deterministic lock ordering when a user moves between two households.

-- Backfill existing households (correct any drift) and align defaults with the
-- incremental trigger approach.
UPDATE households
SET user_count = COALESCE(
  (
    SELECT COUNT(*)
    FROM user_profiles up
    WHERE up.household_id = households.id
  ),
  0
);

ALTER TABLE households
  ALTER COLUMN user_count SET DEFAULT 0;

CREATE OR REPLACE FUNCTION public.sync_household_user_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.household_id IS NOT NULL THEN
      UPDATE households
      SET user_count = COALESCE(user_count, 0) + 1,
      updated_at = NOW()
      WHERE id = NEW.household_id;
    END IF;

    RETURN NEW;
  END IF;

  IF TG_OP = 'DELETE' THEN
    IF OLD.household_id IS NOT NULL THEN
      UPDATE households
      SET user_count = GREATEST(COALESCE(user_count, 0) - 1, 0),
      updated_at = NOW()
      WHERE id = OLD.household_id;
    END IF;

    RETURN OLD;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF NEW.household_id IS DISTINCT FROM OLD.household_id THEN
      -- If the user is moving between two households, update them in a
      -- deterministic (UUID) order to avoid deadlocks during swaps.
      IF OLD.household_id IS NOT NULL AND NEW.household_id IS NOT NULL THEN
        IF OLD.household_id < NEW.household_id THEN
          UPDATE households
          SET user_count = GREATEST(COALESCE(user_count, 0) - 1, 0),
          updated_at = NOW()
          WHERE id = OLD.household_id;

          UPDATE households
          SET user_count = COALESCE(user_count, 0) + 1,
          updated_at = NOW()
          WHERE id = NEW.household_id;
        ELSE
          UPDATE households
          SET user_count = COALESCE(user_count, 0) + 1,
          updated_at = NOW()
          WHERE id = NEW.household_id;

          UPDATE households
          SET user_count = GREATEST(COALESCE(user_count, 0) - 1, 0),
          updated_at = NOW()
          WHERE id = OLD.household_id;
        END IF;
      ELSE
        IF OLD.household_id IS NOT NULL THEN
          UPDATE households
          SET user_count = GREATEST(COALESCE(user_count, 0) - 1, 0),
          updated_at = NOW()
          WHERE id = OLD.household_id;
        END IF;

        IF NEW.household_id IS NOT NULL THEN
          UPDATE households
          SET user_count = COALESCE(user_count, 0) + 1,
          updated_at = NOW()
          WHERE id = NEW.household_id;
        END IF;
      END IF;
    END IF;

    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS user_profiles_sync_household_user_count ON public.user_profiles;

CREATE TRIGGER user_profiles_sync_household_user_count
BEFORE INSERT OR DELETE OR UPDATE OF household_id ON public.user_profiles
FOR EACH ROW
EXECUTE FUNCTION public.sync_household_user_count();

-- Ensure create_household_for_user starts user_count at 0 (the trigger will
-- increment to 1 when the creator is linked via user_profiles.household_id).
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
  VALUES (p_name, current_user_id, 0)
  RETURNING id INTO new_household_id;

  -- Link the user profile to the new household
  UPDATE user_profiles
  SET household_id = new_household_id
  WHERE id = current_user_id;

  RETURN new_household_id;
END;
$$;
