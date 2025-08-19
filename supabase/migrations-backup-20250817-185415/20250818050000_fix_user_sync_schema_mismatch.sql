-- Fix schema mismatch in user sync functions
-- The atomic function and trigger were trying to insert 'email' column into user_profiles
-- but the user_profiles table doesn't have an email column

-- Fix the atomic function to match actual user_profiles schema
CREATE OR REPLACE FUNCTION public.ensure_user_exists_atomic(p_auth_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_user_id uuid;
  v_email text;
  v_lock_id bigint;
BEGIN
  IF p_auth_user_id IS NULL THEN
    RAISE EXCEPTION 'User ID cannot be null';
  END IF;
  
  v_lock_id := ('x' || substr(md5(p_auth_user_id::text), 1, 8))::bit(32)::bigint;
  
  IF NOT pg_try_advisory_xact_lock(v_lock_id) THEN
    RAISE EXCEPTION 'Could not acquire advisory lock for user sync';
  END IF;
  
  SELECT id INTO v_user_id FROM public.users WHERE id = p_auth_user_id;
  
  IF v_user_id IS NULL THEN
    SELECT email INTO v_email FROM auth.users WHERE id = p_auth_user_id;
    
    IF v_email IS NULL THEN
      RAISE EXCEPTION 'Auth user does not exist';
    END IF;
    
    INSERT INTO public.users (id, email, created_at, updated_at)
    VALUES (p_auth_user_id, v_email, now(), now())
    ON CONFLICT (id) DO UPDATE SET 
      email = EXCLUDED.email,
      updated_at = now()
    RETURNING id INTO v_user_id;
    
    -- Fixed: user_profiles table does NOT have email column
    INSERT INTO public.user_profiles (id, onboarding_completed, preferences, created_at, updated_at)
    VALUES (p_auth_user_id, false, '{}', now(), now())
    ON CONFLICT (id) DO UPDATE SET
      updated_at = now();
  END IF;
  
  RETURN v_user_id;
END;
$$;

-- Fix the trigger function to match the actual user_profiles schema  
CREATE OR REPLACE FUNCTION public.handle_auth_user_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  -- STEP 1: Insert into users table FIRST (required by foreign key constraints)  
  INSERT INTO public.users (id, email, created_at, updated_at)
  VALUES (NEW.id, NEW.email, NEW.created_at, NOW())
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    updated_at = NOW();

  -- STEP 2: Insert user profile AFTER users record exists (satisfies foreign key)
  -- Fixed: user_profiles table does NOT have email column
  INSERT INTO public.user_profiles (id, onboarding_completed, preferences)
  VALUES (NEW.id, false, '{}'::jsonb)
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
EXCEPTION
  WHEN others THEN
    -- Log error but don't block user creation in auth.users  
    RAISE WARNING 'Error in handle_auth_user_created trigger: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- Sync any existing auth.users that don't have corresponding users/user_profiles records
-- This handles cases where users were created before the trigger was working properly
DO $$
DECLARE
  auth_user_record RECORD;
BEGIN
  FOR auth_user_record IN 
    SELECT au.id, au.email 
    FROM auth.users au
    LEFT JOIN public.users u ON au.id = u.id
    WHERE u.id IS NULL
  LOOP
    RAISE NOTICE 'Syncing existing auth user: % (%)', auth_user_record.email, auth_user_record.id;
    PERFORM public.ensure_user_exists_atomic(auth_user_record.id);
  END LOOP;
END
$$;