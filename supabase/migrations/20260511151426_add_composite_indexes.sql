-- Add composite indexes for hot read patterns flagged in the May 11 audit.
--
-- Reference: reports/home-match-revival/audit-2026-05-11/full-app-audit-and-remediation-plan-2026-05-11.md
-- Section 7 (M14).
--
-- Both indexes target the existing list-fetch paths where Postgres
-- otherwise has to do (filter on user_id) + (filter on type/active) +
-- (sort on created_at desc). A single composite that matches the
-- predicate AND the sort lets the planner read the index in order and
-- skip the sort step entirely.
--
-- All statements are idempotent (IF NOT EXISTS). Safe to replay.

BEGIN;

-- Hot path: getUserInteractionsByType / getUserInteractionsByTypes
-- WHERE user_id = $1 AND interaction_type = $2 ORDER BY created_at DESC.
-- Existing single-column indexes (user_id, type) require a separate sort.
CREATE INDEX IF NOT EXISTS idx_uppi_user_type_created
  ON public.user_property_interactions (user_id, interaction_type, created_at DESC);

-- Hot path: getUserSavedSearches
-- WHERE user_id = $1 AND is_active = true ORDER BY created_at DESC.
-- Partial index keyed on is_active so the planner only stores the rows
-- the query actually scans.
CREATE INDEX IF NOT EXISTS idx_saved_searches_user_active_created
  ON public.saved_searches (user_id, is_active, created_at DESC)
  WHERE is_active = true;

COMMIT;
