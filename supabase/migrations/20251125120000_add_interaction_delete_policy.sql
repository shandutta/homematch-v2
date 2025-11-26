-- Add missing DELETE policy for user_property_interactions
-- This was missing from the original RLS policies, causing silent delete failures

CREATE POLICY "Users can delete their own interactions" ON user_property_interactions
  FOR DELETE USING (auth.uid() = user_id);
