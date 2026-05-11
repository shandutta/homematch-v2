# Supabase Query Audit — 2026-05-09

Scope: `src/lib/services/` and `src/app/api/`. Read-only; no code changes.

Files examined: 12 service files + 16 API route files that call `.from()`/`.rpc()`. Indexes cross-referenced against `supabase/migrations/*.sql`.

## Summary by Category

| Category                                   | Count                                                                                               | Top files                                                                                                                                                                                        |
| ------------------------------------------ | --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| N+1 / per-item awaited queries in loops    | 5                                                                                                   | `vibes/backfill.ts`, `admin/generate-neighborhood-vibes/route.ts`, `admin/generate-vibes/route.ts`, `admin/status-refresh/route.ts`, `couples/disputed/route.ts`                                 |
| Missing pagination (`.limit`/`.range`)     | High (most `users.ts`, `users-client.ts`, `properties/crud.ts`, `properties/neighborhood.ts` reads) | services-wide                                                                                                                                                                                    |
| Unfiltered / `select('*')`                 | ~30 sites                                                                                           | `users.ts`, `properties/neighborhood.ts`, `properties/crud.ts`, `vibes/backfill.ts`                                                                                                              |
| Sequential awaits (could be `Promise.all`) | 2+                                                                                                  | `properties/neighborhood.ts:298` already batched; `couples.ts:540` already batched. Others (admin routes) still serial.                                                                          |
| Likely missing indexes                     | 4–5 columns                                                                                         | `user_property_interactions(user_id,interaction_type)`, `user_property_interactions(property_id, created_at)`, `household_invitations(token)` (present), `properties(neighborhood_id)` (present) |

## High-Severity Findings

### H1. N+1: per-neighborhood listing+stats fetch

- **Where**: `src/app/api/admin/generate-neighborhood-vibes/route.ts:113-141`
- **Pattern**: `for (const neighborhood of neighborhoods) { await Promise.all([...properties query, fetchNeighborhoodStats]) }` — one round trip per neighborhood (×N). With `limit=25` default that's 50 sequential RTTs.
- **Fix**: Single `properties` query with `.in('neighborhood_id', ids)` then group in memory; batch stats via RPC or `.in()`.

### H2. N+1: per-property update in vibes backfill

- **Where**: `src/lib/services/vibes/backfill.ts:195`, `:301`, `:312`
- **Pattern**: `for (const batch of chunkArray(...))` then per-property `.eq('id', property.id)` updates.
- **Fix**: Use `upsert([])` with batch arrays, or `update().in('id', ids)` where columns are uniform; otherwise pipeline updates with `Promise.all` inside the chunk.

### H3. N+1: per-result inserts in admin/generate-vibes

- **Where**: `src/app/api/admin/generate-vibes/route.ts:224`, `:311`
- **Pattern**: `for (const result of batchResult.success)` performing inserts per result. Same in `admin/generate-neighborhood-vibes/route.ts:158`.
- **Fix**: Batch into one `insert([...rows])` call.

### H4. N+1: per-row writes in admin/status-refresh

- **Where**: `src/app/api/admin/status-refresh/route.ts:216`
- **Pattern**: paginated read (`range(offset, +batchSize)`), then `for (const row of rows)` mutating each. Pagination is good; per-row writes inside the loop are not.
- **Fix**: Group by status and run `update({status}).in('id', idsForThatStatus)` per group.

### H5. N+1: per-resolution lookups in couples/disputed

- **Where**: `src/app/api/couples/disputed/route.ts:157`
- **Pattern**: `for (const resolution of resolutions ?? [])` likely fetching property/user details per resolution.
- **Fix**: Collect ids, single `.in('id', ids)` fetch, hydrate in memory.

## Medium-Severity Findings

### M1. Unbounded `select('*')` reads on growing tables

Sites lacking `.limit()`/`.range()` on tables that grow per user/listing:

- `src/lib/services/users.ts:32, 167, 203, 273, 347, 392, 411, 430, 451, 487` — household + invitation + saved-search reads use `select('*')` without limits. Most are bounded by `.eq('id', …)` (PK), but list-style reads (`saved_searches by user_id` at L488; `household members by household_id` at L274) need explicit `.limit()` + ordering for safety.
- `src/lib/services/properties/neighborhood.ts:37, 121, 151, 176, 302` — neighborhood/property fetches with `select('*')`. Cards only need a subset; `*` here pulls JSON blobs (raw_data, images) the UI doesn't use.
- `src/lib/services/properties/crud.ts:29, 171, 196` — `select('*')` on properties; same issue (raw_data/photo arrays bloat payload).

**Fix**: Replace `*` with explicit projection (id, address, price, beds, baths, sqft, primary_photo_url). Add `.limit(N)` + `.order('created_at', { ascending: false })` to list queries.

### M2. `users.ts:451` saved-search list & `:430` interaction list — no pagination

- `.eq('user_id', …).order('created_at', desc)` with no `.limit()` or `.range()`. As `user_property_interactions` grows (one row per swipe), this returns the full lifetime swipe history.
- **Fix**: Add `.range(offset, offset+pageSize-1)` and accept paging params.

### M3. `properties/search.ts:185, 364, 410` — `select('*')` in search paths

