-- Phase 1 DB performance closure: enrich realtime mutual-like notifications with
-- one server-side query instead of client-side per-event profile/property lookups.

CREATE OR REPLACE FUNCTION public.get_realtime_mutual_like_payload(
  p_current_user_id uuid,
  p_partner_user_id uuid,
  p_property_id uuid
)
RETURNS TABLE (
  has_mutual_like boolean,
  partner_name text,
  property_address text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT
    EXISTS (
      SELECT 1
      FROM public.user_property_interactions AS current_user_interaction
      WHERE current_user_interaction.user_id = p_current_user_id
        AND current_user_interaction.property_id = p_property_id
        AND current_user_interaction.interaction_type = 'like'
    ) AS has_mutual_like,
    COALESCE(partner.display_name, partner.email, 'Household member') AS partner_name,
    COALESCE(property.address, 'Unknown property') AS property_address
  FROM public.user_profiles AS partner
  JOIN public.user_profiles AS current_profile
    ON current_profile.id = p_current_user_id
   AND current_profile.household_id = partner.household_id
  LEFT JOIN public.properties AS property
    ON property.id = p_property_id
  WHERE auth.uid() = p_current_user_id
    AND partner.id = p_partner_user_id
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_realtime_mutual_like_payload(uuid, uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_realtime_mutual_like_payload(uuid, uuid, uuid) TO service_role;

-- DOWN:
-- DROP FUNCTION IF EXISTS public.get_realtime_mutual_like_payload(uuid, uuid, uuid);
