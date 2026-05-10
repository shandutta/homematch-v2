---
date: 2026-05-08
phase: P0/P1 hardening (read-only evidence index)
scope: approved disposable auth/test fixture sources — what is locked, where, and what remains non-secret
authors: hermes-claude (worktree d130-auth-fixture-source-index-2028)
status: REPO-SIDE EVIDENCE — no live execution, no secrets read
related:
  - reports/home-match-revival/p0-auth-credential-recovery-and-tiny-probe-plan-2026-05-08.md
  - reports/home-match-revival/remote-supabase-test-seed-and-auth-probe-2026-05-08.md
  - reports/home-match-revival/p0-p1-credentialless-auth-lifecycle-verification-plan-2026-05-08.md
  - reports/home-match-revival/public-demo-listing-fixture-boundary-2026-05-08.md
  - reports/home-match-revival/p0-p1-blocker-evidence-index-2026-05-08.md
  - AGENTS.md
---

# D130 — Auth/test fixture source index

## 0. Purpose & boundary

This is a read-only PM/reviewer index that maps every approved
disposable auth/test fixture source to the script, runtime, and report
that anchors it, plus the residual non-secret items still required for
Phase 0/1 closure.

It is deliberately **non-executing**:

- No live Supabase calls, no admin seed runs, no auth lifecycle runs.
- No secrets read; `.env.local`, `.env.test.local`, and 1Password are
  not opened by this slice.
- No Phase 2+ work, no Docker reset, no browser swarms, no paid APIs.

It does **not** authorize new fixtures, new seed paths, or new
environment-gated execution; existing canonical artifacts remain the
only source of truth for what may be run, where, and by whom.

## 1. Approved disposable auth/test fixture sources

These are the complete set of sanctioned disposable fixture sources for
Phase 0/1 work. Each row names the source-of-truth file and the runtime
that consumes it. Anything not listed here is out of scope for the
current gate.

| #   | Fixture domain                                                                                                            | Source of truth                                                                                                                           | Runtime / consumers                                                                                                                                                                                                                     | Disposable scope                                                                                     |
| --- | ------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| 1   | Local Supabase auth users (`test1@example.com`, `test2@example.com`, `test3@example.com`, `test-worker-0..7@example.com`) | `scripts/setup-test-users-admin.js`                                                                                                       | Local Supabase only by default; refuses non-local unless `ALLOW_REMOTE_SUPABASE=true` or `SUPABASE_ALLOW_REMOTE=true` is explicitly set. Used by `scripts/run-local-seeded-auth-lifecycle.js` and the e2e auth setup.                   | Deletes/recreates exactly these emails and matching `user_profiles`; no broader user-table mutation. |
| 2   | Mocked test user shapes (unit/integration)                                                                                | `__tests__/fixtures/test-data.ts` (`TEST_USERS`, `getWorkerTestUser`, `WORKER_TEST_USER_COUNT`)                                           | Jest unit tests, Vitest integration tests, Playwright auth setup (`__tests__/e2e/auth.setup.ts`).                                                                                                                                       | In-memory only; never written to a live DB by these consumers.                                       |
| 3   | Local seeded auth lifecycle harness                                                                                       | `scripts/run-local-seeded-auth-lifecycle.js` + `__tests__/e2e/auth-lifecycle-local-seeded.spec.ts`                                        | Pinned to local URL; forces `LOCAL_SEEDED_AUTH_LIFECYCLE=true`, `PLAYWRIGHT_WORKERS=1`, `NEXT_PUBLIC_TEST_MODE=true`, `ALLOW_REMOTE_SUPABASE=false`, `SUPABASE_ALLOW_REMOTE=false`, then runs `setup-test-users-admin.js` and the spec. | Local Supabase only; will not run against remote unless guardrails are stripped (out of scope).      |
| 4   | Local DB seed data (neighborhoods, properties, gallery seed)                                                              | `supabase/seed.sql`                                                                                                                       | Applied automatically by `supabase db reset` against local Supabase.                                                                                                                                                                    | Synthetic IDs (`dev-100001..`), Bay-Area centroids, no real customer rows.                           |
| 5   | Gallery property fixture (`zpid=dev-100014`, `908 Gallery Ln`, San Francisco, CA)                                         | Defined in both `scripts/setup-test-users-admin.js` (`gallerySeedProperty`) and `supabase/seed.sql` (line 435+)                           | Upserted by the admin seed script for `test1@example.com` along with one seeded gallery like; reused by gallery/listing tests.                                                                                                          | Synthetic property; safe to upsert/delete in disposable env.                                         |
| 6   | Public/demo listing fixtures (anonymous landing)                                                                          | `src/app/api/properties/marketing/route.ts`, `src/components/marketing/{MarketingPreviewCard,MarketingPreviewCardStatic,PhoneMockup}.tsx` | Anonymous public surface; locked by the static guard at `__tests__/unit/app/public-demo-listing-fixture-boundary.test.ts`.                                                                                                              | Hardcoded `mock-N` zpids only; cannot read Supabase, services, or external APIs (guard enforced).    |
| 7   | No-auth live probe wrapper                                                                                                | `scripts/run-no-auth-live-probes.js` + `__tests__/integration/routing/no-auth-live-probe.spec.ts`                                         | Refuses non-local base URLs; uses no credentials, tokens, cookies, admin keys, cron secrets, or external API keys; safe-skips when no local app responds.                                                                               | Read-only; no fixture mutation, no auth state.                                                       |
| 8   | API auth smoke matrix                                                                                                     | `__tests__/integration/api/auth-smoke-matrix.spec.ts`                                                                                     | Refuses non-local targets unless `ALLOW_REMOTE_API_AUTH_SMOKE=1`; consumes a bearer token via `API_AUTH_SMOKE_TOKEN` (acquired separately, never printed).                                                                              | Tests three protected reads only; no mutation; no token persistence.                                 |
| 9   | Test auth helpers / storage state                                                                                         | `__tests__/utils/auth-helper.ts` + `playwright/.auth/user-worker-*.json` (generated, gitignored)                                          | Playwright workers reuse worker-pinned storage state; helpers are `login`, `logout`, `verifyAuthenticated`, `verifyNotAuthenticated`, `useStorageState`, `authenticateWithStorageState`.                                                | Storage states are local-only artifacts of seeded users; not committed.                              |
| 10  | Couples test data                                                                                                         | `scripts/setup-couples-test-data.js`                                                                                                      | Optional companion to the test-user seed for couples flows; consumed only when explicitly invoked.                                                                                                                                      | Disposable: scoped to seeded users from row 1.                                                       |

