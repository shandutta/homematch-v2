# Middleware & API Speed/Dead-Code Audit

**Date**: 2026-05-07 | **Task**: t_124c4ac0 | **Profile**: backend-eng

## Executive Summary

Audited all 28 API routes, middleware, rate limiters, auth helpers, and error handling.
Found 1 critical speed issue, 2 high-severity architecture problems, and several medium-low
consistency/cleanup items. Recommendations are ordered by impact/risk ratio.

---

## CRITICAL: Rate Limiter Calls Supabase Auth on Every Check

**File**: `src/lib/middleware/rateLimiter.ts:74-93`

`getClientIdentifier()` calls `createClient()` + `supabase.auth.getUser()` on **every**
rate-limit check. This adds ~100-300ms latency to every rate-limited endpoint.

```typescript
// CURRENT: ~100-300ms per check
async function getClientIdentifier(request: NextRequest): Promise<string> {
  const supabase = await createClient() // DB round-trip
  const {
    data: { user },
  } = await supabase.auth.getUser() // another DB round-trip
  // ...
}
```

**Impact**: Every call to `rateLimit()`, `withRateLimit()`, or `authRateLimit()` pays this
tax. Affected endpoints: `/api/couples/activity`, `/api/couples/mutual-likes`,
`/api/interactions`, `/api/interactions/reset`, `/api/users/avatar`,
`/api/users/search`, and all maps endpoints.

**Fix**: Rate limit by IP/hostname alone (a ~1ms operation). User-based rate limiting is
better done by extracting user ID from the request context that already exists (middleware
already resolved the user).

---

## HIGH: Dual Incompatible Rate Limiter Systems

Two completely separate rate limiter implementations with no shared state:

| System | File                            | Library                 | Endpoints Using It                                                              |
| ------ | ------------------------------- | ----------------------- | ------------------------------------------------------------------------------- |
| Tiered | `lib/middleware/rateLimiter.ts` | `rate-limiter-flexible` | couples/activity, couples/mutual-likes, users/avatar                            |
| Simple | `lib/utils/rate-limit.ts`       | Custom Map-based        | maps/geocode, maps/autocomplete, interactions, interactions/reset, users/search |

**Problems**:

- Confusing for developers ("which one do I use?")
- Different behavior, different headers, different error shapes
- Neither persists across restarts or works with multiple server instances

**Fix**: Migrate all endpoints to the tiered system (`lib/middleware/rateLimiter.ts`).
Deprecate `lib/utils/rate-limit.ts`. Still in-memory, but at least consistent.

---

## HIGH: No Response Caching on API Endpoints

Only 2 of 28 API routes set Cache-Control headers:

- `/api/health` — `no-cache, no-store, must-revalidate` (correct)
- `/api/maps/proxy-script` — `public, max-age=3600` (correct for script proxy)

**Missed opportunities**:

| Endpoint                     | Recommendation                                    | Rationale                          |
| ---------------------------- | ------------------------------------------------- | ---------------------------------- |
| `/api/properties/marketing`  | `public, max-age=3600`                            | Returns hardcoded mock data        |
| `/api/properties/vibes`      | `public, max-age=300, stale-while-revalidate=600` | Property vibes change infrequently |
| `/api/neighborhoods/vibes`   | `public, max-age=3600`                            | Neighborhood vibes are static      |
| `/api/maps/metro-boundaries` | `public, max-age=86400`                           | Geographic boundaries never change |

---

## MEDIUM: Inconsistent Auth Patterns

Two auth helpers with different return shapes are used inconsistently:

```typescript
// PATTERN A (standard): requireUserFromRequest
const { user, response } = await requireUserFromRequest(supabase, request)
// returns { user: User | null, response: NextResponse | null }

// PATTERN B (legacy): getUserFromRequest
const {
  data: { user },
  error,
} = await getUserFromRequest(supabase, request)
// returns { data: { user }, error }
```

Pattern B is used in: `couples/mutual-likes`, `couples/check-mutual`. This means those
endpoints return raw `{ error: 'Unauthorized' }` instead of the standardized
`{ error: 'Unauthorized', code: 'UNAUTHORIZED' }` from `ApiErrorHandler`.

