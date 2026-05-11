# Security / Auth / API / DB Report Index — Freshness Snapshot — 2026-05-08

Generated: 2026-05-08T19:43Z (worktree `d78-security-report-index-freshness-1943`, base integration HEAD `a39107e`).

Scope: strict Phase 0/1 read-only refresh of [`p0-p1-blocker-evidence-index-2026-05-08.md`](./p0-p1-blocker-evidence-index-2026-05-08.md) (generated 2026-05-08T17:38Z). This report indexes the security / auth / API / DB evidence reports that have landed since the base index, restates which canonical artifacts they extend, and reconciles the unresolved Phase 0/1 gates against the latest proof. **No closure is claimed.** No code changed. No Supabase, paid APIs, browser swarms, dashboards, secrets, deploys, subagents, or remote mutations were used.

## Verdict (unchanged)

Phase 0 and Phase 1 remain **not 100% closed**. The strict OG gate stays active per [`phase0-phase1-strict-closure-gate.md`](./phase0-phase1-strict-closure-gate.md) and [`phase0-phase1-closure-matrix.md`](./phase0-phase1-closure-matrix.md). The three cross-cutting external approvals listed in [`p1-decision-needed-register-freshness-2026-05-08.md`](./p1-decision-needed-register-freshness-2026-05-08.md) §"Cross-cutting external approvals" remain the gate to move from "repo-side closed" to "Phase 0/1 closed":

1. **D6** validation lane (local Supabase/Docker, safeguarded remote-test, or written exception).
2. **D2** durable rate-limiter provider choice (in-memory accepted with risk, Upstash Redis, or Vercel KV / Redis-compatible).
3. **D3** production auth settings execution (email confirmation + CAPTCHA in production Supabase, reconciled against `config/signup-verification-launch-policy.json`).

This index does not authorize, advance, or close any of those gates.

## What landed since the base index (2026-05-08T17:38Z → 19:43Z)

Selection criterion: docs and static guards under `reports/home-match-revival/` and `__tests__/` whose subject is security, auth, API, or DB. JSON snapshots and unrelated marketing/perf rows are excluded; the canonical taxonomy/closure matrix entries already list those.

