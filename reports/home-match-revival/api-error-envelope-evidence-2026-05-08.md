# API Error Envelope Evidence — 2026-05-08

Phase 0/1 docs-only evidence note. Read-only; no tests, builds, or external calls run for this slice. Maps canonical envelope helpers in `src/lib/api/errors.ts` to the route families and shared boundaries that adopt them, and records the documented non-envelope exceptions.

## Canonical envelope

`src/lib/api/errors.ts` — `ApiErrorHandler` is the single source of truth for JSON API responses.

- Error shape: `{ error: string, code: string, details?: unknown }` (400 carries `details`; 401/403/404/500/405/429/502/503/504 omit it).
- Success shape: `{ data, success: true }` via `ApiErrorHandler.success`.
- Helpers:
  - `badRequest` → 400 / `BAD_REQUEST` (carries `details`)
  - `unauthorized` → 401 / `UNAUTHORIZED`
  - `forbidden` → 403 / `FORBIDDEN`
  - `notFound` → 404 / `NOT_FOUND`
  - `methodNotAllowed` → 405 / `METHOD_NOT_ALLOWED`
  - `tooManyRequests` → 429 / `RATE_LIMITED` (preserves rate-limit headers)
  - `serverError` → 500 / `SERVER_ERROR` (logs `details`)
  - `badGateway` → 502 / `BAD_GATEWAY`
  - `serviceUnavailable` → 503 / `SERVICE_UNAVAILABLE`
  - `gatewayTimeout` → 504 / `GATEWAY_TIMEOUT`
  - `fromZodError` → 400 / `BAD_REQUEST` with `error.flatten()` in `details`
  - `success<T>` → 200 envelope `{ data, success: true }`

## Shared boundaries that produce envelopes

These helpers wrap a class of errors so route handlers do not have to. Routes that import them inherit the envelope shape automatically.

- `src/lib/api/auth.ts` — `requireUserFromRequest` returns `ApiErrorHandler.unauthorized()` on missing/invalid auth. Used as the standard 401 boundary by API routes.
- `src/lib/middleware/rateLimiter.ts` — `checkRateLimit` and the `withRateLimit` wrapper return:
  - 429 via `ApiErrorHandler.tooManyRequests` (carries `Retry-After` and `X-RateLimit-*` headers)
  - 401 via `ApiErrorHandler.unauthorized`
  - 500 via `ApiErrorHandler.serverError`
- `src/lib/api/admin-rate-limit.ts` — `rateLimitAdminRoute` delegates to `checkRateLimit`, so admin 429s reuse the standardized envelope (no local raw shape).
- `src/lib/api/route-deadline.ts` — `withRouteDeadline` resolves to `ApiErrorHandler.gatewayTimeout` when a handler races past its deadline.

## Helper → route adoption matrix

Counts come from `grep -nE "ApiErrorHandler\." src/app/api/**/route.ts`. All 26 `route.ts` files under `src/app/api` either import `ApiErrorHandler` directly or inherit envelopes via the shared boundaries above. The remaining direct `NextResponse.json(...)` callsites in API routes are success/data payloads (no `error` field) — see exceptions below.

### `unauthorized` — 401 / `UNAUTHORIZED`

Primarily produced by `requireUserFromRequest` and the rate limiter; direct callers include:

- `src/app/api/couples/check-mutual/route.ts`
- `src/app/api/couples/mutual-likes/route.ts`
- `src/app/api/couples/stats/route.ts`
- `src/app/api/couples/disputed/route.ts`
- `src/app/api/admin/generate-vibes/route.ts`
- `src/app/api/admin/generate-vibes-zillow/route.ts`
- `src/app/api/admin/generate-neighborhood-vibes/route.ts`
- `src/app/api/admin/ingest/zillow/route.ts`
- `src/app/api/admin/status-refresh/route.ts`
- `src/app/api/interactions/route.ts`, `src/app/api/interactions/reset/route.ts`
- `src/app/api/users/avatar/route.ts`, `src/app/api/users/search/route.ts`
- `src/app/api/performance/metrics/route.ts`

### `badRequest` / `fromZodError` — 400 / `BAD_REQUEST`

- All `couples/*` routes (input validation, missing IDs, invalid resolution types)
- `interactions/route.ts` and `interactions/reset/route.ts` (Zod-validated bodies)
- `maps/geocode/route.ts`, `maps/places/autocomplete/route.ts`, `maps/metro-boundaries/route.ts`
- `users/search/route.ts`, `users/avatar/route.ts`
- `properties/marketing/route.ts`, `properties/vibes/route.ts`, `neighborhoods/vibes/route.ts`
- `performance/metrics/route.ts`
- `admin/generate-vibes/route.ts`, `admin/generate-vibes-zillow/route.ts`, `admin/generate-neighborhood-vibes/route.ts`, `admin/status-refresh/route.ts`, `admin/ingest/zillow/route.ts`
- `zillow/random-image/route.ts`

### `notFound` — 404 / `NOT_FOUND`

- `src/app/api/couples/disputed/route.ts` (no household)
- `src/app/api/couples/stats/route.ts` (household stats missing)
- `src/app/api/users/avatar/route.ts`
- `src/app/api/zillow/random-image/route.ts`

### `methodNotAllowed` — 405 / `METHOD_NOT_ALLOWED`

