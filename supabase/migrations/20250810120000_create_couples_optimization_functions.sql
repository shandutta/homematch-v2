-- Create optimized database functions for couples features

-- Function to get mutual likes for a household efficiently
CREATE OR REPLACE FUNCTION get_household_mutual_likes(p_household_id UUID)
RETURNS TABLE (
  property_id UUID,
  liked_by_count BIGINT,
  first_liked_at TIMESTAMPTZ,
  last_liked_at TIMESTAMPTZ,
  user_ids UUID[]
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    upi.property_id,
    COUNT(DISTINCT upi.user_id) as liked_by_count,
    MIN(upi.created_at) as first_liked_at,
    MAX(upi.created_at) as last_liked_at,
    ARRAY_AGG(DISTINCT upi.user_id) as user_ids
  FROM public.user_property_interactions upi
  WHERE 
    upi.household_id = p_household_id
    AND upi.interaction_type = 'like'
  GROUP BY upi.property_id
  HAVING COUNT(DISTINCT upi.user_id) >= 2
  ORDER BY MAX(upi.created_at) DESC;
$$;

-- Function to get household activity with enhanced performance
CREATE OR REPLACE FUNCTION get_household_activity_enhanced(
  p_household_id UUID,
  p_limit INT DEFAULT 20,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  property_id UUID,
  interaction_type TEXT,
  created_at TIMESTAMPTZ,
  user_display_name TEXT,
  user_email TEXT,
  property_address TEXT,
  property_price NUMERIC,
  property_bedrooms INT,
  property_bathrooms NUMERIC,
  property_images TEXT[]
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    upi.id,
    upi.user_id,
    upi.property_id,
    upi.interaction_type,
    upi.created_at,
    COALESCE(au.raw_user_meta_data->>'display_name', au.email) as user_display_name,
    au.email as user_email,
    p.address as property_address,
    p.price as property_price,
    p.bedrooms as property_bedrooms,
    p.bathrooms as property_bathrooms,
    p.images as property_images
  FROM public.user_property_interactions upi
  INNER JOIN public.user_profiles up ON upi.user_id = up.id
  INNER JOIN auth.users au ON upi.user_id = au.id
  INNER JOIN public.properties p ON upi.property_id = p.id
  WHERE upi.household_id = p_household_id
  ORDER BY upi.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
$$;

-- Function to check if a potential like would create a mutual like
CREATE OR REPLACE FUNCTION check_potential_mutual_like(
  p_user_id UUID,
  p_property_id UUID,
  p_household_id UUID
)
RETURNS TABLE (
  would_be_mutual BOOLEAN,
  partner_user_id UUID
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    CASE WHEN COUNT(*) > 0 THEN TRUE ELSE FALSE END as would_be_mutual,
    (ARRAY_AGG(upi.user_id))[1] as partner_user_id
  FROM public.user_property_interactions upi
  WHERE 
    upi.household_id = p_household_id
    AND upi.property_id = p_property_id
    AND upi.interaction_type = 'like'
    AND upi.user_id != p_user_id;
$$;

-- Add composite indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_property_interactions_household_type_created 
ON user_property_interactions(household_id, interaction_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_property_interactions_household_property_type 
ON user_property_interactions(household_id, property_id, interaction_type);

CREATE INDEX IF NOT EXISTS idx_user_property_interactions_household_user_type 
ON user_property_interactions(household_id, user_id, interaction_type);

-- Add RLS policies for the new functions
CREATE POLICY "Household members can access mutual likes function" ON user_property_interactions
FOR SELECT
USING (
  household_id IN (
    SELECT household_id 
    FROM user_profiles 
    WHERE id = auth.uid()
  )
);

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION get_household_mutual_likes(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_household_activity_enhanced(UUID, INT, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION check_potential_mutual_like(UUID, UUID, UUID) TO authenticated;