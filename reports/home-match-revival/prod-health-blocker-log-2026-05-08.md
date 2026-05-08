# Production Health Blocker Log — 2026-05-08

Generated: 2026-05-08 (worktree `d114-prod-health-blocker-log-2022`).
Scope: strict Phase 0/1 control-plane slice. Read-only narrative log that
records the standing production-health blockers and the validation gates
that already cover them on the repo side, so a reviewer can locate the
"is production launchable?" answer without reassembling it from the 80+
canonical artifacts. **No secrets, no host names, no dashboard or paid-API
execution, no live mutations, no deploy authorization** — only repo-tracked
proof and canonical cross-references. This log does not change any gate
verdict and does not authorize Phase 2+.

## Verdict (no change)

Production cannot launch. Phase 0 and Phase 1 remain not 100% closed per
`phase0-phase1-strict-closure-gate.md` lines 14-19 and
`phase0-phase1-closure-matrix.md` lines 5-7 and 73-76. The blockers below
are the production-health-relevant subset; the broader proof index lives
in `p0-p1-blocker-evidence-index-2026-05-08.md`.

## Standing production-health blockers

| Blocker | Lane | Repo-side closure | Outstanding (out-of-scope here) |
| --- | --- | --- | --- |
| Production Supabase project — auth confirmation + CAPTCHA configuration | External-approval-gated | `d3-signup-verification-policy-decision-2026-05-08.md`; `d3-signup-verification-repo-invariant-guard-2026-05-08.md`; `__tests__/unit/auth/signup-verification-policy-invariants.test.ts`; `config/signup-verification-launch-policy.json` (machine-guarded launch policy). Repo refuses to launch with confirmations off or CAPTCHA absent. | Production project settings change (email confirmation toggle, CAPTCHA provider/secret) and any non-production email sink for E2E. Not executable here without explicit Shan/ops approval. |
| Production Supabase project — durable rate limiter provider | External-approval-gated | `src/lib/middleware/rateLimiter.ts` (`RATE_LIMIT_STORAGE_PROVIDER` adapter seam; only `memory` executable; non-memory provider names fail closed); `__tests__/unit/lib/middleware/rate-limiter-check.test.ts`; `__tests__/unit/lib/middleware/rate-limiter-durable-provider-guard.test.ts`; `d2-durable-rate-limiter-approval-gate-guard-2026-05-08.md`; `p1-route-scoped-limiter-key-closure-2026-05-08.md`. | Provider choice (accept in-memory launch risk, Upstash, or Vercel KV/Redis-compatible), credential path, and provisioning. Owner/ops decision per `p1-decision-needed-register-2026-05-08.md` D2 row. |
| Production Supabase project — DB reset/lint/rollback/integration validation | Live-evidenced (environment-gated) | `__tests__/unit/database/migration-reset-readiness.test.ts` (every 2026 Phase 1 migration carries `-- DOWN:` notes and is reset-replay-safe; reset stays behind `scripts/dev-supabase-reset.js` + Docker wrapper, no remote `--db-url` reset path); `d6-db-static-reset-readiness-closure-2026-05-08.md`; `d22-migration-rollback-evidence-index-2026-05-08.md`. | Approval of one validation lane (local Supabase/Docker, safeguarded remote-test DB, or written deferral). Destructive `supabase db reset` must never touch production. |
| Production Supabase project — service-role authority integration | Live-evidenced (environment-gated) | `d1-service-role-rbac-authority-implementation-packet-2026-05-08.md`; `supabase/migrations/20260508024000_create_admin_role_assignments.sql` (authority table + RLS, no authenticated write path, DOWN companion); `src/lib/supabase/server.ts` `checkServiceRoleAuthorization()` reads `admin_role_assignments`; `src/types/app-database.ts`. | Live DB integration of the authority table is gated under D6; no further authority-model decision is open for this revival gate. |
| Maps deploy dependency — paid Google Maps API quota exposure | External-approval-gated | `phase0-synthesis.md` lines 44-45 (financial-abuse impact note); `middleware-api-audit.md` line 101 (Maps endpoints unauthenticated, parent-task gate); `p0-site-traversal-acceptance-matrix-2026-05-08.md` lines 41-45 and 102-131 (paid/external skip rules); `zillow-provider-production-grade-evaluation-2026-05-08.md` (parallel paid-provider readiness frame). | Production Google Maps key provisioning, quota/budget approval, and decision on whether the Maps API routes ship behind user auth or stay rate-limit-only at launch. Dashboard work is out of scope; positive Maps execution remains skip-listed in the acceptance matrix. |
| Public no-credential traversal artifact | Repo-side actionable | `p0-no-auth-traversal-smoke-guard-2026-05-08.md` + `__tests__/unit/routing/no-auth-traversal-smoke-guard.test.ts` (5/5 static guard); `p0-no-auth-api-protected-redirect-probe-harness-2026-05-08.md` + `scripts/run-no-auth-live-probes.js` + `__tests__/integration/routing/no-auth-live-probe.spec.ts` + `pnpm test:no-auth-live-probes` (default-safe, refuses non-local base URLs); `p0-p1-strict-anonymous-live-probe-rerun-2026-05-08.md`. | Bounded local execution slice (no auth, no external dashboards, no paid APIs, no real form submission) per `p0-p1-remaining-blocker-taxonomy-2026-05-08.md` section A row 1. |
| Authenticated traversal + E2E auth lifecycle + API auth smoke live execution | Live-evidenced (environment-gated) | `remote-supabase-test-seed-and-auth-probe-2026-05-08.md` (four core protected pages traversed against local app on a non-production seed); `p0-p1-strict-anonymous-protected-route-closure-2026-05-08.md`; `__tests__/integration/api/auth-smoke-matrix.spec.ts` (handler-level matrix, refuses non-local targets unless `ALLOW_REMOTE_API_AUTH_SMOKE=1`); `p0-p1-api-auth-smoke-matrix-2026-05-08.md`. | Approval of a single safe authenticated traversal lane (local Supabase/Docker seeded users, remote-Supabase disposable seed reuse, or test-only browser session cookies) plus token source for the live API auth smoke. Not executable here. |

