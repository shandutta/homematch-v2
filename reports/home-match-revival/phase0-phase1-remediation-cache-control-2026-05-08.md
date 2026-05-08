# Phase 0/1 Remediation Progress — Cache-Control Slice — 2026-05-08

Status: **Phase 1 partially remediated; Phase 0/1 still not closed**.

## Closed/advanced in this slice

1. **Middleware/API M3 — user-specific GET cache policy foundation**
   - Added `src/lib/api/cache-control.ts` with `noStoreJson()` and `withUserSpecificNoStoreHeaders()`.
   - Header policy: `private, no-store, no-cache, must-revalidate, max-age=0`.
   - Applied to successful user-specific JSON responses in authenticated GET routes:
     - `src/app/api/couples/activity/route.ts`
     - `src/app/api/couples/check-mutual/route.ts`
     - `src/app/api/couples/disputed/route.ts`
     - `src/app/api/couples/mutual-likes/route.ts`
     - `src/app/api/couples/stats/route.ts`
     - `src/app/api/interactions/route.ts`
     - `src/app/api/neighborhoods/vibes/route.ts`
     - `src/app/api/properties/vibes/route.ts`
     - `src/app/api/users/search/route.ts`
   - Added `__tests__/unit/api/cache-control.test.ts` covering helper behavior and static route adoption.

## Verification

- RED observed:
  - `hm-cache-red-1778204900.service` failed because `@/lib/api/cache-control` was missing.
- GREEN/final observed:
  - `hm-cache-green-1778205009.service`: 1 suite / 4 tests passed.
  - `hm-cache-test-final-1778205036.service`: cache-control + middleware targeted Jest passed.
  - `hm-cache2-red-1778205520.service`: failed on the expanded route adoption matrix before the new routes imported/used `noStoreJson`.
  - `hm-cache2-test-final-1778205589.service`: expanded cache-control + middleware targeted Jest passed.
  - `hm-cache2-typecheck-1778205594.service`: `pnpm type-check` passed under resource limits.
  - `hm-cache-typecheck-1778205041.service`: `pnpm type-check` passed under resource limits.
  - `git diff --check`: passed.

## Remaining gate

M3 is **partial**, not closed globally. Authenticated/user-specific successful GET responses are now covered by the static matrix. Remaining GET routes need explicit classification:

- public static/proxy data: bounded public cache
- health/metrics/admin: no-store/no-cache or no-cache per endpoint semantics
- error responses: explicit no-store/no-cache policy where appropriate

Phase 0 and Phase 1 are still not 100% closed. Continue strict Phase 0/1 remediation only; keep Phase 2+ held.
