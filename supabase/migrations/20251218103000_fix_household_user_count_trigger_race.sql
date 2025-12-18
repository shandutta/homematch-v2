-- Fix race condition in households.user_count sync trigger.
-- The previous implementation recalculated COUNT(*) inside a trigger, which can be
-- snapshot-stale under concurrent transactions (e.g. two users joining the same
-- household at the same time), leaving user_count incorrect.
--
-- This migration switches to atomic +/- updates which are concurrency-safe due to
-- row-level locking on the households row.

-- Backfill existing households (correct any drift).
UPDATE households
SET user_count = COALESCE(
  (
    SELECT COUNT(*)
    FROM user_profiles up
    WHERE up.household_id = households.id
  ),
  0
);

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

  IF TG_OP = 'UPDATE' THEN
    IF NEW.household_id IS DISTINCT FROM OLD.household_id THEN
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

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS user_profiles_sync_household_user_count ON public.user_profiles;

CREATE TRIGGER user_profiles_sync_household_user_count
AFTER INSERT OR DELETE OR UPDATE OF household_id ON public.user_profiles
FOR EACH ROW
EXECUTE FUNCTION public.sync_household_user_count();

