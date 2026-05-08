# D60 — RLS Policy Coverage Index (Phase 1 DB)

**Date:** 2026-05-08
**Scope:** Static, repo-side index mapping every RLS-protected `public` table to its current policies, the migration that authored each policy, and the static/behavioural test evidence guarding it. Pairs with the [RLS Security Audit](./rls-security-audit.md) (2026-05-07 backlog) and [D22 Migration Rollback Evidence Index](./d22-migration-rollback-evidence-index-2026-05-08.md).
**Bounds:** No live DB, no `supabase db reset`, no Docker, no remote/dashboard mutations. Static SQL/test inspection only.

## Why this index exists

The 2026-05-07 [`rls-security-audit.md`](./rls-security-audit.md) enumerated 12 gaps across the original 6 core tables; the 2026-05-08 closure wave (migrations `20260508003500`, `…021000`, `…001000`, `…024000`) addressed the CRITICAL/HIGH items but the per-table policy/evidence mapping was scattered across the audit, the rollback index, and individual migration tests. This file is the single static lookup for "which policies protect table X today, who authored them, and what guards them."

The migration timestamps and policy names below are repo-side strings; live PostgreSQL `pg_policies` reconciliation is one of the unresolved gaps in §4.

## 1. Coverage matrix — protected tables

| Table | RLS enabled | SELECT | INSERT | UPDATE | DELETE | Notes |
|-------|-------------|--------|--------|--------|--------|-------|
| `user_profiles` | [`20250728013711`](../../supabase/migrations/20250728013711_enable_rls.sql) | `auth.uid() = id` ([`20250728013721`](../../supabase/migrations/20250728013721_create_rls_policies.sql)) + `supabase_auth_admin` FOR ALL ([`20251122101500`](../../supabase/migrations/20251122101500_auth_admin_user_profiles_access.sql)) | `auth.uid() = id` ([`20250728013721`](../../supabase/migrations/20250728013721_create_rls_policies.sql)) | `auth.uid() = id` ([`20250728013721`](../../supabase/migrations/20250728013721_create_rls_policies.sql)) | `auth.uid() = id` ([`20260508021000`](../../supabase/migrations/20260508021000_add_user_profiles_delete_policy.sql)) | DELETE added in 2026-05-08 closure (audit §2.2). |
| `households` | [`20250728013711`](../../supabase/migrations/20250728013711_enable_rls.sql) | household-membership subquery ([`20250728013721`](../../supabase/migrations/20250728013721_create_rls_policies.sql)) | `auth.uid() = created_by` ([`20251130200000`](../../supabase/migrations/20251130200000_consolidated_pending_features.sql), L83-84) | household-membership subquery ([`20250728013721`](../../supabase/migrations/20250728013721_create_rls_policies.sql)) | none (intentional) | INSERT also funnels through SECURITY DEFINER RPC `create_household_for_user` (L141-217). |
| `neighborhoods` | [`20250728013711`](../../supabase/migrations/20250728013711_enable_rls.sql) | `true` (public) ([`20250728013721`](../../supabase/migrations/20250728013721_create_rls_policies.sql)) | none (admin-only) | none (admin-only) | none (admin-only) | Read-only by design (audit §1.1). |
| `properties` | [`20250728013711`](../../supabase/migrations/20250728013711_enable_rls.sql) | `listing_status = 'active' AND coalesce(is_active, true) = true` ([`20260508003500`](../../supabase/migrations/20260508003500_fix_properties_public_select_policy.sql)) + `anon` marketing read ([`20250801052809`](../../supabase/migrations/20250801052809_enable_marketing_read_policy.sql)) | none (admin-only) | none (admin-only) | none (admin-only) | CRITICAL audit gap §2.1 closed by `20260508003500`. |
| `user_property_interactions` | [`20250728013711`](../../supabase/migrations/20250728013711_enable_rls.sql) | `auth.uid() = user_id` ([`20250728013721`](../../supabase/migrations/20250728013721_create_rls_policies.sql)) + household mutual-likes ([`20250816045943`](../../supabase/migrations/20250816045943_create_couples_optimization_functions.sql)) | `auth.uid() = user_id` ([`20250728013721`](../../supabase/migrations/20250728013721_create_rls_policies.sql)) | `auth.uid() = user_id` ([`20250728013721`](../../supabase/migrations/20250728013721_create_rls_policies.sql)) | `auth.uid() = user_id` ([`20251125120000`](../../supabase/migrations/20251125120000_add_interaction_delete_policy.sql)) | Full CRUD + cross-household read for couples view. |
| `saved_searches` | [`20250728013711`](../../supabase/migrations/20250728013711_enable_rls.sql) | `auth.uid() = user_id` ([`20250728013721`](../../supabase/migrations/20250728013721_create_rls_policies.sql)) | `auth.uid() = user_id` ([`20250728013721`](../../supabase/migrations/20250728013721_create_rls_policies.sql)) | `auth.uid() = user_id` ([`20250728013721`](../../supabase/migrations/20250728013721_create_rls_policies.sql)) | `auth.uid() = user_id` ([`20250728013721`](../../supabase/migrations/20250728013721_create_rls_policies.sql)) | Full CRUD per user. |
| `neighborhood_vibes` | [`20251215090000`](../../supabase/migrations/20251215090000_create_neighborhood_vibes.sql) | `authenticated` `true` ([`20251215090000`](../../supabase/migrations/20251215090000_create_neighborhood_vibes.sql)) | `service_role` only | `service_role` only | `service_role` only | Read for any signed-in user; admin/cron mutations only. |
| `property_vibes` | [`20251130200000`](../../supabase/migrations/20251130200000_consolidated_pending_features.sql) (L47) | `authenticated` `true` ([`20251130200000`](../../supabase/migrations/20251130200000_consolidated_pending_features.sql), L54-55) | `service_role` only (L57-58) | `service_role` only (L60-61) | `service_role` only (L63-64) | Same shape as `neighborhood_vibes`. |
| `household_property_resolutions` | [`20251218091000`](../../supabase/migrations/20251218091000_create_household_property_resolutions.sql) (L28) | household-scoped subquery (L35-44) | `resolved_by = auth.uid()` + household-scoped (L46-56) | household-scoped subquery (L58-67) | household-scoped subquery (L69-78) | Full CRUD scoped to caller's household. |
| `household_invitations` | [`20251130200000`](../../supabase/migrations/20251130200000_consolidated_pending_features.sql) (L109) | household-scoped subquery (L115-120) | `auth.uid() = created_by` + household scope (L122-128) | `auth.uid() = created_by` (L130-131) | none (intentional) | Cancellation handled via UPDATE to `status='cancelled'`/`'revoked'` ([`20251218090000`](../../supabase/migrations/20251218090000_allow_revoked_household_invitation_status.sql)). |
| `admin_role_assignments` | [`20260508024000`](../../supabase/migrations/20260508024000_create_admin_role_assignments.sql) (L31) | `auth.uid() = user_id AND enabled AND not expired` (L41-49) | none (intentional, service-role bootstrap only) | none | none | New RBAC authority table; replaces `user_profiles.role` gate (D1 packet). |

