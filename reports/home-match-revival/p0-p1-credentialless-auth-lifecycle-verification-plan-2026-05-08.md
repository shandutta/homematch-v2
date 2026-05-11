# P0/P1 Credentialless Auth Lifecycle Verification Plan

Generated: 2026-05-08T08:45:17Z
Scope: read-only scout for strict Phase 0/1 gate. No secrets read, no real user/customer data used, no browser swarm run, no external dashboards, no paid APIs, and no repo code mutated.
Repo: `/home/shan/projects/homematch-v2`

## Verdict

The open closure-matrix item "E2E auth lifecycle" can be narrowed, but it cannot be closed credentiallessly.

What is possible now without approved credentials is useful but partial: static coverage review, missing-config behavior, public/auth-page rendering, anonymous protected-route redirect checks, redirect allowlist checks, and mocked unit/component coverage for login/signup/verify/reset behavior.

What is not possible credentiallessly is the actual lifecycle proof Phase 0/1 needs: seeded test user exists, login succeeds against Supabase, session persists into middleware cookies/localStorage, protected pages render as authenticated, logout clears the session, and signup/verification behavior matches the production policy. That requires either an approved existing test session/credential set or local Supabase/Docker with seeded users from `scripts/setup-test-users-admin.js`.

## Coverage available now without credentials/session

These can be run or inspected without mutating real data:

1. Auth form unit/component coverage with mocked Supabase client
   - `__tests__/unit/components/auth/LoginForm.test.tsx`
     - renders form
     - missing Supabase browser env notice
     - successful email/password login through mock
     - login failure message
     - Google OAuth success/failure through mock
     - disabled/loading states
     - empty form submission prevention
   - `__tests__/unit/components/auth/SignupForm.test.tsx`
     - renders form
     - missing Supabase browser env notice
     - successful signup through mock
     - signup failure message
     - Google OAuth success/failure through mock
     - disabled/loading states
     - post-signup success state
     - resend verification email path
   - `__tests__/unit/components/auth/VerifyEmailForm.test.tsx`
     - prefill from search params
     - verifies code and redirects when session is returned
     - falls back to fetching session
     - verification failure
     - missing Supabase browser config notice

2. Credentialless E2E checks
   - `__tests__/e2e/auth-login-flow.spec.ts` has browser tests for login form rendering, validation, loading, accessibility, and error display. The "successful email/password authentication flow" is adaptive and currently accepts either redirect or error, so it is not closure-grade proof of successful auth.
   - `__tests__/e2e/properties-route-auth.spec.ts` checks anonymous `/properties/:id` redirects to `/login?redirectTo=...`.
   - Anonymous protected-route redirect checks can be run for every prefix in `src/lib/routing/protected-routes.ts`: `/dashboard`, `/profile`, `/household`, `/settings`, `/validation`, `/couples`, `/properties`.

3. Middleware/static auth-boundary checks
   - `middleware.ts` redirects unauthenticated protected paths to `/login` with a `redirectTo` param.
   - `middleware.ts` redirects already-authenticated `/login` or `/signup` users to a safe local `redirectTo`/legacy `redirect` value or `/dashboard`.
   - `middleware.ts` blocks open redirects via `getSafeRedirectPath`: rejects missing values, non-absolute paths, protocol-relative values, and values containing `://`.
   - `src/lib/routing/protected-routes.ts` is a concise source of protected prefixes.
   - API routes are now skipped by middleware auth work and expected to enforce auth inside handlers. That is good for performance, but it means API auth lifecycle verification must check handler-level `requireUserFromRequest()`/bearer/cookie behavior separately from page middleware.

4. Docs/setup clarity
   - `AGENTS.md` says fast dev can use `SKIP_SUPABASE_GUARD=true pnpm dev`; Docker is optional except local DB and integration paths.
   - `docs/SETUP_GUIDE.md` documents local Supabase reset and test-user setup via `pnpm test:setup-users` / `scripts/setup-test-users-admin.js`.
   - `package.json` exposes the relevant commands: `test:e2e`, `test:e2e:smoke`, `test:setup-users`, `dev:db`, and `test:integration`.

## What requires approved credentials/session or local Supabase/Docker

