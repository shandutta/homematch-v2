-- HOUSEHOLD-001 (companion to the create-by-user-id RPC): drop the FKs from
-- household_invitations.created_by and .accepted_by to auth.users(id). Clerk
-- users have no auth.users row, so every Clerk-originated invite create or
-- accept would 23503-fail without this. Same pattern as the earlier drop of
-- user_profiles_id_fkey applied for PR #35.
ALTER TABLE public.household_invitations
  DROP CONSTRAINT IF EXISTS household_invitations_created_by_fkey;
ALTER TABLE public.household_invitations
  DROP CONSTRAINT IF EXISTS household_invitations_accepted_by_fkey;
