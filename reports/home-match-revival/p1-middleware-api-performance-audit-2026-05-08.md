# P1 middleware/API performance architecture audit

Task: t_99b5c6d4
Repo inspected: /home/shan/projects/homematch-v2
Mode: read-only; no code changes, no deploys, no external calls
Date: 2026-05-08

## Verdict

The prior P1 middleware/API audit is partly stale. Several high-impact issues have already been fixed: the rate limiter no longer calls Supabase auth, paid Maps endpoints now require authenticated users, admin routes are rate-limited, outbound Google/RapidAPI calls mostly use fetchWithTimeout, and most user-specific GET responses now use no-store helpers.

The remaining performance architecture problem is narrower and clearer: middleware still runs Supabase session work on API requests that immediately authenticate again inside the route handler. The fastest safe path is to stop doing route-auth in middleware for /api/*, keep security headers globally, and let API handlers own API auth/rate/cache behavior.

## Current surface

Observed from src/app/api/**/route.ts plus middleware.ts:

- 26 API route files under src/app/api.
- 17 GET routes and 15 POST routes, including explicit unsupported-method stubs on several files.
- 15 route files use rate limiting via withRateLimit, checkRateLimit, rateLimit, or rateLimitAdminRoute.
- 14 route files require users via requireUserFromRequest.
- 5/5 admin route files use rateLimitAdminRoute.
- 6 route files use fetchWithTimeout for outbound Google/RapidAPI calls.
- 3 route files use service-role helpers: users/search, maps/metro-boundaries, couples/disputed.
- Public Cache-Control is present on health, maps/proxy-script, and maps/metro-boundaries.
- noStoreJson/private no-store is present on most user-specific endpoints.

## Keep

1. Keep src/lib/middleware/rateLimiter.ts as the single API limiter.
   - It now uses rate-limiter-flexible only.
   - getClientIdentifier is IP-header-only and does not touch Supabase auth.
   - 429s go through ApiErrorHandler.tooManyRequests with Retry-After and X-RateLimit headers.
   - Do not reintroduce src/lib/utils/rate-limit.ts or any second Map-based limiter.

2. Keep requireUserFromRequest as the standard API auth boundary.
   - couples/mutual-likes and couples/check-mutual have already moved to requireUserFromRequest.
   - It centralizes bearer-token parsing and 401 shape.

3. Keep the Maps auth hardening on geocode/autocomplete.
   - /api/maps/geocode and /api/maps/places/autocomplete now require auth before calling paid Google APIs.
   - Both rate-limit by auth.user.id.
   - Both use fetchWithTimeout.

4. Keep noStoreJson for user-specific data.
   - couples/activity, check-mutual, disputed, mutual-likes, stats, interactions, users/search, properties/vibes, neighborhoods/vibes, maps/script, performance/metrics, and zillow/random-image all avoid accidental shared caching.

5. Keep production-blocking on /api/zillow/random-image.
   - It returns 404 in NODE_ENV=production. That is the right posture for a demo endpoint using RapidAPI.

## Fix now: high impact, low/medium risk

### 1. Stop middleware from doing Supabase auth work for /api/*

File: middleware.ts:96-214, 279-321, 324-335

