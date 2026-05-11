# Service Layer & Query Pattern Audit

**Repo:** /home/shan/projects/homematch-v2  
**Audit scope:** `src/` — all Supabase client setups, service classes, API routes, and data access patterns  
**Date:** 2026-05-07  
**Task:** P1.4 (t_54566b70)

---

## 1. Supabase Client Setup

### 1.1 Client Instances — Inventory

| File                                                | Client Type                                   | Key Used                        | Context                           | Singleton?                    |
| --------------------------------------------------- | --------------------------------------------- | ------------------------------- | --------------------------------- | ----------------------------- |
| `src/lib/supabase/client.ts`                        | `createBrowserClient` (from `@supabase/ssr`)  | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Browser                           | Per-call factory              |
| `src/lib/supabase/server.ts:createClient()`         | `createServerClient` (from `@supabase/ssr`)   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Server Components, cookie-based   | Per-call factory              |
| `src/lib/supabase/server.ts:createApiClient()`      | `createServerClient` (from `@supabase/ssr`)   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | API Routes, `NextRequest` context | Per-request                   |
| `src/lib/supabase/server.ts:createServiceClient()`  | `createServerClient` (from `@supabase/ssr`)   | `SUPABASE_SERVICE_ROLE_KEY`     | Server only, admin ops            | Per-call (with auth gate)     |
| `src/lib/supabase/standalone.ts`                    | `createClient` (from `@supabase/supabase-js`) | `SUPABASE_SERVICE_ROLE_KEY`     | Scripts, migrations, tests        | Per-call (cached in test env) |
| `src/lib/supabase/factory.ts:SupabaseClientFactory` | All above, unified                            | Varies by context               | Feature-flagged factory           | Singleton w/ cache            |
| `src/lib/supabase/service-role-client.ts`           | Delegates to factory                          | `SUPABASE_SERVICE_ROLE_KEY`     | Thin wrapper                      | No                            |

**Total distinct client-creation pathways:** 7

### 1.2 Server vs Browser vs Service Role

- **Browser:** `client.ts` → `createBrowserClient()`. Used by `CouplesRealtime`, `BaseService.getSupabase()` when `typeof window !== 'undefined'`. Uses anon key, is safe.
- **Server (cookie-based):** `server.ts:createClient()`. Used by Server Actions (`actions.ts`), `optional-user.ts`, `checkServiceRoleAuthorization()`. Uses anon key. Reads `Authorization` header as bearer token override.
- **API Routes:** `server.ts:createApiClient()`. Used by all API route handlers. Sets `autoRefreshToken: false`, `persistSession: false`. Correct design.
- **Service Role:** `server.ts:createServiceClient()` gates access behind `checkServiceRoleAuthorization()` which verifies the caller has a `role === 'admin'` in `user_profiles`. Good safety measure. Also accessible via `service-role-client.ts` which delegates to factory (no auth gate in factory path — see risk below).
- **Standalone:** `standalone.ts` for scripts/migrations. Always uses service role key. No auth. Correct for its purpose.

### 1.3 Hardcoded Keys

