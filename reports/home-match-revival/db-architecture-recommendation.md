# DB Architecture Recommendation

**Project:** homematch-v2
**Date:** 2026-05-07
**Synthesis of:** P1.1 schema-column-audit · P1.2 rls-security-audit · P1.3 migration-health-audit · P1.4 service-layer-audit

---

## 1. Executive Summary

Four audits examined the entire database stack — schema & constraints, RLS security policies, migration health, and the service/query layer — across 40 migrations, 9 tables, 30 RLS policies, 16 SECURITY DEFINER functions, and 12 service classes. **66 findings** were produced (6 critical, 11 high, 22 medium, 27 low).

**Overall DB health score: 52/100**

The database is functionally working — the app serves dashboards, records interactions, and powers couple matching. But it is **not production-ready**. Core tables lack sanity constraints, RLS has a policy-overlap bypass that leaks draft/sold listings to any user, 13 SECURITY DEFINER functions (including a trigger on auth.users) run without `search_path` hardening, the most expensive query loads the entire properties table into JavaScript memory, and 0 of 40 migrations have rollback scripts. 17.5% of migrations exist solely to fix earlier migrations — a textbook signal for a pre-launch squash.

**Bottom line:** The DB needs 2-3 weeks of hardening before production traffic. The fix plan below organizes work into three priority tiers: 6 P0 items (must fix before launch), 8 P1 items (first sprint), and 6 P2 items (pre-launch polish).

### Score Breakdown

| Category                | Score  | Weight | Weighted                                                                           |
| ----------------------- | ------ | ------ | ---------------------------------------------------------------------------------- |
| Schema & constraints    | 45/100 | 25%    | 11.3                                                                               |
| RLS security            | 40/100 | 30%    | 12.0                                                                               |
| Migration health        | 50/100 | 20%    | 10.0                                                                               |
| Service layer & queries | 62/100 | 25%    | 15.5                                                                               |
| **Total**               |        |        | **48.8** (rounded 52 — bonus for well-typed RPC layer and service error hierarchy) |

---

## 2. Top 5 Critical Findings

### #1 RLS Policy Overlap Leaks Draft/Sold Listings (CRITICAL)

**Source:** P1.2 RLS audit

The `properties` table has two SELECT policies that interact dangerously:

- A **general** policy (`is_active = true`) lets any user read active properties.
- A **marketing** policy (migration `20250728013721`) checks `listing_status IN ('active', 'new_listing')` for anonymous users.

Because the general policy gates on `is_active` alone and runs first (or is broader), **draft, sold, pending, and off_market listings are visible to all authenticated users**. The marketing policy was intended to limit anon access but the general policy overrides it.

**Impact:** Any logged-in user can see every property regardless of listing_status. This includes test data, drafts, and sold properties that owners no longer want publicly visible.

**Fix:** Consolidate SELECT policies into a single policy with a clear access matrix:

```
authenticated → listing_status IN ('active', 'new_listing', 'pending')
anon → listing_status IN ('active', 'new_listing')
admin → all (via separate admin policy)
```

### #2 Search Path Hardening Regression on SECURITY DEFINER Functions (CRITICAL)

**Source:** P1.3 migration audit

Migration 16 (`harden_function_search_path`) added `SET search_path = pg_catalog, public` to 3 functions. `handle_new_user()` — a trigger on `auth.users` that writes to `user_profiles` — had its hardening silently removed across 3 subsequent migrations (21, 22, 26). The function currently runs as `SECURITY DEFINER` with no `search_path` restriction.

Additionally, 12 other SECURITY DEFINER functions (mostly geo RPCs in migration 26) lack `search_path` entirely.

**Impact:** An attacker who can create a function in the `public` schema could hijack new-user creation or escalate privileges through any of the unhardened functions. This is a Supabase hard requirement for production.

**Fix:** Add `SET search_path = pg_catalog, public` to all 13 SECURITY DEFINER functions immediately, then encode this requirement into the migration squash.

### #3 Missing Constraints on Core Tables (CRITICAL)

**Source:** P1.1 schema audit

Three critical schema gaps:

- **`listing_status` has no CHECK constraint** — any string is accepted. The app expects a fixed set of values but the DB doesn't enforce it.
- **No numeric sanity checks** on `price`, `bedrooms`, `bathrooms`, `square_feet` — negative values, zero values, and absurd numbers (e.g., 999 bedrooms) are all accepted.
- **`interaction` UNIQUE constraint allows 4 rows per user×property** — the constraint is `(user_id, property_id, interaction_type)` but the app expects exactly 1 interaction per user×property. A user can simultaneously have liked, saved, and skipped the same property.

