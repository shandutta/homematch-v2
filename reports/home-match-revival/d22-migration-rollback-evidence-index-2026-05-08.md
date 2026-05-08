# D22 — Migration Rollback Evidence Index (Phase 1 DB Remediation)

**Date:** 2026-05-08
**Scope:** Phase 1 DB remediation migrations applied during 2026 (timestamps `20260507…`–`20260508…`).
**Bounds:** Static, repo-side index only. No `supabase db reset`, no DB lint, no Docker, no remote DB execution. Rollback execution still requires an approved local Supabase or safeguarded remote-test environment.

## Why this index exists

Phase 1 DB remediation migrations were authored without legacy DOWN scripts (see [`migration-health-audit.md`](./migration-health-audit.md), §3 — "0 of 40 migrations have DOWN scripts"). For the 2026 cleanup wave we adopted a static convention: every Phase 1 migration carries a `-- DOWN:` block, and Jest static guards assert the block is present. This file pins each migration to its DOWN block, the assertions that protect it, and the residual gaps that cannot be covered statically.

## Coverage matrix

| # | Migration | UP intent (one line) | `-- DOWN:` line | Static guard(s) | Behavioural test(s) |
|---|-----------|----------------------|-----------------|-----------------|---------------------|
| 1 | [`20260507225000_add_schema_safety_constraints.sql`](../../supabase/migrations/20260507225000_add_schema_safety_constraints.sql) | Adds `properties` CHECK constraints (`chk_properties_*`) and FK constraints on `user_profiles.household_id` / `properties.neighborhood_id`. | L91 | `migration-reset-readiness.test.ts` (DOWN + reset-replay-safe) | [`schema-safety-migration.test.ts`](../../__tests__/unit/database/schema-safety-migration.test.ts) |
| 2 | [`20260508000000_add_property_stats_rpc.sql`](../../supabase/migrations/20260508000000_add_property_stats_rpc.sql) | Creates `public.get_property_stats()` and grants execute to `authenticated`/`service_role`. | L55 | `migration-reset-readiness.test.ts`, `rollback-coverage.test.ts` | [`property-stats-rpc-migration.test.ts`](../../__tests__/unit/database/property-stats-rpc-migration.test.ts) |
| 3 | [`20260508001000_harden_security_definer_search_paths.sql`](../../supabase/migrations/20260508001000_harden_security_definer_search_paths.sql) | Sets `search_path = pg_catalog, public` on 13 SECURITY DEFINER functions (`handle_new_user`, geo RPCs, backfills). | L91 | `migration-reset-readiness.test.ts`, `rollback-coverage.test.ts` | [`security-definer-search-path-migration.test.ts`](../../__tests__/unit/database/security-definer-search-path-migration.test.ts) |
| 4 | [`20260508003500_fix_properties_public_select_policy.sql`](../../supabase/migrations/20260508003500_fix_properties_public_select_policy.sql) | Tightens the public `properties` SELECT policy to require `is_active AND listing_status = 'active'`. | L23 | `migration-reset-readiness.test.ts`, `rollback-coverage.test.ts` | [`property-rls-policy-migration.test.ts`](../../__tests__/unit/database/property-rls-policy-migration.test.ts), [`rls-policy-closure.test.ts`](../../__tests__/unit/database/rls-policy-closure.test.ts) |
| 5 | [`20260508015000_fix_interaction_uniqueness.sql`](../../supabase/migrations/20260508015000_fix_interaction_uniqueness.sql) | Replaces `(user_id, property_id, interaction_type)` uniqueness with `(user_id, property_id)` after duplicate compaction. | L34 | `migration-reset-readiness.test.ts`, `rollback-coverage.test.ts` | [`interaction-uniqueness-migration.test.ts`](../../__tests__/unit/database/interaction-uniqueness-migration.test.ts) |
| 6 | [`20260508021000_add_user_profiles_delete_policy.sql`](../../supabase/migrations/20260508021000_add_user_profiles_delete_policy.sql) | Adds the `Users can delete their own profile` RLS policy. | L11 | `migration-reset-readiness.test.ts`, `rollback-coverage.test.ts` | [`rls-policy-closure.test.ts`](../../__tests__/unit/database/rls-policy-closure.test.ts) |
| 7 | [`20260508022000_add_jsonb_gin_indexes.sql`](../../supabase/migrations/20260508022000_add_jsonb_gin_indexes.sql) | Adds GIN indexes on `user_profiles.preferences`, `user_property_interactions.score_data`, `saved_searches.filters`. | L16 | `migration-reset-readiness.test.ts`, `rollback-coverage.test.ts` | [`jsonb-gin-indexes-migration.test.ts`](../../__tests__/unit/database/jsonb-gin-indexes-migration.test.ts) |
| 8 | [`20260508023000_add_realtime_mutual_like_payload_rpc.sql`](../../supabase/migrations/20260508023000_add_realtime_mutual_like_payload_rpc.sql) | Creates `public.get_realtime_mutual_like_payload(uuid, uuid, uuid)` with auth + same-household guards. | L43 | `migration-reset-readiness.test.ts`, `rollback-coverage.test.ts` (asserts auth/household guards + DOWN drop) | — (covered by `rollback-coverage.test.ts` shape assertions) |
| 9 | [`20260508024000_create_admin_role_assignments.sql`](../../supabase/migrations/20260508024000_create_admin_role_assignments.sql) | Creates the `admin_role_assignments` authority table replacing the prior `user_profiles.role` service-role gate. | L57 | `migration-reset-readiness.test.ts` | [`admin-role-assignments-migration.test.ts`](../../__tests__/unit/database/admin-role-assignments-migration.test.ts) |

