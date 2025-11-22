-- Allow GoTrue (supabase_auth_admin) to manage user_profiles during auth user creation
BEGIN;

GRANT ALL PRIVILEGES ON TABLE public.user_profiles TO supabase_auth_admin;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'user_profiles'
      AND policyname = 'user_profiles_auth_admin_full_access'
  ) THEN
    CREATE POLICY user_profiles_auth_admin_full_access
      ON public.user_profiles
      FOR ALL
      TO supabase_auth_admin
      USING (true)
      WITH CHECK (true);
  END IF;
END
$$;

COMMIT;
