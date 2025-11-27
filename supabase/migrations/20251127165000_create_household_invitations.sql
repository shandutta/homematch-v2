-- Create household_invitations table for managing partner invites
CREATE TABLE IF NOT EXISTS household_invitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  token TEXT NOT NULL UNIQUE,
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invited_email TEXT,
  invited_name TEXT,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  accepted_by UUID REFERENCES auth.users(id),
  accepted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on token for fast lookups
CREATE INDEX IF NOT EXISTS idx_household_invitations_token ON household_invitations(token);

-- Create index on household_id for fetching invitations
CREATE INDEX IF NOT EXISTS idx_household_invitations_household ON household_invitations(household_id);

-- Enable RLS
ALTER TABLE household_invitations ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can view invitations for their household
CREATE POLICY "Users can view their household invitations" ON household_invitations
  FOR SELECT USING (
    household_id IN (
      SELECT household_id FROM user_profiles WHERE id = auth.uid()
    )
  );

-- Users can create invitations for their household
CREATE POLICY "Users can create invitations for their household" ON household_invitations
  FOR INSERT WITH CHECK (
    auth.uid() = created_by AND
    household_id IN (
      SELECT household_id FROM user_profiles WHERE id = auth.uid()
    )
  );

-- Users can update invitations they created (e.g., cancel)
CREATE POLICY "Users can update their own invitations" ON household_invitations
  FOR UPDATE USING (auth.uid() = created_by);
