# D79 Cookie/Session Security Index

Generated: 2026-05-08
Scope: read-only static repo evidence for the strict Phase 0/1 gate. No
secrets read, no live sessions mutated, no remote dashboards touched, no
browser swarm run, no paid APIs invoked. Only existing tracked source under
this worktree was inspected.

Worktree: `/home/shan/projects/homematch-v2.claude-workers/d79-cookie-session-security-index-1948`
Branch: `autonomy/hm-cookie-session-security-index-1948`
Base integration HEAD at launch: `a39107e`

## Purpose

A single concise index of how Supabase auth cookies and sessions are
configured across HomeMatch, what helpers enforce that configuration, and
which auth-lifecycle gates still need live evidence before Phase 0/1 can
mark "E2E auth lifecycle" closed. This index intentionally does not
restate the full credentialless lifecycle plan (`p0-p1-credentialless-auth-lifecycle-verification-plan-2026-05-08.md`)
or reopen D1 / D3 decisions; it cross-references them.

## 1. Cookie hardening surface

### 1.1 Canonical helper

`src/lib/supabase/cookie-options.ts:10` — `buildSupabaseSessionCookieOptions(options)`:

- Forces `httpOnly: true` regardless of caller input.
- Forces `secure: true` only when `process.env.NODE_ENV === 'production'`.
- Defaults `path: '/'`, `sameSite: 'lax'`, and `maxAge: 60 * 60 * 24 * 7`
  (seven days), but preserves caller-supplied values for those fields.
- Spreads any extra fields the Supabase SSR layer passes through, so
  caller-supplied `domain`, `expires`, etc. are not silently dropped.

This is the only place that decides cookie security flags. Every
production cookie write path goes through it.

### 1.2 Single-source storage-key helper

`src/lib/supabase/storage-keys.ts:39` — `getSupabaseAuthStorageKey(hostname)`:

- Slugifies the hostname (default `localhost`).
- Builds a project fingerprint from `NEXT_PUBLIC_SUPABASE_URL` host/path
  plus the first 8 chars of `NEXT_PUBLIC_SUPABASE_ANON_KEY` (slugified).
- Returns `sb-<host-slug>-<project-fingerprint>-auth-token`.

The function is referenced by middleware, the server client, the API
client, the browser client, the login form, and the Playwright auth
setup, so every auth surface points at the same cookie/storage name for
a given host + Supabase project.

### 1.3 Helper usage map