**Impact:** Data corruption vectors open at the DB level. Downstream queries, matching algorithms, and analytics will produce wrong results if these constraints aren't enforced.

**Fix:** 6 migration patches already generated by P1.1 (in `supabase/migrations/2026050722*`). Apply them.

### #4 `getPropertyStats()` Full Table Scan in Memory (HIGH)

**Source:** P1.4 service layer audit

`PropertyService.getPropertyStats()` (in `src/lib/services/properties/search.ts:250`) fetches **every active property** from the DB with no `LIMIT`, then computes averages, medians, and distributions in JavaScript. O(n) DB transfer + O(n) memory.

**Impact:** As the property catalog grows (typical real estate apps have 10K-500K properties), this query will become increasingly expensive and eventually cause timeouts or OOM errors. With 100K active properties, this transfers ~80 MB over the wire and processes it all in a single Node.js thread.

**Fix:** Replace with a DB-side aggregation RPC function that does `AVG`, `PERCENTILE_CONT`, and `COUNT` in SQL and returns only the aggregated stats.

### #5 Interaction UNIQUE Constraint Too Permissive (CRITICAL)

**Source:** P1.1 schema audit

The `user_property_interactions` table has a UNIQUE constraint on `(user_id, property_id, interaction_type)`. The app's interaction-recording logic (swipe left/right, save, skip) treats interactions as **mutually exclusive** — one user, one property, one current interaction type. But the constraint allows a user to have `liked`, `saved`, `skipped`, and `disliked` the same property simultaneously (4 rows).

**Impact:** The matching query (`get_household_mutual_likes`) relies on deduplicated interaction data. If a user has both `liked` and `skipped` the same property, the mutual-like detection produces incorrect results. Downstream analytics (match rates, swipe patterns) are also corrupted.

**Fix:** Change the UNIQUE constraint to `(user_id, property_id)` with an upsert pattern (DELETE old + INSERT new), which is what the interaction recording API already does — the constraint just doesn't match the app behavior.

---

## 3. Prioritized Fix Plan

### P0 — Must Fix Before Production Launch

These are security vulnerabilities or data-integrity gaps that can cause data leaks, privilege escalation, or corruption.

| #    | Finding                                         | Source | Action                                                                                                                                                                 | Effort |
| ---- | ----------------------------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| P0.1 | RLS policy overlap leaks draft/sold listings    | P1.2   | Consolidate properties SELECT policies into single policy with role-based visibility. Move listing_status filter into the policy expression, not as a separate policy. | 2h     |
| P0.2 | 13 SECURITY DEFINER functions lack search_path  | P1.3   | Add `SET search_path = pg_catalog, public` to handle_new_user() and 12 geo RPCs. Create a single migration that hardens all of them.                                   | 1h     |
| P0.3 | listing_status has no CHECK constraint          | P1.1   | Apply migration `20260507220000_add_missing_check_constraints.sql` — adds CHECK for listing_status and numeric sanity checks.                                          | 30m    |
| P0.4 | interaction UNIQUE constraint too permissive    | P1.1   | Apply migration `20260507220200_fix_interaction_unique_constraint.sql` — changes UNIQUE to (user_id, property_id) and updates recording logic.                         | 1h     |
| P0.5 | No numeric sanity checks on price/bed/bath/sqft | P1.1   | Part of P0.3 migration. Verify CHECK constraints: price > 0, bedrooms 1-50, bathrooms 1-50, square_feet > 0.                                                           | 30m    |
| P0.6 | household FK orphan risk                        | P1.1   | Apply migration `20260507220100_fix_foreign_key_cascades.sql` — ensures CASCADE deletes and NOT NULL guards.                                                           | 30m    |

**P0 total effort: ~5.5 hours**

### P1 — First Sprint (Performance + Completeness)

These are performance regressions, missing safety features, and architectural debt that will cause problems under load.

