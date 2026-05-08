# P0/P1 Blocker Reconciliation — 2026-05-08

Scope: strict Phase 0/1 closure only. No deploys, paid APIs, browser swarms, broad installs, external dashboards, production data, or secrets were used. Workspace verified as `/home/shan/projects/homematch-v2` on branch `autonomy/6h-business-hardening`.

## Verdict

Phase 2+ remains held. The remaining Phase 0/1 blockers are now mostly approval-needed or environment-needed, not broad repo-code ambiguity. The safe next work should be one tiny, repo-local slice at a time; do not force implementation where the blocker is a Shan/product/security/ops decision or an execution environment prerequisite.

## Approval-needed blockers

| Blocker                                                       | Classification                  | Evidence                                                                                                                                                                                                 | Safe next step                                                                                                                                        |
| ------------------------------------------------------------- | ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Authenticated browser traversal and protected API live probes | approval-needed                 | `phase0-live-probe-auth-cron-env-closure-2026-05-08.md` lines 41-43 and `p0-p1-api-auth-smoke-matrix-2026-05-08.md` lines 47-74 require an approved test account/session or bearer token.                | Shan/ops provides approved local/non-production session/token, or explicitly approves a remote-test target.                                           |
| D1 service-role RBAC authority                                | approval-needed                 | `p1-decision-needed-register-2026-05-08.md` D1; `phase1-remediation-closure-scout.md` A3.                                                                                                                | Choose custom claims, dedicated admin table, or explicitly accepted `user_profiles.role` authority before code changes.                               |
| D2 durable production rate limiter                            | approval-needed                 | Register D2; M5/M10 repo coverage is closed, but storage remains in-process memory.                                                                                                                      | Choose accept-in-memory, Upstash Redis, or Vercel KV/Redis before implementation.                                                                     |
| D3 production email confirmation/CAPTCHA execution            | approval-needed, policy-decided | `d3-signup-verification-policy-decision-2026-05-08.md` chooses production email confirmation + Turnstile/hCaptcha policy, but dashboard/config/secrets execution remains external/approved-channel work. | Implement only in a scoped config/runbook task with approved Supabase/CAPTCHA credentials; keep local/E2E bypass test-only.                           |
| D5 numeric constraint semantics                               | approval-needed                 | Register D5 and `phase1-remediation-closure-scout.md` DB P0.5: bedroom/bathroom zero semantics conflict with original 1-50 audit target.                                                                 | Product/data owner chooses zero-allowed, 1-50, or nullable/unknown semantics.                                                                         |
| D7 disputed-route email/profile exposure                      | repo-side closed                | `d7-disputed-route-exposure-closure-2026-05-08.md`: disputed route no longer selects/returns partner email and current consumers only need display name/interaction data.                                | Reopen only if product/security later requires partner email in the disputed-properties UX; then constrain it explicitly through route DTO/RPC tests. |
| External dashboards/accounts/secrets                          | approval-needed                 | Operating plan lines 18-19 and 210-216 forbid unapproved dashboard/account changes, paid APIs, deploys, production writes, and secrets.                                                                  | Keep all such work as approval-gated tasks.                                                                                                           |

## Environment-needed blockers

| Blocker                                      | Classification     | Evidence                                                                                                                                                     | Safe next step                                                                                    |
| -------------------------------------------- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------- |
| D6 DB reset/lint/integration validation      | environment-needed | Register D6; closure matrix lines 18-19 and 25-27; many DB migrations are statically covered but not reset/lint rehearsed.                                   | Provide local Supabase/Docker, or approve a safeguarded non-production remote DB validation path. |
| E2E auth lifecycle / signup verification     | environment-needed | `p0-p1-credentialless-auth-lifecycle-verification-plan-2026-05-08.md` and D3 decision require local email capture / seeded users, not real production email. | Run only after local Supabase/email sink or approved non-production auth environment exists.      |
| Closure-grade API auth smoke matrix          | environment-needed | `p0-p1-api-auth-smoke-matrix-2026-05-08.md` static shape passes, but live run needs local server and `API_AUTH_SMOKE_TOKEN`.                                 | Start local app and use approved local/non-production bearer token; do not target production.     |
| DB migration validation against current rows | environment-needed | DB P0.3/P0.4/P0.5/P1.x notes repeatedly require reset/lint/real-row validation before deploy.                                                                | Bundle with D6 once the validation environment exists.                                            |

## Stale or replaced blockers

| Prior blocker                                    | Current classification                       | Evidence                                                                                                                                                  |
| ------------------------------------------------ | -------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/api/maps/metro-boundaries` no-credential 500   | stale/replaced, closed by later slice        | Closure matrix line 14 records the follow-up P0 metro-boundaries fix and passing targeted Jest/type-check evidence.                                       |
| M6 429 error-standardization static failure      | stale/replaced, closed by M10 reconciliation | Closure matrix line 16 records the stale guard reclassification and updated delegated-path regression passing 30/30.                                      |
| D4 `.env.prod` local-dev guard precision         | stale/replaced, closed repo-side             | Register D4 now accepts untracked `.env.prod` plus non-secret `config/supabase-production-hosts.json`; closure matrix line 20 records guard/doc evidence. |
| Duplicate Supabase factory consolidation         | stale/replaced, closed repo-side             | `p1-duplicate-supabase-factory-closure-2026-05-08.md` removed duplicate runtime factory and added a static guard.                                         |
| Dependency cleanup as a Phase 0/1 launch blocker | stale/replaced, decision closed              | `p1-dependency-cleanup-decision-2026-05-08.md` keeps launch-path deps and defers package pruning to a separate package-manager verification slice.        |
| `pg_trgm` property text-search index             | stale/replaced, not launch-path required     | `p1-pg-trgm-text-search-decision-2026-05-08.md` found no production launch-path caller for property free-text search.                                     |
| README/Docker optional ambiguity                 | stale/replaced, closed repo-side             | Closure matrix lines 11 and 20 record fast-dev/Docker optional guidance and env/local-dev docs.                                                           |

## Safe repo-local next slices

These are safe only if each remains tiny and resource-limited:

1. Update stale register/matrix language to point at newer decision artifacts where evidence exists. This report performs that docs/report-only reconciliation for D3 and links the report into the matrix.
2. Draft implementation acceptance criteria for D5 after Shan/product/security chooses an option. D7 is closed for the current no-email UX contract.
3. Add static-only guards for already-decided policy after implementation is scoped, especially D3 production-email/CAPTCHA config invariants. Do not touch dashboards or secrets.
4. Run closure-grade API/browser/auth probes only after the approved local/non-production environment and credentials exist.
5. Run DB reset/lint/rollback/integration only after D6 environment approval exists.

## Kanban context read

The current Kanban task context lists recent closed backend slices: metro-boundaries no-credential fix, route-deadline helper, anonymous public-page fast path, dependency cleanup decision, and pg_trgm launch-path decision. Those recent handoffs explain why several blockers in older scout artifacts are now stale/replaced rather than still-open repo-code work. Direct blocked-card enumeration was not available through this worker context, so this reconciliation uses the task handoff plus the repo's blocker/register artifacts as durable evidence.

## Matrix/register update made in this slice

- D3 is no longer an undecided policy question. It is now policy-decided by `d3-signup-verification-policy-decision-2026-05-08.md` and remains blocked only for approved external/config implementation and local/E2E environment setup.
- The closure matrix source-artifact list now includes this reconciliation report and the D3 decision artifact.

No code, dependencies, lockfiles, production config, dashboards, secrets, browser swarms, Docker, or paid/external APIs were touched.
