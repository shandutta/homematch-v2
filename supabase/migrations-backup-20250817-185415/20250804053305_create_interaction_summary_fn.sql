-- Migration: 20250804053305_create_interaction_summary_fn.sql
-- Purpose: Record hardened version of get_user_interaction_summary to align local history with remote.
-- Note: Mirrors the SQL that is live on remote (hardened search_path, LANGUAGE sql, STABLE).

CREATE OR REPLACE FUNCTION public.get_user_interaction_summary(p_user_id uuid)
RETURNS TABLE(interaction_type text, count bigint)
LANGUAGE sql
STABLE
SET search_path = pg_catalog, public
AS $$
  SELECT interaction_type, COUNT(*)::bigint AS count
  FROM public.user_property_interactions
  WHERE user_id = p_user_id
  GROUP BY interaction_type
  ORDER BY interaction_type
$$;

GRANT EXECUTE ON FUNCTION public.get_user_interaction_summary(uuid) TO authenticated;

COMMENT ON FUNCTION public.get_user_interaction_summary(uuid)
IS 'Aggregates interaction counts by type for the specified user_id. Hardened with fixed search_path (pg_catalog, public) and LANGUAGE sql, STABLE.';
