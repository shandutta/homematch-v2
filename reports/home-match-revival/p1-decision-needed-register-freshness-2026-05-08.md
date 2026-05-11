# P1 Decision-Needed Register — Freshness Report

Generated: 2026-05-08T17:42Z
Scope: strict Phase 0/1. Maps each owner decision (D1–D7) to its current status, latest in-repo proof artifact, and the exact external approval still needed before Phase 0/1 can honestly be called 100% closed. Phase 0/1 is not closed by this report.

## How to read this

- **Current status** = closure posture as of the timestamp above. "Closed repo-side" means the repo has invariants, migrations, code, and/or tests that hold the decided position; it does not mean live/production validation has run.
- **Latest proof artifact** = the newest in-repo evidence that demonstrates the current status. Commit hashes refer to the `autonomy/hm-decision-register-freshness-1742` worker branch unless otherwise noted.
- **External approval still needed** = the specific, externally owned action that must happen before the decision can move from "repo-side closed" to "Phase 0/1 closed". Items already closed for Phase 0/1 explicitly say so.

## Decision freshness matrix

### D1 — Service-role RBAC authority

- **Current status**: closed repo-side. `checkServiceRoleAuthorization()` in `src/lib/supabase/server.ts` queries `public.admin_role_assignments` (not `user_profiles.role`); `ApprovedServiceRoleCapability` enumerates the narrow user-facing helper paths (`users-search`, `household-disputes`, `invite-acceptance`, `invite-preview`); migration `supabase/migrations/20260508024000_create_admin_role_assignments.sql` creates the authority table with RLS enabled and no authenticated self-promotion write path; 11/11 targeted Jest guards pass (5 authorization scenarios, 4 migration static checks, 2 route capability whitelist assertions).
- **Latest proof artifact**: `reports/home-match-revival/d1-service-role-rbac-authority-implementation-packet-2026-05-08.md` (worker commit `e7af71e`).
- **External approval still needed**: none for repo-side D1 itself. Live validation of the `admin_role_assignments` migration + RLS at runtime remains **D6-gated** — it requires the same approved DB reset/integration lane that D6 is waiting on.

### D2 — Durable production rate limiter

- **Current status**: repo-local adapter seam closed. `src/lib/middleware/rateLimiter.ts` exposes a non-secret `RATE_LIMIT_STORAGE_PROVIDER` selector; only `memory` is executable, and any non-memory provider name fails closed with an explicit approval-required adapter error. `__tests__/unit/lib/middleware/rate-limiter-check.test.ts` preserves in-memory behavior, and `__tests__/unit/lib/middleware/rate-limiter-durable-provider-guard.test.ts` enumerates common durable provider names and SDK packages (Upstash, Vercel KV, Redis, Postgres/Supabase, Cloudflare KV, Edge Config) to prove the repo does not select or provision any external store.
- **Latest proof artifact**: `reports/home-match-revival/d2-durable-rate-limiter-approval-gate-guard-2026-05-08.md` (worker commit `5c428b9`).
- **External approval still needed**: owner/ops decision to either (A) accept the in-memory limiter as dev/best-effort only and document production risk, (B) approve and provision Upstash Redis, or (C) approve and provision Vercel KV / Redis-compatible store. Provisioning of the chosen provider (project, secrets, network) is owned outside the repo.

### D3 — Production email confirmation / signup CAPTCHA

- **Current status**: closed repo-side as a launch-policy guard. `config/signup-verification-launch-policy.json` machine-encodes the production policy: email confirmation required, CAPTCHA required, Turnstile preferred, no pre-verification app session. `__tests__/unit/auth/signup-verification-policy-invariants.test.ts` blocks regressions and treats `supabase/config.toml` as local-only evidence; production must not launch with confirmations disabled or CAPTCHA absent. Local/E2E bypass is explicit and local-sink-only with no external CAPTCHA calls.
- **Latest proof artifact**: `reports/home-match-revival/d3-signup-verification-repo-invariant-guard-2026-05-08.md` (worker commit `a24760d`); decision memo at `reports/home-match-revival/d3-signup-verification-policy-decision-2026-05-08.md`; machine policy at `config/signup-verification-launch-policy.json`.
- **External approval still needed**: ops/security to (1) enable email confirmation in the production Supabase project settings, (2) provision the Turnstile (or chosen) CAPTCHA site/secret and apply it to production Supabase auth, and (3) confirm those settings against the launch-policy JSON before launch. Dashboard/secrets work is explicitly out of repo-only scope.

### D4 — `.env.prod` handling model

- **Current status**: closed repo-side for Phase 0/1. `.env.prod` stays untracked / secret-managed; `config/supabase-production-hosts.json` carries production hostnames as **non-secret** guard metadata only; `scripts/guard-supabase-env.js` honors `SKIP_SUPABASE_GUARD=true` from `.env.local` and emits offender categories without env values; README/setup/workflow docs forbid tracked keys, passwords, and database URLs.
- **Latest proof artifact**: `reports/home-match-revival/p0-p1-env-prod-local-dev-closure-2026-05-08.md` (plus `config/supabase-production-hosts.json`).
- **External approval still needed**: **none for Phase 0/1.** Production secret rotation/storage continues through normal ops/security channels. Reopen only if ops/security later requires an exact production env baseline comparison instead of host-based non-secret guard metadata.