| Surface                   | File                                             | Cookie helper                                                                                                | Storage-key helper                                                                                     | Notes                                                                                                                                                                                                    |
| ------------------------- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Edge middleware           | `middleware.ts:1-191`                            | `buildSupabaseSessionCookieOptions` for every Supabase `setAll` write (line 176)                             | `getSupabaseAuthStorageKey(hostname)` for cookie presence check + cookie name (lines 136-137, 153-156) | Skips Supabase work entirely for `/api/*` and `PUBLIC_BYPASS_PATHS`; redirects anonymous protected paths to `/login` even before constructing the SSR client when no auth cookie is present.             |
| Server SSR client         | `src/lib/supabase/server.ts:11-77`               | `buildSupabaseSessionCookieOptions` inside `cookies.setAll` (line 43)                                        | `getSupabaseAuthStorageKey(hostname)` from `host` header (lines 16-18)                                 | `auth: { autoRefreshToken: true, persistSession: true, detectSessionInUrl: true, flowType: 'pkce' }`. Bearer-token override supported for API/RSC contexts.                                              |
| API SSR client            | `src/lib/supabase/server.ts:80-142`              | n/a — `setAll` is intentionally a no-op (lines 113-117)                                                      | `getSupabaseAuthStorageKey(hostname)` from request `host` header (lines 93-98)                         | `auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false, flowType: 'pkce' }`; expected to read cookies/bearer only, never to write a session.                                 |
| Service-role client       | `src/lib/supabase/server.ts:165-190`             | none — cookies are stubbed out (`getAll: () => []`, `setAll: () => {}`)                                      | n/a                                                                                                    | Gated by `APPROVED_SERVICE_ROLE_CAPABILITIES` set or `checkServiceRoleAuthorization()` admin lookup against `admin_role_assignments`.                                                                    |
| Browser client            | `src/lib/supabase/client.ts:6-44`                | n/a (client cookies are written by Supabase SSR; browser cookies cannot be marked `httpOnly` from JS anyway) | `getSupabaseAuthStorageKey(window.location.hostname)` (lines 16-21)                                    | `auth: { autoRefreshToken: true, persistSession: true, detectSessionInUrl: true, storageKey }`.                                                                                                          |
| Standalone/script client  | `src/lib/supabase/standalone.ts`                 | n/a — service role only, no cookies                                                                          | n/a                                                                                                    | `autoRefreshToken: false`, `persistSession: false`. Test-mode caches per URL/key with a deterministic non-default `storageKey` to avoid GoTrue collisions.                                               |
| Login form post-auth wait | `src/components/features/auth/LoginForm.tsx:187` | n/a                                                                                                          | `getSupabaseAuthStorageKey(window.location.hostname)` to wait for persistence before redirect          | Avoids redirect race that lands on `/login` because the cookie has not yet been written.                                                                                                                 |
| E2E auth setup            | `__tests__/e2e/auth.setup.ts:90`                 | n/a                                                                                                          | Same helper, validating worker storage state                                                           | Only runs against approved test users; out of scope for this index.                                                                                                                                      |
| Optional user reader      | `src/lib/supabase/optional-user.ts`              | n/a                                                                                                          | Indirect via `createClient()`                                                                          | Returns `null` (instead of throwing) when the public Supabase config is missing, so anonymous public surfaces stay clean.                                                                                |
| Refresh recovery          | `src/lib/supabase/refresh-recovery.ts`           | n/a                                                                                                          | Indirect via the wrapped client                                                                        | Wraps `getUser`/`getSession` to clear stale local sessions on `invalid_refresh_token` / `refresh_token_not_found` without hitting the network, and is attached to every server, API, and browser client. |
| Sign-out server action    | `src/lib/supabase/actions.ts`                    | n/a                                                                                                          | Indirect via `createClient()`                                                                          | Calls `supabase.auth.signOut()` then `revalidatePath('/', 'layout')` and redirects to `/`.                                                                                                               |

### 1.4 Re-export bridge for the App Router

`src/middleware.ts` re-exports `buildSupabaseSessionCookieOptions`,
`config`, and `middleware` from the root-level `middleware.ts`. This
avoids drift between two middleware implementations after the
src-tree-discovery fix. Both layers therefore share the same cookie
hardening helper, the same protected-path source of truth (`src/lib/routing/protected-routes.ts`),
and the same redirect handling (`getSafeRedirectPath`).

## 2. Session lifecycle behavior

### 2.1 Server / SSR

- Cookies that Supabase SSR writes via `setAll` always pass through
  `buildSupabaseSessionCookieOptions`, so:
  - `httpOnly` cannot be downgraded to `false` by upstream Supabase code.
  - `secure` follows `NODE_ENV` (production: true; everywhere else: false).
  - `path` defaults to `/`, `sameSite` to `lax`, `maxAge` to 7 days.
- The server SSR client persists sessions and auto-refreshes; the API
  client deliberately does not, because API handlers should live for one
  request and either read cookies or accept a bearer.

### 2.2 Edge middleware

- Bypasses `/api/performance/metrics`, `/api/health`, and any `/api/*`
  request without constructing a Supabase client (`middleware.ts` lines
  107-113). API handlers are responsible for their own auth.
- For non-API requests, builds the cookie name via
  `getSupabaseAuthStorageKey(request.nextUrl.hostname)` and short-circuits
  for anonymous public pages without invoking Supabase at all
  (`middleware.ts` lines 134-145).