## Validation gates without secrets

The following repo-side gates are already in force and run without secrets,
dashboards, or paid-API calls. They remain the load-bearing safeguards that
keep production-health drift from landing while the external decisions are
pending.

- Production Supabase target detection: `scripts/guard-supabase-env.js`
  blocks `pnpm dev` when `.env.local` is pointed at the production
  Supabase host; non-secret host metadata lives in
  `config/supabase-production-hosts.json` per `p0-p1-env-prod-local-dev-closure-2026-05-08.md`.
- Signup launch invariants: `__tests__/unit/auth/signup-verification-policy-invariants.test.ts`
  refuses to compile a launch with email confirmation disabled or CAPTCHA
  absent; backed by `config/signup-verification-launch-policy.json`.
- Durable rate-limiter approval gate:
  `__tests__/unit/lib/middleware/rate-limiter-durable-provider-guard.test.ts`
  enumerates Upstash/Vercel KV/Redis/Postgres/Cloudflare KV/Edge Config
  provider names + SDK packages and fails closed until a provider is
  approved.
- DB reset readiness: `__tests__/unit/database/migration-reset-readiness.test.ts`
  guards every 2026 Phase 1 migration for `-- DOWN:` notes and reset-replay
  safety; package scripts keep reset behind a Docker wrapper with no remote
  `--db-url` exposure.
- Service-role authority static guards: 11 targeted Jest assertions
  (5 authorization scenarios + 4 migration static assertions + 2 route
  capability whitelist) per `phase0-phase1-closure-matrix.md` lines 39 and 53.
- Public no-credential static traversal guard:
  `__tests__/unit/routing/no-auth-traversal-smoke-guard.test.ts`
  (5/5 Jest pass).
- Local no-auth live probe wrapper: `pnpm test:no-auth-live-probes` is
  default-safe (Vitest 45/45 skipped) and refuses non-local base URLs per
  `p0-no-auth-api-protected-redirect-probe-harness-2026-05-08.md`.
