# Phase 0/1 Remediation Progress — API Error Standardization — 2026-05-08

Status: **M6 partially remediated; Phase 0/1 still not closed**.

## Closed in this slice

1. **ApiErrorHandler helper coverage expanded**
   - Added standardized helpers for:
     - `methodNotAllowed` / 405 / `METHOD_NOT_ALLOWED`
     - `tooManyRequests` / 429 / `RATE_LIMITED`
     - `badGateway` / 502 / `BAD_GATEWAY`
     - `serviceUnavailable` / 503 / `SERVICE_UNAVAILABLE`
     - `gatewayTimeout` / 504 / `GATEWAY_TIMEOUT`
   - `tooManyRequests` preserves rate-limit headers.

2. **Shared helper error shapes standardized**
   - `src/lib/api/admin-rate-limit.ts` now returns `ApiErrorHandler.tooManyRequests()`.
   - `src/lib/middleware/rateLimiter.ts` now uses `ApiErrorHandler` for 429/401/500 surfaces.

3. **Scout artifact preserved**
   - `reports/home-match-revival/api-error-standardization-scout.md` inventories remaining route-local raw error responses.

## Verification

- RED: `hm-m6-red-1778207538.service` failed before helper/shared-helper adoption.
- GREEN: `hm-m6-green-1778207664.service` passed.
- Final targeted: `hm-m6-test-final-1778207690.service` passed 3 suites.
- Interactions route targeted: `hm-m6-interactions-test-final3-1778208185.service` passed 3 suites / 27 tests.
- Zillow route targeted: `hm-m6-zillow-test-final-1778208739.service` passed 2 suites.
- Route-family targeted: `hm-m6-family-test-final-1778208941.service` passed 3 suites.
- Maps proxy targeted: `hm-m6-maps-test-final-1778209257.service` passed 3 suites.
- Remaining couples route-family targeted: `hm-m6-couples-green-1778209630.service` passed.
- Admin route-family targeted: `hm-m6-admin-green-1778209911.service` passed.
- Type-check: `hm-m6-typecheck-1778207696.service`, `hm-m6-interactions-typecheck3-1778208190.service`, `hm-m6-couples-typecheck-1778209637.service`, and `hm-m6-admin-typecheck-1778209919.service` passed.
- Diff check: passed.

## Additional M6 route conversion

- `src/app/api/interactions/route.ts` now uses `ApiErrorHandler` for raw 400/429/500/504 error responses while preserving no-store success responses.
- `src/app/api/zillow/random-image/route.ts` no longer returns invalid JSON bodies with 204; production/config/upstream failures use `ApiErrorHandler`, and empty demo results return no-store 200 payloads.
- Converted the first route family: `couples/check-mutual`, `couples/stats`, `couples/mutual-likes`, `neighborhoods/vibes`, and `properties/vibes` now use `ApiErrorHandler` for auth/client/server errors.
- Converted paid Google Maps proxy errors in `maps/geocode` and `maps/places/autocomplete` to `ApiErrorHandler`.
- Converted remaining couples route-family raw errors in `couples/activity`, `couples/notify`, and `couples/disputed` to `ApiErrorHandler` for method-not-allowed, validation, rate-limit, not-found, and server failures.
- Converted admin route-family raw errors in `admin/status-refresh`, `admin/ingest/zillow`, `admin/generate-vibes`, `admin/generate-neighborhood-vibes`, and `admin/generate-vibes-zillow` to `ApiErrorHandler` for unauthorized cron, config, bad request, and server failures.
- Regression coverage added to `__tests__/unit/api/error-standardization.test.ts`.

## Remaining M6 work

- Continue route-family conversions for health/performance/maps-script/properties-marketing remaining API errors.
