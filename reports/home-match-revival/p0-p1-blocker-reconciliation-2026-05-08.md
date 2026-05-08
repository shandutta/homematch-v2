# P0/P1 Blocker Decision Packet — 2026-05-08

Updated: 2026-05-08T12:22:21Z
Scope: strict Phase 0/1 closure only. This packet reconciles `phase0-phase1-closure-matrix.md` with the expanded OG business-readiness backlog and names only the remaining Phase 0/1 blockers. No app code, deploys, paid APIs, production dashboards, browser swarms, broad installs, secrets, real users, or production/customer data were used.

## Gate verdict

Phase 2+ remains held. The expanded OG backlog adds Phase 2+ readiness work, but it does not create a safe basis to skip the current Phase 0/1 blockers. Phase 0/1 can advance only after the blockers below are closed, or after Shan explicitly approves a written gate exception.

Classification key:

- `repo-closed`: repo-side work/evidence is sufficient for the current Phase 0/1 contract.
- `repo-actionable`: a bounded no-secret/no-dashboard repo task can still add closure evidence.
- `approval-gated`: Shan/product/security/ops must choose or approve the policy/provider/config path before implementation.
- `environment-blocked`: execution requires approved local/non-production infrastructure, seeded fixtures, tokens, sessions, Docker/Supabase, or equivalent safe test environment.

## Remaining Phase 0/1 blockers

| Blocker | Classification | Reconciled evidence | Exact safe next Kanban child task | Explicit Shan approval needed |
| --- | --- | --- | --- | --- |
| Authenticated browser/API execution for protected pages and user APIs | `environment-blocked` for positive authenticated execution; small `repo-actionable` no-credential redirect coverage remains possible | `phase0-phase1-closure-matrix.md` lines 15, 18-19, 25, and 28 keep authenticated browser/API probes blocked on approved test credentials/session. `p0-site-traversal-acceptance-matrix-2026-05-08.md` lines 72-91 and 133-153 define the protected route/API acceptance set. `accessibility-core-flow-matrix.md` lines 36-44 keeps protected positive accessibility traversal gated. | `P0/P1 protected no-credential redirect matrix`: add/run a bounded local/static or handler-level matrix proving anonymous redirects/401s for protected pages/APIs, with no login and no production data. Separately, after approval: `P0/P1 approved authenticated traversal execution`: run the matrix with seeded non-production fixtures and record route/API evidence. | Approve one safe auth fixture path: local Supabase/test DB with seeded users, disposable non-production account/session, or temporary test-only browser session cookie. Approve fixture data scope for household, profile, property, interactions, invite, and settings states. |
| E2E auth lifecycle: signup/login/verify/logout/session clearing and redirect return | `environment-blocked`; D3 policy is `repo-closed` but execution is not | `d3-signup-verification-policy-decision-2026-05-08.md` decides production email confirmation plus CAPTCHA and says local/E2E should use seeded confirmed users or local email capture. `p0-site-traversal-acceptance-matrix-2026-05-08.md` lines 146-152 defines login, redirectTo, logout, protected render, API 401/2xx, and mutation reset acceptance. | `P0/P1 local auth lifecycle E2E`: with local Supabase only, create seeded confirmed test users from `scripts/setup-test-users-admin.js` or equivalent, verify login -> dashboard, protected redirectTo, logout clears session, and no real email/CAPTCHA calls. Optional follow-on: `D3 local signup verification E2E` using local Inbucket/Mailpit only. | Approve local Supabase/Docker or equivalent non-production auth environment; approve use of seeded disposable users; approve local email sink for signup verification. Do not use production accounts, production sessions, real invite tokens, or real email/CAPTCHA services. |
| API auth smoke live token/server | `environment-blocked` | `p0-p1-api-auth-smoke-matrix-2026-05-08.md` has the checked-in matrix at `__tests__/integration/api/auth-smoke-matrix.spec.ts`; static/skipped execution passed, but closure-grade live execution requires a local/non-production server and `API_AUTH_SMOKE_TOKEN`. | `P0/P1 API auth smoke live execution`: start approved local app target on `http://127.0.0.1:3000`, provide only an approved local/non-production bearer token, then run `API_AUTH_SMOKE_RUN=1 API_AUTH_SMOKE_TOKEN='<approved token>' TEST_API_URL=http://127.0.0.1:3000 pnpm exec vitest run __tests__/integration/api/auth-smoke-matrix.spec.ts` and record results. | Approve the token source and target server. Remote test target requires explicit approval plus `ALLOW_REMOTE_API_AUTH_SMOKE=1`; never point this at production. |
| D1 service-role RBAC authority | `approval-gated`; current service-role bypass guard is `repo-closed` for the narrow client path, but authority model remains open | `p1-decision-needed-register-2026-05-08.md` D1 states `user_profiles.role === 'admin'` remains placeholder-grade authority. `auth-boundary-consolidation-2026-05-08.md` removed user-scoped service-role fallback and avoided guessing future RBAC. | `D1 RBAC authority implementation plan`: after Shan chooses the authority, write/implement the minimal repo changes and tests for custom claims, dedicated roles table, or accepted `user_profiles.role` administration. No service-role expansion before decision. | Choose one: Supabase custom claims; dedicated admin/roles table with RLS/migrations; or explicitly accept and administer `user_profiles.role` as source of truth for this revival gate. |
| D2 durable production rate-limiter provider | `approval-gated`; adapter seam is `repo-closed` | `p1-decision-needed-register-2026-05-08.md` D2 and `phase0-phase1-closure-matrix.md` line 28 state `RATE_LIMIT_STORAGE_PROVIDER` exists, only `memory` executes, and non-memory providers fail with approval-required adapter error. Route-scoped limiter keys are closed by `p1-route-scoped-limiter-key-closure-2026-05-08.md`. | `D2 durable rate-limiter provider adapter`: only after provider approval, add the selected Upstash/Vercel KV/Redis-compatible adapter behind env gates, tests, and docs. If Shan accepts in-memory for launch, write a risk-acceptance note instead of adding infra. | Choose and provision one: accept in-memory with documented multi-instance risk; Upstash Redis; Vercel KV/Redis-compatible storage. Approve any credentials/config path. |
| D3 production email confirmation/CAPTCHA config execution | `approval-gated`; policy and repo invariants are `repo-closed` | `d3-signup-verification-policy-decision-2026-05-08.md` decides production must require email confirmation and signup CAPTCHA, preferring Cloudflare Turnstile. `d3-signup-verification-repo-invariant-guard-2026-05-08.md` and `phase0-phase1-closure-matrix.md` line 28 preserve local-only Supabase config evidence and static guardrails. | `D3 production auth config runbook/execution`: with approval, configure Supabase email confirmations and CAPTCHA in the target environment, document dashboard settings/secrets, and add/record safe verification evidence. Separate local E2E must use local email sink and CAPTCHA bypass/test flag only. | Approve Supabase dashboard/config access, CAPTCHA provider, secret storage, and whether this worker may execute dashboard/config changes or only prepare a runbook. Approve non-production email sink for tests. |
| D6 DB reset/lint/rollback/integration validation environment | `environment-blocked` | `p1-decision-needed-register-2026-05-08.md` D6 and `phase0-phase1-closure-matrix.md` lines 18, 28, and 39 keep `supabase db reset`, DB lint, rollback rehearsal, and integration tests blocked on environment. Static DB/report slices are not a substitute for reset/lint/integration proof. | `D6 DB reset/lint/integration validation`: in approved local Supabase/Docker or safeguarded remote-test DB, run the reset/lint/rollback/integration command set, capture failures, and update the closure matrix. Keep real production DB/data out of scope. | Approve validation lane: local Supabase/Docker; safeguarded remote-test DB; or explicit written deferral/gate exception. Approve any destructive reset only against disposable local/test database. |