Symbols used: "subquery" = `… IN (SELECT household_id FROM user_profiles WHERE id = auth.uid())`. Subquery performance disposition documented in [`rls-security-audit.md`](./rls-security-audit.md) §3.1.

## 2. Test evidence per table

Static guards (no DB) plus integration probes that need a live local Supabase. The integration column lists tests that are written but only pass when `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, anon key, and `TEST_AUTH_TOKEN`/test creds are present.

| Table | Static guard(s) | Integration probe(s) | Live-DB status |
|-------|------------------|----------------------|----------------|
| `user_profiles` | [`rls-policy-closure.test.ts`](../../__tests__/unit/database/rls-policy-closure.test.ts) (delete-policy text) | [`rls-boundaries.test.ts`](../../__tests__/integration/security/rls-boundaries.test.ts) (anon read denied; cross-household update denied) | Not run from this slice — see §4. |
| `households` | [`rls-policy-closure.test.ts`](../../__tests__/unit/database/rls-policy-closure.test.ts) (households INSERT policy text) | [`household-creation-rls.test.ts`](../../__tests__/integration/households/household-creation-rls.test.ts) (rejects insert without `created_by`; allows when matched) | Not run from this slice — see §4. |
| `neighborhoods` | none (read-only public policy is the audited surface) | none directly | n/a — public read by design. |
| `properties` | [`property-rls-policy-migration.test.ts`](../../__tests__/unit/database/property-rls-policy-migration.test.ts) (asserts listing-status gate, rejects bare `is_active = true`) | none in repo for the public SELECT policy specifically | Listing-status enforcement on a real DB still unverified. |
| `user_property_interactions` | [`migration-reset-readiness.test.ts`](../../__tests__/unit/database/migration-reset-readiness.test.ts) (DOWN/replay-safe), [`interaction-uniqueness-migration.test.ts`](../../__tests__/unit/database/interaction-uniqueness-migration.test.ts) | [`rls-boundaries.test.ts`](../../__tests__/integration/security/rls-boundaries.test.ts) (cross-household interaction read denied) | Not run from this slice — see §4. |
| `saved_searches` | none (covered by initial migration; no closure migration in 2026 wave) | none in repo | Live RLS check still unverified. |
| `neighborhood_vibes` | none beyond migration source | none in repo | Static only. |
| `property_vibes` | none beyond migration source | none in repo | Static only. |
| `household_property_resolutions` | none beyond migration source | indirect via `couples/disputed` route tests | Live policy reconciliation not in this slice. |
| `household_invitations` | none beyond migration source | indirect via `invite/[token]` actions tests | Live policy reconciliation not in this slice. |
| `admin_role_assignments` | [`admin-role-assignments-migration.test.ts`](../../__tests__/unit/database/admin-role-assignments-migration.test.ts) (RLS enabled, no authenticated write path, server lookup uses this table) | none in repo | Live grant/revoke flow not exercised here. |

Suite invocation pattern (matches D6 closure): `systemd-run --user --scope -p MemoryMax=2G -p CPUQuota=200% pnpm exec jest <test path> --runInBand`.

## 3. Service-role bypass surfaces (read-side compensation)

These routes intentionally bypass RLS via service role. They are not RLS gaps — they are caller-side authorization paths that compensate for read-only or aggregate flows. Listed here so the index is complete; remediation tracked in [`rls-security-audit.md`](./rls-security-audit.md) §4 and [`d1-service-role-rbac-authority-implementation-packet-2026-05-08.md`](./d1-service-role-rbac-authority-implementation-packet-2026-05-08.md).

| Route | Tables touched | Caller authorization |
|-------|----------------|----------------------|
| `GET /api/users/search` | `user_profiles` | authenticated + rate-limited; service role used to bypass per-user SELECT |
| `GET /api/couples/disputed` | `user_profiles`, `user_property_interactions`, `household_property_resolutions` | authenticated + household-membership check before service-role read |
| `PATCH /api/couples/disputed` | `household_property_resolutions` | authenticated + household-membership check before service-role upsert |
| `POST /api/interactions` | `user_profiles`, `user_property_interactions` | authenticated; service role only as fallback for missing profile/backfill |
| `invite/[token]` SSR + actions | `household_invitations`, `user_profiles` | unauthenticated read of invite payload by design; mutations require auth |

Replacement direction (D1 packet): substitute service-role table reads with `SECURITY DEFINER` RPCs (`get_household_member_profiles`, `search_users_by_email`, `accept_household_invite`).

## 4. Unresolved live DB validation

Static guards verify migration text and intent; they do not prove the policies behave correctly against a running PostgreSQL. The following items still require an approved local Supabase or remote-test environment and are explicitly out of scope for this slice (no live DB, no Docker, no remote mutations):

1. **`pg_policies` reconciliation** — assert that, after applying the full migration set, `pg_policies` returns the exact policy/qualifier list described in §1 (no extra permissive policies, no missing ones).
2. **`pg_class.relrowsecurity` / `relforcerowsecurity` audit** — confirm RLS is `ENABLED` (and where appropriate `FORCED`) on all 11 tables in §1.
3. **Anon-role enumeration probe** — exercise [`rls-boundaries.test.ts`](../../__tests__/integration/security/rls-boundaries.test.ts) and an analogous `properties` listing-status probe (draft/sold rows must be invisible to `anon` and to `authenticated`).
4. **DELETE-on-`user_profiles` happy path** — execute the new `20260508021000` policy against a real authenticated user and verify cascade behaviour against `households`/`user_property_interactions` (FK + RLS interaction).
5. **`admin_role_assignments` self-promotion smoke** — confirm an authenticated user can SELECT only their own assignment row and cannot INSERT/UPDATE/DELETE.
6. **SECURITY DEFINER `search_path` runtime check** — `pg_proc.proconfig` for the 13 functions hardened by `20260508001000` should show `search_path=pg_catalog, public[, extensions]`.
7. **`supabase db lint` / `db reset` replay** — neither is part of the static guard set; both still need an approved local environment.

These are not regressions; they are validation steps that cannot complete from a static repo audit.

## 5. Sibling closure references

- [`rls-security-audit.md`](./rls-security-audit.md) — original gap enumeration (2026-05-07).
- [`d22-migration-rollback-evidence-index-2026-05-08.md`](./d22-migration-rollback-evidence-index-2026-05-08.md) — rollback DOWN-block index for the 2026-05-08 wave.
- [`d6-db-static-reset-readiness-closure-2026-05-08.md`](./d6-db-static-reset-readiness-closure-2026-05-08.md) — static reset-readiness guard.
- [`d1-service-role-rbac-authority-implementation-packet-2026-05-08.md`](./d1-service-role-rbac-authority-implementation-packet-2026-05-08.md) — service-role RBAC cutover plan.
- [`p0-p1-blocker-evidence-index-2026-05-08.md`](./p0-p1-blocker-evidence-index-2026-05-08.md) — top-level P0/P1 evidence index.
