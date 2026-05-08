# Launch Blocker Burnup Snapshot — 2026-05-08

Generated: 2026-05-08T20:30Z (worker `d133-launch-blocker-burnup-snapshot-2028`).
Scope: strict Phase 0/1. This is a one-page reviewer snapshot that buckets each remaining P0/P1 blocker into one of five burnup lanes. It does **not** claim Phase 0/1 closure, authorize Phase 2+, deploys, secrets, paid APIs, browser swarms, dashboards, real users, or customer data. No code or schema changed in this slice.

## Verdict (no change)

Phase 0/1 remains **not 100% closed**. The strict OG gate stays active per `phase0-phase1-strict-closure-gate.md` and `phase0-phase1-closure-matrix.md`. This snapshot only classifies the remaining work so the burndown is unambiguous; canonical sources of truth are unchanged.

## Buckets

### 1. Repo-side closed (no further repo work needed for Phase 0/1)

These are repo-side closed under their current contracts. Live counterparts, where they exist, live in lanes 2–5.

| Item | Closure proof |
| --- | --- |
| D1 — service-role RBAC authority (table + RLS + helper switch + Jest guards) | `d1-service-role-rbac-authority-implementation-packet-2026-05-08.md`; `supabase/migrations/20260508024000_create_admin_role_assignments.sql`; `src/lib/supabase/server.ts` `checkServiceRoleAuthorization()` |
| D2 — durable rate-limiter adapter seam (memory only; non-memory provider names fail closed) | `d2-durable-rate-limiter-approval-gate-guard-2026-05-08.md`; `__tests__/unit/lib/middleware/rate-limiter-durable-provider-guard.test.ts` |
| D3 — signup-verification launch policy + static invariants | `d3-signup-verification-repo-invariant-guard-2026-05-08.md`; `config/signup-verification-launch-policy.json`; `__tests__/unit/auth/signup-verification-policy-invariants.test.ts` |
| D4 — `.env.prod` handling model (untracked; non-secret host metadata only) | `p0-p1-env-prod-local-dev-closure-2026-05-08.md`; `config/supabase-production-hosts.json` |
| D5 — numeric constraint semantics (bedrooms/bathrooms) | `d5-numeric-constraint-semantics-closure-2026-05-08.md` |
| D6 — DB reset/migration static readiness guards (no remote `--db-url` reset exposure) | `d6-db-static-reset-readiness-closure-2026-05-08.md`; `__tests__/unit/database/migration-reset-readiness.test.ts` |
| D7 — disputed-route email/profile field exposure (DTO trimmed) | `d7-disputed-route-exposure-closure-2026-05-08.md` |
| Internal/demo surface disposition (default 404 in prod behind `requireInternalPreviewAccess()`) | `p1-internal-demo-surface-disposition-2026-05-08.md`; `phase0-phase1-closure-matrix.md` |
| Anonymous protected-route redirect static guard + harness | `p0-no-auth-traversal-smoke-guard-2026-05-08.md`; `p0-no-auth-api-protected-redirect-probe-harness-2026-05-08.md` |
| API auth smoke handler-level matrix + skip set | `__tests__/integration/api/auth-smoke-matrix.spec.ts`; `p0-p1-api-auth-smoke-matrix-2026-05-08.md` |
| Accessibility core-flow static matrix | `accessibility-core-flow-matrix.md`; `__tests__/unit/accessibility/core-flow-matrix.test.ts` |

### 2. Live-evidence blocked (need approved local/non-prod environment, no owner-policy decision pending)