## OG backlog reconciliation

The expanded OG backlog remains Phase 2+ work unless it overlaps a Phase 0/1 blocker above.

- Observability launch floor, cost-control ledger, data-quality/trust contract, admin console, SEO/shareability, and growth loops are not safe substitutes for Phase 0/1 closure.
- The OG accessibility first slice is already materialized as `accessibility-core-flow-matrix.md`; public/no-credential accessibility follow-ups are repo-actionable, but protected positive accessibility remains tied to the authenticated traversal environment gate.
- Admin/demo/debug route decisions are product/Phase 2+ hardening unless Shan chooses to pull them into a separate pre-launch route-exposure gate; they are not one of the bounded remaining Phase 0/1 blockers in this packet.
- Paid-provider surfaces and dashboards remain approval-gated globally; this packet does not authorize external calls, quota changes, production dashboard work, or secret handling.

## Approval packet for Shan

To close Phase 0/1 without a written exception, Shan needs to answer these in order:

1. D6 environment: local Supabase/Docker, safeguarded remote-test DB, or explicit DB-validation deferral/gate exception?
2. Auth execution environment: local seeded users, disposable non-production account/session, or temporary test-only browser session cookie?
3. API auth smoke: approved local/non-production bearer token and target server?
4. D1 RBAC authority: custom claims, dedicated roles table, or accepted/administered `user_profiles.role`?
5. D2 rate limiter: accept in-memory risk, Upstash Redis, or Vercel KV/Redis-compatible store?
6. D3 production auth config: approve Supabase email confirmation plus CAPTCHA execution/runbook, including provider and secret/config path?

Until those approvals/environments exist, the safe Kanban work is limited to report updates, no-credential/static guards, and local mocked tests that do not touch production systems, secrets, external dashboards, paid APIs, real users, or real customer data.

## Source artifacts read for this update

- `reports/home-match-revival/phase0-phase1-closure-matrix.md`
- `reports/home-match-revival/og-business-readiness-backlog-2026-05-08.md`
- `reports/home-match-revival/p1-decision-needed-register-2026-05-08.md`
- `reports/home-match-revival/p0-site-traversal-acceptance-matrix-2026-05-08.md`
- `reports/home-match-revival/accessibility-core-flow-matrix.md`
- `reports/home-match-revival/p0-p1-api-auth-smoke-matrix-2026-05-08.md`
- `reports/home-match-revival/d3-signup-verification-policy-decision-2026-05-08.md`
- `reports/home-match-revival/auth-boundary-consolidation-2026-05-08.md`
- `reports/home-match-revival/p1-route-scoped-limiter-key-closure-2026-05-08.md`