1. Successful login/session persistence
   - `__tests__/e2e/auth.setup.ts` logs in all worker users and writes `playwright/.auth/user-worker-*.json` storage states.
   - It depends on users from `__tests__/fixtures/test-data.ts`, especially `test-worker-0@example.com` through `test-worker-7@example.com` and `test3@example.com` as a fresh user.
   - It waits for Supabase auth cookie/localStorage state using `getSupabaseAuthStorageKey(hostname)`.
   - Without actual test users in the target Supabase project, this cannot prove lifecycle closure.

2. Test-user creation
   - `scripts/setup-test-users-admin.js` requires `SUPABASE_SERVICE_ROLE_KEY` and defaults to local Supabase at `http://127.0.0.1:54200`.
   - It refuses non-local Supabase unless `ALLOW_REMOTE_SUPABASE=true` or `SUPABASE_ALLOW_REMOTE=true` is explicitly set.
   - It deletes/recreates test users and upserts profiles, so it is a data mutation and was correctly out of scope for this read-only scout.

3. Authenticated protected-page traversal
   - The app has helper support in `__tests__/utils/auth-helper.ts`: `login`, `logout`, `verifyAuthenticated`, `verifyNotAuthenticated`, `useStorageState`, and `authenticateWithStorageState`.
   - Real authenticated traversal needs a valid session to verify `/dashboard`, `/couples`, `/properties/:id` or representative property UI, `/settings`, and `/profile`.

4. Signup/verify lifecycle
   - Current unit tests mock `signUp` and verification behavior.
   - True lifecycle proof requires a policy decision and environment: email confirmation/CAPTCHA remain decision-needed items in the closure matrix. If production confirmation is enabled, verification needs either a local Mailpit/Supabase email capture path or an approved non-production email workflow.

5. Integration/API auth with real tokens
   - API middleware no longer authenticates `/api/*`; handlers must do it.
   - Closure-grade API auth probes need a bearer token or cookie from an approved test user/session and a local/safe dataset. Otherwise only 401/anonymous rejection and static handler scans are safe.

## Minimal closure-grade test matrix

Run this only in an approved local Supabase/Docker environment or with an approved existing non-production test session. Keep worker count low; this is not a browser swarm.

### A. Credentialless preflight, safe now

1. Static route boundary check
   - Verify every `PROTECTED_PATH_PREFIXES` entry redirects anonymous users to `/login?redirectTo=<path>`.
   - Verify public auth routes `/login`, `/signup`, `/verify-email`, `/reset-password` render without secrets and without console errors.

2. Redirect safety
   - Anonymous deep link `/couples` preserves `redirectTo=/couples`.
   - Authenticated visit to `/login?redirectTo=https://example.com` falls back to `/dashboard`.
   - Legacy `/login?redirect=/couples` still works.

3. Mocked component unit coverage
   - Run targeted auth component tests: LoginForm, SignupForm, VerifyEmailForm, plus ResetPasswordForm if present.

### B. Local seeded lifecycle, required for Phase 0/1 closure

Prereq: local Supabase/Docker or approved remote-test override.

1. Start/reset local test data
   - Local path: `pnpm dev:db` or equivalent local Supabase start/reset, then `pnpm test:setup-users`.
   - Do not run against production or real user data.

2. Playwright setup/session proof
   - Run setup only or a tiny dependent suite with `PLAYWRIGHT_WORKERS=1`.
   - Prove `auth.setup.ts` creates a storage state for one worker test user and that the session persists by cookie/localStorage.

3. Login to dashboard
   - `/login` with `test-worker-0@example.com` + `testpassword123`.
   - Expect redirect to `/dashboard` and authenticated content.

4. Deep-link protected redirect
   - Clear session.
   - Visit `/couples`.
   - Expect `/login?redirectTo=/couples`.
   - Login and expect return to `/couples`.

5. Protected route smoke after login
   - Visit `/dashboard`, `/couples`, `/settings`, `/profile`, and one representative `/properties/:id` seeded in local data.
   - Capture URL, HTTP status if available, visible app shell, and console errors.

6. Logout lifecycle
   - From authenticated app shell, click logout.
   - Expect public/login/root destination.
   - Revisit `/dashboard`; expect redirect to `/login?redirectTo=/dashboard`.

7. API auth smoke with same test user
   - Use a token/session from the test user.
   - Probe a small read-only handler-level auth set, for example a couples stats/activity endpoint and a user/profile route if safe locally.
   - Also verify anonymous requests still return 401 and paid/external endpoints are not invoked without approval.

### C. Signup/verify, policy-gated

Only run after D3 production/local auth policy is decided.

