# Phase 0 Live Probe / Browser / Auth / Cron / Env Closure Evidence — 2026-05-08

Generated: 2026-05-08T07:19:23Z
Lane: `/home/shan/projects/homematch-v2`
Scope: strict Phase 0 closure only. Read/probe/report only. No deploys, no DB writes, no dashboard mutations, no real cron secrets, no paid API calls beyond rejected unauthenticated auth-boundary probes.

## Verdict

Phase 0 is **not 100% closed** after this slice.

This run advanced closure evidence materially: the local app started through the approved guard bypass, public pages rendered in-browser with clean console output, unauthenticated protected pages redirected to login, 22 local API probes ran without secrets, and all five cron-secret admin endpoints rejected missing secrets before side-effect paths. It also found two concrete blockers: authenticated browser traversal could not be completed because no approved valid test credentials are present in `.env.local` / `.env.prod`, and `/api/maps/metro-boundaries?metro=bay-area` returns 500 in dev because the public endpoint tries to create a service-role client outside an authorized server context.

## Live local app evidence

Command:

```bash
SKIP_SUPABASE_GUARD=true pnpm dev
```

Result:

- Next.js 15.5.9 served on `http://localhost:3000`.
- Guard bypass was explicit and logged: `SKIP_SUPABASE_GUARD=true`.
- `.env.local` was loaded. `.env.prod` is absent.
- No production deploy or remote dashboard mutation was performed.

## Browser traversal evidence

Browser-verified pages and flows:

| Path                                | Result                                                                                               | Console              |
| ----------------------------------- | ---------------------------------------------------------------------------------------------------- | -------------------- |
| `/`                                 | Rendered landing page with header, hero, CTAs, feature sections, footer, and cookie banner.          | 0 console errors     |
| `/cookies`                          | Rendered cookie settings. Banner accept action was clickable; cookie page controls remained visible. | 0 console errors     |
| `/dashboard` unauthenticated        | Redirected to login form instead of exposing protected dashboard content.                            | 0 console errors     |
| `/about`                            | Rendered public about page.                                                                          | 0 console errors     |
| `/contact`                          | Rendered public contact page.                                                                        | 0 console errors     |
| `/login` invalid credential attempt | Showed `Invalid login credentials`; no protected content exposed.                                    | No JS crash observed |

Authenticated traversal status: **blocked**. `scripts/setup-test-users-admin.js` defines default local test users, but `.env.local` does not provide `TEST_USER_1_EMAIL` / `TEST_USER_1_PASSWORD`, `.env.prod` is absent, and the default local test login failed against the currently configured remote Supabase. Running `scripts/setup-test-users-admin.js` would mutate auth/profile data and is outside this no-side-effects slice.

Exact next action: provide an approved existing test account/session cookie for the configured Supabase project, or run a local Supabase/Docker test environment, then verify `login → dashboard → couples → settings/profile → logout` and update this artifact.

## API live probe evidence

Probe shape: local `curl` against `http://127.0.0.1:3000`, no secrets, no real auth cookie, no mutation payloads beyond empty unauthenticated requests expected to reject before side effects.