**Fix**: Migrate the two legacy endpoints to `requireUserFromRequest`.

---

## MEDIUM: Maps API Endpoints Unauthenticated (Parent Task Gate)

From Phase 0 synthesis: _"Harden unauthenticated Maps endpoints before broad Phase 1
execution."_

All 5 maps endpoints (`/api/maps/*`) are unauthenticated. They proxy paid Google APIs:

| Endpoint                               | Risk                                            |
| -------------------------------------- | ----------------------------------------------- |
| `/api/maps/geocode` (POST)             | Proxies paid geocoding API — abusable for cost  |
| `/api/maps/places/autocomplete` (POST) | Proxies paid Places API — session-based billing |
| `/api/maps/proxy-script` (GET)         | Loads Google Maps JS — less risky               |
| `/api/maps/script` (GET)               | Returns proxy URL — negligible risk             |
| `/api/maps/metro-boundaries` (GET)     | Static data — negligible risk                   |

**Recommendation**: Add per-session token validation for geocode and autocomplete.
A simple approach: generate a one-time token on page load, validate it in the API route.
This prevents direct API abuse without requiring full auth.

---

## LOW: middleware.ts Double-Auth on API Routes

`middleware.ts` runs `supabase.auth.getUser()` on every request, including API routes.
But API routes then run `requireUserFromRequest()` which calls `getUser()` AGAIN.

For authenticated API calls, this means two Supabase auth round-trips per request.

**Fix**: Add a middleware-level flag (e.g., `x-auth-resolved` header) that API routes
can read to skip their own auth call when middleware already resolved the user.

---

## LOW: Dead/Unused Code

| Location                               | Issue                                                                                                                                |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `lib/utils/performance.ts`             | `performanceMonitor` class accumulates metrics but never reports them in production. `withPerformanceTracking` used by only 1 route. |
| `api/zillow/random-image:59-62`        | `pickRandom()` function disabled with eslint comments                                                                                |
| `api/couples/notify:56-73`             | `_notificationData` computed but never used                                                                                          |
| `api/admin/generate-vibes` GET handler | Status endpoint not documented in route inventory                                                                                    |

---

## LOW: Route Shape Inconsistencies

| Issue                                                          | Examples                                              |
| -------------------------------------------------------------- | ----------------------------------------------------- |
| Rate limit 429 errors use `ApiErrorHandler.badRequest()` (400) | `interactions/reset:20`, `interactions:37`            |
| Error responses missing `code` field                           | `couples/mutual-likes:77`                             |
| Some routes reject unsupported methods, others don't           | `couples/activity` has stubs, `interactions` does not |

---

## Speed-Optimization Quick Wins

1. **Add `Cache-Control` headers** — 5-minute effort, immediate CDN/Next.js cache benefit
2. **Fix `getClientIdentifier`** — Eliminate 100-300ms from every rate-limited endpoint
3. **Skip middleware auth for `/api/` routes** — Only applies security headers, skips auth
4. **Add ETag/If-None-Match support** — For list endpoints that return stable data

---

## Implementation Plan (Prioritized)

### Phase 1: Safe, High-Impact (do now)

1. Fix `getClientIdentifier` to not call Supabase (CRITICAL speed)
2. Add Cache-Control headers to cacheable endpoints (HIGH)
3. Migrate maps endpoints from `utils/rate-limit.ts` to `middleware/rateLimiter.ts` (HIGH consistency)

### Phase 2: Auth Hardening (next)

4. Add session-token validation to `/api/maps/geocode` and `/api/maps/places/autocomplete`
5. Migrate `couples/mutual-likes` and `couples/check-mutual` to `requireUserFromRequest`

### Phase 3: Cleanup (later)

6. Deprecate `lib/utils/rate-limit.ts`
7. Remove dead `performanceMonitor` or wire it to production reporting
8. Standardize 429 error responses
9. Add unsupported-method stubs to routes missing them