| Item | What unblocks it | Latest proof |
| --- | --- | --- |
| Authenticated browser traversal for protected pages (full matrix + protected positive accessibility) | Approved seeded local/Docker auth, the existing remote Supabase disposable seed, or temporary test-only session cookies | `remote-supabase-test-seed-and-auth-probe-2026-05-08.md`; `p0-site-traversal-acceptance-matrix-2026-05-08.md` rows 72–91 / 133–176 |
| E2E auth lifecycle (signup/login/verify/logout/session clearing, redirectTo round-trip) | Local Supabase/Docker (or equivalent non-prod auth) + local email sink (Inbucket/Mailpit) | `p0-p1-blocker-reconciliation-2026-05-08.md` lines 22, 42–44 |
| API auth smoke live execution | Approved local app server + non-prod `API_AUTH_SMOKE_TOKEN`; remote target only with `ALLOW_REMOTE_API_AUTH_SMOKE=1` | `p0-p1-api-auth-smoke-matrix-2026-05-08.md` lines 9–12, 63–74 |
| Final public no-credential traversal artifact (Playwright/local-smoke) | Approved local app target only; harness already exists | `p0-no-auth-api-protected-redirect-probe-harness-2026-05-08.md`; `p0-p1-remaining-blocker-taxonomy-2026-05-08.md` §A row 1 |
| Authenticated mutation/storage/invite/account positive flows | Same auth lane as row 1, plus disposable fixtures + reset/teardown | `p0-site-traversal-acceptance-matrix-2026-05-08.md` lines 85–91, 121–125, 140–152 |

### 3. Owner/ops decision (no env or repo work substitutes for the choice)

| Item | Decision still owed | Source |
| --- | --- | --- |
| D2 — durable production rate limiter | Pick exactly one: (A) accept in-memory + document multi-instance risk, (B) Upstash Redis, (C) Vercel KV / Redis-compatible. Provision secrets outside repo | `p1-decision-needed-register-2026-05-08.md` D2 row; `p1-decision-needed-register-freshness-2026-05-08.md` §D2 |
| D6 — validation lane choice | Pick exactly one: (A) local Supabase/Docker, (B) safeguarded remote-test DB, (C) written deferred-validation exception | `p1-decision-needed-register-freshness-2026-05-08.md` §D6 |
| Authenticated traversal lane choice (A1) | Pick exactly one: local seeded users, existing remote Supabase seed, or temporary test-only session cookies. Approve fixture data scope (household, profile, property, interactions, invite, settings) | `p0-p1-blocker-evidence-index-2026-05-08.md` row 1 |
| Internal/demo surface long-term policy | Confirm whether `/dashboard/vibes-test`, `/validation`, `/demo/ads`, `/sponsor-mockups` reintroduce as sponsor-sales collateral or admin tooling later (not a Phase 0/1 launch blocker; gate already 404s in prod) | `p1-internal-demo-surface-disposition-2026-05-08.md` |

### 4. Paid/external held (require explicit per-provider approval before any positive execution)

| Surface | Held because | Source |
| --- | --- | --- |
| D3 — production email confirmation + Turnstile/CAPTCHA application | Dashboard/secrets/config execution against the production Supabase project; Turnstile (or chosen) provider provisioning | `d3-signup-verification-policy-decision-2026-05-08.md`; `p1-decision-needed-register-freshness-2026-05-08.md` §D3 |
| Maps / Zillow / RapidAPI positive paths | Paid API spend + side effects | `p0-site-traversal-acceptance-matrix-2026-05-08.md` lines 41–45, 102–131 |
| OpenRouter / LLM positive paths | Paid API spend + side effects | same |
| Email / notification side-effecting routes | Real outbound email + provider quota | same |
| Cron / admin ingestion or generation | External writes, schedule effects, dashboard mutation | same |
| External dashboards (Vercel, Supabase prod, Google, AdSense, Analytics, Stripe) | Operating-plan forbids changes without explicit approval | `home-match-business-revival-operating-plan.md` lines 18–19, 214–218 |
| Zillow provider production-grade lift | Provider readiness + budget + ops sign-off | `zillow-provider-production-grade-evaluation-2026-05-08.md` |

### 5. Integration-queue pending (work that flips on automatically once the right approval/lane lands)

These are not new asks; they are downstream beneficiaries of the rows above and exist here so the burnup is honest about what remains queued.