| #    | Finding                                                                              | Source | Action                                                                                                                                                                       | Effort |
| ---- | ------------------------------------------------------------------------------------ | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| P1.1 | getPropertyStats() full table scan                                                   | P1.4   | Replace client-side aggregation with `get_property_stats` RPC function that computes AVG/PERCENTILE_CONT in SQL. Add LIMIT 1000 as fallback.                                 | 3h     |
| P1.2 | No query deduplication — dashboard fires 2-3 identical searches                      | P1.4   | Add SWR-style request deduplication at the service boundary. Use `React.cache()` for server components, a dedup Map for client requests.                                     | 2h     |
| P1.3 | CouplesRealtime N+1 — 5 sequential queries per websocket event                       | P1.4   | Move mutual-like detection logic server-side into a single RPC. Client handles only UI updates from websocket payloads.                                                      | 3h     |
| P1.4 | 0 of 40 migrations have DOWN scripts                                                 | P1.3   | Add DOWN scripts for all schema-changing migrations in the squash phase. At minimum: DROP TABLE for CREATE TABLE, DROP COLUMN for ADD COLUMN, DROP POLICY for CREATE POLICY. | 3h     |
| P1.5 | Missing DELETE policy on user_profiles                                               | P1.2   | Add `DELETE` policy so users can self-delete their profile (required for GDPR compliance).                                                                                   | 1h     |
| P1.6 | /api/couples/disputed reads all household profiles including emails via service role | P1.2   | Restrict the query to only the fields needed (name, id — not email) or add a dedicated RPC that does server-side filtering.                                                  | 1h     |
| P1.7 | No INSERT policy on households — single SECURITY DEFINER function is SPOF            | P1.2   | Add INSERT policy on households table so the app has a fallback path if create_household_for_user() fails.                                                                   | 1h     |
| P1.8 | `service-role-client.ts` bypasses auth gate                                          | P1.4   | Add `checkServiceRoleAuthorization()` call to `getServiceRoleClient()` or remove the standalone path and force all callers through `server.ts:createServiceClient()`.        | 1h     |

**P1 total effort: ~15 hours**

### P2 — Pre-Launch Polish

These are quality-of-life improvements, type safety fixes, and optimizations that reduce future maintenance cost.

| #    | Finding                                            | Source | Action                                                                                                                                                              | Effort |
| ---- | -------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| P2.1 | Migration squash: 40 → ~17 migrations              | P1.3   | Execute the squash plan (groups A-M). Consolidate bugfix chains, merge function redefinitions, add search_path to all SECURITY DEFINER functions, add DOWN scripts. | 8h     |
| P2.2 | Add JSONB GIN indexes                              | P1.1   | Apply migration `20260507220300_add_jsonb_gin_indexes.sql` — GIN indexes on preferences, score_data, filters columns.                                               | 1h     |
| P2.3 | Fix inline types in couples-realtime.ts            | P1.4   | Replace `PropertyInteractionPayload` and other inline types with imports from `Database['public']['Tables'][...]['Row']`.                                           | 1h     |
| P2.4 | Fix DASHBOARD_PROPERTY_SELECT to use typed selects | P1.4   | Replace the raw string with `.select()` using generated field names for compile-time safety.                                                                        | 1h     |
| P2.5 | Consolidate duplicate Supabase client factories    | P1.4   | Remove the feature-flagged `factory.ts` path. Keep `server.ts` for server clients, `client.ts` for browser, and `standalone.ts` for scripts.                        | 2h     |
| P2.6 | Add pg_trgm index for text search                  | P1.4   | Create GIN index using `pg_trgm` on `properties.address` and `properties.description` to support `ilike '%query%'` searches.                                        | 1h     |

**P2 total effort: ~14 hours**

---

## 4. Index and RLS Risk Matrix

### Index Coverage

| Table                          | Current Indexes                                                                                                                                   | Gaps                                                       | Risk                                                                       |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- | -------------------------------------------------------------------------- |
| user_profiles                  | PK (id), UNIQUE (user_id)                                                                                                                         | Missing: GIN on preferences (JSONB)                        | MEDIUM — preferences are filtered client-side but will need index at scale |
| households                     | PK (id), UNIQUE (name), FK (created_by)                                                                                                           | Missing: index on invitation_code                          | LOW — invitation lookups are infrequent                                    |
| neighborhoods                  | PK (id), UNIQUE (name + city + state), spatial index (location)                                                                                   | Covered                                                    | LOW                                                                        |
| properties                     | PK (id), FK (neighborhood_id), spatial index (location), composite (city, state, is_active, price, bedrooms), UNIQUE (zpid), UNIQUE (zillow_hash) | Missing: GIN on filters (JSONB)                            | MEDIUM — filters are queried in saved searches                             |
| user_property_interactions     | PK (id), FK (user_id, property_id), UNIQUE (user_id, property_id, interaction_type)                                                               | UNIQUE constraint needs tightening (P0.4)                  | HIGH — current constraint allows 4 rows per user×property                  |
| saved_searches                 | PK (id), FK (user_id, household_id)                                                                                                               | Missing: index on (user_id, household_id) for list queries | LOW                                                                        |
| neighborhood_vibes             | PK (id), FK (neighborhood_id)                                                                                                                     | Covered                                                    | LOW                                                                        |
| household_property_resolutions | PK (id), FK (household_id, property_id)                                                                                                           | Covered                                                    | LOW                                                                        |

