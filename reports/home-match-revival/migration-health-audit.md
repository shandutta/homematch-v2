# Migration Health & Squash Audit

**Project:** homematch-v2
**Date:** 2026-05-07
**Total migrations:** 40
**Span:** 2025-07-28 to 2025-12-21 (5 months)

---

## 1. Ordering & Dependencies

**Verdict:** Linear, no circular dependencies. ✅

All 40 migrations follow sequential timestamps with no circular references. No migration references objects created in a later migration. However, several migrations use `CREATE OR REPLACE FUNCTION` which silently overwrites earlier function definitions — this creates a hidden form of dependency where the "intent" of an earlier migration (e.g., search_path hardening) is undone by a later one without any warning.

| # | Migration | Type | Depends On |
|---|-----------|------|------------|
| 1 | setup_homematch_v2_schema | Schema | — |
| 2 | create_core_tables | TABLE | 1 |
| 3 | create_neighborhoods_table | TABLE | 1 |
| 4 | create_properties_table | TABLE | 1 |
| 5 | create_interaction_tables | TABLE | 2 |
| 6 | create_indexes | INDEX | 2,3,4,5 |
| 7 | enable_rls | RLS | 2-5 |
| 8 | create_rls_policies | POLICY | 2-5,7 |
| 9-10 | fix_postgis_geometry_type_* | ALTER | 3,4 |
| 11 | add_user_profile_trigger | FUNC+TRIG | 2 |
| 12 | add_geographic_search_function | FUNC | 4 |
| 13 | add_cascade_delete | ALTER | 2 |
| 14 | enable_marketing_read_policy | POLICY | 4,7 |
| 15 | create_interaction_summary_fn | FUNC | 5 |
| 16 | harden_function_search_path | FUNC | 11,12,15 |
| 17 | create_couples_optimization_functions | FUNC+IDX | 5 |
| 18 | update_property_type_constraint | ALTER | 4 |
| 19 | auth_admin_user_profiles_access | POLICY | 2 |
| 20 | add_missing_rpc_functions | FUNC | 4,12,16 |
| 21 | fix_user_profile_trigger | FUNC | 11,16 |
| 22 | add_user_profile_display_name | ALTER+FUNC | 2,21 |
| 23 | add_interaction_delete_policy | POLICY | 5,8 |
| 24 | consolidated_pending_features | MULTI | 2,3,4,5,8 |
| 25 | secure_check_table_exists | FUNC | 20 |
| 26 | restore_geo_rpcs_and_profile_full_name | MULTI | 12,20,22 |
| 27 | fix_get_geographic_density_return_types | FUNC | 26 |
| 28 | add_zillow_images_refresh_marker | ALTER | 4 |
| 29 | create_neighborhood_vibes | TABLE | 3 |
| 30 | fix_get_neighborhood_stats_ambiguity | FUNC | 20 |
| 31 | sync_household_user_count | FUNC+TRIG | 2 |
| 32 | allow_revoked_household_invitation_status | ALTER | 2 |
| 33 | create_household_property_resolutions | TABLE | 2,4 |
| 34 | fix_household_user_count_trigger_race | FUNC+TRIG | 24,31 |
| 35 | fix_household_user_count_trigger_deadlock | FUNC+TRIG | 31,34 |
| 36 | optimize_property_indexes | INDEX | 4 |
| 37 | add_property_neighborhood_backfill | FUNC | 3,4 |
| 38 | backfill_property_neighborhoods_fallback | FUNC | 37 |
| 39 | backfill_property_coordinates_city_centroid | FUNC | 4 |
| 40 | add_city_state_keys | ALTER+INDEX | 4 |

---

## 2. Bugfix Migrations

**Verdict:** 7 bugfix migrations (17.5% of total). ⚠️ Several form chains of 2-3 fixes for the same thing.

| # | Migration | What It Fixes | Severity |
|---|-----------|---------------|----------|
| 9 | fix_postgis_geometry_type_neighborhoods_v5 | Wrong geometry type in neighborhoods table | HIGH |
| 10 | fix_postgis_geometry_type_properties | Wrong geometry type in properties table | HIGH |
| 21 | fix_user_profile_trigger | handle_new_user() trigger robustness (adds ON CONFLICT) | MEDIUM |
| 27 | fix_get_geographic_density_return_types | Return type mismatch in get_geographic_density() | MEDIUM |
| 30 | fix_get_neighborhood_stats_ambiguity | Column ambiguity in get_neighborhood_stats() | MEDIUM |
| 34 | fix_household_user_count_trigger_race | Race condition in household user count trigger | HIGH |
| 35 | fix_household_user_count_trigger_deadlock | Deadlock from row-level locking in trigger | CRITICAL |

