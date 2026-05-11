-- Phase 1 remediation: enforce one current interaction per user/property.
--
-- Earlier schema allowed separate rows for the same user/property when the
-- interaction_type differed. Product code treats the interaction as mutable
-- state, so the database should enforce one current row per user/property.

BEGIN;

-- Keep the newest row for any existing duplicate user/property interaction
-- group before tightening the uniqueness constraint.
WITH ranked_interactions AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY user_id, property_id
      ORDER BY created_at DESC NULLS LAST, id DESC
    ) AS row_number
  FROM public.user_property_interactions
)
DELETE FROM public.user_property_interactions AS interactions
USING ranked_interactions AS ranked
WHERE interactions.id = ranked.id
  AND ranked.row_number > 1;

ALTER TABLE public.user_property_interactions
  DROP CONSTRAINT IF EXISTS user_property_interactions_user_id_property_id_interaction_type_key;

-- ADD CONSTRAINT doesn't support IF NOT EXISTS for unique constraints, so we
-- guard against the re-run case (e.g. prod's migration history was repaired
-- after an out-of-band apply). Idempotent: skip cleanly if the constraint
-- already exists.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'user_property_interactions_user_id_property_id_key'
      AND conrelid = 'public.user_property_interactions'::regclass
  ) THEN
    ALTER TABLE public.user_property_interactions
      ADD CONSTRAINT user_property_interactions_user_id_property_id_key
      UNIQUE (user_id, property_id);
  END IF;
END $$;

COMMIT;

-- DOWN:
-- ALTER TABLE public.user_property_interactions
--   DROP CONSTRAINT IF EXISTS user_property_interactions_user_id_property_id_key;
-- ALTER TABLE public.user_property_interactions
--   ADD CONSTRAINT user_property_interactions_user_id_property_id_interaction_type_key
--   UNIQUE (user_id, property_id, interaction_type);
-- NOTE: rows deleted during duplicate compaction require point-in-time recovery; the old uniqueness shape can be restored but deleted duplicate rows cannot be reconstructed from this migration alone.