| #   | Topic                                         | New artifact (path)                                                                                                              | Commit    | Extends / supersedes                                                                                                                                                                                                                                                                                                                                            | Repo-side or env-gated                                                           |
| --- | --------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| F1  | P0/P1 remaining blocker taxonomy              | [`p0-p1-remaining-blocker-taxonomy-2026-05-08.md`](./p0-p1-remaining-blocker-taxonomy-2026-05-08.md)                             | `528c769` | Extends base index rows 1–12; canonical for "next-leaf shape" of each remaining blocker.                                                                                                                                                                                                                                                                        | Repo-side index.                                                                 |
| F2  | Test-suite taxonomy (worker-safe lanes)       | [`test-suite-taxonomy-2026-05-08.md`](./test-suite-taxonomy-2026-05-08.md)                                                       | `6fbdc46` | Documents Lane A targeted Jest as the only worker-safe lane; Lane B+ (Vitest integration / Playwright / live probe) stays approval-gated.                                                                                                                                                                                                                       | Repo-side; lane B+ env-gated.                                                    |
| F3  | Phase 1 DB migration rollback evidence (D22)  | [`d22-migration-rollback-evidence-index-2026-05-08.md`](./d22-migration-rollback-evidence-index-2026-05-08.md)                   | `b3a1e10` | Extends base index row 7 (D6) with per-migration `-- DOWN:` line numbers and the static guard set (`__tests__/unit/database/migration-reset-readiness.test.ts`, `rollback-coverage.test.ts`, sibling per-migration guards).                                                                                                                                     | Repo-side; live rollback rehearsal env-gated under D6.                           |
| F4  | P1 decision-needed register freshness (D1–D7) | [`p1-decision-needed-register-freshness-2026-05-08.md`](./p1-decision-needed-register-freshness-2026-05-08.md)                   | `fd8aba2` | Refreshes [`p1-decision-needed-register-2026-05-08.md`](./p1-decision-needed-register-2026-05-08.md); collapses external approvals to the three cross-cutting items above.                                                                                                                                                                                      | Repo-side.                                                                       |
| F5  | Env-guard diagnostics emit categories only    | `__tests__/unit/scripts/guard-supabase-env.test.ts` static guard expansion                                                       | `e63b596` | Extends base index row referenced via D4 / [`p0-p1-env-prod-local-dev-closure-2026-05-08.md`](./p0-p1-env-prod-local-dev-closure-2026-05-08.md) (env values never printed; offender categories only).                                                                                                                                                           | Repo-side.                                                                       |
| F6  | Rate-limit provider readiness map (D2)        | [`d2-rate-limit-provider-readiness-map-2026-05-08.md`](./d2-rate-limit-provider-readiness-map-2026-05-08.md)                     | `5ae7915` | Consolidates [`d2-durable-rate-limiter-approval-gate-guard-2026-05-08.md`](./d2-durable-rate-limiter-approval-gate-guard-2026-05-08.md), [`rate-limit-gap-scout.md`](./rate-limit-gap-scout.md), and [`p1-route-scoped-limiter-key-closure-2026-05-08.md`](./p1-route-scoped-limiter-key-closure-2026-05-08.md) onto a single page with the exact provider ask. | Repo-side; provider provision external-approval-gated.                           |
| F7  | Property-card trust-copy audit (P1)           | [`p1-property-card-trust-copy-audit-2026-05-08.md`](./p1-property-card-trust-copy-audit-2026-05-08.md)                           | `6909450` | New audit; future-gated dimensions noted. Surfaces no new auth/DB ask.                                                                                                                                                                                                                                                                                          | Repo-side.                                                                       |
| F8  | Admin tooling gap index (HELD P1 gates)       | [`admin-tooling-gap-index-2026-05-08.md`](./admin-tooling-gap-index-2026-05-08.md)                                               | `03fb0cc` | Records four operator-tooling gaps (ingest status, triage, traces, spend) as **HELD — gate not opened**; tied to base index row 10 (paid/external) and row 9 (internal/demo).                                                                                                                                                                                   | Repo-side index of held gates.                                                   |
| F9  | CSP & external-origin policy inventory        | [`p0-p1-csp-and-external-origin-policy-inventory-2026-05-08.md`](./p0-p1-csp-and-external-origin-policy-inventory-2026-05-08.md) | `66731af` | New static inventory of policy surfaces (`middleware.ts` SECURITY_HEADERS, `vercel.json`, `next.config.ts`), CSP directives (production-only), and external origins under `src/`. Cross-checks server-side-only origins (OpenRouter, RapidAPI) against `connect-src`.                                                                                           | Repo-side.                                                                       |
| F10 | Storage upload policy boundary guards         | `__tests__/unit/app/storage-upload-policy-guard.test.ts`                                                                         | `08f4244` | New static guards for storage upload boundaries; ties to base index row 11 (auth'd mutation/storage flows).                                                                                                                                                                                                                                                     | Repo-side; live execution env-gated.                                             |
| F11 | No-credential accessibility ↔ route taxonomy  | [`no-credential-accessibility-route-taxonomy-2026-05-08.md`](./no-credential-accessibility-route-taxonomy-2026-05-08.md)         | `5a3d88e` | Crosswalks `accessibility-core-flow-matrix.md` + `no-auth-public-accessibility-smoke.md` against the route taxonomy in `src/lib/routing/protected-routes.ts`.                                                                                                                                                                                                   | Repo-side; protected positive accessibility still env-gated (base index row 12). |
| F12 | Env-prod guard + local-dev no-secret docs     | [`p0-p1-env-prod-local-dev-closure-2026-05-08.md`](./p0-p1-env-prod-local-dev-closure-2026-05-08.md)                             | `a39107e` | Tightens D4 closure: `.env.prod` untracked; `config/supabase-production-hosts.json` is non-secret guard metadata; offender categories printed only.                                                                                                                                                                                                             | Repo-side.                                                                       |

## Reconciliation: did the unresolved Phase 0/1 gates move?

| Base index row | Gate                                                | Movement since 17:38Z                                                                                            | Net status                                                                       |
| -------------- | --------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| 1              | Authenticated browser traversal                     | None (no new live evidence; F11 only crosswalks taxonomy).                                                       | Live-evidenced (env-gated). Unchanged.                                           |
| 2              | E2E auth lifecycle                                  | None. F4 restates D3 repo-side closure; production auth settings still external-approval-gated.                  | Live-evidenced (env-gated). Unchanged.                                           |
| 3              | API auth smoke live token + server                  | None.                                                                                                            | Live-evidenced (env-gated). Unchanged.                                           |
| 4              | D1 service-role RBAC authority                      | F3 adds rollback evidence for `20260508024000_create_admin_role_assignments.sql`; F4 confirms repo-side closure. | Repo-side closed. Live integration still D6-gated. Unchanged.                    |
| 5              | D2 durable rate limiter                             | F6 collapses prior evidence into a single ask; no provider provisioned.                                          | External-approval-gated. Unchanged.                                              |
| 6              | D3 production email confirmation + CAPTCHA          | F4 reaffirms repo-side closure; production settings not applied.                                                 | External-approval-gated for prod; repo-side closed. Unchanged.                   |
| 7              | D6 DB reset/lint/rollback/integration               | F3 documents per-migration DOWN coverage + static guards; live execution still gated.                            | Live-evidenced (env-gated). Unchanged.                                           |
| 8              | Final public no-credential traversal artifact       | None (F11 maps coverage; harness execution still pending).                                                       | Repo-side actionable; bounded local execution still owed. Unchanged.             |
| 9              | Internal/demo surface disposition                   | F8 catalogues admin-tooling gaps as HELD; surfaces remain gated behind `requireInternalPreviewAccess()`.         | Repo-side closed for launch gate. Unchanged.                                     |
| 10             | Paid/external route checks                          | None positive. F9 inventories external origins (CSP cross-check).                                                | External-approval-gated. Unchanged.                                              |
| 11             | Authenticated mutation/storage/invite/account flows | F10 adds storage upload boundary guards (static).                                                                | Live-evidenced (env-gated); static guards extended. Unchanged at the gate level. |
| 12             | Protected positive accessibility traversal          | F11 crosswalks coverage; no positive run.                                                                        | Live-evidenced (env-gated). Unchanged.                                           |

No row is closed by anything in the freshness window. The gate verdict remains: **Phase 0/1 not 100% closed.**

## Cross-cutting checks (read-only)

- **Secrets / env**: F5 + F12 confirm `scripts/guard-supabase-env.js` reports offender categories only; `config/supabase-production-hosts.json` is non-secret. No secret values were inspected, copied, printed, or committed by this slice.
- **CSP**: F9 confirms CSP is **production-only** (gated by `NODE_ENV === 'production'` in `middleware.ts`). Server-side-only origins (`openrouter.ai`, `*.p.rapidapi.com`) are correctly absent from `connect-src`.
- **DB**: F3 confirms 9/9 Phase 1 DB remediation migrations carry `-- DOWN:` blocks and are covered by static guards in `__tests__/unit/database/`.
- **Rate limiting**: F6 confirms only `memory` is executable; non-memory provider names fail closed with an explicit approval-required adapter error (no silent promotion path).
- **Auth**: F4 confirms `checkServiceRoleAuthorization()` reads `admin_role_assignments` (not `user_profiles.role`); D1 packet repo-side closed; live validation D6-gated.

## Targeted check (worker-safe Lane A only)

This slice changed no source code, so per the bounded-worker rules a `pnpm type-check` run was not triggered. No tests were added or modified. Repo state remains as committed at base HEAD `a39107e`.

If a reviewer wants to revalidate the static guards referenced above, the F2 taxonomy (`test-suite-taxonomy-2026-05-08.md`) lists the worker-safe Lane A invocations, e.g.:

```
systemd-run --user --scope -p MemoryMax=2G -p CPUQuota=200% \
  pnpm exec jest \
    __tests__/unit/auth/d1-rbac-authority-packet.test.ts \
    __tests__/unit/database/migration-reset-readiness.test.ts \
    __tests__/unit/database/rollback-coverage.test.ts \
    __tests__/unit/lib/middleware/rate-limiter-durable-provider-guard.test.ts \
    __tests__/unit/scripts/guard-supabase-env.test.ts \
    --runInBand
```

Lane B+ (Vitest integration, Playwright E2E, live probes, accessibility, performance) is **not** invoked by this worker; F2 documents the explicit approval/environment gating for those lanes.

## What this report does NOT do

- Does not advance or close any Phase 0/1 row.
- Does not authorize spend, paid/external APIs, live Supabase mutations, browser swarms, dashboards, deploys, or remote mutations.
- Does not replace the base index ([`p0-p1-blocker-evidence-index-2026-05-08.md`](./p0-p1-blocker-evidence-index-2026-05-08.md)), the closure matrix ([`phase0-phase1-closure-matrix.md`](./phase0-phase1-closure-matrix.md)), the strict closure gate ([`phase0-phase1-strict-closure-gate.md`](./phase0-phase1-strict-closure-gate.md)), the blocker reconciliation ([`p0-p1-blocker-reconciliation-2026-05-08.md`](./p0-p1-blocker-reconciliation-2026-05-08.md)), the remaining-taxonomy ([`p0-p1-remaining-blocker-taxonomy-2026-05-08.md`](./p0-p1-remaining-blocker-taxonomy-2026-05-08.md)), or the decision register ([`p1-decision-needed-register-2026-05-08.md`](./p1-decision-needed-register-2026-05-08.md) / its freshness sibling).
- Does not introduce any new approval or unblock any held gate.

## Source artifacts (canonical, unchanged)

- [`phase0-phase1-strict-closure-gate.md`](./phase0-phase1-strict-closure-gate.md)
- [`phase0-phase1-closure-matrix.md`](./phase0-phase1-closure-matrix.md)
- [`p0-p1-blocker-evidence-index-2026-05-08.md`](./p0-p1-blocker-evidence-index-2026-05-08.md) (base for this freshness snapshot)
- [`p0-p1-blocker-reconciliation-2026-05-08.md`](./p0-p1-blocker-reconciliation-2026-05-08.md)
- [`p0-p1-remaining-blocker-taxonomy-2026-05-08.md`](./p0-p1-remaining-blocker-taxonomy-2026-05-08.md)
- [`p1-decision-needed-register-2026-05-08.md`](./p1-decision-needed-register-2026-05-08.md)
- [`p1-decision-needed-register-freshness-2026-05-08.md`](./p1-decision-needed-register-freshness-2026-05-08.md)
- [`p0-p1-csp-and-external-origin-policy-inventory-2026-05-08.md`](./p0-p1-csp-and-external-origin-policy-inventory-2026-05-08.md)
- [`d22-migration-rollback-evidence-index-2026-05-08.md`](./d22-migration-rollback-evidence-index-2026-05-08.md)
- [`d2-rate-limit-provider-readiness-map-2026-05-08.md`](./d2-rate-limit-provider-readiness-map-2026-05-08.md)
- [`p0-p1-env-prod-local-dev-closure-2026-05-08.md`](./p0-p1-env-prod-local-dev-closure-2026-05-08.md)
- [`no-credential-accessibility-route-taxonomy-2026-05-08.md`](./no-credential-accessibility-route-taxonomy-2026-05-08.md)
- [`admin-tooling-gap-index-2026-05-08.md`](./admin-tooling-gap-index-2026-05-08.md)
- [`test-suite-taxonomy-2026-05-08.md`](./test-suite-taxonomy-2026-05-08.md)
- `config/signup-verification-launch-policy.json`
- `config/supabase-production-hosts.json`