**Notable chains:**
- **household_user_count**: 3 migrations (31→34→35) for one trigger function — a textbook case for squashing
- **PostGIS geometry**: 2 migrations (9-10) fixing the same type of bug on two tables — should be one migration
- **geographic_density**: 2 migrations (26→27) because return types were wrong — squash together

---

## 3. Reversibility

**Verdict:** CRITICAL — 0 of 40 migrations have DOWN scripts. ❌

No migration includes rollback/down instructions. The only reversibility mechanism is:
- 16 migrations use `DROP ... IF EXISTS` before `CREATE` (partial re-runnability)
- Some migrations use `IF NOT EXISTS` on `CREATE TABLE` and `ADD COLUMN`

**Rollback strategy (if needed):**
- Run migrations in reverse order with manually crafted undo statements
- For `CREATE TABLE IF NOT EXISTS` → `DROP TABLE IF EXISTS`
- For `ALTER TABLE ADD COLUMN IF NOT EXISTS` → `ALTER TABLE DROP COLUMN IF EXISTS`
- For `CREATE OR REPLACE FUNCTION` → restore previous version from git history
- For data-mutating migrations (INSERT/UPDATE) → no automated undo; would need point-in-time recovery

**Risk:** Any production incident requiring rollback would require manual SQL scripting against git history. A pre-launch app should have at least basic down scripts for schema-changing migrations.

---

## 4. Idempotency

**Verdict:** Mixed — mostly idempotent but with one critical failure point. ⚠️

### Safe patterns (32 migrations):
- `CREATE TABLE IF NOT EXISTS` — 5 migrations use this ✅
- `ALTER TABLE ADD COLUMN IF NOT EXISTS` — used in several migrations ✅
- `CREATE OR REPLACE FUNCTION` — used by 20 migrations ✅
- `DROP ... IF EXISTS` — used by 16 migrations ✅
- `CREATE INDEX IF NOT EXISTS` — used by 6 migrations ✅
- `CREATE POLICY` on tables with `IF NOT EXISTS` — used ✅

### Unsafe patterns (1 migration):
| Migration | Issue | Risk |
|-----------|-------|------|
| 24 (consolidated_pending_features) | Uses bare `CREATE FUNCTION` (not `OR REPLACE`) for `create_household_for_user` | **Will fail** if migration is re-run or if function already exists from another source |

### Missing idempotency guards:
- **8 (create_rls_policies)**: Uses bare `CREATE POLICY` — would fail on re-run if policies already exist
- **23 (add_interaction_delete_policy)**: Same — bare `CREATE POLICY`
- **7 (enable_rls)**: Uses bare `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` — harmless on re-run (idempotent by nature) but no explicit guard

---

## 5. Search Path Hardening

**Verdict:** CRITICAL — hardening is incomplete and has been silently undone. ❌

Migration 16 (harden_function_search_path, 2025-08-04) added `SET search_path = pg_catalog, public` to 3 functions. This is a Supabase security best practice that prevents function-injection attacks by ensuring `pg_catalog` is searched first.

### Functions hardened (3):
- `get_user_interaction_summary` ✅ (not subsequently overwritten)
- `get_properties_within_radius` ✅ (later recreated WITH search_path in migration 20)
- `handle_new_user` ❌ — hardening LOST in migrations 21, 22, and 26

### handle_new_user — the silent regression:
```
v1: add_user_profile_trigger          — no search_path
v2: harden_function_search_path       — SET search_path = pg_catalog, public ✅
v3: fix_user_profile_trigger          — search_path REMOVED ❌
v4: add_user_profile_display_name     — still no search_path ❌
v5: restore_geo_rpcs_and_profile_full_name — still no search_path ❌
```

### Functions with SECURITY DEFINER but NO search_path (12 total):
These are elevated-privilege functions running as the definer without search_path hardening — a security risk:

| Function | Last Defined In | Risk |
|----------|----------------|------|
| handle_new_user | restore_geo_rpcs (26) | **HIGH** — trigger on auth.users, writes to user_profiles |
| get_properties_in_bounds | restore_geo_rpcs (26) | MEDIUM — read-only geo query |
| get_walkability_score | restore_geo_rpcs (26) | MEDIUM |
| get_transit_score | restore_geo_rpcs (26) | MEDIUM |
| get_properties_by_distance | restore_geo_rpcs (26) | MEDIUM |
| get_neighborhoods_in_bounds | restore_geo_rpcs (26) | MEDIUM |
| get_property_clusters | restore_geo_rpcs (26) | MEDIUM |
| get_properties_in_polygon | restore_geo_rpcs (26) | MEDIUM |
| get_properties_along_route | restore_geo_rpcs (26) | MEDIUM |
| get_geographic_density | fix_geo_density_return_types (27) | MEDIUM |
| get_nearest_amenities | restore_geo_rpcs (26) | MEDIUM |
| backfill_property_neighborhoods | backfill_fallback (38) | LOW — admin-only backfill |
| backfill_property_coordinates_city_centroid | backfill_coords (39) | LOW — admin-only backfill |

**Recommendation:** All SECURITY DEFINER functions must have `SET search_path = pg_catalog, public` (or at minimum `SET search_path = pg_catalog, pg_temp`). This is a Supabase hard requirement for production.

---

## 6. Squash Candidates

**Verdict:** 40 migrations can be consolidated to ~17. Pre-launch apps should typically have 10-20.

### Squash Plan

#### Group A: Foundation (keep separate — 8 migrations)
These are the initial schema creation and represent logical units:
| Keep | Squash From | Rationale |
|------|-------------|-----------|
| 001_schema | #1 setup_homematch_v2_schema | Logical unit: schema creation |
| 002_core_tables | #2 create_core_tables | users, households |
| 003_neighborhoods | #3 create_neighborhoods_table | Separate domain entity |
| 004_properties | #4 create_properties_table | Core domain entity, large |
| 005_interactions | #5 create_interaction_tables | Separate domain |
| 006_indexes | #6 create_indexes | Indexes for tables created above |
| 007_rls | #7 enable_rls + #8 create_rls_policies | RLS is one concern |

#### Group B: PostGIS fixes (squash 2→1)
| New Migration | Squash From | Rationale |
|---------------|-------------|-----------|
| 008_postgis_geometry_fixes | #9, #10 | Same bug pattern on two tables |

#### Group C: User profile trigger saga (squash 5→1)
handle_new_user() was defined 5 times. Consolidate to final version with search_path:
| New Migration | Squash From | Rationale |
|---------------|-------------|-----------|
| 009_user_profile_trigger | #11, #16 (partial), #21, #22, #26 (partial) | 5 definitions of the same trigger function |

#### Group D: Geographic functions (squash 4→1)
| New Migration | Squash From | Rationale |
|---------------|-------------|-----------|
| 010_geographic_rpc_functions | #12, #20 (partial), #26 (geo parts), #27 | All geo RPCs in one migration with search_path |

#### Group E: Interaction & couples functions (squash 2→1)
| New Migration | Squash From | Rationale |
|---------------|-------------|-----------|
| 011_interaction_functions | #15, #17 | Related interaction/couples functions |

#### Group F: Property constraints & indexes (squash 3→1)
| New Migration | Squash From | Rationale |
|---------------|-------------|-----------|
| 012_property_enhancements | #18, #28, #36, #40 | All property ALTER+INDEX in one migration |

#### Group G: RLS policies (squash 3→1)
| New Migration | Squash From | Rationale |
|---------------|-------------|-----------|
| 013_rls_policy_enhancements | #14, #19, #23 | All policy additions |

#### Group H: Utility functions (keep separate — 2 migrations)
| Keep | Squash From | Rationale |
|------|-------------|-----------|
| 014_check_table_exists | #20 (partial), #25 | 2 revisions, squash to final |
| 015_neighborhood_stats | #20 (partial), #30 | 2 revisions, squash to final |

#### Group I: Cascade & invitation fixes (squash 2→1)
| New Migration | Squash From | Rationale |
|---------------|-------------|-----------|
| 016_household_enhancements | #13, #32 | Both ALTER user-related tables |