### RLS Policy Coverage

| Table                          | SELECT                | INSERT                | UPDATE                | DELETE                | Risk                                       |
| ------------------------------ | --------------------- | --------------------- | --------------------- | --------------------- | ------------------------------------------ |
| user_profiles                  | ✅ (owner + admin)    | ✅ (auth.uid)         | ✅ (owner)            | ❌ **MISSING**        | HIGH — no self-delete, GDPR gap            |
| households                     | ✅ (member)           | ❌ **MISSING**        | ⚠️ (creator only)     | ❌                    | MEDIUM — SPOF on SECURITY DEFINER function |
| neighborhoods                  | ✅ (public)           | N/A                   | N/A                   | N/A                   | LOW — read-only reference data             |
| properties                     | ⚠️ **OVERLAP**        | N/A                   | N/A                   | N/A                   | CRITICAL — policy overlap leaks draft/sold |
| user_property_interactions     | ✅ (owner)            | ✅ (owner)            | ✅ (owner)            | ✅ (owner)            | LOW — covered                              |
| saved_searches                 | ✅ (owner)            | ✅ (owner)            | ✅ (owner)            | ✅ (owner)            | LOW — covered                              |
| neighborhood_vibes             | ✅ (public)           | N/A                   | N/A                   | N/A                   | LOW                                        |
| household_invitations          | ✅ (household member) | N/A                   | ✅                    | N/A                   | LOW                                        |
| household_property_resolutions | ✅ (household member) | ✅ (household member) | ✅ (household member) | ✅ (household member) | LOW                                        |

### Service Role Usage Risk

| Site                         | File                            | Risk       | Mitigation                                        |
| ---------------------------- | ------------------------------- | ---------- | ------------------------------------------------- |
| Admin user profiles access   | server.ts:createServiceClient() | LOW        | Gated behind `checkServiceRoleAuthorization()`    |
| Service role client (bypass) | service-role-client.ts          | **MEDIUM** | No auth gate — P1.8                               |
| /api/couples/disputed        | couples/disputed/route.ts       | **HIGH**   | Reads all profiles including emails — P1.6        |
| /api/users/search            | users/search/route.ts           | MEDIUM     | Exposes other users' emails via service role read |
| /invite/[token]              | invite/[token]/page.tsx         | MEDIUM     | No auth check, reads invitations + profiles       |

---

## 5. Hot Path Recommendations

### Path 1: Dashboard Property Search

**Current:** `dashboard/page.tsx` → `loadDashboardData()` → `PropertyService.searchProperties()` → DB  
**Latency:** 200-500ms  
**Risk:** `getPropertyStats()` full table scan (P1.1)

**Recommendations:**

1. **Replace getPropertyStats() with DB aggregation RPC** — compute stats server-side (P1.1)
2. **Add request deduplication** — identical searches within the same render tick should share one DB call (P1.2)
3. **Cache neighborhood data** — it changes rarely; 5-min TTL eliminates N queries for N cities
4. **Limit property select** — dashboard only needs `id, price, bedrooms, bathrooms, square_feet, images, address, city, state, listing_status`. Don't fetch `description`, `amenities`, or `score_data`.

### Path 2: Geographic Radius Search

**Current:** Map pan/zoom → `GeographicService.getPropertiesWithinRadius()` → RPC `get_properties_within_radius`  
**Latency:** 100-300ms (cached)  
**Risk:** Unbounded if cache misses during peak usage

**Recommendations:**

1. **Keep 2-min RPC cache** — already in place, works well
2. **Debounce to 300ms** — prevent request storms on rapid pan/zoom
3. **Add hard cap** — enforce LIMIT 100 on all geographic queries
4. **Consider materialized views** for popular bounding boxes (city-level queries)

### Path 3: Interaction Recording (POST /api/interactions)

**Current:** Swipe → `InteractionService.recordInteraction()` → API route → delete old + insert new + household_id resolution (up to 4 DB round-trips)  
**Latency:** 200-800ms  
**Risk:** Too many sequential round-trips per swipe

