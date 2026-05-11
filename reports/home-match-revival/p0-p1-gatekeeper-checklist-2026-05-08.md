# P0/P1 Gatekeeper Checklist — 2026-05-08

Generated: 2026-05-08T (worktree `d117-gatekeeper-checklist-2022`).
Scope: a single, strict gatekeeper checklist that compresses every Phase 0/1 row in `phase0-phase1-closure-matrix.md` and `p0-p1-blocker-evidence-index-2026-05-08.md` into (a) the on-disk evidence files that MUST exist and pass before any closure claim, and (b) the no-claim-closure conditions that automatically reject a closure claim regardless of agent assertion. This file is review-only and does not authorize Phase 2+, secrets, paid APIs, browser swarms, deploys, or production data.

## How to read this checklist

- A row is closure-eligible only if every "Required evidence files" path exists at HEAD, the named test/guard is green under the documented resource-limited command, and none of the "No-claim-closure conditions" trigger.
- "Repo-side closure" means closure-eligible from this checklist alone. "Live-evidenced" means closure additionally requires execution evidence captured in a dated artifact under `reports/home-match-revival/`. "External-approval-gated" means closure additionally requires a written Shan/ops decision linked from the row.
- Agent self-assertion ("I ran the test", "the matrix is complete") never counts. The artifact path and the matching test name must both resolve at HEAD.

## Universal no-claim-closure conditions (apply to every row)

1. The cited evidence artifact must exist at the path printed in this checklist as of HEAD. A missing file rejects the closure claim, even if a prior commit referenced it.
2. The cited test/guard must be invoked under the resource-limited form already established in this repo (`systemd-run --user --scope -p MemoryMax=2G -p CPUQuota=200% pnpm exec jest …` or the equivalent Vitest invocation), and must pass with the count documented in the matrix or evidence index. A passing test under a different command, a stubbed/mocked replacement, or a `.only`/`.skip` shortcut does not count.
3. No closure may rely on production Supabase URLs, real user accounts, real email/CAPTCHA providers, paid APIs, or remote `--db-url` reset paths. Any artifact that demonstrates closure by hitting these surfaces is automatically rejected and must be re-run against an approved local/disposable lane.
4. No closure may be claimed by editing the closure matrix, the blocker reconciliation, the decision-needed register, or this checklist alone. Status edits without a corresponding new dated evidence artifact + green test are rejected.
5. Live-evidenced rows additionally require the dated execution artifact (e.g. `…-2026-05-08.md`) to record: the exact command, the target host (must be `127.0.0.1` or an explicitly approved non-production host), the seeded fixture origin, and the redacted/non-secret outputs. Output that prints secrets is rejected and must be re-captured.
6. External-approval-gated rows additionally require the written Shan/ops decision to be linked from the row. A pending Linear/Notion item is not a decision; only the linked decision artifact counts.

## Per-row checklist

### Row 1 — Authenticated browser traversal for protected pages (live-evidenced)

- Required evidence files:
  - `reports/home-match-revival/p0-site-traversal-acceptance-matrix-2026-05-08.md` (acceptance set + remaining gaps).
  - `reports/home-match-revival/remote-supabase-test-seed-and-auth-probe-2026-05-08.md` (live `/dashboard`, `/couples`, `/settings`, `/profile` traversal).
  - `reports/home-match-revival/p0-p1-strict-anonymous-live-probe-rerun-2026-05-08.md` (anonymous redirect traversal post-`src/middleware.ts` discovery fix).
  - `reports/home-match-revival/accessibility-core-flow-matrix.md` (protected accessibility acceptance metadata).
  - A dated authenticated-positive traversal artifact `reports/home-match-revival/p0-p1-authenticated-positive-traversal-<YYYY-MM-DD>.md` covering household, profile, property, interactions, invite, and settings states.
- No-claim-closure conditions specific to row 1:
  - Authenticated traversal that uses anything other than the approved local Supabase/Docker seed or the existing remote Supabase disposable seed (i.e. real Gmail account, real invite token, real email/CAPTCHA) is rejected.
  - Closure claim limited to the four core protected pages without the full mutation/storage/invite/account positive set is rejected; that set lives in row 11.
  - A closure claim that cites only the static accessibility matrix (Jest 5/5) without the authenticated traversal artifact is rejected; static matrix alone closes only row 12's repo-side leg.

