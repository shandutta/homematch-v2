# Phase 0/1 Remediation Progress — Auth Boundary Consolidation — 2026-05-08

Status: **Phase 1 auth/client cleanup closed for this bounded repo-side slice**.

## Closed in this slice

- Converted `src/app/api/couples/check-mutual/route.ts`, `src/app/api/couples/stats/route.ts`, and `src/app/api/couples/mutual-likes/route.ts` from open-coded `getUserFromRequest` auth extraction to `requireUserFromRequest`.
- Removed the duplicate `createApiClient()` `supabase.auth.getUser` monkey-patch in `src/lib/supabase/server.ts`; bearer-token fallback now stays in the shared `getUserFromRequest` helper.
- Removed the user-scoped interactions POST service-role fallback/backfill path from `src/app/api/interactions/route.ts`; household lookup now uses the authenticated request client and falls back to `null` without bypassing RLS.
- Added static regression coverage in `__tests__/unit/api/auth-boundary-consolidation.test.ts` so these routes keep the canonical API auth boundary, auth fallback remains centralized, and interactions does not reintroduce service-role fallback.

## Verification

- RED: `pnpm exec jest __tests__/unit/api/auth-boundary-consolidation.test.ts --runInBand` failed after adding monkey-patch and interactions service-role fallback assertions.
- GREEN: `pnpm exec jest __tests__/unit/api/auth-boundary-consolidation.test.ts --runInBand` passed after cleanup.
- Targeted regression: `pnpm exec jest __tests__/unit/api/auth-boundary-consolidation.test.ts __tests__/unit/app/api/interactions/route.test.ts __tests__/unit/api/error-standardization.test.ts --runInBand` passed 3 suites / 37 tests.
- Type-check: `pnpm type-check` passed.
- Diff check: `git diff --check` passed.

## Remaining auth cleanup

- No additional repo-side Phase 1 auth/client cleanup was changed in this bounded slice.
- Future service-role expansion still needs explicit RBAC/policy design before implementation; this slice intentionally avoided guessing beyond removal of the user-scoped fallback.