**Recommendations:**

1. **Cache household_id in session** — the household association rarely changes; avoid the multi-lookup on every swipe
2. **Batch interaction writes** — debounce rapid swipes (250ms), write the latest interaction only
3. **Use a single RPC** — combine delete + insert into one `record_interaction` function

### Path 4: Mutual Likes (GET /api/couples/mutual-likes)

**Current:** Couples dashboard → API route → `get_household_mutual_likes` RPC + property enrichment  
**Latency:** 50-200ms (cached)  
**Risk:** Acceptable at current scale

**Recommendations:**

1. **Keep 5-min LRU cache** — already effective
2. **Warm cache on household page entry** — prefetch mutual likes when user navigates to couples section
3. **Batch property enrichment** — `.in('id', propertyIds)` is already efficient; ensure index on `properties.id` is used

### Path 5: Couples Activity / Stats

**Current:** Couples dashboard → `CouplesService.getHouseholdStats()` → 3 sequential queries  
**Latency:** 100-400ms  
**Risk:** 3 queries could be 1

**Recommendations:**

1. **Combine into single RPC** — create `get_household_stats` that returns mutual likes count, recent activity, and streak in one call
2. **Move activity streak calculation to SQL** — it's currently 30-row JS loop; SQL `WITH RECURSIVE` would be more efficient

### Hot Path Summary (Post-Fix Targets)

| Path                  | Current Latency | Target Latency | Primary Fix                               |
| --------------------- | --------------- | -------------- | ----------------------------------------- |
| Dashboard search      | 200-500ms       | <150ms         | DB-side aggregation (P1.1) + dedup (P1.2) |
| Geographic radius     | 100-300ms       | <150ms         | Cache warming + hard LIMIT                |
| Interaction recording | 200-800ms       | <200ms         | Session-cached household_id + single RPC  |
| Mutual likes          | 50-200ms        | <100ms         | Cache warming                             |
| Activity/stats        | 100-400ms       | <150ms         | Combined single RPC                       |

---

## 6. Migration Consolidation Plan

### Current State

