# M8 External-Call Timeout Closure — HomeMatch

Generated: 2026-05-08T05:55Z

## Verdict

M8 is now repo-closed for Next.js API routes: every `src/app/api/**/route.ts` direct outbound `fetch(` call is wrapped through `fetchWithTimeout()`.

## Code changes

- Added Zillow/RapidAPI timeouts to `src/app/api/admin/generate-vibes-zillow/route.ts`.
- Added status-detail refresh timeouts to `src/app/api/admin/status-refresh/route.ts`; timeout is configurable with `STATUS_DETAIL_FETCH_TIMEOUT_MS` and defaults to 10s.
- Added Zillow/RapidAPI search/image timeouts to `src/app/api/zillow/random-image/route.ts`.
- Expanded `__tests__/unit/api/external-timeouts.test.ts` to cover Maps, proxy-script, Zillow random-image, admin status refresh, and admin Zillow vibe generation routes.

## Verification

- Static scan: no `src/app/api/**/route.ts` file contains direct `fetch(` without importing/using `fetchWithTimeout`.
- `pnpm jest __tests__/unit/api/external-timeouts.test.ts --runInBand` passed: 1 suite / 6 tests.
- `pnpm type-check` passed.
- `pnpm lint` still fails on pre-existing unrelated lint debt in files not touched by this slice (`actions.test.ts`, `middleware.ts`, `generate-vibes/route.ts`, several unused `NextResponse` imports, and pre-existing type assertion rules).

## Gate impact

- Close M8 in the Phase 1 matrix.
- Phase 1 remains not 100% complete because other open/block items remain.
- Phase 2+ remains held.