- When an auth cookie is present:
  - Constructs an SSR client with `autoRefreshToken: true`,
    `persistSession: true`, `detectSessionInUrl: true`.
  - `getUser()` runs under an `AbortController` clamped by
    `MIDDLEWARE_SUPABASE_TIMEOUT_MS` (default 5000ms) so a stalled
    Supabase auth call cannot block the edge.
  - On `invalid_refresh_token` / `refresh_token_not_found` (either as
    a returned error or as a thrown exception), middleware deletes every
    cookie matching `sb-*-auth-token` from the response so the next
    request is clean.
  - On Supabase auth timeout, middleware logs a warning and treats the
    request as unauthenticated rather than failing closed.
- Always applies the standard security headers
  (`X-Frame-Options`, `X-Content-Type-Options`, `X-XSS-Protection`,
  `Referrer-Policy`, `Permissions-Policy`, `Cross-Origin-Opener-Policy`,
  `Cross-Origin-Resource-Policy`). In production, also applies the
  documented Content-Security-Policy and HSTS.
- Redirects:
  - Anonymous protected path → `/login?redirectTo=<path><query>`.
  - Authenticated `/login` or `/signup` → `getSafeRedirectPath` of
    `redirectTo` / `redirect`, falling back to `/dashboard`.
  - `getSafeRedirectPath` rejects null, decode-failures, non-`/`
    leading values, protocol-relative `//`, and any value containing
    `://` — i.e., open-redirect surface is closed at the helper.

### 2.3 Refresh recovery

`withRefreshRecovery(client)` is attached to every server, API, and
browser client and wraps `auth.getSession` and `auth.getUser`:

- On `invalid_refresh_token` / `refresh_token_not_found` (returned error
  or thrown error), it logs a redacted warning (`code` and `message`
  only — no token contents) and calls `auth.signOut({ scope: 'local' })`
  to drop the stale token without calling Supabase.
- After clearing, `getSession` returns `{ data: { session: null }, error: null }`
  and `getUser` retries once.

### 2.4 Sign-out

- `src/lib/supabase/actions.ts` `signOut` server action calls Supabase
  `signOut`, revalidates the root layout, and redirects to `/`.
- Middleware is the deletion path for the post-redirect cleanup of
  `sb-*-auth-token` cookies whenever a request still carries a stale
  refresh token (see 2.2).

## 3. Static guards already in repo

| Guard                                                                                                                                                                         | File                                                                    | What it locks in                                                                                                           |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `httpOnly: true` regardless of caller, `secure` follows `NODE_ENV`, defaults for `path` / `sameSite` / `maxAge`                                                               | `__tests__/unit/lib/supabase/cookie-options.test.ts`                    | Helper invariants.                                                                                                         |
| Server SSR `createClient()` writes every Supabase auth cookie with `httpOnly: true`, `secure: true` in production, `path: '/'`, `sameSite: 'lax'`, `maxAge: 7d`               | `__tests__/unit/lib/supabase/server-cookie-options.test.ts`             | Real `createClient` exercises both the Supabase auth-token cookie and the code-verifier cookie.                            |
| Middleware refreshes Supabase auth cookies through the shared options helper with `httpOnly: true` and (production) `secure: true`                                            | `__tests__/unit/middleware.test.ts:269-299`                             | Edge layer cookie hardening parity.                                                                                        |
| Server SSR client: `getUser()` recovers from `invalid_refresh_token` by clearing the local session and returning a fresh result; `getSession()` returns null without throwing | `__tests__/unit/lib/supabase/server-refresh-recovery.test.ts`           | Refresh recovery wiring on the server.                                                                                     |
| Browser SSR client: same recovery semantics via `withRefreshRecovery`                                                                                                         | `__tests__/unit/lib/supabase/client-refresh-recovery.test.ts`           | Refresh recovery wiring on the browser.                                                                                    |
| Service-role client: capability whitelist + admin assignment lookup; fail-closed on disabled/expired/missing assignment                                                       | `__tests__/unit/lib/supabase/server-service-role-authorization.test.ts` | D1 service-role authority closure (cross-references `d1-service-role-rbac-authority-implementation-packet-2026-05-08.md`). |
| Anonymous traversal redirect set + `redirectTo` preservation                                                                                                                  | `__tests__/unit/routing/no-auth-traversal-smoke-guard.test.ts`          | Static no-credential redirect coverage.                                                                                    |
| API auth smoke matrix (anonymous 401 + skip lattice)                                                                                                                          | `__tests__/integration/api/auth-smoke-matrix.spec.ts`                   | Static and skip behavior; live execution remains gated.                                                                    |
| Single Supabase factory per surface                                                                                                                                           | `__tests__/unit/lib/supabase/no-duplicate-factory.test.ts`              | Prevents accidental introduction of a second cookie/session helper that bypasses the shared options.                       |
| Supabase cookie-name shape and host-aware fingerprint                                                                                                                         | `__tests__/integration/supabase-client-patterns.test.ts`                | Same name across middleware, server, browser, and Playwright.                                                              |

