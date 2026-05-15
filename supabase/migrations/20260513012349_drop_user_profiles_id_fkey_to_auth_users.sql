-- Phase D/E Clerk migration follow-up.
-- Drops the legacy FK that required every user_profiles.id to exist in
-- auth.users(id). That worked when Supabase Auth was the single auth source,
-- but with Clerk now creating profile rows directly (via webhook +
-- ensureUserProfileForCurrentClerkUser bootstrap), the FK rejects every new
-- Clerk user with a foreign_key_violation (23503).
--
-- Effect: legacy Supabase users keep their rows untouched. New Clerk users
-- can now be inserted. Deletes-cascade behavior is replaced by the Clerk
-- webhook's user.deleted handler (which nulls out clerk_user_id rather than
-- dropping the row, since households still reference it).
ALTER TABLE public.user_profiles
  DROP CONSTRAINT IF EXISTS user_profiles_id_fkey;