- Paid/external skip rules: `p0-site-traversal-acceptance-matrix-2026-05-08.md`
  lines 41-45 and 102-131 keep Maps/Zillow/RapidAPI/OpenRouter/email/notification
  surfaces skip-listed; `p0-p1-api-auth-smoke-matrix-2026-05-08.md` lines 22-35
  enumerates the API auth smoke skip set.
- Internal/demo surface gating: `requireInternalPreviewAccess()` /
  `HOMEMATCH_ENABLE_INTERNAL_PREVIEW=true`, default 404 in production
  (commit `3e5f510`), with route-policy Jest guards passing.
- CSP and external-origin policy inventory:
  `p0-p1-csp-and-external-origin-policy-inventory-2026-05-08.md`.
- Cookie/session helper index:
  `d79-cookie-session-security-index-2026-05-08.md`.

## What this log does NOT do

- Does not advance Phase 0/1 closure. Each row is still gated where the
  canonical artifacts say it is gated.
- Does not authorize spending money, calling paid/external APIs, mutating
  any Supabase project, or executing dashboard/secret/config changes.
- Does not replace `phase0-phase1-closure-matrix.md`,
  `p0-p1-blocker-evidence-index-2026-05-08.md`,
  `p0-p1-blocker-reconciliation-2026-05-08.md`,
  `p0-p1-remaining-blocker-taxonomy-2026-05-08.md`, or
  `p1-decision-needed-register-2026-05-08.md`. Those remain canonical.
- Does not list provider names, hostnames, project IDs, secret paths, or
  account identifiers. Those belong outside the repo per the operating
  plan.

## Source artifacts (canonical)

- `reports/home-match-revival/phase0-phase1-strict-closure-gate.md`
- `reports/home-match-revival/phase0-phase1-closure-matrix.md`
- `reports/home-match-revival/p0-p1-blocker-evidence-index-2026-05-08.md`
- `reports/home-match-revival/p0-p1-blocker-reconciliation-2026-05-08.md`
- `reports/home-match-revival/p0-p1-remaining-blocker-taxonomy-2026-05-08.md`
- `reports/home-match-revival/p1-decision-needed-register-2026-05-08.md`
- `reports/home-match-revival/p0-site-traversal-acceptance-matrix-2026-05-08.md`
- `reports/home-match-revival/p0-p1-api-auth-smoke-matrix-2026-05-08.md`
- `reports/home-match-revival/p0-p1-csp-and-external-origin-policy-inventory-2026-05-08.md`
- `reports/home-match-revival/p0-p1-env-prod-local-dev-closure-2026-05-08.md`
- `reports/home-match-revival/d1-service-role-rbac-authority-implementation-packet-2026-05-08.md`
- `reports/home-match-revival/d2-durable-rate-limiter-approval-gate-guard-2026-05-08.md`
- `reports/home-match-revival/d3-signup-verification-policy-decision-2026-05-08.md`
- `reports/home-match-revival/d3-signup-verification-repo-invariant-guard-2026-05-08.md`
- `reports/home-match-revival/d6-db-static-reset-readiness-closure-2026-05-08.md`
- `reports/home-match-revival/d22-migration-rollback-evidence-index-2026-05-08.md`
- `reports/home-match-revival/d79-cookie-session-security-index-2026-05-08.md`
- `reports/home-match-revival/p0-no-auth-traversal-smoke-guard-2026-05-08.md`
- `reports/home-match-revival/p0-no-auth-api-protected-redirect-probe-harness-2026-05-08.md`
- `reports/home-match-revival/p1-route-scoped-limiter-key-closure-2026-05-08.md`
- `reports/home-match-revival/zillow-provider-production-grade-evaluation-2026-05-08.md`
- `reports/home-match-revival/security-evidence-index-2026-05-08.md`
- `reports/home-match-revival/middleware-api-audit.md`
- `reports/home-match-revival/phase0-synthesis.md`
- `config/signup-verification-launch-policy.json`
- `config/supabase-production-hosts.json`