| Method | Path                                                                        | Status | Body class     | Closure meaning                                                                                               |
| ------ | --------------------------------------------------------------------------- | -----: | -------------- | ------------------------------------------------------------------------------------------------------------- |
| GET    | `/api/health`                                                               |    200 | JSON           | Public health live probe passed; `Cache-Control: no-cache, no-store, must-revalidate`.                        |
| POST   | `/api/health`                                                               |    405 | JSON           | Unsupported method rejected.                                                                                  |
| GET    | `/api/properties/marketing`                                                 |    200 | JSON           | Public marketing API live probe passed.                                                                       |
| GET    | `/api/maps/metro-boundaries?metro=bay-area`                                 |    500 | empty          | **Open bug:** public route calls service-role client and throws `Unauthorized access to service role client`. |
| GET    | `/api/maps/script`                                                          |    200 | JSON           | Public script endpoint responded; `Cache-Control: private, no-store, no-cache, must-revalidate, max-age=0`.   |
| GET    | `/api/maps/proxy-script`                                                    |    200 | JavaScript     | Public proxy script responded; `Cache-Control: public, max-age=3600`.                                         |
| GET    | `/api/couples/activity`                                                     |    401 | auth rejection | User-auth endpoint rejected anonymous request.                                                                |
| GET    | `/api/couples/check-mutual?propertyId=00000000-0000-0000-0000-000000000000` |    401 | auth rejection | User-auth endpoint rejected anonymous request.                                                                |
| GET    | `/api/couples/disputed`                                                     |    401 | auth rejection | User-auth endpoint rejected anonymous request.                                                                |
| GET    | `/api/couples/mutual-likes`                                                 |    401 | auth rejection | User-auth endpoint rejected anonymous request.                                                                |
| GET    | `/api/couples/stats`                                                        |    401 | auth rejection | User-auth endpoint rejected anonymous request.                                                                |
| GET    | `/api/interactions`                                                         |    401 | auth rejection | User-auth endpoint rejected anonymous request.                                                                |
| GET    | `/api/properties/vibes`                                                     |    401 | auth rejection | User-auth endpoint rejected anonymous request.                                                                |
| GET    | `/api/users/search?q=a`                                                     |    401 | auth rejection | User-auth endpoint rejected anonymous request.                                                                |
| POST   | `/api/maps/geocode`                                                         |    401 | auth rejection | Paid Maps geocode rejected before external Google call.                                                       |
| POST   | `/api/maps/places/autocomplete`                                             |    401 | auth rejection | Paid Places autocomplete rejected before external Google call.                                                |
| POST   | `/api/admin/ingest/zillow`                                                  |    401 | auth rejection | Cron/admin endpoint rejected missing secret.                                                                  |
| POST   | `/api/admin/status-refresh`                                                 |    401 | auth rejection | Cron/admin endpoint rejected missing secret.                                                                  |
| POST   | `/api/admin/generate-neighborhood-vibes`                                    |    401 | auth rejection | Cron/admin endpoint rejected missing secret.                                                                  |
| POST   | `/api/admin/generate-vibes`                                                 |    401 | auth rejection | Cron/admin endpoint rejected missing secret.                                                                  |
| GET    | `/api/admin/generate-vibes`                                                 |    401 | auth rejection | Cron/admin status endpoint rejected missing secret.                                                           |
| POST   | `/api/admin/generate-vibes-zillow`                                          |    401 | auth rejection | Cron/admin endpoint rejected missing secret.                                                                  |

API live probe status: **partially closed, not complete**.

Closed in this slice:

- Public health, marketing, maps script, and maps proxy-script smoke probes.
- Anonymous auth-boundary probes for eight user-auth GET endpoints.
- Anonymous paid Maps POST probes confirmed auth rejects before paid external calls.
- Anonymous cron/admin probes confirmed missing-secret rejection across all five cron-secret route families.

Open after this slice:

- Authenticated read-only user endpoint live probes need a valid approved test session.
- `/api/maps/metro-boundaries` needs remediation or a documented public/service-role access design change before it can be marked closed.
- Mutation endpoints remain intentionally unprobed live under this no-side-effects scope.

## Cron-secret endpoint opacity

Static source scan plus live anonymous probes covered five admin route families:

| Route file                                               | Header accepted | Query accepted | Missing secret rejects | Admin rate-limit hook present | Live no-secret status |
| -------------------------------------------------------- | --------------- | -------------- | ---------------------- | ----------------------------- | --------------------: |
| `src/app/api/admin/ingest/zillow/route.ts`               | yes             | yes            | yes                    | yes                           |                   401 |
| `src/app/api/admin/status-refresh/route.ts`              | yes             | yes            | yes                    | yes                           |                   401 |
| `src/app/api/admin/generate-vibes/route.ts`              | yes             | yes            | yes                    | yes                           |                   401 |
| `src/app/api/admin/generate-vibes-zillow/route.ts`       | yes             | yes            | yes                    | yes                           |                   401 |
| `src/app/api/admin/generate-neighborhood-vibes/route.ts` | yes             | yes            | yes                    | yes                           |                   401 |

Closure status: **closed for no-secret endpoint opacity**. Secret strength, storage, rotation, and incident-response policy remain an ops/security decision and should not be inferred from route code.

## `.env.prod` guard precision

Observed environment file presence:

- `.env.local`: present.
- `.env.prod`: absent.
- `.env.test.local`: absent.

Guard behavior:

