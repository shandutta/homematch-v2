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
    
    INSERT INTO public.user_profiles (id, email, onboarding_completed, preferences, created_at, updated_at)
    VALUES (p_auth_user_id, v_email, false, '{}', now(), now())
    ON CONFLICT (id) DO UPDATE SET
      email = EXCLUDED.email,
      updated_at = now();
  END IF;
  
  RETURN v_user_id;
END;
$$;