### D5 — Numeric constraint semantics (bedrooms/bathrooms)

- **Current status**: closed repo-side. Zero bedrooms intentionally represents studio/loft listings; zero bathrooms remains the current unknown/missing-value sentinel for external ingestion and defensive fallbacks. DB/schema/API static guards preserve non-negative semantics.
- **Latest proof artifact**: `reports/home-match-revival/d5-numeric-constraint-semantics-closure-2026-05-08.md`.
- **External approval still needed**: **none for Phase 0/1.** Reopen only if product/data-modeling later replaces the zero-bathroom sentinel with explicit nullable/unknown semantics or requires a strictly positive constraint.

### D6 — DB reset / lint / integration environment

- **Current status**: static reset-readiness guards closed; live execution still environment-blocked. `__tests__/unit/database/migration-reset-readiness.test.ts` enforces `-- DOWN:` notes and blocks reset-replay-unsafe statements across all 2026 Phase 1 DB remediation migrations (caught and forced repair of the missing rollback notes in `supabase/migrations/20260507225000_add_schema_safety_constraints.sql`); package scripts keep DB reset behind the local `scripts/dev-supabase-reset.js` + Docker wrapper with no remote `--db-url` reset exposure. Targeted resource-limited Jest passed 20/20.
- **Latest proof artifact**: `reports/home-match-revival/d6-db-static-reset-readiness-closure-2026-05-08.md` (worker commit `1a55e73`).
- **External approval still needed**: approve a safe validation lane so `supabase db reset`, DB lint, rollback rehearsal, and integration tests can actually execute — either (A) provision local Supabase / Docker on the worker host, (B) approve a safeguarded remote-test path (disposable project + scoped service role), or (C) explicitly accept a deploy exception that defers DB reset/lint with documented risk. Until one of A/B/C lands, D1 live RBAC validation, D5 DB constraint validation, and Phase 0 integration-test closure stay blocked.

### D7 — Disputed-route email/profile field exposure

- **Current status**: closed repo-side. `/api/couples/disputed` selects only `id, display_name` for household members and returns no `user_email`; current UI consumers do not require partner email.
- **Latest proof artifact**: `reports/home-match-revival/d7-disputed-route-exposure-closure-2026-05-08.md`.
- **External approval still needed**: **none for the current UX contract.** Reopen only if product/security later requires partner email in the disputed-property UX; in that case, document and constrain the purpose through a scoped route DTO or RPC.

## Cross-cutting external approvals (consolidated)

These are the only externally owned actions still required to move Phase 0/1 from "repo-side closed" to "Phase 0/1 closed":

1. **D6 validation lane** — approve local Supabase/Docker, a safeguarded remote-test path, or an explicit deferred-validation exception. Unblocks D1 live RBAC validation and Phase 0 integration-test closure as a side effect.
2. **D2 durable provider** — choose A (accept in-memory + document risk), B (Upstash Redis), or C (Vercel KV / Redis-compatible) and provision the chosen option's secrets/network outside the repo.
3. **D3 production auth settings** — apply email confirmation + Turnstile (or chosen) CAPTCHA in the production Supabase project, verified against `config/signup-verification-launch-policy.json` before launch.

D4, D5, and D7 require no further external approval for Phase 0/1 closure under their current contracts.

## Gate position (unchanged)

Phase 2+ remains held. This report does not advance the matrix; it is a freshness snapshot to make the remaining external asks unambiguous. The Phase 0/1 closure matrix should continue to read: Phase 2+ is held until the three cross-cutting approvals above are resolved or Shan explicitly approves a written gate exception.

## Source artifacts

- `reports/home-match-revival/p1-decision-needed-register-2026-05-08.md`
- `reports/home-match-revival/phase0-phase1-closure-matrix.md`
- `reports/home-match-revival/d1-service-role-rbac-authority-implementation-packet-2026-05-08.md`
- `reports/home-match-revival/d2-durable-rate-limiter-approval-gate-guard-2026-05-08.md`
- `reports/home-match-revival/d3-signup-verification-policy-decision-2026-05-08.md`
- `reports/home-match-revival/d3-signup-verification-repo-invariant-guard-2026-05-08.md`
- `reports/home-match-revival/d5-numeric-constraint-semantics-closure-2026-05-08.md`
- `reports/home-match-revival/d6-db-static-reset-readiness-closure-2026-05-08.md`
- `reports/home-match-revival/d7-disputed-route-exposure-closure-2026-05-08.md`
- `reports/home-match-revival/p0-p1-env-prod-local-dev-closure-2026-05-08.md`
- `config/signup-verification-launch-policy.json`
