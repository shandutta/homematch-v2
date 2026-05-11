# P0 No-Auth API / Protected Redirect Probe Harness

Generated: 2026-05-08T13:43:12Z
Task: t_3b07751e
Scope: repo-local Phase 0/1 closure slice for no-credential public API/page probes and unauthenticated protected redirect probes.

## What changed

- Added `__tests__/integration/routing/no-auth-live-probe.spec.ts`, a bounded Vitest live-probe matrix that only runs when `NO_AUTH_LIVE_PROBES_RUN=1`.
- Added `scripts/run-no-auth-live-probes.js`, a no-secret wrapper that refuses non-local base URLs, checks whether a local app server is responding, and exits 0 with an explicit SKIP message when no local server is running.
- Added `pnpm test:no-auth-live-probes` as the repo-local wrapper command.

## Harness guardrails

- Default base URL is `http://127.0.0.1:3000`.
- Allowed base hosts are only `127.0.0.1`, `localhost`, and `::1`.
- The wrapper does not start a server, deploy, use production dashboards, use paid APIs, use browser swarms, or submit auth/signup/reset/contact forms.
- The wrapper does not use credentials, bearer tokens, session cookies, real user data, cron secrets, admin secrets, or external service keys.
- Public page probes are GET render/status checks only.
- Protected page probes use unauthenticated GET with `redirect: 'manual'` and assert redirect to `/login` with `redirectTo` preserved.
- Public API probes are limited to `/api/health` and GET method-boundary coverage for `/api/performance/metrics`; the metrics probe does not POST metrics.
- Protected API probes are anonymous GET denial checks for user-scoped read APIs and synthetic IDs/query values only.

## Probe coverage

Public no-credential pages / metadata:

- `/`
- `/about`
- `/contact`
- `/cookies`
- `/demo/ads`
- `/invite/synthetic-invalid-token`
- `/login`
- `/privacy`
- `/reset-password`
- `/signup`
- `/sponsor-mockups`
- `/terms`
- `/verify-email`
- `/auth/auth-code-error`
- `/robots.txt`
- `/sitemap.xml`
- `/synthetic-missing-route-for-p0-no-auth-probe`

Unauthenticated protected redirects:

- `/dashboard`
- `/dashboard/activity`
- `/dashboard/liked`
- `/dashboard/mutual-likes`
- `/dashboard/passed`
- `/dashboard/viewed`
- `/dashboard/vibes-test`
- `/profile`
- `/settings`
- `/household/create`
- `/household/join`
- `/couples`
- `/couples/decisions`
- `/properties/synthetic-property-id`
- `/validation`
- `/couples?tab=activity`

API no-credential checks:

- `/api/health` expects 200.
- GET `/api/performance/metrics` expects 405 and does not submit metrics.
- Anonymous user-scoped GET routes under `/api/couples/*`, `/api/interactions`, `/api/neighborhoods/vibes`, `/api/properties/vibes`, and `/api/users/search` expect 401.

## Verification evidence

Commands run from `/home/shan/projects/homematch-v2`:

1. `systemd-run --user --scope -p MemoryMax=2G -p CPUQuota=200% pnpm exec vitest run __tests__/integration/routing/no-auth-live-probe.spec.ts --config vitest.config.ts`
   - Result: pass with 1 skipped file / 45 skipped tests because `NO_AUTH_LIVE_PROBES_RUN` was intentionally unset.
   - This verifies the default non-live behavior is safe and skipped.

2. `systemd-run --user --scope -p MemoryMax=2G -p CPUQuota=200% pnpm test:no-auth-live-probes`
   - Result: exit 0 with `[p0-no-auth-live-probes] SKIP: no local app server responded at http://127.0.0.1:3000; start the local app before running live probes.`
   - This verifies the wrapper skips cleanly when no local app server is running.

3. `systemd-run --user --scope -p MemoryMax=2G -p CPUQuota=200% pnpm exec jest __tests__/unit/routing/no-auth-traversal-smoke-guard.test.ts --runInBand`
   - Result: PASS, 5/5 tests.
   - This preserves the static no-auth route/protected redirect guard.

4. `NO_AUTH_LIVE_PROBES_BASE_URL=https://example.com node scripts/run-no-auth-live-probes.js; test $? -eq 1`
   - Result: exit 0 for the shell assertion after the wrapper itself exited 1 with `Refusing no-auth live probes against non-local URL https://example.com`.
   - This verifies the wrapper refuses non-local targets.

5. `systemd-run --user --scope -p MemoryMax=2G -p CPUQuota=200% pnpm format:file __tests__/integration/routing/no-auth-live-probe.spec.ts scripts/run-no-auth-live-probes.js package.json reports/home-match-revival/phase0-phase1-closure-matrix.md reports/home-match-revival/p0-no-auth-api-protected-redirect-probe-harness-2026-05-08.md`
   - Result: PASS; Prettier wrote the new/changed files and reported package/matrix/report unchanged where applicable.

## Closure status

Harness/readiness is repo-local complete for this slice. Live execution is still not claimed because no local app server was running at `127.0.0.1:3000` during verification.

Authenticated browser/API execution remains blocked until Shan approves a non-production seeded auth/session and safe local/test data path. This harness intentionally does not attempt authenticated probes.
