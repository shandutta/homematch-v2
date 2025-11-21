-- Add missing profile fields for application features and test data
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS display_name TEXT;

-- Backfill from auth.users so existing profiles have contact info
UPDATE user_profiles up
SET
  email = COALESCE(up.email, au.email),
  display_name = COALESCE(
    up.display_name,
    au.raw_user_meta_data->>'display_name',
    au.email
  )
FROM auth.users au
WHERE up.id = au.id;

-- Enforce email presence/uniqueness for consistency with auth.users
ALTER TABLE user_profiles
  ALTER COLUMN email SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS ux_user_profiles_email ON user_profiles (email);

-- Ensure new users get hydrated profiles with the added fields
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
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email),
    false,
    '{}'::jsonb
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger to ensure it uses the updated function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
