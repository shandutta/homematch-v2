-- Allow consumer-friendly 'revoked' status for household invitations.
-- Migrate legacy 'cancelled' rows to 'revoked' and tighten the check constraint.

UPDATE household_invitations
SET status = 'revoked'
WHERE status = 'cancelled';

ALTER TABLE household_invitations
  DROP CONSTRAINT IF EXISTS household_invitations_status_check;

ALTER TABLE household_invitations
  ADD CONSTRAINT household_invitations_status_check
  CHECK (status IN ('pending', 'accepted', 'expired', 'revoked'));

