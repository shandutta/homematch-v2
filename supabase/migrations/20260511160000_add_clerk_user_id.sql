-- Phase C.2 of Clerk migration: add clerk_user_id mapping column.
--
-- Migration strategy (Option B): keep user_profiles.id as UUID, add a
-- clerk_user_id TEXT column that maps to Clerk's userId (e.g. "user_2xY...").
-- All server-side code resolves clerk userId -> user_profiles row at request
-- time. This avoids invasive FK cascades on user_profiles.id (which is
-- referenced by many tables: households, properties, swipes, etc).
--
-- Companion to Phase E (user data migration): the Clerk webhook at
-- /api/webhooks/clerk creates a user_profiles row with the clerk_user_id set
-- when a user signs up via Clerk's UI. Existing Supabase users will get their
-- clerk_user_id backfilled during Phase E.

ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS clerk_user_id TEXT UNIQUE;

CREATE INDEX IF NOT EXISTS idx_user_profiles_clerk_user_id
  ON user_profiles(clerk_user_id);

COMMENT ON COLUMN user_profiles.clerk_user_id IS
  'Clerk userId mapping (e.g. user_2xY...). Set on first sign-in via Clerk webhook. NULL for users who have not yet been migrated from Supabase Auth (Phase E).';