- Hot path. Returning `*` from `properties` (large JSONB columns) on every search inflates payload + CPU.
- **Fix**: Project only fields the card grid uses; defer detail fetch to property-detail endpoint.

### M4. `neighborhood-vibes/backfill.ts:345` — `select('*')` on neighborhoods, then optional filters

- Without `.limit()` this will scan all neighborhoods.
- **Fix**: Require an explicit cap (`.limit(maxPerRun)`) and `.order('id')`.

### M5. `users-client.ts` — runs in browser, returns `select('*')` user-profile rows

- L43, L209, L338 — `select('*')` of `user_profiles`. RLS enforces per-user, but `*` includes `preferences` JSONB (potentially large).
- **Fix**: Explicit projection.

## Index Coverage

Cross-checked filter/order columns vs migrations:

| Query column                                          | Index?                           | Source                                                                                         |
| ----------------------------------------------------- | -------------------------------- | ---------------------------------------------------------------------------------------------- |
| `user_property_interactions.user_id`                  | ✓                                | `20250728013707_create_indexes.sql:15`                                                         |
| `user_property_interactions.property_id`              | ✓                                | `:16`                                                                                          |
| `user_property_interactions.household_id`             | ✓                                | `:17`                                                                                          |
| `user_property_interactions.interaction_type`         | ✓                                | `:18`                                                                                          |
| `(user_id, interaction_type, created_at)` composite   | ✗                                | hot pattern at `users.ts:431-433` & `:452-454` would benefit; only single-column indexes exist |
| `(user_id, is_active, created_at)` for saved_searches | ✗                                | `users.ts:488-490` does this filter+order                                                      |
| `properties.neighborhood_id`                          | ✓                                | `:3` and composite `_active_neighborhood` (`20251218120000`)                                   |
| `properties.is_active`+other                          | ✓ composites in `20251218120000` |
| `household_invitations.token`                         | ✓                                | `20251130200000:106`                                                                           |
| `household_invitations.household_id`                  | ✓                                | `:107`                                                                                         |
| `neighborhood_vibes.neighborhood_id`                  | ✓                                | `20251215090000:30`                                                                            |
| `property_vibes.property_id`                          | ✓                                | `20251130200000:43`                                                                            |

**Recommended new indexes**:

1. `CREATE INDEX idx_user_property_interactions_user_type_created ON user_property_interactions(user_id, interaction_type, created_at DESC)` — supports `users.ts:431, 452`.
2. `CREATE INDEX idx_saved_searches_user_active_created ON saved_searches(user_id, is_active, created_at DESC) WHERE is_active = true` — partial index, supports `users.ts:488`.
3. Verify `user_profiles.household_id` order index exists (only the b-tree at `:20` does — fine, low-cardinality).

## Sequential-await opportunities

- `src/app/api/admin/status-refresh/route.ts` — paginated batches are sequential by design (rate limiting); leave.
- `src/app/api/admin/generate-vibes/route.ts:84-101` — two list queries run serially before the loop; could `Promise.all`.
- `src/lib/services/properties/neighborhood.ts:298` — already uses `Promise.all([neighborhood, properties, stats])` ✓.
- `src/lib/services/couples.ts:540` — already uses `Promise.all` ✓.

## `select()` post-mutation usage

Routes use bare `.select()` after `insert/update/upsert` (e.g. `users.ts:58, 82, 152, 188, 298, 324, 374, 472, 509`, `properties/crud.ts:87, 120`, `properties/neighborhood.ts:65, 93`, `interactions/route.ts:105, 353`, `users-client.ts:28, 63, 103, 151, 190, 272, 297, 323, 360`). This is fine semantically (returns the just-mutated row), but combined with no projection it returns `*`.

**Fix**: Use `.select('id, ...explicit')` to keep payloads small and avoid leaking new columns by accident.

## Top 5 Highest-Impact Fixes

1. **Batch the per-neighborhood loop in `admin/generate-neighborhood-vibes/route.ts:113`** — one `properties .in('neighborhood_id', ids)` query replaces N. (H1)
2. **Replace `select('*')` in `properties/search.ts` and `properties/neighborhood.ts`** with explicit card-projection — biggest payload win on the hot listing path. (M3, M4)
3. **Add composite index `(user_id, interaction_type, created_at DESC)` on `user_property_interactions`** — supports `users.ts:431` and `:452`, primary couples/swipe-history queries.
4. **Paginate the saved-search and interaction list reads in `users.ts:430, 451, 487`** — currently unbounded; will degrade as users accumulate swipes.
5. **Batch updates in `vibes/backfill.ts:301, 312`** with `update().in('id', ids)` per group, or `upsert(rows)` — backfill currently does N sequential writes per chunk.

## Files scanned

Services (12): `base.ts`, `couples.ts`, `interactions.ts`, `locations-client.ts`, `properties.ts`, `users.ts`, `users-client.ts`, `properties/{crud,geographic,neighborhood,search}.ts`, `vibes/backfill.ts`, `neighborhood-vibes/backfill.ts`, plus filter builder.

API routes (16): under `src/app/api/{users,couples,interactions,health,maps,neighborhoods,properties,admin}/...`.

Migrations cross-referenced: 20 files in `supabase/migrations/`.

---

_Read-only audit. No source files modified._
