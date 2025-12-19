-- Persist couples "disputed property" resolutions so they don't reappear after refresh.

CREATE TABLE IF NOT EXISTS household_property_resolutions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  resolution_type TEXT NOT NULL CHECK (
    resolution_type IN (
      'scheduled_viewing',
      'saved_for_later',
      'final_pass',
      'discussion_needed'
    )
  ),
  resolved_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  resolved_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE (household_id, property_id)
);

CREATE INDEX IF NOT EXISTS idx_household_property_resolutions_household
  ON household_property_resolutions(household_id);

CREATE INDEX IF NOT EXISTS idx_household_property_resolutions_property
  ON household_property_resolutions(property_id);

ALTER TABLE household_property_resolutions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Household members can view property resolutions" ON household_property_resolutions;
DROP POLICY IF EXISTS "Household members can create property resolutions" ON household_property_resolutions;
DROP POLICY IF EXISTS "Household members can update property resolutions" ON household_property_resolutions;
DROP POLICY IF EXISTS "Household members can delete property resolutions" ON household_property_resolutions;

CREATE POLICY "Household members can view property resolutions"
  ON household_property_resolutions
  FOR SELECT
  USING (
    household_id IN (
      SELECT household_id
      FROM user_profiles
      WHERE id = auth.uid()
    )
  );

CREATE POLICY "Household members can create property resolutions"
  ON household_property_resolutions
  FOR INSERT
  WITH CHECK (
    resolved_by = auth.uid()
    AND household_id IN (
      SELECT household_id
      FROM user_profiles
      WHERE id = auth.uid()
    )
  );

CREATE POLICY "Household members can update property resolutions"
  ON household_property_resolutions
  FOR UPDATE
  USING (
    household_id IN (
      SELECT household_id
      FROM user_profiles
      WHERE id = auth.uid()
    )
  );

CREATE POLICY "Household members can delete property resolutions"
  ON household_property_resolutions
  FOR DELETE
  USING (
    household_id IN (
      SELECT household_id
      FROM user_profiles
      WHERE id = auth.uid()
    )
  );
