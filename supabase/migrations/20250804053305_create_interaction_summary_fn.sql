-- Migration: 20250801213500_create_interaction_summary_fn.sql
-- This function aggregates interaction counts for a given user and is used by GET /api/interactions?type=summary

-- Ensure schema exists
CREATE SCHEMA IF NOT EXISTS public;

-- Create or replace function
CREATE OR REPLACE FUNCTION public.get_user_interaction_summary(p_user_id UUID)
RETURNS TABLE(interaction_type TEXT, count BIGINT)
LANGUAGE sql
STABLE
AS $$
  SELECT interaction_type, COUNT(*)::bigint AS count
  FROM public.user_property_interactions
  WHERE user_id = p_user_id
  GROUP BY interaction_type
  ORDER BY interaction_type
$$;

-- Grant execution rights to authenticated role
GRANT EXECUTE ON FUNCTION public.get_user_interaction_summary(UUID) TO authenticated;

-- Optional comments for documentation
COMMENT ON FUNCTION public.get_user_interaction_summary(UUID) IS 'Aggregates interaction counts by type for the specified user_id.';
