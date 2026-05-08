# D107 — Rate-limit helper adoption evidence

Generated: 2026-05-08
Scope: Phase 0/1 documentation slice. Read-only consolidation that pins the
in-repo rate-limit story onto one page: which shared helpers exist, which
identity each helper key uses, and what is documented as **not** going
through them. No env/secret reads, no live Supabase, no paid APIs, no
deploys, no broad test runs. Does not advance the closure matrix; it makes
the existing repo-side adoption auditable in one place.

This note does **not** restate D2 durable-provider readiness. The
production storage decision remains tracked in
`d2-rate-limit-provider-readiness-map-2026-05-08.md` and
`d2-durable-rate-limiter-approval-gate-guard-2026-05-08.md`.

## 1. Shared helpers in scope

All five helpers live in two files; no parallel limiter implementation
exists post-M10 consolidation.

| Helper | Source | Wraps |
| --- | --- | --- |
| `checkRateLimit(identifier, tier?)` | `src/lib/middleware/rateLimiter.ts` | Explicit-key path against `rate-limiter-flexible/lib/RateLimiterMemory`. |
| `rateLimit(request, tier?)` | `src/lib/middleware/rateLimiter.ts` | `checkRateLimit(getClientIdentifier(request), tier)`. |
| `withRateLimit(request, handler, tier?)` | `src/lib/middleware/rateLimiter.ts` | `rateLimit(...)` then handler, with auth/server-error normalization. |
| `authRateLimit(request, identifier?)` | `src/lib/middleware/rateLimiter.ts` | `auth` tier (5 / 15min, 30m block) with brute-force log. |
| `rateLimitAdminRoute(request, routeKey)` | `src/lib/api/admin-rate-limit.ts` | `checkRateLimit('admin:<routeKey>:<ip>', 'strict')`; never logs secret material. |

Tier table (`RATE_LIMIT_TIERS` in `rateLimiter.ts`): `strict` 10/min/5m,
`standard` 30/min/2m, `relaxed` 100/min/1m, `auth` 5/15min/30m,
`testing` 1000/min/5s.

429 shape (`rateLimitExceededResponse`): `ApiErrorHandler.tooManyRequests`
plus `Retry-After`, `X-RateLimit-Limit`, `X-RateLimit-Remaining`,
`X-RateLimit-Reset`.

## 2. Static adoption guard

`__tests__/unit/api/route-rate-limit-adoption-scan.test.ts` walks every
`src/app/api/**/route.ts` and asserts each exported `POST`/`PUT`/`PATCH`/
`DELETE` handler satisfies one of:

1. Body matches the 405 stub pattern
   `return ApiErrorHandler.methodNotAllowed(` with ≤6 statements
   (Next.js requires explicit handlers so unsupported methods do not
   hang in tests/E2E; these perform no request work).
2. The file imports from `@/lib/middleware/rateLimiter` or
   `@/lib/api/admin-rate-limit`, **and** the handler body invokes one
   of `checkRateLimit(`, `withRateLimit(`, `rateLimit(`,
   `authRateLimit(`, `rateLimitAdminRoute(`.
3. The route appears on the in-file `INTENTIONAL_EXCEPTIONS` list with
   a `reason` ≥10 chars and a real route path.

Companion repo-side coverage tests already in place:

- `__tests__/unit/api/rate-limit-coverage.test.ts` — per-route helper
  + scoped-key assertions.
- `__tests__/unit/lib/middleware/rate-limiter-check.test.ts` — explicit-
  key isolation + memory-provider default behavior.
- `__tests__/unit/lib/middleware/rate-limiter-durable-provider-guard.test.ts`
  — durable-provider approval-gate + forbidden SDK/dependency scan.

## 3. Mutation route adoption snapshot

| Route | Mutation handlers | Treatment | Identity / key |
| --- | --- | --- | --- |
| `src/app/api/admin/status-refresh/route.ts` | POST | helper | `rateLimitAdminRoute(request, 'admin:status-refresh')` → route+IP |
| `src/app/api/admin/ingest/zillow/route.ts` | POST | helper | `rateLimitAdminRoute(request, 'admin:ingest-zillow')` → route+IP |
| `src/app/api/admin/generate-vibes/route.ts` | POST | helper | `rateLimitAdminRoute(request, 'admin:generate-vibes')` → route+IP |
| `src/app/api/admin/generate-neighborhood-vibes/route.ts` | POST | helper | `rateLimitAdminRoute(request, 'admin:generate-neighborhood-vibes')` → route+IP |
| `src/app/api/admin/generate-vibes-zillow/route.ts` | POST | helper | `rateLimitAdminRoute(request, 'admin:generate-vibes-zillow')` → route+IP |
| `src/app/api/couples/disputed/route.ts` | PATCH | helper | `checkRateLimit(rateLimitKey('couples:disputed', user.id))` → user.id |
| `src/app/api/couples/notify/route.ts` | POST | helper | `checkRateLimit(rateLimitKey('couples:notify', user.id))` → user.id |
| `src/app/api/interactions/route.ts` | POST, DELETE | helper | `checkRateLimit(...)` keyed on user.id (POST) / `interactions:delete` scope (DELETE) |
| `src/app/api/interactions/reset/route.ts` | DELETE | helper | `checkRateLimit(rateLimitKey('interactions:reset', user.id))` → user.id |
| `src/app/api/performance/metrics/route.ts` | POST | helper | `checkRateLimit(rateLimitKey('performance:metrics', ip))` → IP |
| `src/app/api/maps/geocode/route.ts` | POST | helper | `checkRateLimit(rateLimitKey('maps:geocode', auth.user.id))` → user.id |
| `src/app/api/maps/places/autocomplete/route.ts` | POST | helper | `checkRateLimit(rateLimitKey('maps:autocomplete', auth.user.id))` → user.id |
| `src/app/api/users/avatar/route.ts` | POST, DELETE | helper | `rateLimit(request, 'strict' / 'standard')` → IP |
| `src/app/api/couples/activity/route.ts` | (GET helper) | helper on GET; no mutation handlers exposed | `withRateLimit(request, ..., 'standard')` |
| `src/app/api/health/route.ts` | POST, PUT, PATCH, DELETE | 405 stub | n/a |
| `src/app/api/properties/marketing/route.ts` | POST, PUT, PATCH, DELETE | 405 stub | n/a |
| `src/app/api/couples/check-mutual/route.ts` | POST, PUT, PATCH, DELETE | 405 stub | n/a |