### Row 2 — E2E auth lifecycle (live-evidenced)

- Required evidence files:
  - `reports/home-match-revival/d3-signup-verification-policy-decision-2026-05-08.md`.
  - `reports/home-match-revival/d3-signup-verification-repo-invariant-guard-2026-05-08.md`.
  - `__tests__/unit/auth/signup-verification-policy-invariants.test.ts` (must remain green).
  - `config/signup-verification-launch-policy.json`.
  - A dated E2E lifecycle artifact `reports/home-match-revival/p0-p1-auth-lifecycle-e2e-<YYYY-MM-DD>.md` covering signup → verify → login → logout → session clearing → `redirectTo` round-trip.
- No-claim-closure conditions specific to row 2:
  - Any leg executed against production Supabase, a real email provider, or a real CAPTCHA endpoint is rejected; signup verification must use a local sink (Inbucket/Mailpit) and CAPTCHA must be bypassed via the documented local-only path.
  - Closure citing only the static repo invariants (policy + guard + Jest) without the dated E2E artifact is rejected.

### Row 3 — API auth smoke live token + server (live-evidenced)

- Required evidence files:
  - `__tests__/integration/api/auth-smoke-matrix.spec.ts`.
  - `reports/home-match-revival/p0-p1-api-auth-smoke-matrix-2026-05-08.md`.
  - A dated execution artifact recording the run: target host (must be `127.0.0.1:3000` or an explicitly approved non-production remote with `ALLOW_REMOTE_API_AUTH_SMOKE=1`), token origin (seeded non-production user), and redacted output.
- No-claim-closure conditions specific to row 3:
  - Any run against a production host or with `API_AUTH_SMOKE_TOKEN` sourced from a real account is rejected.
  - A passing static matrix without the dated live execution artifact is rejected.

### Row 4 — D1 service-role RBAC authority (repo-side closed; integration leg D6-gated)

- Required evidence files:
  - `reports/home-match-revival/d1-service-role-rbac-authority-implementation-packet-2026-05-08.md`.
  - `supabase/migrations/20260508024000_create_admin_role_assignments.sql` (with documented `-- DOWN:` companion).
  - `src/lib/supabase/server.ts` (`checkServiceRoleAuthorization()` reads `admin_role_assignments`, not `user_profiles.role`).
  - `src/types/app-database.ts` (typed `admin_role_assignments` extension).
  - The 11/11 targeted Jest guards: 5 authorization scenarios + 4 migration static assertions + 2 route capability whitelist (must be green under the documented resource-limited Jest invocation).
- No-claim-closure conditions specific to row 4:
  - Any reintroduction of `user_profiles.role` reads in `checkServiceRoleAuthorization()` rejects the closure.
  - Removal of the migration's RLS, role constraint, or "no authenticated write path" property rejects the closure.
  - Live DB validation of the authority table without a closed D6 lane is rejected (it does not move row 4 forward; it lives under row 7).

### Row 5 — D2 durable production rate limiter (external-approval-gated)

- Required evidence files:
  - `src/lib/middleware/rateLimiter.ts` (with `RATE_LIMIT_STORAGE_PROVIDER` adapter seam; only `memory` executable; non-memory provider names fail closed).
  - `__tests__/unit/lib/middleware/rate-limiter-check.test.ts`.
  - `__tests__/unit/lib/middleware/rate-limiter-durable-provider-guard.test.ts`.
  - `reports/home-match-revival/d2-durable-rate-limiter-approval-gate-guard-2026-05-08.md`.
  - `reports/home-match-revival/p1-route-scoped-limiter-key-closure-2026-05-08.md`.
  - A dated provider-decision artifact recording (A) accept in-memory at launch with documented multi-instance risk, (B) Upstash Redis, or (C) Vercel KV / Redis-compatible — signed by Shan/ops.
