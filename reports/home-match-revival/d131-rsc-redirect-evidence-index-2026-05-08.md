# D131 — RSC Protected-Route Redirect Evidence Index

**Date:** 2026-05-08
**Worktree:** `d131-rsc-redirect-evidence-index-2028`
**Scope:** Phase 0/1 hardening/evidence index only. Read-only consolidation of the existing protected-route redirect evidence chain — anonymous RSC failure mode, the `src/middleware.ts` discovery fix, the post-fix anonymous 307 live rerun, and the still-open auth-positive traversal caveats. No code changed in this slice; no live execution, no secrets, no paid APIs, no external dashboards, no Phase 2+ work.

## Why this index exists

Strict anonymous protected-route closure for `/dashboard` and `/couples` traversed three artifacts in quick succession:

1. A repo-side decision + page-level `redirectTo` fix for `/dashboard` and `/couples`.
2. A live anonymous probe that **failed** closure-grade because Next dev returned `200 OK` with an inline RSC `NEXT_REDIRECT` payload and a `<meta http-equiv="refresh">` instead of an HTTP redirect — root-caused to Next 15.5 not discovering root-level `middleware.ts` for a `src/app` tree.
3. A re-export at `src/middleware.ts` that lets the existing root-level middleware run before page rendering, plus a follow-up live rerun that **passed** closure-grade with `HTTP/1.1 307 Temporary Redirect` and a real `Location` header.

Each artifact is canonical and stays canonical. This index pins them together so reviewers can walk the chain in one read, and so the residual auth-positive traversal caveats are not lost in the page-level change history.

## Chain of evidence

| # | Artifact | Role in chain | Verdict |
|---|----------|---------------|---------|
| 1 | [`p0-no-auth-traversal-smoke-guard-2026-05-08.md`](./p0-no-auth-traversal-smoke-guard-2026-05-08.md) + [`__tests__/unit/routing/no-auth-traversal-smoke-guard.test.ts`](../../__tests__/unit/routing/no-auth-traversal-smoke-guard.test.ts) | Static no-auth traversal guard. Pins the public/protected route partition, the `redirectTo` query preservation requirement, and the no-Supabase-client-on-anonymous-public expectation. | Repo-side closed (5/5 Jest). |
| 2 | [`p0-no-auth-api-protected-redirect-probe-harness-2026-05-08.md`](./p0-no-auth-api-protected-redirect-probe-harness-2026-05-08.md) + [`__tests__/integration/routing/no-auth-live-probe.spec.ts`](../../__tests__/integration/routing/no-auth-live-probe.spec.ts) + [`scripts/run-no-auth-live-probes.js`](../../scripts/run-no-auth-live-probes.js) (`pnpm test:no-auth-live-probes`) | Local-only no-secret live probe wrapper. Refuses non-local base URLs; default-safe Vitest skips when `NO_AUTH_LIVE_PROBES_RUN` is unset. Public, public-API-boundary, anonymous protected-API denial, and unauthenticated protected page redirects are all covered. | Harness readiness repo-side closed. |
| 3 | [`p0-p1-strict-anonymous-protected-route-closure-2026-05-08.md`](./p0-p1-strict-anonymous-protected-route-closure-2026-05-08.md) + [`__tests__/unit/app/protected-page-auth-redirects.test.tsx`](../../__tests__/unit/app/protected-page-auth-redirects.test.tsx) | Repo-side decision + page-level fix: `/dashboard` and `/couples` are strict protected; page-level anonymous fallback now redirects to `/login?redirectTo=...` (was bare `/login` for `/dashboard`). | Repo-side closed (3/3 page-redirect Jest; 21/21 across page-redirect + middleware + no-auth-traversal). |
| 4 | [`p0-p1-strict-anonymous-live-probe-rerun-2026-05-08.md`](./p0-p1-strict-anonymous-live-probe-rerun-2026-05-08.md) — **first half** (lines 60–75) | First live rerun against `127.0.0.1:3101`. Anonymous `/dashboard` and `/couples` returned `HTTP/1.1 200 OK` with inline `NEXT_REDIRECT;replace;/login?redirectTo=…;307;` and `<meta id="__next-page-redirect" http-equiv="refresh">` — i.e. the page rendered an RSC redirect rather than the middleware emitting an HTTP redirect. Same response did not carry middleware-applied security headers. | Failed closure-grade HTTP redirect requirement. |
| 5 | [`p0-p1-strict-anonymous-live-probe-rerun-2026-05-08.md`](./p0-p1-strict-anonymous-live-probe-rerun-2026-05-08.md) — **second half** (lines 77–104) + [`src/middleware.ts`](../../src/middleware.ts) re-export + [`__tests__/unit/middleware.test.ts`](../../__tests__/unit/middleware.test.ts) `Next src-directory middleware entrypoint` (line 210) | Discovery-fix slice. Root cause: Next 15.5 dev did not pick up `middleware.ts` at the repo root for the `src/app` tree, so middleware never ran before page rendering. Smallest fix: add `src/middleware.ts` as a thin re-export of `middleware`, `config`, and `buildSupabaseSessionCookieOptions` from the root middleware so the existing protected-route guard runs at the `src/app` tree level without broadening auth behavior. RED/GREEN: targeted test failed before (`Cannot find module '../../src/middleware'`) and passed after (1/1 targeted; 14/14 middleware suite). | Repo-side closed. |
| 6 | [`p0-p1-strict-anonymous-live-probe-rerun-2026-05-08.md`](./p0-p1-strict-anonymous-live-probe-rerun-2026-05-08.md) — **rerun table** (lines 96–104) | Anonymous live rerun after the discovery fix. `/dashboard`, `/couples`, and `/dashboard?tab=liked` returned `HTTP/1.1 307 Temporary Redirect` with `Location: …/login?redirectTo=<encoded original>`; `/api/health` carried middleware-applied `x-frame-options: DENY`, `cross-origin-opener-policy: same-origin`, and `cross-origin-resource-policy: same-origin`, confirming middleware now intercepts. | Live-evidenced (local). |
| 7 | [`remote-supabase-test-seed-and-auth-probe-2026-05-08.md`](./remote-supabase-test-seed-and-auth-probe-2026-05-08.md) — anonymous-protected-route row (line 108) | Original signal that drove this slice: a remote-Supabase-backed local app showed authenticated traversal passing for `/dashboard`, `/couples`, `/settings`, `/profile`, but anonymous `/dashboard` and `/couples` returning `200` while `/settings` and `/profile` redirected. The chain above closes that gap. | Resolved by #3 + #5 + #6. |

