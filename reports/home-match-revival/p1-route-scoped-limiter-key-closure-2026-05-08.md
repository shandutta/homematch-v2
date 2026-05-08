# P1 route-scoped limiter key closure — 2026-05-08

## Scope

Closed the Phase 1 closure-matrix item for route-scoped limiter keys in a bounded repo-local slice. No deploys, paid APIs, production dashboards, browser swarms, broad installs, or real user/customer data were used.

## Changes

- Added `rateLimitKey(scope, identifier)` in `src/lib/middleware/rateLimiter.ts` as the shared key derivation helper.
- Replaced unscoped or ad-hoc string interpolation limiter keys with shared route-scoped helper usage in:
  - `src/app/api/users/search/route.ts`
  - `src/app/api/maps/geocode/route.ts`
  - `src/app/api/maps/places/autocomplete/route.ts`
  - `src/app/api/interactions/reset/route.ts`
  - `src/app/api/interactions/route.ts`
  - `src/app/api/couples/notify/route.ts`
  - `src/app/api/couples/disputed/route.ts`
  - `src/app/api/performance/metrics/route.ts`
  - `src/lib/api/admin-rate-limit.ts`
- Added static adoption guards in `__tests__/unit/api/rate-limit-coverage.test.ts` and route-isolation behavior coverage in `__tests__/unit/lib/middleware/rate-limiter-check.test.ts`.

## TDD / verification evidence

- RED: `systemd-run --user --scope -p MemoryMax=2G -p CPUQuota=200% pnpm exec jest __tests__/unit/api/rate-limit-coverage.test.ts --runInBand` failed as expected before `src/lib/api/admin-rate-limit.ts` adopted `rateLimitKey`, with `Expected substring: "rateLimitKey"`.
- GREEN focused Jest: `systemd-run --user --scope -p MemoryMax=2G -p CPUQuota=200% pnpm exec jest __tests__/unit/api/rate-limit-coverage.test.ts __tests__/unit/lib/middleware/rate-limiter-check.test.ts --runInBand` passed 19/19 tests.
- Type check: `systemd-run --user --scope -p MemoryMax=3G -p CPUQuota=200% pnpm type-check` passed.

## Closure note

This closes only the Phase 1 route-scoped limiter keys matrix blocker. Phase 1 remains not 100% closed because other matrix blockers and decision-needed items still remain.