- No-claim-closure conditions specific to row 5:
  - Adding any non-memory adapter implementation, SDK dependency, or environment variable for an external store before the dated provider-decision artifact exists is rejected and must be reverted.
  - A claim that the in-memory limiter is "production-grade" without the explicit launch-acceptance decision artifact is rejected.

### Row 6 — D3 production email confirmation + CAPTCHA execution (external-approval-gated for prod; repo-side policy + invariants closed)

- Required evidence files:
  - `reports/home-match-revival/d3-signup-verification-policy-decision-2026-05-08.md`.
  - `reports/home-match-revival/d3-signup-verification-repo-invariant-guard-2026-05-08.md`.
  - `__tests__/unit/auth/signup-verification-policy-invariants.test.ts`.
  - `config/signup-verification-launch-policy.json`.
  - A dated external-execution runbook/artifact recording the Supabase project settings change (email confirmation enabled, CAPTCHA provider configured) — signed by Shan/ops; or the runbook prepared but not executed, with explicit deferral note.
- No-claim-closure conditions specific to row 6:
  - Any change that lets production launch with confirmations disabled or CAPTCHA absent (whether by mutating `config/signup-verification-launch-policy.json` or by editing the invariants test) is rejected.
  - "I updated the dashboard" without the linked external-execution artifact is rejected; closure requires a non-secret evidence record (screenshot redaction or read-back of the policy keys, never secret values).

### Row 7 — D6 DB reset/lint/rollback/integration validation (live-evidenced)

- Required evidence files:
  - `__tests__/unit/database/migration-reset-readiness.test.ts` (20/20 green under resource-limited Jest).
  - `reports/home-match-revival/d6-db-static-reset-readiness-closure-2026-05-08.md`.
  - A dated DB-execution artifact recording: lane choice (local Supabase/Docker, safeguarded remote-test DB, or written deferral), the exact reset/lint/rollback commands, and integration test outputs.
- No-claim-closure conditions specific to row 7:
  - Any execution against production or a shared remote without explicit approval is rejected.
  - Any `supabase db reset` invocation that bypasses `scripts/dev-supabase-reset.js` + the Docker wrapper, or that targets `--db-url` with a remote URL, is rejected.
  - Marking row 7 closed without the dated execution artifact (i.e. relying on the static guard alone) is rejected; the static guard closes the readiness leg only.

### Row 8 — Final public no-credential traversal artifact (repo-side actionable)

- Required evidence files:
  - `reports/home-match-revival/p0-no-auth-traversal-smoke-guard-2026-05-08.md`.
  - `__tests__/unit/routing/no-auth-traversal-smoke-guard.test.ts` (5/5 green).
  - `reports/home-match-revival/p0-no-auth-api-protected-redirect-probe-harness-2026-05-08.md`.
  - `scripts/run-no-auth-live-probes.js`.
  - `__tests__/integration/routing/no-auth-live-probe.spec.ts`.
  - A dated execution artifact `reports/home-match-revival/p0-no-auth-public-traversal-execution-<YYYY-MM-DD>.md` covering `/about`, `/contact`, `/privacy`, `/terms`, `/sponsor-mockups`, `/reset-password`, `/verify-email`, `/auth/auth-code-error`, `/robots.txt`, `/sitemap.xml`, and one synthetic missing route, against a local app target.
- No-claim-closure conditions specific to row 8:
  - Any execution against a non-local base URL is rejected (`scripts/run-no-auth-live-probes.js` must refuse and the artifact must show the refusal path was honored).
  - Any execution that submits real auth forms, calls paid APIs, or hits external dashboards is rejected.
  - Default-skipped Vitest output alone (45/45 skipped) without the live execution artifact is not closure for row 8 — that captures harness readiness only.

### Row 9 — Internal/demo surface disposition (repo-side closed for the launch gate)

- Required evidence files:
  - `reports/home-match-revival/p1-internal-demo-surface-disposition-2026-05-08.md`.
  - Integration commit `3e5f510` keeping `/dashboard/vibes-test`, `/validation`, `/demo/ads`, and `/sponsor-mockups` behind `requireInternalPreviewAccess()` / `HOMEMATCH_ENABLE_INTERNAL_PREVIEW=true` with default 404 in production.
  - The targeted demo-surface and SEO route policy Jest guards (must remain green under the documented resource-limited invocation).
