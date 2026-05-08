# P0/P1 strict anonymous protected-route closure — dashboard/couples

Generated: 2026-05-08T16:00:24Z

## Scope

Close the strict anonymous protected-route gap for `/dashboard` and `/couples` after the remote Supabase auth probe showed authenticated traversal passing but anonymous `/dashboard` and `/couples` returning 200 while `/settings` and `/profile` redirected to `/login`.

## Decision

Repo-side default is strict protection. There is no code/docs evidence that `/dashboard` or `/couples` should be public or soft-gated for Phase 0/1. Both remain protected routes and anonymous requests must redirect to `/login` with `redirectTo` preserving the original route and query string.

## Implementation

- Added a targeted app-page auth redirect guard test at `__tests__/unit/app/protected-page-auth-redirects.test.tsx` for:
  - anonymous `/dashboard?tab=liked` -> `/login?redirectTo=%2Fdashboard%3Ftab%3Dliked`
  - anonymous `/couples?tab=activity` -> `/login?redirectTo=%2Fcouples%3Ftab%3Dactivity`
  - authenticated dashboard/couples page access remains allowed under the page-level harness.
- Updated `src/app/dashboard/page.tsx` so its page-level anonymous fallback now redirects to `/login?redirectTo=...` instead of bare `/login`, preserving query parameters the same way `/couples` already did.
- Middleware-level protection remains strict through `src/lib/routing/protected-routes.ts` and existing middleware/no-auth traversal guards.

## Verification

RED:

```text
systemd-run --user --scope -p MemoryMax=2G -p CPUQuota=200% pnpm exec jest __tests__/unit/app/protected-page-auth-redirects.test.tsx --runInBand
```

Result: failed as expected because dashboard redirected to bare `/login` instead of preserving `redirectTo`.

GREEN:

```text
systemd-run --user --scope -p MemoryMax=2G -p CPUQuota=200% pnpm exec jest __tests__/unit/app/protected-page-auth-redirects.test.tsx --runInBand
```

Result: passed 3/3.

Additional targeted verification:

```text
systemd-run --user --scope -p MemoryMax=2G -p CPUQuota=200% pnpm exec jest __tests__/unit/app/protected-page-auth-redirects.test.tsx __tests__/unit/middleware.test.ts __tests__/unit/routing/no-auth-traversal-smoke-guard.test.ts --runInBand
```

Result: passed 21/21 across 3 suites.

```text
systemd-run --user --scope -p MemoryMax=3G -p CPUQuota=200% pnpm type-check
```

Result: passed.

## Remaining gate

This closes the repo-side implementation gap for strict anonymous `/dashboard` and `/couples` page redirects. Closure-grade live remote/local browser evidence should be rerun by the approved probe path after deployment/server restart; no paid APIs, external dashboard changes, or secrets were used here.