Current behavior:
- The matcher includes /api/*.
- middleware.ts creates a Supabase SSR client for most requests.
- For API requests with auth cookies and non-test mode, it may call supabase.auth.getUser().
- API route handlers then call requireUserFromRequest(), which calls getUserFromRequest(), which calls supabase.auth.getUser() again.

Impact:
- Authenticated API requests can pay two Supabase auth validations before doing useful work.
- This is the biggest remaining request-path speed issue.

Recommendation:
- Keep middleware matched for /api/* only if it is needed for security headers.
- For isApiRoute, return applySecurityHeaders(NextResponse.next({ request })) before creating the Supabase client, except for any deliberately middleware-protected API path if one is introduced later.
- Let API routes own auth and rate limiting.

Aggressive stance: do not build an x-auth-resolved handoff header. It adds complexity and trust-boundary ambiguity. API handlers should authenticate APIs; middleware should redirect pages and stamp headers.

Acceptance test:
- Existing API auth tests still pass.
- Protected page redirects still pass.
- Middleware unit test proves /api/foo does not call Supabase getUser.

### 2. Move createServerClient behind the no-auth-cookie fast path for public pages

File: middleware.ts:126-174, 183-214

Current behavior:
- createServerClient is constructed before checking whether a non-API request has the auth cookie.
- getUser is skipped without a cookie, but the client construction still happens on public page requests.

Recommendation:
- Compute cookieName and hasAuthCookie first.
- If !hasAuthCookie && !isApiRoute && !isProtectedPath(pathname) && !isAuthPath, return security headers before createServerClient.

Impact:
- Removes per-request Supabase client setup from anonymous public browsing.
- Low risk if protected-route and auth-route behavior remains covered.

### 3. Add public Cache-Control to /api/properties/marketing

File: src/app/api/properties/marketing/route.ts:66-73

Current behavior:
- Returns hardcoded MARKETING_CARDS with no cache header.
- Wrapped in withPerformanceTracking, but the data is static.

Recommendation:
- Return public, max-age=3600, stale-while-revalidate=86400 or longer.
- If these mock cards stay hardcoded, this endpoint should be CDN-cheap.

Aggressive stance: either cache it publicly or delete the endpoint and inline the three marketing cards where used. Do not keep an uncached API call for static mock data.

### 4. Add a route-level timeout/deadline for long Supabase-heavy APIs

Files:
- src/app/api/couples/disputed/route.ts
- src/app/api/users/avatar/route.ts
- src/app/api/users/search/route.ts

Current behavior:
- Outbound fetch calls use fetchWithTimeout, but multi-query Supabase route handlers can still accumulate sequential waits.
- couples/disputed GET performs multiple service-role/user-scoped queries and in-memory grouping.
- users/avatar performs form parsing, storage upload/list/remove, and profile update.

Recommendation:
- Do not wrap every Supabase call ad hoc. Create one route helper: withRouteDeadline(label, ms, handler), returning 504/timeout with consistent logging.
- Apply to file upload and disputed-property routes first.

Suggested budgets:
- users/search: 2s
- couples/disputed GET: 4s
- users/avatar POST/DELETE: 8-10s

### 5. Use route-scoped rate-limit keys everywhere

Current mixed behavior:
- Some routes call checkRateLimit(auth.user.id), which shares a user-wide bucket across unrelated endpoints.
- Some routes use route-specific keys like couples:notify:${user.id} and couples:disputed:${user.id}.
- withRateLimit uses IP keys.

Recommendation:
- For authenticated routes, prefer `${routeKey}:${user.id}`.
- For anonymous/public routes, prefer `${routeKey}:${ip}`.
- Keep tier selection explicit.

Why:
- A burst of Google autocomplete should not throttle user search or interactions.
- Route-specific buckets make logs and abuse diagnosis clearer.

Priority targets:
- maps/geocode and maps/places/autocomplete currently use auth.user.id only.
- users/search currently uses auth.user.id only.

## Fix next: cleanup and consistency

### 6. Standardize unsupported method handling only where it matters

Current state:
- health, couples/activity, couples/check-mutual, and properties/marketing expose explicit unsupported-method handlers.
- Many routes rely on Next.js default 405 behavior.

Recommendation:
- Do not blanket-add handlers to every route just to satisfy inventory neatness.
- Add explicit handlers only for endpoints covered by E2E tests or routes where CORS/preflight behavior matters.
- Delete inconsistent one-off stubs if they exist only to placate stale tests.

### 7. Fix the status mapping for external provider failures

Files:
- src/app/api/maps/geocode/route.ts:113-115
- src/app/api/maps/places/autocomplete/route.ts:121-128

Current behavior:
- Non-OK Google statuses become ApiErrorHandler.badRequest.

Recommendation:
- INVALID_REQUEST / missing input -> 400.
- REQUEST_DENIED / key/config issue -> 503 or 502, with no secret leakage.
- OVER_QUERY_LIMIT -> 429 or 503 depending whether it is app-user throttling or provider quota.
- UNKNOWN_ERROR -> 502.

Why:
- Treating provider quota/config failures as client 400s hides operational issues and makes alerting harder.

### 8. Reduce service-role use or make it explicit per route

Current service-role routes:
- users/search: justified by cross-user search after auth; returns minimal data.
- maps/metro-boundaries: public static-ish read of neighborhoods; questionable service-role use.
- couples/disputed: justified by household-wide joins/resolutions, but it has a wide read surface.

Recommendations:
- users/search: keep service role only if RLS cannot support a safe search RPC. Better long-term: create a security-definer RPC that returns id/display_name/email/household_id only.
- maps/metro-boundaries: prefer anon/RLS read or a precomputed static artifact; do not use service role for public map geometry unless RLS forces it.
- couples/disputed: keep for now, but move the query logic into one constrained RPC if this route becomes product-critical.

### 9. Make cache policy declarative

Current state:
- cache-control.ts has private no-store helpers only.
- Public cache headers are hand-coded in individual routes.

Recommendation:
- Add helper names that encode intent:
  - publicShortJson(body) => public, max-age=300, stale-while-revalidate=600
  - publicStaticJson(body) => public, max-age=3600 or 86400
  - noStoreJson(body) remains for user-specific data

Why:
- Prevents future routes from forgetting cache headers and makes code review faster.

## Delete / consider deleting

1. Delete /api/properties/marketing if it is only hardcoded mock data and not needed by production landing pages.
   - If kept, cache it publicly.

2. Delete pickRandom from src/app/api/zillow/random-image/route.ts:62-66.
   - It is explicitly disabled as unused. No reason to preserve it.

3. Consider deleting withPerformanceTracking in src/lib/utils/performance if properties/marketing is its only live use.
   - Either make it the official route instrumentation wrapper or remove the one-off usage.

4. Delete any reintroduced duplicate rate-limit helper on sight.
   - The prior duplicate helper appears removed. Keep it that way.

5. Consider deleting /api/performance/metrics if it is not wired to a real metrics sink or dashboard.
   - It is public-bypass in middleware and rate-limited, but a metrics endpoint with no operational consumer is likely noise.

## Updated priority order

1. API middleware fast path: skip Supabase auth/client creation for /api/*.
2. Anonymous public-page fast path: avoid createServerClient when no auth cookie and not protected/auth page.
3. Cache or delete /api/properties/marketing.
4. Route-scoped rate-limit keys for maps/geocode, maps/places/autocomplete, users/search.
5. Add route deadlines to users/avatar and couples/disputed.
6. Fix external-provider error status mapping.
7. Replace maps/metro-boundaries service-role read with anon/RLS or static artifact.
8. Delete pickRandom and decide the fate of withPerformanceTracking/performance metrics.

## Approval-gated checklist

No external dashboards or credentials are required for the repo-local fixes above.

If Shan wants production-grade rate limiting across Vercel instances, that needs an approval checkpoint because it likely requires external storage/configuration:

- Choose Upstash Redis, Vercel KV/Redis, or Supabase-backed limiter.
- Create or reuse external storage credentials.
- Set env vars in Vercel.
- Smoke-test 429 behavior in preview before production.

Until then, keep the in-memory limiter as a local guardrail, not a distributed abuse-control guarantee.

## Evidence read

- reports/home-match-business-revival-operating-plan.md
- reports/home-match-revival/middleware-api-audit.md
- reports/home-match-revival/p1-middleware-api-audit.json
- middleware.ts
- src/lib/middleware/rateLimiter.ts
- src/lib/api/auth.ts
- src/lib/api/admin-rate-limit.ts
- src/lib/api/cache-control.ts
- src/lib/api/fetch-timeout.ts
- src/lib/supabase/service-role-client.ts
- src/app/api/maps/geocode/route.ts
- src/app/api/maps/places/autocomplete/route.ts
- src/app/api/maps/metro-boundaries/route.ts
- src/app/api/properties/marketing/route.ts
- src/app/api/zillow/random-image/route.ts
- src/app/api/users/search/route.ts
- src/app/api/users/avatar/route.ts
- src/app/api/couples/disputed/route.ts

## Non-goals observed

- No code changed.
- No tests run, because this was an architecture audit, not an implementation task.
- No browser swarms, deploys, paid APIs, real user data, or external dashboards touched.