- No-claim-closure conditions specific to row 9:
  - Any change that exposes these surfaces by default in production (default-true env, removed gate, removed 404 fallback) is rejected.
  - "Reintroduce as public sponsor-sales collateral" is not a Phase 0/1 closure path; it is a separate product decision and reopens the row.

### Row 10 — Paid/external route checks (external-approval-gated)

- Required evidence files:
  - `reports/home-match-revival/p0-site-traversal-acceptance-matrix-2026-05-08.md` (paid/external skip rules).
  - `reports/home-match-revival/p0-p1-api-auth-smoke-matrix-2026-05-08.md` (explicit skip set).
  - `reports/home-match-revival/zillow-provider-production-grade-evaluation-2026-05-08.md`.
  - A dated per-provider approval artifact recording: provider name, target environment (must not be production unless explicitly approved), budget/side-effect scope, and Shan/ops sign-off — one per provider exercised.
- No-claim-closure conditions specific to row 10:
  - Any positive execution against Maps, Zillow/RapidAPI, OpenRouter/LLM, email/notification, or cron/admin ingestion without a matching dated approval artifact is rejected and must be undone.
  - Mocking does not "close" row 10 unless every paid/external surface in the inventory is explicitly mocked with a single dated mock-only closure artifact; partial mocking without an inventory-aligned artifact is rejected.

### Row 11 — Authenticated mutation/storage/invite/account positive flows (live-evidenced)

- Required evidence files:
  - `reports/home-match-revival/p0-site-traversal-acceptance-matrix-2026-05-08.md` (acceptance set: household, interactions, saved searches, avatar storage, invite tokens, account states).
  - A dated authenticated-mutation artifact `reports/home-match-revival/p0-p1-authenticated-mutation-flows-<YYYY-MM-DD>.md` covering each mutation surface plus its reset/teardown path.
- No-claim-closure conditions specific to row 11:
  - Mutations executed against production Supabase, real avatar storage buckets, or real invite tokens are rejected.
  - Closure that does not also satisfy rows 1, 2, and 7 is rejected — row 11 inherits the auth-lane and DB-lane gates.
  - A dated artifact missing the teardown/reset proof is rejected (mutation evidence without cleanup proof leaves residue).

### Row 12 — Protected positive accessibility traversal (live-evidenced; repo-side static matrix closed)

- Required evidence files:
  - `reports/home-match-revival/accessibility-core-flow-matrix.md`.
  - `__tests__/unit/accessibility/core-flow-matrix.test.ts` (5/5 green under the documented resource-limited Jest invocation).
  - The dated authenticated-positive accessibility traversal artifact (may be the same artifact as row 1 if it explicitly records accessibility findings — axe results, role/landmark checks, focus-order observations, redacted screenshots).
- No-claim-closure conditions specific to row 12:
  - The static matrix alone does not close the row; live accessibility traversal evidence is required.
  - Accessibility findings that depend on real-user data, real screen-reader recordings of real customers, or production sessions are rejected; only seeded test users count.

## Index/source artifacts

- `reports/home-match-revival/phase0-phase1-strict-closure-gate.md`
- `reports/home-match-revival/phase0-phase1-closure-matrix.md`
- `reports/home-match-revival/p0-p1-blocker-evidence-index-2026-05-08.md`
- `reports/home-match-revival/p0-p1-blocker-reconciliation-2026-05-08.md`
- `reports/home-match-revival/p0-p1-remaining-blocker-taxonomy-2026-05-08.md`
- `reports/home-match-revival/p1-decision-needed-register-2026-05-08.md`

## What this checklist does NOT do

- Does not advance any Phase 0/1 row's closure state. It strictly tightens what can be claimed and how.
- Does not authorize spending money, calling paid/external APIs, mutating live Supabase, running broad browser swarms, or any deploy/dashboard execution.
- Does not replace the canonical matrix, reconciliation, taxonomy, or decision register; it is a review-side gate the canonical artifacts can cite.
- Does not change the gate verdict — Phase 0 and Phase 1 remain not 100% closed and Phase 2/3/4/5/6 remain held.