| Item | Auto-unblocks once… | Source |
| --- | --- | --- |
| D1 live RBAC validation against `admin_role_assignments` | …D6 validation lane lands | `p1-decision-needed-register-freshness-2026-05-08.md` §D1 |
| D5 live numeric-constraint validation in DB | …D6 validation lane lands | `p1-decision-needed-register-freshness-2026-05-08.md` §D5 |
| Migration rollback rehearsal + DB lint live run | …D6 validation lane lands | `d6-db-static-reset-readiness-closure-2026-05-08.md`; `d22-migration-rollback-evidence-index-2026-05-08.md` |
| Protected positive accessibility traversal | …authenticated traversal lane lands | `p0-p1-blocker-evidence-index-2026-05-08.md` row 12 |
| Authenticated mutation/storage/invite/account flows | …authenticated traversal lane + disposable fixtures land | `p0-p1-blocker-evidence-index-2026-05-08.md` row 11 |
| Production-config sign-off vs `config/signup-verification-launch-policy.json` | …D3 production auth settings applied | `d3-signup-verification-policy-decision-2026-05-08.md` |

## What this snapshot does NOT do

- Does not advance Phase 0/1 closure or claim any new lane closed.
- Does not authorize spending money, calling paid/external APIs, mutating live Supabase, or running broad browser swarms.
- Does not replace `phase0-phase1-closure-matrix.md`, `p0-p1-blocker-evidence-index-2026-05-08.md`, `p0-p1-remaining-blocker-taxonomy-2026-05-08.md`, `p0-p1-blocker-reconciliation-2026-05-08.md`, or `p1-decision-needed-register-2026-05-08.md`. Those remain canonical.
- Does not change the gate verdict; Phase 2+ stays held.

## Source artifacts

- `reports/home-match-revival/phase0-phase1-strict-closure-gate.md`
- `reports/home-match-revival/phase0-phase1-closure-matrix.md`
- `reports/home-match-revival/p0-p1-blocker-evidence-index-2026-05-08.md`
- `reports/home-match-revival/p0-p1-remaining-blocker-taxonomy-2026-05-08.md`
- `reports/home-match-revival/p0-p1-blocker-reconciliation-2026-05-08.md`
- `reports/home-match-revival/p1-decision-needed-register-2026-05-08.md`
- `reports/home-match-revival/p1-decision-needed-register-freshness-2026-05-08.md`
- `reports/home-match-revival/p0-site-traversal-acceptance-matrix-2026-05-08.md`
- `reports/home-match-revival/p0-p1-api-auth-smoke-matrix-2026-05-08.md`
- `reports/home-match-revival/p0-no-auth-traversal-smoke-guard-2026-05-08.md`
- `reports/home-match-revival/p0-no-auth-api-protected-redirect-probe-harness-2026-05-08.md`
- `reports/home-match-revival/d1-service-role-rbac-authority-implementation-packet-2026-05-08.md`
- `reports/home-match-revival/d2-durable-rate-limiter-approval-gate-guard-2026-05-08.md`
- `reports/home-match-revival/d3-signup-verification-policy-decision-2026-05-08.md`
- `reports/home-match-revival/d3-signup-verification-repo-invariant-guard-2026-05-08.md`
- `reports/home-match-revival/d5-numeric-constraint-semantics-closure-2026-05-08.md`
- `reports/home-match-revival/d6-db-static-reset-readiness-closure-2026-05-08.md`
- `reports/home-match-revival/d7-disputed-route-exposure-closure-2026-05-08.md`
- `reports/home-match-revival/p1-internal-demo-surface-disposition-2026-05-08.md`
- `reports/home-match-revival/zillow-provider-production-grade-evaluation-2026-05-08.md`
- `reports/home-match-revival/remote-supabase-test-seed-and-auth-probe-2026-05-08.md`
- `reports/home-match-revival/accessibility-core-flow-matrix.md`
- `config/signup-verification-launch-policy.json`
- `config/supabase-production-hosts.json`
