# D108 Cookie / Session Evidence Note

Generated: 2026-05-08
Scope: read-only static evidence note for the strict Phase 0/1 gate. No
secrets read, no live sessions mutated, no remote dashboards touched, no
browser swarm run, no paid APIs invoked. Only existing tracked source under
this worktree was inspected.

Worktree: `/home/shan/projects/homematch-v2.claude-workers/d108-cookie-session-evidence-2019`
Branch: `autonomy/d108-cookie-session-evidence-2019`
Base integration HEAD at launch: `2170964`

## Purpose

A single-page reviewer-facing distillation of (a) which cookie attribute
is pinned by which file/line, and (b) which live-auth lifecycle gates
remain open. This note is intentionally short and is **not** a
re-statement of the canonical
`d79-cookie-session-security-index-2026-05-08.md`; it cites that index
for the full helper map, refresh-recovery wiring, and per-surface
behavior. This note also does not change any verdict in
`phase0-phase1-closure-matrix.md` and does not authorize live execution
of any of the gates listed below.

## 1. Cookie attribute pinning

Each Supabase auth cookie write inside HomeMatch goes through one
helper. The attributes below are pinned by that helper, not by callers.

| Attribute                                     | Pinned to                                                                                               | Pin point                                        | Static guard                                                |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------- | ------------------------------------------------ | ----------------------------------------------------------- |
| `httpOnly`                                    | `true` (always — caller input is overridden)                                                            | `src/lib/supabase/cookie-options.ts:18`          | `__tests__/unit/lib/supabase/cookie-options.test.ts:10-27`  |
| `secure`                                      | `true` iff `process.env.NODE_ENV === 'production'`, else `false`                                        | `src/lib/supabase/cookie-options.ts:17`          | `__tests__/unit/lib/supabase/cookie-options.test.ts:29-37`  |
| `sameSite`                                    | `'lax'` default; caller-supplied value preserved                                                        | `src/lib/supabase/cookie-options.ts:16`          | `__tests__/unit/lib/supabase/cookie-options.test.ts:39-52`  |
| `path`                                        | `'/'` default; caller-supplied value preserved                                                          | `src/lib/supabase/cookie-options.ts:15`          | `__tests__/unit/lib/supabase/cookie-options.test.ts:39-52`  |
| `maxAge`                                      | 7 days (`60 * 60 * 24 * 7`) default; caller value respected                                             | `src/lib/supabase/cookie-options.ts:14`          | `__tests__/unit/lib/supabase/cookie-options.test.ts:54-62`  |
| Cookie / storage key shape                    | `sb-<host-slug>-<project-fingerprint>-auth-token` (host + project-fingerprinted)                        | `src/lib/supabase/storage-keys.ts:39`            | `__tests__/integration/supabase-client-patterns.test.ts`    |
| Helper coverage on real SSR write             | Server SSR `createClient()` exercises the helper for the auth-token cookie and the code-verifier cookie | `src/lib/supabase/server.ts:43`                  | `__tests__/unit/lib/supabase/server-cookie-options.test.ts` |
| Helper coverage on edge refresh               | Middleware `setAll` writes through the same helper                                                      | `middleware.ts:176`                              | `__tests__/unit/middleware.test.ts:269-299`                 |
| Single factory per surface (no second helper) | n/a (negative invariant)                                                                                | `src/lib/supabase/{server,client,standalone}.ts` | `__tests__/unit/lib/supabase/no-duplicate-factory.test.ts`  |

For the full per-surface helper-usage map (server SSR client vs API SSR
client vs service-role client vs browser client vs standalone vs login
form vs E2E setup), see section 1.3 of
`d79-cookie-session-security-index-2026-05-08.md`.

## 2. Remaining live-auth validation gates

These gates require an approved, non-production seeded environment to
exercise. None of them is closable by static evidence alone, and none
was exercised by this note.

| #   | Gate                                                                                                                                                | Static half                                                                                                               | Live half cross-reference                                                                                            |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| L1  | Successful login persists a session cookie that survives one full request and a middleware-driven refresh                                           | Cookie helper invariants (section 1) + server SSR cookie write test                                                       | `p0-p1-credentialless-auth-lifecycle-verification-plan-2026-05-08.md`                                                |
| L2  | Authenticated traversal of `/dashboard`, `/couples`, `/settings`, `/profile`, one `/properties/:id` returns the authenticated app shell             | `p0-p1-strict-anonymous-protected-route-closure-2026-05-08.md` (anonymous half closed)                                    | `remote-supabase-test-seed-and-auth-probe-2026-05-08.md`                                                             |
| L3  | `signOut` clears the cookie on the response and the next protected request redirects to `/login?redirectTo=...`                                     | `src/lib/supabase/actions.ts` + middleware redirect rules                                                                 | `phase0-phase1-closure-matrix.md` (rows for L3)                                                                      |
| L4  | Stale refresh-token recovery: corrupted session next-request lands on `/login` and middleware deletes `sb-*-auth-token` cookies                     | `__tests__/unit/lib/supabase/server-refresh-recovery.test.ts`, `client-refresh-recovery.test.ts`, `middleware.ts:234-269` | environment-gated                                                                                                    |
| L5  | API auth smoke matrix runs against the local app server with both anonymous and authenticated cases (paid/external/admin routes explicitly skipped) | `__tests__/integration/api/auth-smoke-matrix.spec.ts`                                                                     | `p0-p1-api-auth-smoke-matrix-2026-05-08.md`                                                                          |
| L6  | Signup/verification policy exercised in confirm-disabled local mode or via local Mailpit/Supabase email capture                                     | `__tests__/unit/auth/signup-verification-policy-invariants.test.ts`                                                       | `d3-signup-verification-policy-decision-2026-05-08.md` + `d3-signup-verification-repo-invariant-guard-2026-05-08.md` |
| L7  | CAPTCHA: production-required, local/E2E disabled, no external CAPTCHA calls during tests — verified at runtime                                      | `config/signup-verification-launch-policy.json` + D3 invariant guard                                                      | environment-gated                                                                                                    |

## 3. What this note does NOT do

- Does not re-author the canonical
  `d79-cookie-session-security-index-2026-05-08.md`.
- Does not change any gate verdict in
  `phase0-phase1-closure-matrix.md`.
- Does not authorize live login, logout, signup, or signOut against any
  live Supabase project.
- Does not introduce new repo code, new tests, or new policies.
- Does not print or paste secrets, anon keys, service-role keys, refresh
  tokens, or PKCE verifiers; none are present in this note.
