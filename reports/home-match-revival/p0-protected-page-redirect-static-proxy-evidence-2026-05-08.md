---
title: P0 Anonymous Protected-Page Redirect & Static Supabase Proxy Evidence
date: 2026-05-08
worktree: d52-protected-page-redirect-doc
scope: Phase 0/1 evidence index. Maps the anonymous protected-page redirect and the local Supabase static-proxy guards to the exact tests/lines that prove each invariant. Also records that the matching live probe lane stays tiny, local-only, and approval-gated.
non_goals: Does not run live probes, mutate Supabase, hit paid APIs, change deploys/secrets/dashboards, install packages, or claim closure beyond the static repo lane.
---

# P0 anonymous protected-page redirect & static Supabase proxy evidence — 2026-05-08

## Verdict

The repo-side static lane for anonymous protected-page redirects (with `redirectTo` preservation and no Supabase middleware client) and for the local-only `/supabase/[...path]` proxy is fully covered by Lane A jest guards. Live execution against a running app server is intentionally not run here; it stays bounded by the existing approval-gated wrapper (`scripts/run-no-auth-live-probes.js` / `pnpm test:no-auth-live-probes`) and the Vitest spec that defaults to skip.

## Evidence map

### Anonymous protected-page redirect

| Invariant                                                                                                                                                                                                                                                                                                                                                         | Test                                                           | Lines         |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- | ------------- |
| `/login`, `/about`, `/contact`, `/cookies`, `/demo/ads`, `/invite/:token`, `/privacy`, `/reset-password`, `/signup`, `/sponsor-mockups`, `/terms`, `/verify-email`, `/auth/auth-code-error` partition as public via `isProtectedPath` and pass middleware without a Supabase client                                                                               | `__tests__/unit/routing/no-auth-traversal-smoke-guard.test.ts` | 21-36, 89-111 |
| `/dashboard`, `/dashboard/{activity,liked,mutual-likes,passed,viewed,vibes-test}`, `/profile`, `/settings`, `/household/{create,join}`, `/couples`, `/couples/decisions`, `/properties/:id`, `/validation` partition as protected and middleware returns 307 → `/login?redirectTo=<path>` with no Supabase client; `/couples?tab=activity` preserves query string | `__tests__/unit/routing/no-auth-traversal-smoke-guard.test.ts` | 38-54, 95-130 |
| Middleware redirects `/dashboard?tab=liked` → `/login?redirectTo=%2Fdashboard%3Ftab%3Dliked` even when Supabase public env is missing; public/`/login` and `/api/*` paths still render without crashing middleware                                                                                                                                                | `__tests__/unit/middleware.test.ts`                            | 57-98         |
| Middleware fast path skips Supabase for anonymous public marketing pages, anonymous protected pages, anonymous `/login`, and anonymous `/api/*`; auth path still runs Supabase when an auth cookie is present                                                                                                                                                     | `__tests__/unit/middleware.test.ts`                            | 100-208       |
| `src/middleware.ts` entrypoint exposes the same protected-route guard so Next intercepts `src/app` routes before rendering (`/couples` → `/login?redirectTo=%2Fcouples`)                                                                                                                                                                                          | `__tests__/unit/middleware.test.ts`                            | 210-222       |
| Page-level guard for `/dashboard?tab=liked` and `/couples?tab=activity` calling `redirect('/login?redirectTo=...')` with query preserved; authenticated traversal allowed                                                                                                                                                                                         | `__tests__/unit/app/protected-page-auth-redirects.test.tsx`    | 76-118        |
| P0 traversal/inventory matrices keep the protected-redirect expectation and the "approved test auth/session" gate documented                                                                                                                                                                                                                                      | `__tests__/unit/routing/no-auth-traversal-smoke-guard.test.ts` | 132-145       |

### Static `/supabase/[...path]` proxy

| Invariant                                                                                                                           | Test                                              | Lines |
| ----------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- | ----- |
| Proxy disabled by default — returns 404 `Supabase proxy disabled` and never calls `fetch`                                           | `__tests__/unit/app/supabase-proxy-route.test.ts` | 29-42 |
| Enabled proxy refuses non-loopback targets — returns 403 `Supabase proxy target not allowed` and never calls `fetch`                | `__tests__/unit/app/supabase-proxy-route.test.ts` | 44-59 |
| Enabled loopback targets allowed; upstream call uses `redirect: 'manual'`, `cache: 'no-store'`, and emits `x-supabase-proxy-target` | `__tests__/unit/app/supabase-proxy-route.test.ts` | 61-93 |

### Predecessor reports (canonical, unchanged here)

- `reports/home-match-revival/p0-no-auth-traversal-smoke-guard-2026-05-08.md`
- `reports/home-match-revival/p0-no-auth-api-protected-redirect-probe-harness-2026-05-08.md`
- `reports/home-match-revival/p0-p1-strict-anonymous-protected-route-closure-2026-05-08.md`
- `reports/home-match-revival/p0-p1-blocker-evidence-index-2026-05-08.md` rows 8 (no-auth traversal artifact) and 1 (authenticated traversal lane, separate gate).

## Live-probe lane (intentionally unchanged)

- Vitest matrix `__tests__/integration/routing/no-auth-live-probe.spec.ts` defaults to skipped; only runs when `NO_AUTH_LIVE_PROBES_RUN=1`.
- Wrapper `scripts/run-no-auth-live-probes.js` (invoked via `pnpm test:no-auth-live-probes`) refuses non-local base URLs (only `127.0.0.1`, `localhost`, `::1`), starts no server, mints no credentials, submits no forms, and exits 0 with a SKIP message when no local app is responding at `127.0.0.1:3000`.
- Coverage stays GET-only against the public set listed in `p0-no-auth-api-protected-redirect-probe-harness-2026-05-08.md` (lines 26-69), with `redirect: 'manual'` for protected redirect probes.
- This worker does not start a local app, run the live probe wrapper, or claim live closure. The live execution slice remains bounded, repo-local, no-secret, and gated by the existing wrapper guardrails.

## Out-of-scope for this slice

- No browser swarm, deploy, secret, paid API, dashboard, cron mutation, real account/session, real email/CAPTCHA, or production target was used.
- Authenticated traversal, signup/verify/logout E2E, API auth smoke live token, paid/external surfaces, and durable rate limiter provider provisioning all remain in their pre-existing approval lanes (see `p0-p1-blocker-evidence-index-2026-05-08.md` rows 1, 2, 3, 5, 6, 10, 11, 12).
