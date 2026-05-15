-- Phase 6 of the Supabase-auth elimination (2026-05-15).
--
-- The 2026-05-13 audit flagged four remaining cross-schema FKs from
-- `public` → `auth.users`. Clerk creates user_profiles rows directly via
-- the webhook (no auth.users entry), so any Clerk user trying to insert
-- into one of these child tables would fail the constraint check against
-- a parent row that does not exist in `auth.users`.
--
-- Live verification before applying:
--   - 0 orphans in user_property_interactions / saved_searches /
--     households(created_by) / household_property_resolutions when
--     joined against user_profiles.id (i.e. every child row already has
--     a valid user_profiles parent).
--   - 24 user_profiles rows, 20 of which have a matching auth.users row.
--     The 4 Clerk-only rows are why we cannot keep pointing FKs at
--     auth.users.
--
-- Repointing to user_profiles preserves the integrity guarantee and
-- closes the last cross-schema link from public → auth. Cascade
-- semantics on the user-keyed FKs preserved as-is (ON DELETE CASCADE);
-- households.created_by stays without a cascade since it is metadata,
-- not ownership.
--
-- auth.users truncation is intentionally deferred: setup-test-users-admin.js
-- still seeds Supabase auth users for integration tests, and the
-- supabase_auth_admin policy on user_profiles still references them.
-- Truncating them out now would break test setup; do it in a separate
-- pass once the test bootstrap moves off the auth admin API.

begin;

-- 1) user_property_interactions.user_id
alter table public.user_property_interactions
  drop constraint if exists user_property_interactions_user_id_fkey;
alter table public.user_property_interactions
  add constraint user_property_interactions_user_id_fkey
    foreign key (user_id) references public.user_profiles(id) on delete cascade;

-- 2) saved_searches.user_id
alter table public.saved_searches
  drop constraint if exists saved_searches_user_id_fkey;
alter table public.saved_searches
  add constraint saved_searches_user_id_fkey
    foreign key (user_id) references public.user_profiles(id) on delete cascade;

-- 3) households.created_by
alter table public.households
  drop constraint if exists households_created_by_fkey;
alter table public.households
  add constraint households_created_by_fkey
    foreign key (created_by) references public.user_profiles(id);

-- 4) household_property_resolutions.resolved_by
alter table public.household_property_resolutions
  drop constraint if exists household_property_resolutions_resolved_by_fkey;
alter table public.household_property_resolutions
  add constraint household_property_resolutions_resolved_by_fkey
    foreign key (resolved_by) references public.user_profiles(id) on delete cascade;

commit;

-- DOWN:
-- Not provided. Rolling back means recreating FKs into auth.users, which
-- would re-introduce the Clerk-vs-Supabase mismatch and immediately
-- fail for the 4 Clerk-only user_profiles rows. If a true rollback is
-- ever needed, first delete or back-fill auth.users entries for every
-- user_profiles row that points to a Clerk identity, then re-run the
-- inverse FK statements.
