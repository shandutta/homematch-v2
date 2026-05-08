# P0/P1 Blocker Reconciliation — 2026-05-08

Updated: 2026-05-08T12:07:33Z
Scope: strict Phase 0/1 closure only. No deploys, paid APIs, browser swarms, broad installs, external dashboards, production data, or secrets were used. Workspace verified as `/home/shan/projects/homematch-v2` on branch `autonomy/6h-business-hardening`.

## Verdict

Phase 2+ remains held. After the completed inventory, traversal, accessibility, performance-metrics, rate-limit, D3, D5, and D7 slices, the remaining Phase 0/1 blockers are now classified as either owner/external-environment blocked or small repo-local closure candidates. None of the remaining evidence justifies advancing to Phase 2 without Shan explicitly approving a written gate exception.

## Current blocker classification

| Blocker | Current classification | Evidence | Closure condition / safe next step |
| --- | --- | --- | --- |
| Authenticated browser traversal for protected pages | Owner/external-env blocked | `p0-site-traversal-acceptance-matrix-2026-05-08.md` lines 72-91 and 133-153 require an approved non-production auth/session plus seeded fixture data. `accessibility-core-flow-matrix.md` lines 36-44 keeps protected positive accessibility traversal gated the same way. | Shan/ops approves a local Supabase/test DB, disposable non-production account/session, or temporary test-only browser session. Do not use production users or real invite tokens. |
| Closure-grade API auth smoke live execution | Owner/external-env blocked | `phase0-phase1-closure-matrix.md` lines 18-19 and `p0-p1-api-auth-smoke-matrix-2026-05-08.md` record that static matrix/skips exist but live execution needs an approved token and local/non-production target. | Start a safe local/non-production app target and provide `API_AUTH_SMOKE_TOKEN` or equivalent approved bearer/session. |
| D6 DB reset/lint/rollback/integration validation | Owner/external-env blocked | `p1-decision-needed-register-2026-05-08.md` D6; closure matrix lines 18-19 and 28-39. Multiple DB fixes are repo-side/static covered but not reset/lint/integration rehearsed. | Provide local Supabase/Docker or approve a safeguarded remote-test DB validation path. |
| D1 service-role RBAC authority | Owner/security/product decision blocked | `p1-decision-needed-register-2026-05-08.md` D1 keeps `user_profiles.role === 'admin'` as placeholder-grade authority for service-role access. | Choose custom claims, a dedicated admin/roles table, or explicitly accept/administer `user_profiles.role` as the authority before implementing further RBAC changes. |
| D2 durable production rate limiter | Owner/ops decision blocked; repo-local seam closed | `p1-decision-needed-register-2026-05-08.md` D2 and closure matrix line 28: `src/lib/middleware/rateLimiter.ts` now exposes `RATE_LIMIT_STORAGE_PROVIDER`, keeps `memory` as the only executable provider, and rejects non-memory providers with an approval-required adapter error. | Choose accept-in-memory, Upstash Redis, or Vercel KV/Redis-compatible storage and provision credentials/config through approved ops. No further no-secret repo code is required before that choice unless a provider adapter is explicitly selected. |
| D3 production email confirmation/CAPTCHA execution | Owner/external-config blocked; repo-local invariants closed | `d3-signup-verification-policy-decision-2026-05-08.md` decides production should require email confirmation plus CAPTCHA. `d3-signup-verification-repo-invariant-guard-2026-05-08.md` and closure matrix line 28 preserve local-only Supabase config evidence and static production invariant guards. | Implement Supabase/CAPTCHA dashboard/secrets/runbook work only with approved credentials and environment. Local/E2E signup verification still needs an approved non-production auth/email sink. |
| Product/demo/debug route exposure before revival | Owner/product decision blocked | Inventory lines 34, 86-98 and traversal lines 57, 63, 84, 92, 186 flag `/demo/ads`, `/sponsor-mockups`, `/dashboard/vibes-test`, and `/validation` as keep/hide/delete decisions. | Product decides keep, gate, restrict, or delete. Repo-local implementation can follow once the decision is made. |
| External paid-provider surfaces and dashboards | Owner/external-env blocked | Inventory lines 25-27, 41-45, 58-59, 66 and traversal lines 41-45, 108-112, 127-131 flag Google Maps, Zillow/RapidAPI, OpenRouter, cron/admin, and dashboard/secrets work as approval-gated. | Use mocks for repo tests; do not call paid APIs or touch dashboards/accounts/secrets without explicit approval. |

