-- Add missing columns to user_profiles table
-- These columns are required by the application code but were not in the original schema

ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS display_name TEXT,
ADD COLUMN IF NOT EXISTS email TEXT;

-- Populate email from auth.users for existing profiles
UPDATE user_profiles up
SET email = au.email
FROM auth.users au
WHERE up.id = au.id AND up.email IS NULL;

-- Populate display_name with email prefix (part before @) for existing profiles
-- This matches the default behavior in ProfileForm.tsx
UPDATE user_profiles up
SET display_name = SPLIT_PART(au.email, '@', 1)
FROM auth.users au
WHERE up.id = au.id AND up.display_name IS NULL AND au.email IS NOT NULL;

-- Update user profile trigger to auto-populate email and display_name for new signups
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (
    id, 
    email,
    display_name,
    onboarding_completed, 
    preferences
  )
  VALUES (
    NEW.id,
    NEW.email,
    -- Use display_name from user_metadata if available, otherwise use email prefix
    COALESCE(
      NEW.raw_user_meta_data->>'display_name',
      SPLIT_PART(NEW.email, '@', 1)
    ),
    false,
    '{}'::jsonb
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
