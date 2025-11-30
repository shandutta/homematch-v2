-- Consolidated Migration: Property Vibes, Household Features, Storage RLS
-- Combines 8 pending migrations into one clean migration for production
-- Original migrations: 20251127150000 through 20251202100000

-- ============================================================================
-- 1. PROPERTY VIBES TABLE
-- ============================================================================
-- LLM-generated property descriptions and vibes extracted from images

CREATE TABLE IF NOT EXISTS property_vibes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,

  -- Generated Content
  tagline TEXT NOT NULL,
  vibe_statement TEXT NOT NULL,
  feature_highlights JSONB NOT NULL DEFAULT '[]',
  lifestyle_fits JSONB NOT NULL DEFAULT '[]',
  suggested_tags TEXT[] NOT NULL DEFAULT '{}',
  emotional_hooks TEXT[] DEFAULT '{}',

  -- Visual Analysis
  primary_vibes JSONB NOT NULL DEFAULT '[]',
  aesthetics JSONB,

  -- Raw I/O for future training data
  input_data JSONB,
  raw_output TEXT,

  -- Metadata
  model_used TEXT NOT NULL,
  images_analyzed TEXT[] DEFAULT '{}',
  source_data_hash TEXT NOT NULL,
  generation_cost_usd DECIMAL(8,6),
  confidence DECIMAL(3,2),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT unique_property_vibes UNIQUE (property_id)
);

CREATE INDEX IF NOT EXISTS idx_property_vibes_property_id ON property_vibes(property_id);
CREATE INDEX IF NOT EXISTS idx_property_vibes_source_hash ON property_vibes(source_data_hash);
CREATE INDEX IF NOT EXISTS idx_property_vibes_model ON property_vibes(model_used);

ALTER TABLE property_vibes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "property_vibes_select_authenticated"
  ON property_vibes FOR SELECT TO authenticated USING (true);

CREATE POLICY "property_vibes_insert_service"
  ON property_vibes FOR INSERT TO service_role WITH CHECK (true);

CREATE POLICY "property_vibes_update_service"
  ON property_vibes FOR UPDATE TO service_role USING (true);

CREATE POLICY "property_vibes_delete_service"
  ON property_vibes FOR DELETE TO service_role USING (true);

COMMENT ON TABLE property_vibes IS 'LLM-generated property descriptions and vibes extracted from Zillow images.';

-- ============================================================================
-- 2. HOUSEHOLD TABLE ENHANCEMENTS
-- ============================================================================

ALTER TABLE households
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);

ALTER TABLE households
  ADD COLUMN IF NOT EXISTS user_count INTEGER DEFAULT 1;

ALTER TABLE households
  ALTER COLUMN name DROP NOT NULL;

CREATE POLICY "Users can create households" ON households
  FOR INSERT WITH CHECK (auth.uid() = created_by);

-- ============================================================================
-- 3. HOUSEHOLD INVITATIONS TABLE
-- ============================================================================

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

CREATE INDEX IF NOT EXISTS idx_household_invitations_token ON household_invitations(token);
CREATE INDEX IF NOT EXISTS idx_household_invitations_household ON household_invitations(household_id);

ALTER TABLE household_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their household invitations" ON household_invitations
  FOR SELECT USING (
    household_id IN (
      SELECT household_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can create invitations for their household" ON household_invitations
  FOR INSERT WITH CHECK (
    auth.uid() = created_by AND
    household_id IN (
      SELECT household_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own invitations" ON household_invitations
  FOR UPDATE USING (auth.uid() = created_by);

-- ============================================================================
-- 4. CREATE HOUSEHOLD FUNCTION (final hardened version with name parameter)
-- ============================================================================

-- Drop any existing overloads to avoid ambiguity
DROP FUNCTION IF EXISTS public.create_household_for_user();
DROP FUNCTION IF EXISTS public.create_household_for_user(TEXT);

CREATE FUNCTION public.create_household_for_user(p_name TEXT DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_household_id uuid;
  current_user_id uuid;
  auth_email text;
  display_name text;
  existing_household_id uuid;
BEGIN
  current_user_id := auth.uid();

  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Ensure the auth user still exists to prevent FK violations from stale sessions
  SELECT
    email,
    COALESCE(
      raw_user_meta_data->>'display_name',
      SPLIT_PART(email, '@', 1)
    )
  INTO auth_email, display_name
  FROM auth.users
  WHERE id = current_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Your session is no longer valid. Please sign in again.'
      USING ERRCODE = 'P0002', HINT = 'auth user missing';
  END IF;

  -- Guarantee a profile row exists so we can safely update household_id
  INSERT INTO user_profiles (
    id,
    email,
    display_name,
    onboarding_completed,
    preferences
  )
  VALUES (
    current_user_id,
    auth_email,
    display_name,
    false,
    '{}'::jsonb
  )
  ON CONFLICT (id) DO NOTHING;

  -- Check if the user already belongs to a household
  SELECT household_id
  INTO existing_household_id
  FROM user_profiles
  WHERE id = current_user_id;

  IF existing_household_id IS NOT NULL THEN
    RAISE EXCEPTION 'User already belongs to a household';
  END IF;

  -- Create the household with optional name
  INSERT INTO households (name, created_by, user_count)
  VALUES (p_name, current_user_id, 1)
  RETURNING id INTO new_household_id;

  -- Link the user profile to the new household
  UPDATE user_profiles
  SET household_id = new_household_id
  WHERE id = current_user_id;

  RETURN new_household_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_household_for_user(TEXT) TO authenticated;

COMMENT ON FUNCTION public.create_household_for_user(TEXT) IS
  'Creates a household for the current user with optional name, validating auth user presence and provisioning user_profiles before linking.';

-- ============================================================================
-- 5. STORAGE RLS POLICIES FOR AVATARS BUCKET
-- ============================================================================

CREATE POLICY "Avatars are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload own avatar"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can update own avatar"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can delete own avatar"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