## RSC `NEXT_REDIRECT` failure mode — what to look for

The pre-fix failure mode is easy to miss because curl reports `200 OK`. The tells, captured verbatim in the rerun report (#4):

- Status line: `HTTP/1.1 200 OK` with **no** `Location` header.
- Body contains `NEXT_REDIRECT;replace;/login?redirectTo=<encoded>;307;` inline (RSC payload form).
- Body contains `<meta id="__next-page-redirect" http-equiv="refresh" content="1;url=/login?redirectTo=<encoded>"/>`.
- Response is **missing** middleware-applied security headers (`x-frame-options`, COOP, CORP) — the giveaway that middleware never ran.

Closure-grade evidence (post-fix) inverts every one of those: real `307` status, real `Location`, no `NEXT_REDIRECT` payload required, and middleware security headers present on sibling routes like `/api/health`.

## Proxy / middleware discovery fix — file-level pin

Phase 0/1 readers should not chase the fix through the rerun report. The file-level pins are:

- [`middleware.ts`](../../middleware.ts) — canonical implementation. Unchanged by this slice; carries `middleware`, `config`, and `buildSupabaseSessionCookieOptions`.
- [`src/middleware.ts`](../../src/middleware.ts) — five-line re-export so Next 15.5 discovers the guard for the `src/app` tree. Verbatim:

  ```ts
  export {
    buildSupabaseSessionCookieOptions,
    config,
    middleware,
  } from '../middleware'
  ```

- [`__tests__/unit/middleware.test.ts`](../../__tests__/unit/middleware.test.ts) — `Next src-directory middleware entrypoint` describe block (line 210) asserts the re-export contract so the discovery fix cannot silently regress.

## Remaining auth-positive traversal caveats

These caveats are **not** closed by the chain above. They survive into the auth-positive lane and stay tracked here so reviewers don't mistake the anonymous closure for full traversal closure:

1. **Authenticated browser traversal beyond the four core pages.** [`remote-supabase-test-seed-and-auth-probe-2026-05-08.md`](./remote-supabase-test-seed-and-auth-probe-2026-05-08.md) confirms authenticated `/dashboard`, `/couples`, `/settings`, `/profile` load without redirect. The wider authenticated set — dashboard subpages (`activity`, `liked`, `mutual-likes`, `passed`, `viewed`, `vibes-test`), `/household/create`, `/household/join`, `/couples/decisions`, `/properties/<id>`, `/validation`, and the `?tab=` query variants — is still gated under [`p0-p1-blocker-evidence-index-2026-05-08.md`](./p0-p1-blocker-evidence-index-2026-05-08.md) row 1. The middleware fix does not provide that evidence; an approved authenticated-traversal lane does.
2. **Authenticated mutation / storage / invite / account positive flows.** Tracked in [`p0-p1-blocker-evidence-index-2026-05-08.md`](./p0-p1-blocker-evidence-index-2026-05-08.md) row 11 and [`p0-site-traversal-acceptance-matrix-2026-05-08.md`](./p0-site-traversal-acceptance-matrix-2026-05-08.md) lines 85–91, 121–125, 140–152. Out of scope for redirect closure; in scope for auth-positive closure.
3. **Protected positive accessibility traversal.** [`accessibility-core-flow-matrix.md`](./accessibility-core-flow-matrix.md) holds the static matrix; the live authenticated-accessibility leg is gated behind the same auth-traversal lane. See [`p0-p1-blocker-evidence-index-2026-05-08.md`](./p0-p1-blocker-evidence-index-2026-05-08.md) row 12.
4. **E2E auth lifecycle (signup/login/verify/logout/session clearing, `redirectTo` round-trip on success).** The chain above proves `redirectTo` is *emitted* on the anonymous leg; it does not prove the post-login round-trip lands the user back on the originally requested URL. That round-trip is gated under [`p0-p1-blocker-evidence-index-2026-05-08.md`](./p0-p1-blocker-evidence-index-2026-05-08.md) row 2 and [`p0-p1-credentialless-auth-lifecycle-verification-plan-2026-05-08.md`](./p0-p1-credentialless-auth-lifecycle-verification-plan-2026-05-08.md).
5. **Production / non-dev runtime.** All `307` evidence in #6 was captured against `next dev` on `127.0.0.1:3101`. The discovery-fix re-export is also picked up by `next build` because `src/middleware.ts` is the documented Next entrypoint when a `src/` tree exists, but a production-runtime live rerun has not been executed in this slice. Reuse the same anonymous probe shape (`curl --max-redirs 0`) against the eventual production-runtime target before claiming production-runtime closure.
6. **Vercel-runtime middleware behavior.** [`remote-supabase-test-seed-and-auth-probe-2026-05-08.md`](./remote-supabase-test-seed-and-auth-probe-2026-05-08.md) line 16 records that no repo-local `.vercel` metadata or authenticated `vercel` CLI session exists in this workspace. The discovery fix is repo-local; whatever Vercel-edge cache / proxy layer runs in deployed environments must be re-probed from the deployed origin before closure-grade Vercel evidence is claimed.

## What this index does NOT do

- Does not advance Phase 0/1 closure. Each row is gated where the canonical artifact says it is gated.
- Does not authorize live execution, secrets, paid/external APIs, browser swarms, production dashboards, real users, or customer data.
- Does not modify `middleware.ts`, `src/middleware.ts`, page components, tests, or harness code.
- Does not replace [`phase0-phase1-closure-matrix.md`](./phase0-phase1-closure-matrix.md), [`p0-p1-blocker-evidence-index-2026-05-08.md`](./p0-p1-blocker-evidence-index-2026-05-08.md), [`p0-site-traversal-acceptance-matrix-2026-05-08.md`](./p0-site-traversal-acceptance-matrix-2026-05-08.md), or [`p0-p1-blocker-reconciliation-2026-05-08.md`](./p0-p1-blocker-reconciliation-2026-05-08.md).

## Source artifacts (canonical)

- [`reports/home-match-revival/p0-no-auth-traversal-smoke-guard-2026-05-08.md`](./p0-no-auth-traversal-smoke-guard-2026-05-08.md)
- [`reports/home-match-revival/p0-no-auth-api-protected-redirect-probe-harness-2026-05-08.md`](./p0-no-auth-api-protected-redirect-probe-harness-2026-05-08.md)
- [`reports/home-match-revival/p0-p1-strict-anonymous-protected-route-closure-2026-05-08.md`](./p0-p1-strict-anonymous-protected-route-closure-2026-05-08.md)
- [`reports/home-match-revival/p0-p1-strict-anonymous-live-probe-rerun-2026-05-08.md`](./p0-p1-strict-anonymous-live-probe-rerun-2026-05-08.md)
- [`reports/home-match-revival/remote-supabase-test-seed-and-auth-probe-2026-05-08.md`](./remote-supabase-test-seed-and-auth-probe-2026-05-08.md)
- [`reports/home-match-revival/p0-p1-blocker-evidence-index-2026-05-08.md`](./p0-p1-blocker-evidence-index-2026-05-08.md)
- [`reports/home-match-revival/p0-site-traversal-acceptance-matrix-2026-05-08.md`](./p0-site-traversal-acceptance-matrix-2026-05-08.md)
- [`reports/home-match-revival/phase0-phase1-closure-matrix.md`](./phase0-phase1-closure-matrix.md)
- [`middleware.ts`](../../middleware.ts)
- [`src/middleware.ts`](../../src/middleware.ts)
- [`__tests__/unit/middleware.test.ts`](../../__tests__/unit/middleware.test.ts)
- [`__tests__/unit/app/protected-page-auth-redirects.test.tsx`](../../__tests__/unit/app/protected-page-auth-redirects.test.tsx)
- [`__tests__/unit/routing/no-auth-traversal-smoke-guard.test.ts`](../../__tests__/unit/routing/no-auth-traversal-smoke-guard.test.ts)
- [`__tests__/integration/routing/no-auth-live-probe.spec.ts`](../../__tests__/integration/routing/no-auth-live-probe.spec.ts)
- [`scripts/run-no-auth-live-probes.js`](../../scripts/run-no-auth-live-probes.js)