Static guards execute with: `systemd-run --user --scope -p MemoryMax=2G -p CPUQuota=200% pnpm exec jest <test path> --runInBand` (per the D6 closure pattern).

## DOWN-block summaries (verbatim intent)

1. **schema-safety** — `BEGIN; ALTER TABLE … DROP CONSTRAINT IF EXISTS …; COMMIT;` for both FKs and all six `chk_properties_*` checks.
2. **property-stats-rpc** — `REVOKE EXECUTE … FROM service_role/authenticated; DROP FUNCTION IF EXISTS public.get_property_stats();`.
3. **search-path hardening** — `ALTER FUNCTION … RESET search_path` for all 13 SECURITY DEFINER targets.
4. **public-properties policy** — `DROP POLICY IF EXISTS "Anyone can view active properties" …; CREATE POLICY … USING (coalesce(is_active, true) = true);`.
5. **interaction uniqueness** — Drops `user_property_interactions_user_id_property_id_key`, restores `user_property_interactions_user_id_property_id_interaction_type_key`. **Caveat:** rows deleted during duplicate compaction require point-in-time recovery; the DOWN block restores the constraint shape only.
6. **user_profiles delete policy** — `DROP POLICY IF EXISTS "Users can delete their own profile" ON public.user_profiles;`.
7. **JSONB GIN indexes** — `DROP INDEX IF EXISTS` for `idx_saved_searches_filters_gin`, `idx_user_property_interactions_score_data_gin`, `idx_user_profiles_preferences_gin`.
8. **realtime mutual-like RPC** — `DROP FUNCTION IF EXISTS public.get_realtime_mutual_like_payload(uuid, uuid, uuid);`.
9. **admin_role_assignments** — `BEGIN; DROP POLICY IF EXISTS admin_role_assignments_self_select …; DROP TABLE IF EXISTS public.admin_role_assignments; COMMIT;` (sibling D1 packet `d1-service-role-rbac-authority-implementation-packet-2026-05-08.md` describes the cutover this DOWN must coordinate with).

## Static guard duplication note

Both `__tests__/unit/database/migration-reset-readiness.test.ts` (D6) and `__tests__/unit/database/rollback-coverage.test.ts` assert `-- DOWN:` is present, but their lists differ:

- `migration-reset-readiness.test.ts` covers all 9 migrations (1–9 above).
- `rollback-coverage.test.ts` covers 7 migrations (2–8). It omits #1 (schema safety) and #9 (admin role assignments).

The D6 reset-readiness suite already enforces DOWN presence on the two omitted migrations, so no new static assertion is added in this packet — extending `rollback-coverage.test.ts` would duplicate that guarantee. If `rollback-coverage.test.ts` is later refactored, fold its DOWN-presence assertions into the D6 list and keep its **shape** assertions (e.g. mutual-like guard, function signature) as the unique value.

## Residual / non-static gaps

These items cannot close from a static index and require an approved local Supabase or remote-test environment:

1. **Apply-and-rollback dry-run** — none of the DOWN blocks have been executed against a live PostgreSQL instance. The intent-level assertions verify text presence, not that the DOWN block leaves the schema in the pre-UP state.
2. **Data-loss caveat (interaction uniqueness)** — rows deleted by duplicate compaction in #5 are not recoverable through DOWN; recovery requires point-in-time restore.
3. **Service-role cutover (admin_role_assignments)** — DOWN drops the table, but the D1 cutover already replaced the prior `user_profiles.role` gate; rolling back #9 in production additionally requires reinstating the prior gate path or a documented operational decision that the cutover is permanent.
4. **`supabase db lint` / `supabase db reset`** — neither is part of the static guard set; both still need an approved local environment to run.
5. **Search-path RESET** — the DOWN for #3 uses `ALTER FUNCTION … RESET search_path`, which restores the default but does not necessarily restore an earlier explicit `search_path` if one existed; in practice the prior state had no explicit setting, so RESET is the correct inverse.

## Sibling closure references

- [`d6-db-static-reset-readiness-closure-2026-05-08.md`](./d6-db-static-reset-readiness-closure-2026-05-08.md) — the originating closure for the static DOWN guard.
- [`migration-health-audit.md`](./migration-health-audit.md) — historical baseline (zero pre-2026 DOWN coverage; this index documents the 2026 inversion of that baseline).
- [`d1-service-role-rbac-authority-implementation-packet-2026-05-08.md`](./d1-service-role-rbac-authority-implementation-packet-2026-05-08.md) — operational context for #9.
- [`d5-numeric-constraint-semantics-closure-2026-05-08.md`](./d5-numeric-constraint-semantics-closure-2026-05-08.md) — operational context for #1's CHECK constraints.

## Refresh policy

When a new migration is added under `supabase/migrations/2026*.sql`:

1. Append a `-- DOWN:` block to the new migration (the D6 reset-readiness guard will fail without it).
2. Add the migration to `phase1DbRemediationMigrations` in `migration-reset-readiness.test.ts` if it belongs to the Phase 1 cleanup wave.
3. Append a row to the matrix above and a one-line summary in §"DOWN-block summaries".
