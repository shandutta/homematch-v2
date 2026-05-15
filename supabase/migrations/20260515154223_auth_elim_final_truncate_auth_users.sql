-- Final step of the Supabase-auth elimination (2026-05-15): truncate
-- the dormant auth.users table on production.
--
-- After Phases 1–6 + the D1 follow-ups (#47, #48, #49), the public
-- schema no longer references auth.users in any way:
--   - 0 public.* foreign keys point at auth.users (verified via
--     pg_constraint at apply time).
--   - 0 RLS policies on public.* reference auth.users.
--   - No application code path (src/**) reads auth.users.
-- The 20 auth.users rows + ~580 child rows (sessions / identities /
-- refresh_tokens) sitting on prod were inert leftovers from before
-- Clerk became the sole identity provider.
--
-- TRUNCATE … CASCADE clears the auth-schema internal children
-- (auth.sessions, auth.identities, auth.refresh_tokens, etc.) via
-- their own foreign keys to auth.users(id). Pre-truncate prod snapshot:
--   auth.users: 20, auth.sessions: 256, auth.identities: 21,
--   auth.refresh_tokens: 279.
-- Post-truncate: all zero.
--
-- CI behavior: this migration runs against the fresh local Supabase
-- before setup-test-users-admin.js seeds its worker-specific test
-- users; auth.users is already empty at that point so TRUNCATE is a
-- no-op. The setup script then proceeds to create test users
-- normally for integration tests.
--
-- DOWN: not provided. Restoring auth.users requires re-creating each
-- identity by running auth.admin.createUser (or its SQL equivalent
-- with a hashed password and matching auth.identities). For the
-- handful of legacy accounts that existed pre-Clerk-cutover, the
-- right recovery is to ask those users to re-sign-in via Clerk,
-- which creates a fresh user_profiles row via the webhook.

begin;

truncate table auth.users cascade;

commit;
