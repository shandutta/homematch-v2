# Phase 0/1 Remediation Progress — Auth Boundary Consolidation — 2026-05-08

Status: **auth cleanup partially remediated; Phase 0/1 still not closed**.

## Closed in this slice

- Converted `src/app/api/couples/check-mutual/route.ts`, `src/app/api/couples/stats/route.ts`, and `src/app/api/couples/mutual-likes/route.ts` from open-coded `getUserFromRequest` auth extraction to `requireUserFromRequest`.
- Added static regression coverage in `__tests__/unit/api/auth-boundary-consolidation.test.ts` so these routes keep the canonical API auth boundary.

## Verification

- RED: `hm-auth-boundary-red-1778209038.service` failed before route conversion.
- GREEN: `hm-auth-boundary-green-1778209062.service` passed.
- Final targeted: `hm-auth-boundary-test-final-1778209087.service` passed 2 suites.
- Type-check: `hm-auth-boundary-typecheck-1778209091.service` passed.
- Diff check: passed.

## Remaining auth cleanup

- Continue route-by-route consolidation for any remaining server API routes with open-coded auth.
- Address duplicate/monkey-patched auth client behavior in `src/lib/supabase/server.ts` only with a dedicated design/test slice.
