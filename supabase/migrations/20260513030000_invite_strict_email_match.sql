-- Q3: enforce invited_email match on invite acceptance.
--
-- Augments accept_household_invite from 20260513020100 with a third
-- argument p_user_email. When the invite has an invited_email set, it
-- must match the authenticated user's email (case-insensitive, trimmed)
-- before the household membership is granted. If invited_email is NULL —
-- legacy invites created without an intended recipient — the match is
-- skipped (back-compat).
--
-- This is the security-boundary change requested in the 2026-05-13 audit
-- (Q3, Option A): treat household-membership invites as addressed, not
-- bearer. A leaked token URL alone is no longer enough.

BEGIN;

DROP FUNCTION IF EXISTS public.accept_household_invite(TEXT, UUID);

CREATE OR REPLACE FUNCTION public.accept_household_invite(
  p_token TEXT,
  p_profile_id UUID,
  p_user_email TEXT
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
  v_normalized_user_email TEXT;
  v_normalized_invited_email TEXT;
BEGIN
  SELECT id, household_id, status, expires_at, invited_email
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

  -- Strict email match (Q3 Option A): if the invite was addressed to a
  -- specific email, only that email can claim it. Legacy invites with
  -- NULL invited_email are exempt for back-compat.
  IF v_invite.invited_email IS NOT NULL THEN
    v_normalized_invited_email := lower(btrim(v_invite.invited_email));
    v_normalized_user_email := lower(btrim(COALESCE(p_user_email, '')));
    IF v_normalized_user_email = ''
       OR v_normalized_user_email <> v_normalized_invited_email THEN
      RETURN QUERY SELECT
        FALSE,
        'This invitation was sent to a different email. Ask the sender to issue a new invite to your address.'::TEXT,
        NULL::UUID;
      RETURN;
    END IF;
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

GRANT EXECUTE ON FUNCTION public.accept_household_invite(TEXT, UUID, TEXT)
  TO authenticated, service_role;

COMMIT;

-- DOWN:
-- BEGIN;
-- DROP FUNCTION IF EXISTS public.accept_household_invite(TEXT, UUID, TEXT);
-- -- Re-create the prior 2-arg version from 20260513020100 if needed.
-- COMMIT;