1. If confirmations disabled in local test mode
   - Signup with unique local test email.
   - Verify expected post-signup state and session policy.

2. If confirmations enabled
   - Signup with unique local test email.
   - Capture verification email/code through local Supabase/Mailpit or another approved non-production sink.
   - Complete `/verify-email` and verify session/protected route access.

3. CAPTCHA
   - If CAPTCHA is required for production but disabled for local tests, document the test-mode exception and add a static/config assertion so production cannot silently launch without the chosen policy.

## Recommended follow-up Kanban tasks

1. P0/P1 local seeded auth lifecycle smoke implementation
   - Assignee: `backend-eng`
   - Body: In a repo-writing lane, add a narrow Playwright lifecycle spec or targeted command wrapper that runs with `PLAYWRIGHT_WORKERS=1` against local Supabase test users only. Cover login -> dashboard -> protected deep-link redirect preservation -> protected smoke pages -> logout -> protected redirect after logout. Use existing `createWorkerAuthHelper`, `auth.setup.ts`, and `scripts/setup-test-users-admin.js`; do not touch production or real data. Update `reports/home-match-revival/phase0-phase1-closure-matrix.md` with evidence only after a successful run.

2. P0 local Supabase auth-run approval/execution
   - Assignee: `backend-eng`
   - Body: With explicit approval for local Docker/Supabase mutations, run the minimal seeded auth lifecycle matrix from `reports/home-match-revival/p0-p1-credentialless-auth-lifecycle-verification-plan-2026-05-08.md`. Capture exact commands, environment class (local only or approved remote-test), pass/fail output, and screenshots/log excerpts without secrets. If local Supabase is unavailable, block with the specific missing prerequisite.

3. P1 signup/verification policy decision closure
   - Assignee: `researcher`
   - Body: Produce a one-page D3 decision artifact for production email confirmation and CAPTCHA policy. Specify local-test behavior, production behavior, whether signup can create a session before verification, and how E2E should verify email without paid/external services. No dashboard changes; this is a decision artifact only.

4. P0/P1 API auth smoke matrix with approved test token
   - Assignee: `backend-eng`
   - Body: After a local seeded test user/session exists, implement/run a small handler-level API auth smoke matrix: anonymous 401 for protected handlers, authenticated 2xx/expected empty response for safe read-only local endpoints, and explicit skips for paid/external/mutating/admin-secret routes. Do not use production data or paid APIs. Feed results into the closure matrix.

## Evidence inspected

- `reports/home-match-business-revival-operating-plan.md` lines 21-27 and 113-125: strict Phase 0/1 gate and E2E/test-suite expectations.
- `reports/home-match-revival/phase0-phase1-closure-matrix.md` lines 13-24: authenticated verification and E2E auth lifecycle remain open/blocked.
- `reports/home-match-revival/phase0-closure-scout.md` lines 62-70: authenticated browser traversal specifically blocked without approved test account/session or local Supabase/Docker.
- `reports/home-match-revival/p1-auth-provider-replacement-decision-memo-2026-05-08.md` lines 188-203: keep Supabase and close full auth lifecycle E2E as a P0/P1 follow-up.
- `middleware.ts`: protected route redirects, auth route safe redirect logic, API fast path, and middleware matcher.
- `src/lib/routing/protected-routes.ts`: protected page prefixes.
- `playwright.config.ts`: setup/cleanup projects, Chromium-only local default, web server command, test-mode Supabase env defaults.
- `__tests__/e2e/auth.setup.ts` and `auth.cleanup.ts`: worker storage-state creation/removal.
- `__tests__/utils/auth-helper.ts`: login/logout/session verification helpers.
- `__tests__/fixtures/test-data.ts`: seeded worker test user identities.
- `scripts/setup-test-users-admin.js`: local-only service-role guarded test-user creation and profile upsert.
- `__tests__/e2e/auth-login-flow.spec.ts`, `auth-redirects.spec.ts`, and `properties-route-auth.spec.ts`: existing browser auth coverage.
- `__tests__/unit/components/auth/LoginForm.test.tsx`, `SignupForm.test.tsx`, and `VerifyEmailForm.test.tsx`: mocked component coverage.

## Closure answer

Credentialless/local-safe coverage can reduce the unknowns but should not close the gate. The Phase 0/1 closure matrix should keep "E2E auth lifecycle" open until a local seeded or explicitly approved non-production session run proves login, session persistence, protected traversal, logout, and post-logout redirect behavior end to end.
