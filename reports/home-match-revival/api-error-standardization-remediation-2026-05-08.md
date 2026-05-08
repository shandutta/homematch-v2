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
- Type-check: `hm-m6-typecheck-1778207696.service` passed.
- Diff check: passed.

## Remaining M6 work

- Convert mixed `src/app/api/interactions/route.ts` raw errors.
- Fix `src/app/api/zillow/random-image/route.ts` 204 responses with error bodies.
- Continue route-family conversions for maps/couples/admin/other APIs.
