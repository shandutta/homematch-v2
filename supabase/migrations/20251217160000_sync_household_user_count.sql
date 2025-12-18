-- Keep households.user_count in sync with user_profiles.household_id
-- This prevents drift and ensures Couples feature gating is accurate.

-- Backfill existing households
UPDATE households
SET user_count = COALESCE(
  (
    SELECT COUNT(*)
    FROM user_profiles up
    WHERE up.household_id = households.id
  ),
  0
);

-- Create trigger function to maintain user_count on membership changes
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
      SET user_count = (
        SELECT COUNT(*)
        FROM user_profiles
        WHERE household_id = NEW.household_id
      ),
      updated_at = NOW()
      WHERE id = NEW.household_id;
    END IF;

    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF NEW.household_id IS DISTINCT FROM OLD.household_id THEN
      IF OLD.household_id IS NOT NULL THEN
        UPDATE households
        SET user_count = (
          SELECT COUNT(*)
          FROM user_profiles
          WHERE household_id = OLD.household_id
        ),
        updated_at = NOW()
        WHERE id = OLD.household_id;
      END IF;

      IF NEW.household_id IS NOT NULL THEN
        UPDATE households
        SET user_count = (
          SELECT COUNT(*)
          FROM user_profiles
          WHERE household_id = NEW.household_id
        ),
        updated_at = NOW()
        WHERE id = NEW.household_id;
      END IF;
    END IF;

    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS user_profiles_sync_household_user_count ON public.user_profiles;

CREATE TRIGGER user_profiles_sync_household_user_count
AFTER INSERT OR UPDATE OF household_id ON public.user_profiles
FOR EACH ROW
EXECUTE FUNCTION public.sync_household_user_count();