- `src/app/api/health/route.ts`
- `src/app/api/properties/marketing/route.ts`
- `src/app/api/couples/activity/route.ts`
- `src/app/api/couples/check-mutual/route.ts`

### `tooManyRequests` — 429 / `RATE_LIMITED`

Produced centrally by `src/lib/middleware/rateLimiter.ts` and consumed via `checkRateLimit` / `rateLimitAdminRoute` in:

- `src/app/api/interactions/route.ts`
- `src/app/api/maps/geocode/route.ts`, `src/app/api/maps/places/autocomplete/route.ts`
- `src/app/api/users/search/route.ts`
- `src/app/api/performance/metrics/route.ts`
- `src/app/api/couples/notify/route.ts`, `src/app/api/couples/disputed/route.ts`
- All `admin/*` routes via `rateLimitAdminRoute`

### `serverError` — 500 / `SERVER_ERROR`

Used as the default 500 in every `route.ts` listed in the helper-usage scan above (28 files including shared boundaries).

### `badGateway` — 502 / `BAD_GATEWAY`

- `src/app/api/zillow/random-image/route.ts` (upstream Zillow search failure)

### `serviceUnavailable` — 503 / `SERVICE_UNAVAILABLE`

- `src/app/api/maps/script/route.ts`, `src/app/api/maps/geocode/route.ts`, `src/app/api/maps/places/autocomplete/route.ts` (paid Google Maps proxies without server key)
- `src/app/api/neighborhoods/vibes/route.ts` (vibes table not initialized)
- `src/app/api/admin/ingest/zillow/route.ts`, `src/app/api/admin/status-refresh/route.ts` (RAPIDAPI_KEY missing)
- `src/app/api/admin/generate-vibes/route.ts`, `src/app/api/admin/generate-vibes-zillow/route.ts`, `src/app/api/admin/generate-neighborhood-vibes/route.ts` (LLM/key-gated cron)
- `src/app/api/zillow/random-image/route.ts` (Zillow not configured)

### `gatewayTimeout` — 504 / `GATEWAY_TIMEOUT`

- `src/app/api/interactions/route.ts` (summary fetch deadline)
- All routes wrapped by `withRouteDeadline` in `src/lib/api/route-deadline.ts`

### `success<T>` envelope

Adopted in `src/app/api/interactions/route.ts`, `src/app/api/interactions/reset/route.ts`, `src/app/api/users/avatar/route.ts`. Other routes return data shapes pre-dating the success envelope (see exceptions).

## Documented exceptions (intentional non-envelope responses)

These responses are not bugs in the M6 standardization; they are deliberate departures recorded so future audits do not reopen them.

- `src/app/api/maps/proxy-script/route.ts` — returns JavaScript (not JSON). Errors are rendered as JS comments by design; envelopes do not apply.
- `src/app/api/health/route.ts` — `NextResponse.json({}, { status: 200 })` for HEAD/health probes is intentionally an empty 200 body, not a `{ data, success }` envelope.
- `src/app/api/properties/marketing/route.ts` — returns the raw `MARKETING_CARDS` array as the contract clients consume; method-not-allowed paths still use `methodNotAllowed`.
- `src/app/api/maps/metro-boundaries/route.ts`, `src/app/api/maps/geocode/route.ts`, `src/app/api/maps/places/autocomplete/route.ts` — success payloads return upstream-shaped data (`{ results }`, `{ predictions }`, cached GeoJSON) rather than the `{ data, success }` envelope, matching the Google Maps client contract. Error paths are envelope-conformant.
- `src/app/api/admin/ingest/zillow/route.ts`, `src/app/api/admin/status-refresh/route.ts`, `src/app/api/admin/generate-vibes/route.ts`, `src/app/api/admin/generate-neighborhood-vibes/route.ts`, `src/app/api/admin/generate-vibes-zillow/route.ts` — cron success payloads carry batch counters at the top level (`{ ok, summary, ... }`) for operator log readability. Error paths are envelope-conformant.
- `src/app/api/couples/disputed/route.ts`, `src/app/api/couples/notify/route.ts`, `src/app/api/couples/activity/route.ts` — success payloads use route-specific shapes (`{ status: 'ok' }`, `{ resolutions, ... }`, etc.) rather than `success<T>`. Error paths are envelope-conformant.
- `src/app/api/zillow/random-image/route.ts` — empty demo results return a no-store 200 with a route-specific body instead of a 204 (the previous 204-with-error-body bug was closed in M6).

## Regression coverage

`__tests__/unit/api/error-standardization.test.ts` enforces:

- Shared rate limiter and admin rate limiter route 429/401/500 through `ApiErrorHandler`.
- `interactions`, `zillow/random-image`, and the couples / maps / admin / final-JSON route families do not contain raw `NextResponse.json({ error: ... })` patterns and import `@/lib/api/errors`.
- `interactions/route.ts` calls `ApiErrorHandler.gatewayTimeout` and `checkRateLimit`.
- `zillow/random-image/route.ts` does not return `status: 204` and uses `notFound` / `serviceUnavailable` / `badGateway`.

## Cross-references

- `reports/home-match-revival/api-error-standardization-scout.md` — the original M6 inventory of raw responses (now closed).
- `reports/home-match-revival/api-error-standardization-remediation-2026-05-08.md` — the M6 remediation log this evidence note ties off.
- `reports/home-match-revival/m8-external-timeouts-closure-2026-05-08.md` — for the 504/timeout boundary that consumes `gatewayTimeout`.