Out of scope for this index (intentionally):

- `.env.local`, `.env.test.local`, `.env.prod`, and any 1Password vault
  reads. Their presence/absence is documented in
  `p0-auth-credential-recovery-and-tiny-probe-plan-2026-05-08.md`.
- Service-role keys, anon keys, bearer tokens, user passwords, cron
  secrets, CAPTCHA secrets — never printed by any of the above runtimes
  and not referenced here.
- Production accounts, real users, real email/CAPTCHA, paid APIs.

## 2. Cross-reference to canonical evidence

| Evidence claim                                                                      | Anchor artifact                                                                                                                                                   |
| ----------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Seed users + script behavior + non-local refusal                                    | `reports/home-match-revival/p0-auth-credential-recovery-and-tiny-probe-plan-2026-05-08.md` (sections "Seeded local users", "Local seeded auth lifecycle wrapper") |
| Remote-disposable seed actually executed once with redacted output                  | `reports/home-match-revival/remote-supabase-test-seed-and-auth-probe-2026-05-08.md`                                                                               |
| Public/demo fixture surface fully bounded by static guard                           | `reports/home-match-revival/public-demo-listing-fixture-boundary-2026-05-08.md` + `__tests__/unit/app/public-demo-listing-fixture-boundary.test.ts`               |
| Credentialless coverage available now without seed/session                          | `reports/home-match-revival/p0-p1-credentialless-auth-lifecycle-verification-plan-2026-05-08.md`                                                                  |
| Per-blocker classification (repo-side vs live-evidenced vs external-approval-gated) | `reports/home-match-revival/p0-p1-blocker-evidence-index-2026-05-08.md`                                                                                           |
| Source-of-truth rule for seeded creds                                               | `AGENTS.md` lines 29–30 (test-user setup script is the single source; no plaintext creds in `.env.local`, `.env.test.local`, or `~/.codex/config.toml`)           |

## 3. Non-secret residuals required for closure

These items remain open but are **non-secret**: each is a decision,
target, or environment selection — never a key or token to print.

1. **Authenticated traversal lane choice.** Pick exactly one:
   (a) local Supabase/Docker seeded users via row 1; (b) reuse of the
   existing remote-disposable seed (already proven once in the remote
   probe report); or (c) temporary test-only browser storage states
   from row 9.
2. **API auth smoke target.** Confirm local `127.0.0.1:3000` (default)
   versus an explicitly approved non-production remote with
   `ALLOW_REMOTE_API_AUTH_SMOKE=1`. Token acquisition is a separate
   operator step; only the target choice is a non-secret decision.
3. **Public no-credential traversal local execution.** The harness in
   row 7 is repo-side actionable today; the missing artifact is one
   bounded local run against the listed public routes.
4. **Local app server presence.** Whether a local Next.js dev server is
   running on `127.0.0.1:3000` is the gating condition for rows 7 and
   8 to produce real pass/fail (not safe-skip) results.
5. **Email sink choice for signup-verification leg.** Inbucket/Mailpit
   or another non-production sink — required for the signup-verify
   lifecycle in row 3, but only at decision level, not at secret level.

None of the residuals require disclosing or transporting credentials.
They are environment/target/decision choices that the operator records
in the existing canonical artifacts.

## 4. Forbidden in any closure attempt against these fixtures

Inherited from the canonical artifacts above; restated here so this
index is self-contained:

- Pointing any seed/lifecycle/auth-smoke runtime at production Supabase
  or production accounts.
- Stripping the `ALLOW_REMOTE_SUPABASE` / `SUPABASE_ALLOW_REMOTE` /
  `ALLOW_REMOTE_API_AUTH_SMOKE` guards from scripts or tests.
- Storing plaintext credentials in `.env.local`, `.env.test.local`, or
  `~/.codex/config.toml` (per `AGENTS.md`).
- Printing service-role keys, anon keys, bearer tokens, user passwords,
  cron secrets, or CAPTCHA secrets in logs, reports, or commit
  messages.
- Adding new public/demo fixture surfaces without updating the static
  guard inventory in `public-demo-listing-fixture-boundary-2026-05-08`.
- Running broad production deletes; reset/teardown stays scoped to the
  test users in row 1 plus the `dev-100014` gallery fixture.

## 5. Out of scope for this slice (deliberately)

- Implementing or modifying any seed script, test fixture, or harness.
- Authorizing Phase 2+ work, deploys, or external dashboard mutations.
- Reading or rotating any secret.
- Running auth lifecycle, API auth smoke, no-auth live probe, or any
  Playwright spec — even locally.
- Replacing or amending `phase0-phase1-closure-matrix.md`,
  `p0-p1-blocker-reconciliation-2026-05-08.md`, or
  `p0-p1-blocker-evidence-index-2026-05-08.md`.

This document is an evidence pointer only. Closure of any individual
row above still flows through its anchor artifact and the canonical
matrix.