| Command                                            | Result | Evidence                                                                                   |
| -------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------ |
| `pnpm run guard:supabase`                          | exit 1 | Blocks because `.env.local` host matches fallback production host / Supabase host pattern. |
| `SKIP_SUPABASE_GUARD=true pnpm run guard:supabase` | exit 0 | Explicit developer bypass works for known read-only local dev/probe flows.                 |

Closure status: **precision improved but not fully closed**. The guard is precise enough to block the current remote/prod-like `.env.local` even without `.env.prod`, but `.env.prod` remains absent, so the guard still depends on a hard-coded fallback prod host plus generic Supabase-host detection. A sanitized non-secret `.env.prod` baseline or explicit documented fallback policy is still needed for full closure.

## Test-suite quality triage

Targeted command:

```bash
pnpm exec jest \
  __tests__/unit/api/cache-control.test.ts \
  __tests__/unit/api/error-standardization.test.ts \
  __tests__/unit/api/external-timeouts.test.ts \
  __tests__/unit/api/rate-limit-coverage.test.ts \
  __tests__/unit/api/ingest-zillow-route.test.ts \
  __tests__/unit/api/status-refresh-route.test.ts \
  __tests__/unit/api/generate-vibes-route.test.ts \
  __tests__/unit/auth/password-config-alignment.test.ts \
  --runInBand
```

Result: **7 suites passed, 1 suite failed; 64 passed, 5 failed, 69 total**.

Passing suites:

- `__tests__/unit/api/cache-control.test.ts`
- `__tests__/unit/api/external-timeouts.test.ts`
- `__tests__/unit/api/rate-limit-coverage.test.ts`
- `__tests__/unit/api/ingest-zillow-route.test.ts`
- `__tests__/unit/api/status-refresh-route.test.ts`
- `__tests__/unit/api/generate-vibes-route.test.ts`
- `__tests__/unit/auth/password-config-alignment.test.ts`

Failing suite:

- `__tests__/unit/api/error-standardization.test.ts` expects `ApiErrorHandler.tooManyRequests` adoption in `src/lib/api/admin-rate-limit.ts`, `src/app/api/interactions/route.ts`, `src/app/api/maps/geocode/route.ts`, and `src/app/api/maps/places/autocomplete/route.ts`. Current code returns raw `checkRateLimit(...)` responses, so the static M6 standardization guard is either stale after M10 consolidation or has exposed a real regression in shared 429 response standardization.

Closure status: **not closed**. This is useful quality triage evidence: the suite is not merely green/noisy; at least one static guard currently disagrees with implementation and needs owner classification.

## Blocked / closed matrix update

| Phase 0 item                    | Prior status | Current status                     | Evidence                                                                                                                                |
| ------------------------------- | ------------ | ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| API live probe coverage         | open         | partial, not closed                | 22 local probes run; one public API 500 found; authenticated probes still blocked.                                                      |
| Browser traversal               | open         | partial, not closed                | `/`, `/cookies`, `/about`, `/contact`, and unauth `/dashboard` verified with clean console.                                             |
| Authenticated flow verification | open         | blocked                            | No approved valid test credentials/session present; default local test login failed; setup script would mutate data.                    |
| Cron-secret endpoint opacity    | open         | closed for no-secret route opacity | Five cron/admin route families reject missing secrets with 401; static scan confirms header/query secret checks and admin limiter hook. |
| `.env.prod` guard precision     | open         | partial, not closed                | Guard blocks current prod-like `.env.local`; skip bypass works; `.env.prod` still absent.                                               |
| Test-suite quality triage       | open         | partial, not closed                | Focused 8-suite triage found 7 pass and one failing static standardization guard.                                                       |
| Integration-test execution      | blocked      | blocked                            | No local Supabase/Docker or approved remote-test path used in this slice.                                                               |

## Exact next actions

1. Fix or explicitly reclassify `/api/maps/metro-boundaries` service-role usage. It is public according to the route inventory but currently throws before returning public cached data in local dev.
2. Provide an approved test auth path: either a valid existing test account/session cookie for the current Supabase project, or local Supabase/Docker. Then run authenticated browser and read-only API probes.
3. Classify `error-standardization.test.ts` failures as stale expectations vs real 429 standardization regression, then remediate in the Phase 1/M6 lane.
4. Add a sanitized `.env.prod` baseline or document the fallback host-pattern policy as the accepted guard model.
5. Keep Phase 2+ held until the above open/block items are closed or Shan approves a written gate exception.