#### Group J: Household trigger saga (squash 3→1)
| New Migration | Squash From | Rationale |
|---------------|-------------|-----------|
| 017_household_user_count_trigger | #31, #34, #35 | 3 fixes for the same trigger |

#### Group K: Pending features (keep — 1 migration)
| Keep | Squash From | Rationale |
|------|-------------|-----------|
| 018_consolidated_features | #24 (with CREATE OR REPLACE fix) | Large but self-contained |

#### Group L: Neighborhood vibes & resolutions (keep separate — 2 migrations)
| Keep | Squash From | Rationale |
|------|-------------|-----------|
| 019_neighborhood_vibes | #29 | New table, separate domain |
| 020_household_resolutions | #33 | New table, separate domain |

#### Group M: Backfill functions (squash 3→1)
| New Migration | Squash From | Rationale |
|---------------|-------------|-----------|
| 021_backfill_functions | #37, #38, #39 | All backfill operations, 3 revisions of same domain |

### Summary

| Metric | Before | After | Reduction |
|--------|--------|-------|-----------|
| Total migrations | 40 | ~17 | 57% |
| Bugfix-only migrations | 7 | 0 | 100% (absorbed) |
| Functions with 3+ definitions | 5 functions across 16 migrations | 5 functions across 5 migrations | 69% |
| Search path gaps | 13 unhardened SECURITY DEFINER functions | 0 (all hardened) | 100% |

---

## 7. Consolidation Plan

### Phase 1: Fix critical issues (pre-squash)
1. Add `SET search_path = pg_catalog, public` to all 13 unhardened SECURITY DEFINER functions
2. Fix migration #24: change `CREATE FUNCTION` to `CREATE OR REPLACE FUNCTION` for idempotency
3. Add `IF NOT EXISTS` guards to bare `CREATE POLICY` statements in migrations #8 and #23

### Phase 2: Squash
Apply the squash plan above. For each group:
1. Extract the final state of all objects from the last migration in the chain
2. Create a new migration with all DDL in dependency order
3. Add DOWN scripts for all schema-changing operations
4. Apply search_path hardening to all SECURITY DEFINER functions

### Phase 3: Verify
1. Run `supabase db reset` to apply all squashed migrations
2. Verify all tables, functions, triggers, and policies exist
3. Run seed.sql to populate test data
4. Run the application test suite
5. Verify RLS policies are active on all tables

---

## 8. Risk Assessment

| Risk | Severity | Likelihood | Impact |
|------|----------|------------|--------|
| handle_new_user() missing search_path — injection vector on auth trigger | HIGH | LOW | An attacker who can create a malicious function in public schema could hijack new user creation |
| 10 geo functions as SECURITY DEFINER without search_path | MEDIUM | LOW | Same injection class, but lower-value targets |
| No DOWN scripts — can't rollback in production | MEDIUM | MEDIUM | Any bad migration requires manual intervention and possible downtime |
| consolidated_pending_features uses bare CREATE FUNCTION | LOW | LOW | Migration fails on re-run; only matters during reset/restore |
| 3 migrations for one trigger (household_user_count) — confusing history | LOW | HIGH | Developer confusion when debugging; harder to understand intent |

---

## Appendix A: Migration Inventory