## 4. Remaining live-auth validation gates

These items are not closed by static evidence alone. They remain owner /
ops approval-gated and must be re-run against either a local
Supabase/Docker stack (preferred) or an explicitly approved
non-production remote-test path.

| #   | Gate                                                                                                                                                                                                            | Why this index does not close it                                                                                                                                                   | Cross-reference                                                                                                                                            |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| L1  | Successful login persists a session cookie that survives one full request and a middleware-driven refresh against the configured Supabase project.                                                              | Requires an approved seeded test user and a running local app server. The cookie helper invariants are static; the cookie write is exercised only through Supabase SSR at runtime. | `phase0-phase1-closure-matrix.md` lines 14-23, 26; `p0-p1-credentialless-auth-lifecycle-verification-plan-2026-05-08.md` section "Local seeded lifecycle". |
| L2  | Authenticated traversal of representative protected pages (`/dashboard`, `/couples`, `/settings`, `/profile`, one `/properties/:id`) returns the authenticated app shell instead of a `/login` redirect.        | Requires a seeded session. The static redirect guard already proves the anonymous case.                                                                                            | `remote-supabase-test-seed-and-auth-probe-2026-05-08.md`; `p0-p1-strict-anonymous-protected-route-closure-2026-05-08.md`.                                  |
| L3  | `signOut` clears the cookie on the response and a subsequent protected-page request redirects to `/login?redirectTo=...`.                                                                                       | Same as L1 — needs a real session to first exist before sign-out can be observed end to end.                                                                                       | `actions.ts`; closure-matrix lines 26, 35.                                                                                                                 |
| L4  | Stale refresh-token recovery: after a session has been corrupted (rotated key, expired token, manually broken cookie), the next request lands on `/login` and middleware deletes the `sb-*-auth-token` cookies. | The recovery wrappers and middleware deletion code are static; provoking the scenario needs a seeded environment plus explicit approval to manipulate session state.               | `middleware.ts` lines 234-269; `withRefreshRecovery`.                                                                                                      |
| L5  | API auth smoke matrix executes against the local app server with both anonymous and authenticated cases for each safe handler-level route, and paid/external/admin-secret routes are explicitly skipped.        | Static matrix exists; live execution requires `API_AUTH_SMOKE_TOKEN` from an approved test user/session and a local server on `127.0.0.1:3000`.                                    | `p0-p1-api-auth-smoke-matrix-2026-05-08.md`.                                                                                                               |
| L6  | Signup/verification policy is exercised in either confirm-disabled local mode or via local Mailpit/Supabase email capture.                                                                                      | Decision and repo invariants exist; live exercise remains owner-approval-gated.                                                                                                    | `d3-signup-verification-policy-decision-2026-05-08.md`; `d3-signup-verification-repo-invariant-guard-2026-05-08.md`.                                       |
| L7  | CAPTCHA: production-required, local/E2E disabled, no external CAPTCHA calls during tests — verified at runtime.                                                                                                 | D3 launch policy exists in repo. Live verification is environment-gated.                                                                                                           | `config/signup-verification-launch-policy.json`; D3 invariant guard.                                                                                       |