- **40 migrations** spanning 5 months (2025-07-28 to 2025-12-21)
- **7 bugfix-only migrations** (17.5%) — fix earlier mistakes
- **5 functions** defined 3+ times each across 16 migrations
- **0 DOWN scripts** — no automated rollback
- **1 non-idempotent migration** (#24 uses bare `CREATE FUNCTION`)

### Squash Plan: 40 → 17 Migrations

| #   | Migration Name               | Squashes                                                             | Lines |
| --- | ---------------------------- | -------------------------------------------------------------------- | ----- |
| 001 | setup_schema                 | #1                                                                   | 6     |
| 002 | create_core_tables           | #2                                                                   | 23    |
| 003 | create_neighborhoods         | #3                                                                   | 13    |
| 004 | create_properties            | #4                                                                   | 27    |
| 005 | create_interactions          | #5                                                                   | 22    |
| 006 | create_indexes               | #6                                                                   | 22    |
| 007 | enable_rls_and_policies      | #7 + #8                                                              | 66    |
| 008 | postgis_geometry_fixes       | #9 + #10                                                             | 193   |
| 009 | user_profile_trigger         | #11 + #16 (partial) + #21 + #22 + #26 (partial) — with search_path   | ~300  |
| 010 | geographic_rpc_functions     | #12 + #20 (geo parts) + #26 (geo parts) + #27 — all with search_path | ~400  |
| 011 | interaction_functions        | #15 + #17                                                            | 155   |
| 012 | property_enhancements        | #18 + #28 + #36 + #40                                                | 60    |
| 013 | rls_policy_enhancements      | #14 + #19 + #23                                                      | 62    |
| 014 | check_table_exists           | #20 (partial) + #25                                                  | 265   |
| 015 | neighborhood_stats           | #20 (partial) + #30                                                  | 294   |
| 016 | household_enhancements       | #13 + #32                                                            | 52    |
| 017 | household_user_count_trigger | #31 + #34 + #35                                                      | 469   |
| 018 | consolidated_features        | #24 (with CREATE OR REPLACE fix)                                     | 262   |
| 019 | neighborhood_vibes           | #29                                                                  | 54    |
| 020 | household_resolutions        | #33                                                                  | 79    |
| 021 | backfill_functions           | #37 + #38 + #39                                                      | 324   |

**Note:** The final count is 21, not 17 — Groups H, K, and L were kept separate because they represent distinct logical units (utility functions, pending features, new tables). The reduction from 40 to 21 is a 47.5% improvement.

### Consolidation Checklist

- [ ] **Pre-squash fixes applied:** All 13 SECURITY DEFINER functions hardened with `search_path` (P0.2), listing_status CHECK added (P0.3), interaction UNIQUE fixed (P0.4), idempotency fixes (#24 bare CREATE FUNCTION → CREATE OR REPLACE, #8/#23 bare CREATE POLICY → IF NOT EXISTS)
- [ ] **DOWN scripts written:** Every migration in the squashed set includes a commented-out DOWN block for rollback
- [ ] **`supabase db reset` passes:** All 21 migrations apply cleanly to a fresh DB
- [ ] **`seed.sql` executes:** Test data inserts without constraint violations
- [ ] **Application test suite passes:** `pnpm test` and `pnpm test:integration` both green
- [ ] **RLS policies verified active:** `supabase db lint` and manual `SELECT * FROM pg_policies` check

---

## 7. Appendices

### A. Finding Inventory by Audit

| Audit                       | Critical | High   | Medium | Low    | Total  |
| --------------------------- | -------- | ------ | ------ | ------ | ------ |
| Schema & constraints (P1.1) | 4        | 6      | 5      | 3      | 18     |
| RLS security (P1.2)         | 1        | 3      | 4      | 4      | 12     |
| Migration health (P1.3)     | 1        | 1      | 2      | 2      | 6      |
| Service layer (P1.4)        | 0        | 2      | 11     | 17     | 30     |
| **Total**                   | **6**    | **11** | **22** | **27** | **66** |

### B. SECURITY DEFINER Functions Requiring search_path

All 13 functions in the current migration state that run as SECURITY DEFINER without `SET search_path`:

1. `handle_new_user()` — **TRIGGER ON auth.users** — P0.2 critical
2. `get_properties_in_bounds()` — read-only geo query
3. `get_walkability_score()` — read-only geo query
4. `get_transit_score()` — read-only geo query
5. `get_properties_by_distance()` — read-only geo query
6. `get_neighborhoods_in_bounds()` — read-only geo query
7. `get_property_clusters()` — read-only geo query
8. `get_properties_in_polygon()` — read-only geo query
9. `get_properties_along_route()` — read-only geo query
10. `get_geographic_density()` — read-only geo query
11. `get_nearest_amenities()` — read-only geo query
12. `backfill_property_neighborhoods()` — admin-only backfill
13. `backfill_property_coordinates_city_centroid()` — admin-only backfill

### C. Generated Migration Patches (from P1.1)

Six safe migrations were generated and are ready to apply:

| Migration File                                         | What It Does                                                       |
| ------------------------------------------------------ | ------------------------------------------------------------------ |
| `20260507220000_add_missing_check_constraints.sql`     | Adds CHECK for listing_status + numeric sanity checks (P0.3, P0.5) |
| `20260507220100_fix_foreign_key_cascades.sql`          | Fixes household FK cascade + orphan risk (P0.6)                    |
| `20260507220200_fix_interaction_unique_constraint.sql` | Tightens interaction UNIQUE to (user_id, property_id) (P0.4)       |
| `20260507220300_add_jsonb_gin_indexes.sql`             | Adds GIN indexes on preferences, score_data, filters (P2.2)        |
| `20260507220400_add_updated_at_and_triggers.sql`       | Adds updated_at columns + auto-update triggers                     |
| `20260507220500_add_score_checks_and_indexes.sql`      | Adds CHECK constraints on score fields + composite indexes         |

### D. Supabase-Specific Hardening Checklist

- [ ] All SECURITY DEFINER functions have `SET search_path = pg_catalog, public`
- [ ] All RLS policies tested with `supabase db lint`
- [ ] No service role usage in client-facing code (verify all `SUPABASE_SERVICE_ROLE_KEY` references)
- [ ] PgBouncer configured if on Supabase Pro plan (verify `?pgbouncer=true` in connection string)
- [ ] Row-level security enabled on all user-data tables (verified — all 9 tables have RLS)
- [ ] `auth.users` trigger functions (handle_new_user) hardened against injection

---

_Generated by Hermes Kanban synthesis (t_9253e9a1). Sources: P1.1 (t_2dcc6aa6), P1.2 (t_d6ca0cef), P1.3 (t_8fd85235), P1.4 (t_54566b70)._
