-- Atomic household-invite acceptance.
--
-- Replaces the prior pattern in `src/app/invite/[token]/actions.ts` that
-- did two separate UPDATEs (user_profiles.household_id then
-- household_invitations.status='accepted'). If the second UPDATE failed,
-- the invite stayed `pending` while the user was already in the household,
-- so the same invite could be replayed.
--
-- This function runs both updates in one transaction. It also FOR-UPDATE
-- locks the invite row to serialize concurrent accept attempts on the
-- same token.
--
-- The caller still passes `p_profile_id`. Email-match enforcement (Q3 in
-- the 2026-05-13 audit) is a product decision and is NOT in scope here;
-- this RPC is API-compatible with the existing action whether or not
-- email match is enforced upstream.

BEGIN;

CREATE OR REPLACE FUNCTION public.accept_household_invite(
  p_token TEXT,
  p_profile_id UUID
)
RETURNS TABLE (
  success BOOLEAN,
  error TEXT,
  household_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_invite RECORD;
  v_profile_household_id UUID;
BEGIN
  -- Lock the invite row for the duration of this transaction so concurrent
  -- accept attempts on the same token serialize.
  SELECT id, household_id, status, expires_at
    INTO v_invite
    FROM public.household_invitations
    WHERE token = p_token
    FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'Invitation not found.'::TEXT, NULL::UUID;
    RETURN;
  END IF;

  IF v_invite.status <> 'pending' THEN
    RETURN QUERY SELECT FALSE, 'This invitation has already been used.'::TEXT, NULL::UUID;
    RETURN;
  END IF;

  IF v_invite.expires_at < NOW() THEN
    UPDATE public.household_invitations
      SET status = 'expired', updated_at = NOW()
      WHERE id = v_invite.id;
    RETURN QUERY SELECT FALSE, 'This invitation has expired.'::TEXT, NULL::UUID;
    RETURN;
  END IF;

  SELECT user_profiles.household_id
    INTO v_profile_household_id
    FROM public.user_profiles
    WHERE id = p_profile_id;

  IF v_profile_household_id IS NOT NULL
     AND v_profile_household_id <> v_invite.household_id THEN
    RETURN QUERY SELECT
      FALSE,
      'Leave your current household before accepting a new invitation.'::TEXT,
      NULL::UUID;
    RETURN;
  END IF;

  -- Same transaction: both updates commit together or neither does.
  UPDATE public.user_profiles
    SET household_id = v_invite.household_id,
        updated_at = NOW()
    WHERE id = p_profile_id;

  UPDATE public.household_invitations
    SET status = 'accepted',
        accepted_by = p_profile_id,
        accepted_at = NOW(),
        updated_at = NOW()
    WHERE id = v_invite.id;

  RETURN QUERY SELECT TRUE, NULL::TEXT, v_invite.household_id;
END;
$$;

-- The action passes the service-role client, but the RPC is SECURITY DEFINER
-- and serializes its own access checks, so an authenticated user could call
-- it directly too if a future refactor drops the service-role round-trip.
GRANT EXECUTE ON FUNCTION public.accept_household_invite(TEXT, UUID)
  TO authenticated, service_role;

COMMIT;

-- DOWN:
-- BEGIN;
-- DROP FUNCTION IF EXISTS public.accept_household_invite(TEXT, UUID);
-- COMMIT;