## Closed or stale blockers after recent slices

| Prior blocker | Current classification | Evidence / note |
| --- | --- | --- |
| `/api/maps/metro-boundaries` no-credential failure | Repo-side closed | Closure matrix line 14 records the public anon API client path and passing targeted Jest/type-check evidence. |
| M6 429 error-standardization static failure | Stale/replaced, repo-side closed | Closure matrix line 16 records the M10 delegated-path guard update and 30/30 targeted Jest pass. |
| D4 `.env.prod` local-dev guard precision | Repo-side closed | Register D4 and closure matrix lines 20, 37 accept untracked `.env.prod` plus non-secret `config/supabase-production-hosts.json` host precision. |
| D5 numeric constraint semantics | Repo-side closed for current contract | `d5-numeric-constraint-semantics-closure-2026-05-08.md` and register D5: zero bedrooms intentionally covers studios/lofts; zero bathrooms remains the current unknown/missing external-ingestion sentinel. Reopen only for a product/data-model change. |
| D7 disputed-route email/profile exposure | Repo-side closed for current UX | `d7-disputed-route-exposure-closure-2026-05-08.md` and register D7: `/api/couples/disputed` no longer selects or returns partner email, and returns only partner id/display name plus interaction metadata needed by current UX. |
| Public `/api/performance/metrics` ingest abuse controls | Repo-side closed for current slice | `p1-performance-metrics-public-ingest-size-closure-2026-05-08.md` and inventory line 61 record the 64 KiB pre-parse payload guard, bounded metrics/customMetrics/string schema, and targeted unit evidence. Durable observability/storage remains a separate production decision if needed. |
| Duplicate Supabase factory, anonymous public-page middleware fast path, route-scoped limiter keys, route-deadline helper, dependency cleanup decision, pg_trgm launch-path decision | Repo-side closed or not launch-path required | Source artifacts are listed in `phase0-phase1-closure-matrix.md` lines 55-73 and the current matrix rollup. |

## Repo-local closure candidates that remain no-secret/no-dashboard

These are candidates only; each should be handled as a tiny bounded task with resource limits and no external services. They do not unblock Phase 2 by themselves unless their acceptance evidence is added back to the Phase 0/1 matrix.

1. Add or extend static/RTL no-credential public route accessibility smoke for landing/auth/legal/support pages listed in `accessibility-core-flow-matrix.md` lines 30-35 and backlog lines 58-61. Keep it local-only; do not submit real auth/email/contact flows.
2. Add a cookie preferences focus/escape/return-focus guard from `accessibility-core-flow-matrix.md` line 61. This is repo-local and does not need credentials.
3. Add a missing-code/error-path route-handler test for `/auth/callback`, as called out in traversal lines 67 and 113. Keep it code/local only; do not attempt a positive OAuth/code exchange.
4. Add cron/admin denial tests with fake/missing secrets for the admin routes listed in traversal lines 127-131. Mock all Supabase/OpenRouter/Zillow/Google side effects and do not use real secrets.
5. Add a protected-route anonymous redirect matrix if it can run against a safe local app with no production data and without becoming a browser swarm. Positive authenticated traversal remains blocked on approved test auth/session.

No new repo-local candidate should touch production config, external dashboards, paid providers, real accounts, real invite tokens, or secrets.

## Phase 2 hold

Phase 0 is not 100% closed because authenticated traversal/API smoke execution and environment-backed validation remain blocked. Phase 1 is not 100% closed because D1, D2, D3 external/config execution, and D6 remain unresolved outside repo-only authority. Phase 2/3/4/5/6 remain held until the owner/external-env blockers above are resolved or Shan explicitly approves a written gate exception.

## Artifact update made in this slice

This report was updated after reading:

- `reports/home-match-revival/phase0-phase1-closure-matrix.md`
- `reports/home-match-revival/p0-full-route-api-endpoint-inventory-matrix-2026-05-08.md`
- `reports/home-match-revival/p0-site-traversal-acceptance-matrix-2026-05-08.md`
- `reports/home-match-revival/accessibility-core-flow-matrix.md`
- `reports/home-match-revival/p1-decision-needed-register-2026-05-08.md`

No code, dependencies, lockfiles, production config, dashboards, secrets, browser swarms, Docker, or paid/external APIs were touched.