None of these gates require new repo code right now; they require an
approved environment to run against. This index records exactly which
file/test holds the static half of each gate so a future repo-writing
lane can pick them up without re-deriving the surface area.

## 5. What is intentionally out of scope here

- D1 service-role RBAC authority closure (already closed repo-side).
- D2 durable rate-limiter provider choice (owner/ops approval-gated).
- D3 signup-verification policy (closed repo-side as launch-policy
  guard; external execution gated).
- D6 DB reset/lint/integration execution environment.
- Any actual login, logout, signup, or signOut against a live Supabase
  project. This index neither initiated nor recorded any such call.
- Any printing or pasting of secrets, anon keys, service-role keys,
  refresh tokens, or PKCE verifiers. None of those values are present
  in this report.

## 6. Recommended follow-ups (no autonomous action taken)

1. After an approved local seeded environment exists, run the L1–L5
   matrix from section 4 and update `phase0-phase1-closure-matrix.md`
   with the per-row pass/fail evidence. Do not run from this lane.
2. After D3 environment readiness, run the L6/L7 pair using local
   Mailpit/Supabase email capture only. Do not invoke external CAPTCHA
   services.
3. If a future change adds a new Supabase factory, route handler that
   writes auth cookies, or middleware variant, the corresponding
   `cookie-options` and `no-duplicate-factory` static guards should be
   updated in the same change so cookie hardening cannot regress
   silently.

## 7. Evidence inspected

- `src/lib/supabase/cookie-options.ts`
- `src/lib/supabase/storage-keys.ts`
- `src/lib/supabase/server.ts`
- `src/lib/supabase/client.ts`
- `src/lib/supabase/standalone.ts`
- `src/lib/supabase/refresh-recovery.ts`
- `src/lib/supabase/auth-helpers.ts`
- `src/lib/supabase/optional-user.ts`
- `src/lib/supabase/actions.ts`
- `middleware.ts`
- `src/middleware.ts`
- `src/components/features/auth/LoginForm.tsx`
- `__tests__/unit/lib/supabase/cookie-options.test.ts`
- `__tests__/unit/lib/supabase/server-cookie-options.test.ts`
- `__tests__/unit/lib/supabase/server-refresh-recovery.test.ts`
- `__tests__/unit/lib/supabase/server-service-role-authorization.test.ts`
- `__tests__/unit/lib/supabase/client-refresh-recovery.test.ts`
- `__tests__/unit/lib/supabase/no-duplicate-factory.test.ts`
- `__tests__/unit/middleware.test.ts`
- `__tests__/unit/routing/no-auth-traversal-smoke-guard.test.ts`
- `__tests__/integration/supabase-client-patterns.test.ts`
- `reports/home-match-revival/phase0-phase1-closure-matrix.md`
- `reports/home-match-revival/p0-p1-credentialless-auth-lifecycle-verification-plan-2026-05-08.md`
- `reports/home-match-revival/p0-p1-strict-anonymous-protected-route-closure-2026-05-08.md`
- `reports/home-match-revival/remote-supabase-test-seed-and-auth-probe-2026-05-08.md`
- `reports/home-match-revival/p0-p1-api-auth-smoke-matrix-2026-05-08.md`
- `reports/home-match-revival/d3-signup-verification-policy-decision-2026-05-08.md`
- `reports/home-match-revival/d3-signup-verification-repo-invariant-guard-2026-05-08.md`
- `reports/home-match-revival/d1-service-role-rbac-authority-implementation-packet-2026-05-08.md`