| # | Migration | Lines | Creates | Alters | Drops | Idempotent |
|---|-----------|-------|---------|--------|-------|------------|
| 1 | setup_homematch_v2_schema | 6 | — | — | — | ✅ (IFNE) |
| 2 | create_core_tables | 23 | TABLE×2 | ADD FK | — | ✅ (IFNE) |
| 3 | create_neighborhoods_table | 13 | TABLE | — | — | ✅ (IFNE) |
| 4 | create_properties_table | 27 | TABLE | — | — | ✅ (IFNE) |
| 5 | create_interaction_tables | 22 | TABLE×2 | — | — | ✅ (IFNE) |
| 6 | create_indexes | 22 | INDEX×6 | — | — | ✅ (IFNE) |
| 7 | enable_rls | 7 | — | ENABLE RLS×3 | — | ✅ |
| 8 | create_rls_policies | 59 | POLICY×12 | — | — | ⚠️ (no IFNE) |
| 9 | fix_postgis_geometry_neighborhoods | 96 | — | ALTER COLUMN, ADD INDEX | — | ✅ (IFE) |
| 10 | fix_postgis_geometry_properties | 97 | — | ALTER COLUMN, ADD INDEX | — | ✅ (IFE) |
| 11 | add_user_profile_trigger | 18 | FUNC, TRIG | — | DROP TRIG | ✅ (IFE) |
| 12 | add_geographic_search_function | 80 | FUNC, INDEX | — | — | ✅ (IFNE) |
| 13 | add_cascade_delete | 37 | — | DROP/ADD FK | — | ✅ (IFE) |
| 14 | enable_marketing_read_policy | 31 | POLICY | ENABLE RLS | — | ✅ (IFNE/IFE) |
| 15 | create_interaction_summary_fn | 25 | FUNC | — | — | ✅ (IFNE) |
| 16 | harden_function_search_path | 73 | FUNC×3 | — | DROP TRIG | ✅ (IFE) |
| 17 | create_couples_optimization_fns | 130 | FUNC×3, INDEX, POLICY | — | — | ✅ (IFNE) |
| 18 | update_property_type_constraint | 27 | — | DROP/ADD CHECK | — | ✅ (IFE) |
| 19 | auth_admin_user_profiles_access | 25 | POLICY | — | — | ✅ (IFNE) |
| 20 | add_missing_rpc_functions | 225 | FUNC×4 | — | DROP FUNC×3 | ✅ (IFE) |
| 21 | fix_user_profile_trigger | 15 | FUNC | — | — | ⚠️ (removes sp) |
| 22 | add_user_profile_display_name | 46 | FUNC | ADD COLUMN×2, UPDATE | — | ✅ (IFNE) |
| 23 | add_interaction_delete_policy | 6 | POLICY | — | — | ⚠️ (no IFNE) |
| 24 | consolidated_pending_features | 262 | TABLE, FUNC, IDX, POLICY | ADD COLUMN | DROP | ❌ bare CREATE FUNC |
| 25 | secure_check_table_exists | 40 | FUNC | — | — | ✅ (sp) |
| 26 | restore_geo_rpcs_and_profile | 570 | FUNC×9 | ADD COLUMN, UPDATE | DROP FUNC×9 | ✅ (IFNE/IFE) |
| 27 | fix_geo_density_return_types | 61 | FUNC | — | — | ⚠️ (no sp) |
| 28 | add_zillow_images_refresh_marker | 12 | — | ADD COLUMN, ADD INDEX | — | ✅ (IFNE) |
| 29 | create_neighborhood_vibes | 54 | TABLE, POLICY | ADD COLUMN, ENABLE RLS | DROP TABLE | ✅ (IFNE/IFE) |
| 30 | fix_neighborhood_stats_ambiguity | 69 | FUNC | — | — | ✅ (sp) |
| 31 | sync_household_user_count | 77 | FUNC, TRIG | — | DROP TRIG | ✅ (IFE) |
| 32 | allow_revoked_household_invitation | 15 | — | ALTER COLUMN | — | ✅ (IFE) |
| 33 | create_household_property_resolutions | 79 | TABLE, POLICY | ADD COLUMN, ENABLE RLS | DROP TABLE | ✅ (IFNE/IFE) |
| 34 | fix_household_user_count_race | 201 | FUNC×2 | ADD COLUMN | DROP TRIG | ✅ (IFE) |
| 35 | fix_household_user_count_deadlock | 191 | FUNC×2 | — | DROP TRIG | ✅ (IFE) |
| 36 | optimize_property_indexes | 21 | INDEX×5 | — | — | ✅ (IFNE) |
| 37 | add_property_neighborhood_backfill | 61 | FUNC | — | — | ⚠️ (no sp) |
| 38 | backfill_property_neighborhoods_fb | 158 | FUNC | INSERT | — | ⚠️ (no sp) |
| 39 | backfill_property_coords_centroid | 105 | FUNC | — | — | ⚠️ (no sp) |
| 40 | add_city_state_keys | 17 | — | ADD COLUMN×2, ADD INDEX | — | ✅ (IFNE) |

---

## Appendix B: Search Path Hardening Template

For every SECURITY DEFINER function, add before `AS $$`:
```sql
SET search_path = pg_catalog, public
```

Full pattern:
```sql
CREATE OR REPLACE FUNCTION public.function_name(args)
RETURNS return_type
LANGUAGE plpgsql  -- or sql
SECURITY DEFINER
SET search_path = pg_catalog, public  -- ← required
AS $$
...
$$;
```
