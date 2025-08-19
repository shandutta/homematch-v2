-- supabase/migrations/20250801213500_create_interaction_summary_fn.sql

-- This function aggregates interaction counts for a given user.
-- It is called by the GET /api/interactions?type=summary endpoint.
-- This is more efficient than fetching all rows and aggregating in the application.

CREATE OR REPLACE FUNCTION get_user_interaction_summary(p_user_id UUID)
RETURNS TABLE(interaction_type TEXT, count BIGINT) AS $$
BEGIN
    RETURN QUERY
    SELECT
        i.interaction_type,
        COUNT(i.id)
    FROM
        public.user_property_interactions AS i
    WHERE
        i.user_id = p_user_id
    GROUP BY
        i.interaction_type;
END;
$$ LANGUAGE plpgsql;

-- Grant execution rights to the authenticated role
GRANT EXECUTE ON FUNCTION public.get_user_interaction_summary(UUID) TO authenticated;