Read-only routes that also opt into a limiter helper but are out of the
mutation scan's scope: `src/app/api/users/search/route.ts` (GET) and
`src/app/api/couples/mutual-likes/route.ts` (GET).

## 4. Identity strategy summary

- **Authenticated mutations**: route-scoped key derived via
  `rateLimitKey('<route-scope>', user.id)` so disputed/notify/
  interactions/reset/maps quotas are isolated per route per user. Falls
  through `checkRateLimit` (memory store).
- **Admin cron routes**: `admin:<routeKey>:<ip>` via
  `rateLimitAdminRoute`. Cron-secret material is intentionally excluded
  from the key (no log, no hash dimension), matching the M5 admin
  closure note in `rate-limit-gap-scout.md`.
- **Anonymous / pre-auth surfaces** (`users/avatar`,
  `performance/metrics`): IP-derived identifier from
  `getClientIdentifier()` =
  `ip_<x-forwarded-for[0] | x-real-ip | 'unknown'>`. Never reads
  Supabase auth; no session lookup overhead before the limiter check.
- **Auth flows**: `authRateLimit` overlays the `auth` tier
  (5 / 15min / 30m block) on either an explicit identifier or the same
  IP fallback, and warn-logs the brute-force signal under
  `[Security] Auth rate limit exceeded`.
- **Test bypass**: `shouldBypassRateLimit()` returns true under
  `NODE_ENV=test` or `NEXT_PUBLIC_TEST_MODE=true`, **unless**
  `RATE_LIMIT_ENFORCE_IN_TESTS=true` or `RATE_LIMIT_ENFORCE=true` flips
  the seam back on. This is the exact knob that
  `rate-limiter-check.test.ts` and the route-coverage tests exercise.

## 5. Documented exceptions

`INTENTIONAL_EXCEPTIONS` in
`__tests__/unit/api/route-rate-limit-adoption-scan.test.ts` is **empty**
as of this evidence date. Every non-stub mutation handler under
`src/app/api/**` routes through a shared helper; every other mutation
handler is a 405 stub the scan also accepts.

A future entry MUST include:

- a `path` that resolves under the worktree (the scan asserts
  `statSync(absPath)` resolves), and
- a `reason` ≥10 characters explaining why a shared helper is not
  applicable (e.g. a route that proxies to a downstream service which
  already enforces its own per-IP throttling), with the discussion
  link in the reason text.

Adding an exception without those fields fails the scan; removing the
last shared-helper invocation from a route while leaving handler work
in place fails the scan; renaming the helper module without updating
`RATE_LIMIT_IMPORT_SOURCES` fails the scan.

## 6. What this note explicitly does NOT do

- Does not select, install, or call any durable rate-limit provider
  (Upstash, Vercel KV, Redis, ioredis, Cloudflare KV, Memcached, etc.).
  The approval-gate guard remains canonical.
- Does not alter `INTENTIONAL_EXCEPTIONS` or its fixture.
- Does not authorize Phase 2+ work, deploys, env edits, dashboard
  changes, paid Maps quota lift, or live Supabase mutations.
- Does not run broad test suites; static evidence only.
- Does not enumerate every read-only route that calls a helper; only
  the mutation-scope routes the new scan actually enforces, plus the
  two GET routes most often cited alongside.

## 7. Source artifacts

- `src/lib/middleware/rateLimiter.ts`
- `src/lib/api/admin-rate-limit.ts`
- `__tests__/unit/api/route-rate-limit-adoption-scan.test.ts`
- `__tests__/unit/api/rate-limit-coverage.test.ts`
- `__tests__/unit/lib/middleware/rate-limiter-check.test.ts`
- `__tests__/unit/lib/middleware/rate-limiter-durable-provider-guard.test.ts`
- `reports/home-match-revival/rate-limit-gap-scout.md`
- `reports/home-match-revival/p1-route-scoped-limiter-key-closure-2026-05-08.md`
- `reports/home-match-revival/d2-rate-limit-provider-readiness-map-2026-05-08.md`
- `reports/home-match-revival/d2-durable-rate-limiter-approval-gate-guard-2026-05-08.md`