**No hardcoded keys found.** All credentials come from environment variables:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_LOCAL_PROXY_TARGET` (for local dev proxy)

Non-null assertions (`!`) are used on env vars in `server.ts`, `factory.ts`, and `standalone.ts`. If env vars are missing at runtime, this will throw on server startup rather than at the point of use — acceptable but could be made friendlier.

### 1.4 Findings: Client Setup

| #   | Severity   | Finding                                                                                                                                                                                                                                                                   | File:Line                                    | Recommendation                                                                                                                   |
| --- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| C1  | **Medium** | Duplicate client factories: `server.ts`/`client.ts` (production) AND `factory.ts` (feature-flagged). Two code paths that must stay in sync.                                                                                                                               | server.ts:104, factory.ts:23                 | Remove feature flag and consolidate. Factory's `shouldCache()` logic differs from server.ts (`httpOnly` cookie difference).      |
| C2  | **Low**    | `factory.ts:SupabaseClientFactory` caches BROWSER and SERVICE clients indefinitely in `clientCache` Map. No TTL, no eviction. If tokens expire, cached clients serve stale state.                                                                                         | factory.ts:25, factory.ts:261-265            | Add TTL to cache or use `WeakRef`. Consider per-request server clients (they aren't cacheable anyway).                           |
| C3  | **Medium** | `service-role-client.ts` creates service role client via factory with NO authorization check. The gateway in `server.ts:checkServiceRoleAuthorization()` is bypassed.                                                                                                     | service-role-client.ts:14, server.ts:273-311 | Add auth gate to `getServiceRoleClient()` or remove it and force callers through `server.ts:createServiceClient()`.              |
| C4  | **Low**    | `standalone.ts` uses service role and caches test clients in a Map keyed on URL+key. Cache is never cleared — fine for test isolation but could cause cross-test contamination in vitest parallel mode.                                                                   | standalone.ts:8, standalone.ts:32            | Include vitest pool ID in cache key (already done for storageKey). Cache eviction not needed for tests since runtime is bounded. |
| C5  | **Low**    | `loadDashboardData` creates a standalone anon client (`createStandaloneClient` from `@supabase/supabase-js` directly) for cached dashboard queries. This bypasses the `@supabase/ssr` cookie-based session management but is intentional for anonymous property browsing. | data/loader.ts:45-53                         | OK as designed. Document the intent clearly.                                                                                     |

---

## 2. Query Patterns

### 2.1 `.single()` vs `.maybeSingle()` Usage

| File                        | Method           | Usage                                              | Correct?  |
| --------------------------- | ---------------- | -------------------------------------------------- | --------- |
| `properties/crud.ts:32`     | `.single()`      | `getProperty()` — expects exactly 1 row            | Yes       |
| `properties/crud.ts:63`     | `.single()`      | `getPropertyWithNeighborhood()`                    | Yes       |
| `properties/crud.ts:88`     | `.single()`      | `createProperty()` on insert return                | Yes       |
| `properties/crud.ts:121`    | `.single()`      | `updateProperty()`                                 | Yes       |
| `properties/crud.ts:174`    | `.single()`      | `getPropertiesByZpid()` — handles PGRST116         | Yes       |
| `properties/crud.ts:199`    | `.single()`      | `getPropertiesByHash()` — handles PGRST116         | Yes       |
| `server.ts:296`             | `.single()`      | `checkServiceRoleAuthorization()` on user_profiles | **Risky** |
| `interactions/route.ts:157` | `.single()`      | insert return — always 1 row                       | Yes       |
| `interactions/route.ts:68`  | `.maybeSingle()` | User profile household_id lookup                   | Yes       |
| `couples.ts:179`            | `.single()`      | `getUserHousehold()`                               | Yes       |
| `couples-realtime.ts:146`   | `.single()`      | Profile lookup in realtime handler                 | **Risky** |
| `couples-realtime.ts:170`   | `.single()`      | Interaction lookup in realtime handler             | **Risky** |
| `couples-realtime.ts:186`   | `.single()`      | Property lookup in realtime handler                | **Risky** |

**Verdict:** `.single()` is generally used correctly with proper PGRST116 handling. `.maybeSingle()` is used where appropriate. The `checkServiceRoleAuthorization()` and `CouplesRealtime` uses are risky — see N+1 section.

### 2.2 N+1 Query Patterns

| #   | Severity   | Finding                                                                                                                                                                                             | File:Line                   | Evidence                                                                                                                             |
| --- | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| N1  | **High**   | `getPropertyStats()` fetches ALL active properties without LIMIT, then computes stats (avg, median, distribution) in JavaScript memory. This is O(n) in both DB transfer and memory.                | search.ts:250-253           | `supabase.from('properties').select('price, bedrooms, bathrooms, square_feet, property_type').eq('is_active', true)` — no `.limit()` |
| N2  | **Medium** | `CouplesRealtime.handlePropertyInteraction()` makes up to 5 sequential DB queries per incoming websocket event: `getUser()`, profile lookup, myLike check, profile lookup (again), property lookup. | couples-realtime.ts:107-206 | Sequential awaits at lines 134, 142, 164, 174, 182                                                                                   |
| N3  | **Medium** | `CouplesService.getHouseholdStats()` makes 3 sequential queries: `getMutualLikes()` (which itself queries), count query, recent activity query.                                                     | couples.ts:591-605          | Lines 591, 593, 600                                                                                                                  |
| N4  | **Low**    | `loadDashboardData` fetches neighborhoods per city in parallel but each call is a separate DB query. With N cities = N queries.                                                                     | data/loader.ts:250-253      | `Promise.all(userPreferences.cities.map(...))`                                                                                       |
| N5  | **Low**    | `checkServiceRoleAuthorization()` in `server.ts` creates two clients and makes two queries (getUser + user_profiles lookup) for every service role request.                                         | server.ts:273-311           | Lines 276-296                                                                                                                        |

### 2.3 Findings: Query Patterns

| #   | Severity   | Finding                                                                                                                                                                                                           | File:Line                 | Recommendation                                                                                   |
| --- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------- | ------------------------------------------------------------------------------------------------ |
| Q1  | **High**   | **No query deduplication or request coalescing.** Multiple parallel components can trigger identical searches with no cache layer between them. Dashboard mount will typically fire 2-3 identical searches.       | data/loader.ts, search.ts | Add `unstable_cache` or a SWR-style deduplication layer at the service boundary.                 |
| Q2  | **Medium** | `getSimilarProperties` generates range filters dynamically from `referenceProperty.price * 0.2`, etc. No bounds checking — could generate negative price floors for $0 properties.                                | search.ts:361-397         | Validate reference values before computing ranges.                                               |
| Q3  | **Low**    | Text search in `searchPropertiesText` uses `ilike` with `%query%` — no trigram index will be used. This is a full table scan.                                                                                     | search.ts:335-337         | Add a `pg_trgm` GIN index on `address` and `description`, or use Supabase full-text search.      |
| Q4  | **Low**    | `buildPropertyFiltersFromPreferences` has a type mismatch mapping: `'house': 'single_family'` and `'townhouse': 'townhome'`. If the DB stores `'house'` or `'townhouse'`, this mapping produces the wrong filter. | data/loader.ts:171-175    | Verify against the DB enum. Parent task (P1.1) found a CHECK constraint mismatch — align values. |

---

## 3. Connection Pooling & Transaction Management

### 3.1 Connection Pooling

**No explicit connection pooling configuration found.** The Supabase JS libraries (`@supabase/supabase-js`, `@supabase/ssr`) handle connection pooling internally via `postgres-meta` / `pgbouncer` on the Supabase platform side.

- `@supabase/ssr` uses cookie-based sessions per request — each request creates its own client context
- `@supabase/supabase-js` (standalone) creates persistent connections
- No `pgbouncer=true` or `?pgbouncer=true` query parameter found in connection strings

**Risk:** If the Supabase project uses PgBouncer in transaction mode, prepared statements will fail. The codebase does not appear to use prepared statements explicitly, but `@supabase/supabase-js` may internally.

### 3.2 Transactions

**No explicit transaction blocks found.** The codebase does not use `supabase.rpc()` for transactional wrappers or any BEGIN/COMMIT patterns. All mutations are single-statement operations.

### 3.3 Long-Running Queries

| Query                                   | Potential Issue                                                        |
| --------------------------------------- | ---------------------------------------------------------------------- |
| `getPropertyStats()`                    | Full table scan of `properties` — O(n) rows transferred                |
| `searchPropertiesText()` with `ilike`   | Full table scan without trigram index                                  |
| `getHouseholdStats()` — activity streak | Fetches 30 rows, computes dates client-side (OK in size, N+1 in count) |

### 3.4 Findings: Connection Pooling

| #   | Severity   | Finding                                                                                                                                                                                           | Recommendation                                                                                            |
| --- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| P1  | **Medium** | No connection timeout or max-retry configuration visible. Supabase JS has defaults but no explicit tuning for this app's workload.                                                                | Configure `db.pool` settings in `schema` or via Supabase dashboard for PgBouncer if the plan supports it. |
| P2  | **Low**    | `@supabase/supabase-js` standalone client (used in `standalone.ts`, `data/loader.ts`) does not support cookie-based auth rotation. If used server-side with expiring keys, it will fail silently. | OK for anon-key-only dashboard queries and service-role scripts. Document the limitation.                 |

---

## 4. Error Handling

### 4.1 Error Infrastructure

The codebase has a **well-structured error hierarchy** in `src/lib/services/errors.ts`:

```
ServiceError (base)
├── DatabaseError
├── NotFoundError
├── ValidationError
├── AuthError
├── ConfigError
├── ExternalServiceError
├── RateLimitError
└── NetworkError
```

### 4.2 Error Handling Patterns by Layer

| Layer                               | Pattern                                                | Swallows Errors?                    | Logs?                            |
| ----------------------------------- | ------------------------------------------------------ | ----------------------------------- | -------------------------------- |
| **BaseService.executeQuery**        | try/catch → `handleErrorLegacy()` → returns null       | Yes (default: `throwErrors: false`) | Yes (console.error)              |
| **BaseService.executeArrayQuery**   | try/catch → returns []                                 | Yes                                 | Yes                              |
| **BaseService.executeBooleanQuery** | try/catch → returns false                              | Yes                                 | Yes                              |
| **API Routes (interactions)**       | try/catch → `ApiErrorHandler.serverError()` → 500 JSON | Yes (generic message to client)     | Yes (console.error with details) |
| **API Routes (mutual-likes)**       | try/catch → 500 JSON `{ error: '...' }`                | Yes                                 | Yes                              |
| **Server Actions (auth)**           | if error → `redirect('/error')`                        | Yes (redirect)                      | No (swallowed)                   |
| **CouplesService (all static)**     | try/catch → returns [] / null                          | Yes                                 | Yes (console.error)              |
| **CouplesRealtime**                 | try/catch → returns early                              | Yes                                 | Yes                              |
| **RPC Wrapper (callRPC)**           | throws `handleRPCError()`                              | No (throws)                         | Yes (console.error)              |

### 4.3 Error Surfacing to Users

**API routes:** Return generic `{ error: 'Failed to ...' }` with HTTP status codes. Internal details are logged server-side but never sent to clients — **correct security practice**.

**Server actions:** Redirect to `/error` on failure. No error details passed. Minimally informative but safe.

**Client-side services:** `InteractionService` (client-side fetch wrapper) throws Errors with `res.status` in message — good for client error handling.

### 4.4 Findings: Error Handling

| #   | Severity   | Finding                                                                                                                                                                                                                                         | File:Line                      | Recommendation                                                                                          |
| --- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------ | ------------------------------------------------------------------------------------------------------- |
| E1  | **Medium** | `BaseService` defaults to silent error swallowing (`throwErrors: false`). Service methods that fail return null/[]/false with no indication to the caller that an error occurred. Callers cannot distinguish "no results" from "database down". | base.ts:164-166, errors.ts:168 | Consider a Result<T, E> pattern or at minimum log a structured error event that monitoring can pick up. |
| E2  | **Low**    | Server Actions (`actions.ts`) redirect to `/error` on ANY auth failure with no logging. Sign-in failures (wrong password) and system failures (DB down) look identical to the user.                                                             | actions.ts:28-30               | Log auth errors before redirecting. Consider flash messages for user-correctable errors.                |
| E3  | **Low**    | `interactions/route.ts` POST handler has a complex household_id resolution with retries (2 attempts, 200ms delay, service role fallback). If ALL attempts fail, the interaction is still recorded with `householdId: null` — no alert.          | interactions/route.ts:80-124   | Emit a warning metric when household_id resolution fails so operations can monitor.                     |
| E4  | **Low**    | `couples.ts:getUserHousehold()` uses `.single()` which throws PGRST116 if no profile row exists. The caller catches and returns null, but the error path is exception-driven rather than using `.maybeSingle()`.                                | couples.ts:175-181             | Switch to `.maybeSingle()` and check for null — same behavior, no exception overhead.                   |

---

## 5. Type Safety

### 5.1 Generated Types

- `src/types/database.ts` — Generated Supabase types (via `supabase gen types`)
- `src/types/app-database.ts` — Extends `Database` with custom RPC function signatures (`AdditionalFunctions` interface), then exports `AppDatabase`
- All Supabase clients are typed with `<AppDatabase>`: `SupabaseClient<AppDatabase>`

### 5.2 Query Result Typing

| File                       | Typing Approach                                                               | Quality                                                             |
| -------------------------- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| `properties/crud.ts`       | `supabase.from('properties').select('*').single()` — returns `Property`       | Good — typed via AppDatabase                                        |
| `properties/search.ts:97`  | `.returns<PropertyWithNeighborhood[]>()` — explicit cast                      | Good                                                                |
| `properties/search.ts:252` | `supabase.from('properties').select('price, bedrooms, ...')` — partial select | Acceptable — fields accessed by name                                |
| `interactions/route.ts`    | Manual `InteractionWithProperty` type + filter                                | OK — verbose but safe                                               |
| `couples-realtime.ts`      | Manual `PropertyInteractionPayload` type (not from database.ts)               | **Drift risk** — inline type may go stale                           |
| `couples.ts`               | `MutualLikeRaw`, `HouseholdActivityRaw` inline interfaces + type guards       | OK — validated at runtime                                           |
| `data/loader.ts`           | `DASHBOARD_PROPERTY_SELECT` as string constant                                | **Drift risk** — if schema changes, select string is silently wrong |

### 5.3 RPC Type Safety

`supabase-rpc-types.ts` defines a `TypedSupabaseRPC` interface with typed parameters and return types for all 20 RPC functions. `callRPC()` in the wrapper provides generic type inference. **This is well-done.**

However, `isRPCImplemented()` is a hardcoded list that must be manually maintained (line 467-493). If a new RPC function is added to the DB but forgotten here, it will report as unimplemented.

### 5.4 Findings: Type Safety

| #   | Severity   | Finding                                                                                                                                                                                         | File:Line                     | Recommendation                                                                                                       |
| --- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| T1  | **Medium** | `couples-realtime.ts` defines `PropertyInteractionPayload` inline instead of using the generated type from `database.ts`. Schema changes won't be caught at compile time.                       | couples-realtime.ts:6-14      | Import from generated types: `Database['public']['Tables']['user_property_interactions']['Row']`                     |
| T2  | **Medium** | `DASHBOARD_PROPERTY_SELECT` is a raw SQL-like string. If a column is renamed or dropped, the query will fail at runtime with no type checking.                                                  | data/loader.ts:99-124         | Use the Supabase query builder's type-safe `.select()` with field names from the generated type.                     |
| T3  | **Low**    | `isRPCImplemented()` hardcodes the list of implemented RPC functions. Easy to forget to update when adding new DB functions.                                                                    | supabase-rpc-types.ts:467-493 | Consider runtime discovery via `supabase.rpc('get_rpc_functions')` or a generated list from migration introspection. |
| T4  | **Low**    | `data/loader.ts:buildPropertyFiltersFromPreferences()` has a type mapping `Record<string, string>` for property types — keys are typed but values use string mapping that could miss new types. | data/loader.ts:171-175        | Use a const object with `as const satisfies Record<UIPropertyType, DBPropertyType>`.                                 |

---

## 6. Server Actions vs API Routes

### 6.1 Architecture

| Pattern                             | Used For                                                             | DB Access                                         | Auth                                                     | Rate Limiting                                     |
| ----------------------------------- | -------------------------------------------------------------------- | ------------------------------------------------- | -------------------------------------------------------- | ------------------------------------------------- |
| **Server Actions** (`'use server'`) | Auth (login, signup, signOut, signInWithGoogle)                      | Via `createClient()` (cookie-based server client) | Implicit via cookies                                     | None                                              |
| **API Routes** (`/api/*`)           | Interactions, couples, properties, neighborhoods, users, admin, maps | Via `createApiClient(request)`                    | `requireUserFromRequest()` with bearer + cookie fallback | Per-route (rate-limit.ts, rateLimiter middleware) |

### 6.2 Direct Client-Side DB Access

**One concerning pattern:**

- `CouplesRealtime` (`src/lib/realtime/couples-realtime.ts`) — creates a browser Supabase client AND directly queries `user_profiles`, `user_property_interactions`, `properties` tables from client-side code. This works because RLS is enabled on these tables, but it's a **security boundary concern** — any client-side code could theoretically query these tables.

- `InteractionService` (`src/lib/services/interactions.ts`) — properly uses `fetch('/api/interactions', ...)` instead of direct DB access. This is the correct pattern.

### 6.3 Findings: Architecture

| #   | Severity   | Finding                                                                                                                                                                                                                                                      | File:Line                               | Recommendation                                                                                                   |
| --- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| A1  | **Medium** | `CouplesRealtime` mixes concerns: real-time subscription (correct for websockets) with direct DB queries (should go through API routes or server-side logic). The client makes `getUser()`, profile lookups, and property lookups directly.                  | couples-realtime.ts:134,142,164,174,182 | Move the mutual-like detection logic server-side. The client should only handle websocket events and UI updates. |
| A2  | **Low**    | Server Actions have no rate limiting, no CSRF protection beyond Next.js built-in. Auth endpoints are vulnerable to brute-force.                                                                                                                              | actions.ts:16-34                        | Add rate limiting to auth server actions. Consider `next-auth` or a dedicated auth middleware.                   |
| A3  | **Low**    | The `fetchHouseholdIdWithServiceRole()` in `interactions/route.ts` uses the service role client as a fallback to bypass RLS when the anon client can't read the profile. This is a legitimate pattern but should be documented as an intentional RLS bypass. | interactions/route.ts:80-108            | Add a comment explaining the RLS bypass rationale.                                                               |

---

## 7. Hot Paths — The 5 Most Frequently Called Queries

### 7.1 Dashboard Property Search

**Path:** `dashboard/page.tsx` → `loadDashboardData()` → `PropertyService.searchProperties()` → DB  
**Query:** `properties` table with filters (price, bedrooms, city, etc.) + neighborhood join + count  
**Frequency:** Every dashboard page load + every filter change  
**Caller:** Server-side (async component) via `DefaultSupabaseClientFactory`  
**Risk:** `getPropertyStats()` variant (called somewhere in the stats pipeline) does a **full table scan** with no limit.

**Optimization opportunities:**

- Use `unstable_cache` already in place for anonymous queries (60s TTL). Consider per-user caching for authenticated users.
- Move `getPropertyStats()` to a DB function that does server-side aggregation.
- The neighborhood join is `neighborhood:neighborhoods(*)` — this fetches all neighborhood columns. The dashboard only uses `name, city, state`.

### 7.2 Geographic Search

**Path:** Map interaction → `GeographicService.getPropertiesWithinRadius()` → RPC `get_properties_within_radius`  
**Query:** PostGIS spatial query with `ST_DWithin`  
**Frequency:** Every map pan/zoom (debounced)  
**Caller:** API route or service (depends on context)  
**Risk:** No query result caching at the service level. Geographic queries are expensive.

**Optimization opportunities:**

- RPC wrapper already supports caching (2-min TTL set in geographic.ts:259). This is good.
- Consider materialized views for common bounding boxes.

### 7.3 Interaction Recording (POST /api/interactions)

**Path:** Swipe/like/skip → `InteractionService.recordInteraction()` → `fetch('/api/interactions', POST)`  
**Query:** Delete old interaction + insert new + optional household_id resolution (up to 4 queries)  
**Frequency:** Every swipe — highest frequency write  
**Caller:** Client-side via fetch  
**Risk:** Complex household_id resolution with service role fallback. Each interaction is ~4 DB round-trips.

**Optimization opportunities:**

- Cache `household_id` in the user session to avoid the lookup on every swipe.
- Batch interaction inserts if user swipes rapidly (debounce insert, queue writes).

### 7.4 Mutual Likes (GET /api/couples/mutual-likes)

**Path:** Couples dashboard → `fetch('/api/couples/mutual-likes')` → `CouplesService.getMutualLikes()`  
**Query:** `get_household_mutual_likes` RPC + optional property detail enrichment  
**Frequency:** Every couples dashboard load  
**Caller:** API route (server-side)  
**Risk:** LRU cache (5-min TTL) helps. The property enrichment query uses `.in('id', propertyIds)` which is efficient.

**Optimization opportunities:**

- Cache is already in place. Consider warming the cache on household page entry.

### 7.5 Couples Activity / Stats

**Path:** Couples dashboard → `CouplesService.getHouseholdActivity()` / `getHouseholdStats()`  
**Query:** `get_household_activity_enhanced` RPC + mutual property IDs lookup  
**Frequency:** Every couples dashboard load  
**Caller:** API route (server-side)  
**Risk:** `getHouseholdStats()` makes 3 queries: mutual likes, count, recent activity. The count query uses `{ count: 'exact', head: true }` — efficient.

**Optimization opportunities:**

- Combine the three `getHouseholdStats` queries into a single RPC function.
- Activity streak calculation in JS is fine for 30 rows but could be moved to SQL.

### 7.6 Hot Path Summary

| Path                  | DB Queries per Request                    | Current Latency Estimate | Target | Risk                         |
| --------------------- | ----------------------------------------- | ------------------------ | ------ | ---------------------------- |
| Dashboard search      | 1-2 (search + neighborhoods)              | 200-500ms                | <200ms | `getPropertyStats` full scan |
| Geographic radius     | 1 (RPC)                                   | 100-300ms (cached)       | <150ms | Unbounded if cache misses    |
| Interaction recording | 3-5 (delete + insert + household lookups) | 200-800ms                | <300ms | Too many round-trips         |
| Mutual likes          | 1-2 (RPC + enrichment)                    | 50-200ms (cached)        | <100ms | Acceptable                   |
| Activity/stats        | 2-3 (RPC + count + activity)              | 100-400ms                | <200ms | Combine into one RPC         |

---

## 8. Summary of All Findings

### High Severity

| ID  | Area          | Finding                                                                                                  | Recommendation                                                 |
| --- | ------------- | -------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| N1  | Query Pattern | `getPropertyStats()` loads all active properties into memory with no LIMIT. O(n) transfer + O(n) memory. | Replace with DB-side aggregation RPC function.                 |
| Q1  | Query Pattern | No query deduplication. Dashboard fires 2-3 identical searches on mount.                                 | Add request coalescing or SWR-style dedup at service boundary. |

### Medium Severity

| ID  | Area           | Finding                                                                                        | Recommendation                                                   |
| --- | -------------- | ---------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| C1  | Client Setup   | Duplicate client factories (server.ts + factory.ts) behind feature flag.                       | Consolidate into one factory. Remove feature flag.               |
| C3  | Client Setup   | `service-role-client.ts` bypasses the service role authorization gate.                         | Add auth gate or remove and redirect callers.                    |
| N2  | Query Pattern  | `CouplesRealtime.handlePropertyInteraction()` — 5 sequential DB queries per websocket event.   | Batch into one RPC call or move logic server-side.               |
| N3  | Query Pattern  | `CouplesService.getHouseholdStats()` — 3 sequential queries.                                   | Combine into single `get_household_stats` RPC function.          |
| Q2  | Query Pattern  | `getSimilarProperties()` range computation has no bounds checking.                             | Validate reference values before range computation.              |
| P1  | Pooling        | No explicit connection pool or timeout configuration.                                          | Configure Supabase PgBouncer settings for production workload.   |
| E1  | Error Handling | Silent error swallowing in BaseService. Callers can't distinguish "no results" from "DB down." | Consider Result<T, E> pattern or structured error events.        |
| T1  | Type Safety    | `couples-realtime.ts` uses inline types instead of generated DB types.                         | Use `Database['public']['Tables'][...]['Row']` from database.ts. |
| T2  | Type Safety    | `DASHBOARD_PROPERTY_SELECT` is a raw string, not type-checked.                                 | Use typed `.select()` with generated field names.                |
| A1  | Architecture   | `CouplesRealtime` makes direct client-side DB queries.                                         | Move mutual-like detection and profile lookups server-side.      |

### Low Severity

| ID  | Area           | Finding                                                                                | Recommendation                                         |
| --- | -------------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| C2  | Client Setup   | Factory caches clients indefinitely without TTL.                                       | Add TTL or use per-request clients for server context. |
| C4  | Client Setup   | Standalone test client cache never cleared.                                            | OK for tests. Document behavior.                       |
| C5  | Client Setup   | Dashboard loader uses standalone anon client bypassing SSR.                            | Document intent.                                       |
| N4  | Query Pattern  | Neighborhood fetch is N queries for N cities.                                          | Batch into single `in` query or use RPC.               |
| N5  | Query Pattern  | `checkServiceRoleAuthorization()` makes 2 client creates + 2 queries.                  | Cache admin status per session.                        |
| Q3  | Query Pattern  | Text search uses `ilike` — no index usage.                                             | Add `pg_trgm` GIN index on address + description.      |
| Q4  | Query Pattern  | Property type mapping mismatch (`single_family` vs `house`).                           | Align with DB CHECK constraint (from P1.1 findings).   |
| P2  | Pooling        | Standalone client doesn't support cookie auth rotation.                                | Document limitation.                                   |
| E2  | Error Handling | Auth server actions redirect to `/error` with no logging.                              | Log auth failures before redirect.                     |
| E3  | Error Handling | Interaction household_id resolution failure is silent.                                 | Emit monitoring metric on failure.                     |
| E4  | Error Handling | `getUserHousehold()` uses `.single()` with exception path instead of `.maybeSingle()`. | Switch to `.maybeSingle()`.                            |
| T3  | Type Safety    | `isRPCImplemented()` hardcoded list, manually maintained.                              | Consider runtime discovery or generated list.          |
| T4  | Type Safety    | Property type mapping uses unconstrained string map.                                   | Use const object with `satisfies`.                     |
| A2  | Architecture   | Auth server actions have no rate limiting.                                             | Add rate limiting to auth actions.                     |
| A3  | Architecture   | Service role fallback in interactions API not documented as intentional RLS bypass.    | Add documentation comment.                             |

---

## 9. Recommended Fix Priority

### Immediate (before production traffic)

1. **Fix `getPropertyStats()` full table scan** — move to DB function (N1)
2. **Add request deduplication** for dashboard searches (Q1)
3. **Add auth gate to `service-role-client.ts`** or remove the bypass (C3)

### Short-term (next sprint)

4. Consolidate client factories — remove feature flag (C1)
5. Fix CouplesRealtime N+1 — move logic server-side (N2, A1)
6. Combine CouplesService stats queries into single RPC (N3)
7. Fix inline types in couples-realtime.ts (T1)
8. Fix DASHBOARD_PROPERTY_SELECT to use typed selects (T2)

### Nice-to-have

9. Add RPC caching TTL to factory client cache (C2)
10. Add pg_trgm index for text search (Q3)
11. Add rate limiting to auth server actions (A2)
12. Switch getUserHousehold to maybeSingle (E4)
