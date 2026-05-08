# P0/P1 Launch-Readiness Evidence Index — 2026-05-08

Generated: 2026-05-08T22:18Z (worktree `d46-launch-readiness-index`).
Scope: strict Phase 0/1 closure gate. This is a reviewer index that maps each
**current P0/P1 hardening category** to (a) the latest tests/static guards in
`__tests__/`, (b) the latest report under `reports/home-match-revival/`, and
(c) the latest commit on the integration branch that materializes that
category. It also pins which Phase 2+ product work remains held.

This index does **not** authorize Phase 2+ implementation, deploys, paid APIs,
production dashboards, real-user data access, browser swarms, secret handling,
or external mutations. It does not modify source code. It is a single-page
fan-in of the evidence trail; the canonical owners
(`phase0-phase1-closure-matrix.md`, `p0-p1-blocker-evidence-index-2026-05-08.md`,
`p0-p1-blocker-reconciliation-2026-05-08.md`,
`p0-p1-remaining-blocker-taxonomy-2026-05-08.md`,
`p1-decision-needed-register-2026-05-08.md`,
`test-suite-taxonomy-2026-05-08.md`) remain authoritative.

## Verdict (no change)

Phase 0 and Phase 1 are **not 100% closed**. Repo-side hardening is broad and
well-evidenced; closure-grade execution evidence (authenticated browser/API
traversal, full E2E auth lifecycle, durable rate limiter provisioning,
production Supabase auth config, `supabase db reset`/lint/integration
execution) is still owner- or environment-gated. Phase 2/3/4/5/6 stay held.

## Coverage legend

- **Status — repo-closed**: bounded no-secret/no-dashboard repo work is sufficient
  for the current Phase 0/1 contract. Live counterpart (if any) lives in another
  lane.
- **Status — repo-closed + live-evidenced (partial)**: repo-side closed and at
  least one approved live execution slice has produced artifacts; the full live
  matrix is still gated.
- **Status — repo-closed; live execution gated**: repo-side closed; closure-grade
  execution requires an approved local/non-production environment.
- **Status — approval-gated**: closure requires an explicit Shan/product/security/
  ops decision before any further implementation.

Tests are run via `systemd-run --user --scope -p MemoryMax=2G -p CPUQuota=200% pnpm exec jest <single path> --runInBand`
for Lane A guards (per `test-suite-taxonomy-2026-05-08.md`). Vitest integration,
Playwright E2E, performance, and remote/live probe lanes remain operator-gated.

## Hardening categories × evidence

| # | Category | Latest tests / static guards | Latest report | Latest commit | Status |
| - | --- | --- | --- | --- | --- |
| 1 | API auth boundary + service-role narrow helpers | `__tests__/unit/api/auth-boundary-consolidation.test.ts`; `__tests__/unit/app/service-role-route-capability-guard.test.ts` | `auth-boundary-consolidation-2026-05-08.md` | `1ef1bae` (`fix: standardize api auth boundary`); follow-ons `8860611`, `0949084`, `b71c3f6` | repo-closed |
| 2 | Service-role RBAC authority (D1) | `__tests__/unit/auth/d1-rbac-authority-packet.test.ts`; `__tests__/unit/database/admin-role-assignments-migration.test.ts`; `__tests__/unit/app/service-role-route-capability-guard.test.ts` | `d1-service-role-rbac-authority-implementation-packet-2026-05-08.md` | `e7af71e` (`feat(security): replace user_profiles.role service-role gate with admin_role_assignments authority table`) | repo-closed; live DB integration gated under D6 |
| 3 | Durable rate limiter provider seam (D2) | `__tests__/unit/lib/middleware/rate-limiter-check.test.ts`; `__tests__/unit/lib/middleware/rate-limiter-durable-provider-guard.test.ts`; `__tests__/unit/api/rate-limit-coverage.test.ts` | `d2-durable-rate-limiter-approval-gate-guard-2026-05-08.md`; `p1-route-scoped-limiter-key-closure-2026-05-08.md` | `5c428b9` (`test: guard durable rate limiter approval gate`); seam at `06c5c7b`; route keys at `ea17dba`; consolidation at `f5aea01` | repo-closed; provider provisioning approval-gated |
| 4 | Signup verification policy (D3) | `__tests__/unit/auth/signup-verification-policy-invariants.test.ts` | `d3-signup-verification-policy-decision-2026-05-08.md`; `d3-signup-verification-repo-invariant-guard-2026-05-08.md` | `a24760d` (`test: guard signup verification launch policy`); invariants at `5373032`; policy file `config/signup-verification-launch-policy.json` | repo-closed; production Supabase config + CAPTCHA approval-gated; local E2E environment-gated |
| 5 | `.env.prod` handling + Supabase env guard precision (D4) | `__tests__/unit/scripts/guard-supabase-env.test.ts`; `__tests__/unit/docs/readme-local-dev.test.ts` | `p0-p1-env-prod-local-dev-closure-2026-05-08.md` | `52697b1` (`fix: close env guard local dev docs slice`); diagnostics-only emission at `6e75a2c` | repo-closed |
| 6 | Numeric constraint semantics (D5) | `__tests__/unit/database/schema-safety-migration.test.ts`; numeric-semantics assertions inside service unit tests | `d5-numeric-constraint-semantics-closure-2026-05-08.md` | `018b5ba` (`docs: close numeric constraint semantics decision`); migration at `b67826c` | repo-closed |
| 7 | DB migration reset/rollback static readiness (D6) | `__tests__/unit/database/migration-reset-readiness.test.ts`; `__tests__/unit/database/rollback-coverage.test.ts`; `__tests__/unit/database/admin-role-assignments-migration.test.ts`; `__tests__/unit/database/property-rls-policy-migration.test.ts`; `__tests__/unit/database/security-definer-search-path-migration.test.ts`; `__tests__/unit/database/property-stats-rpc-migration.test.ts`; `__tests__/unit/database/jsonb-gin-indexes-migration.test.ts`; `__tests__/unit/database/interaction-uniqueness-migration.test.ts`; `__tests__/unit/database/rls-policy-closure.test.ts` | `d6-db-static-reset-readiness-closure-2026-05-08.md`; `d22-migration-rollback-evidence-index-2026-05-08.md`; `migration-health-audit.md`; `db-architecture-recommendation.md` | `1a55e73` (`test: add DB reset readiness guards`); D6 env-criteria guard at `0848291`; D22 index at `b3a1e10` | repo-closed; live `supabase db reset`/lint/rollback/integration execution gated |
| 8 | Disputed-route profile exposure (D7) | `__tests__/unit/api/auth-boundary-consolidation.test.ts` (boundary inputs); existing couples handler unit guard | `d7-disputed-route-exposure-closure-2026-05-08.md` | `7a24b38` (`fix: limit disputed route profile exposure`) | repo-closed |
| 9 | Schema safety constraints + RLS hardening | `__tests__/unit/database/schema-safety-migration.test.ts`; `__tests__/unit/database/property-rls-policy-migration.test.ts`; `__tests__/unit/database/rls-policy-closure.test.ts`; `__tests__/unit/database/security-definer-search-path-migration.test.ts`; `__tests__/unit/database/jsonb-gin-indexes-migration.test.ts`; `__tests__/unit/database/interaction-uniqueness-migration.test.ts` | `rls-security-audit.md`; `schema-column-audit.md`; `migration-health-audit.md` | `b67826c`, `41ca064`, `be976ae`, `320f916`, `ba647e9`, schema constraints chained through `3990a4a` (`fix: close phase1 db perf cleanup`) | repo-closed; live RLS/integration execution gated under D6 |
| 10 | Anonymous protected-route redirect coverage (P0/P1) | `__tests__/unit/routing/no-auth-traversal-smoke-guard.test.ts`; `__tests__/unit/app/protected-page-auth-redirects.test.tsx`; `__tests__/unit/middleware.test.ts`; `__tests__/unit/middleware/next15-proxy-coverage.test.ts` | `p0-no-auth-traversal-smoke-guard-2026-05-08.md`; `p0-p1-strict-anonymous-protected-route-closure-2026-05-08.md`; `p0-p1-strict-anonymous-live-probe-rerun-2026-05-08.md`; `claude-p0-noauth-probe-164859-reconcile-2026-05-08.md` | `05ebfbe` (`test: add p0 no-auth traversal smoke guard`); middleware exposure at `92a6c35`; redirect preservation at `a57ed3e`; Next 15 proxy coverage at `e6f8769` | repo-closed + live-evidenced (partial: anonymous `/dashboard`, `/couples`, `/dashboard?tab=liked` → 307 + Location) |
| 11 | No-credential live probe harness (public pages, public APIs, anonymous protected denial) | `__tests__/integration/routing/no-auth-live-probe.spec.ts` (default-skipped Vitest 45/45); `__tests__/unit/routing/no-auth-traversal-smoke-guard.test.ts` | `p0-no-auth-api-protected-redirect-probe-harness-2026-05-08.md`; `claude-p0-noauth-probe-164859-reconcile-2026-05-08.md` | `736f604` (`test: add no-auth live probe harness`); follow-on policy + reconcile at `682408a`, `4205c2d`, `5b974f7` | repo-closed (harness ready); local execution slice still pending |
| 12 | Authenticated traversal + remote Supabase disposable seed (partial live) | `__tests__/integration/api/auth-smoke-matrix.spec.ts` (handler-level matrix; refuses non-local without `ALLOW_REMOTE_API_AUTH_SMOKE=1`); `__tests__/e2e/auth-lifecycle-local-seeded.spec.ts` (Lane C2 — operator-only); `__tests__/integration/auth/local-auth-lifecycle-smoke.test.ts` (readiness gates); `__tests__/integration/auth/local-auth-lifecycle-readiness.test.ts` | `remote-supabase-test-seed-and-auth-probe-2026-05-08.md`; `p0-p1-api-auth-smoke-matrix-2026-05-08.md`; `p0-p1-credentialless-auth-lifecycle-verification-plan-2026-05-08.md`; `p0-site-traversal-acceptance-matrix-2026-05-08.md` | `7c513d7` (`test: add local auth lifecycle smoke gates`); harness readiness at `4738158`; remote-seed evidence captured per `33715f3`, `1226f46`, `d5c1010`, `242bedc` | repo-closed + live-evidenced (partial: 4 protected pages + API auth smoke against approved remote-seeded Supabase); full positive matrix gated |
| 13 | Public no-credential accessibility coverage | `__tests__/unit/accessibility/core-flow-matrix.test.ts`; `__tests__/integration/accessibility/no-auth-public-accessibility-smoke.test.ts`; `__tests__/e2e/no-auth-public-accessibility.spec.ts` (Lane C1 — operator-only) | `accessibility-core-flow-matrix.md`; `no-auth-public-accessibility-smoke.md` | `4e93347` (`test: add accessibility core-flow matrix guard`); harness readiness at `b50fbed` (`test: guard no-credential accessibility smoke readiness`); harness scaffolding at `b79737e` | repo-closed; protected positive a11y traversal gated under row 12 |
| 14 | Internal/demo surface gating | `__tests__/unit/app/demo-surface-production-gate.test.ts`; `__tests__/unit/app/seo-route-policy.test.ts`; `__tests__/unit/app/metadata-routes.test.ts` | `p1-internal-demo-surface-disposition-2026-05-08.md` | `3e5f510` (`fix: gate remaining internal demo surfaces`); first slice at `34bfcc0`; SEO guards strengthened at `8264b47`; robots/sitemap protections at `2bb63ed` | repo-closed (default 404 in production unless `HOMEMATCH_ENABLE_INTERNAL_PREVIEW=true`) |
| 15 | Public route metadata + SEO inventory | `__tests__/unit/app/metadata-routes.test.ts`; `__tests__/unit/app/seo-route-policy.test.ts`; `__tests__/unit/app/public-route-metadata-inventory.test.ts` | `p0-full-route-api-endpoint-inventory-matrix-2026-05-08.md`; `p0-site-traversal-acceptance-matrix-2026-05-08.md` | `be73555` (`feat: add route metadata coverage`); legal/noindex inventory at `6891cdd`; SEO reconcile at `682408a` | repo-closed |
| 16 | Public performance metrics ingest hardening (size cap + payload shape) | `__tests__/unit/api/performance-metrics-route.test.ts`; `__tests__/unit/api/error-standardization.test.ts` | `p1-performance-metrics-public-ingest-size-closure-2026-05-08.md` | `ca46903` (`fix: standardize performance metrics payload error`); ingest size at `1020573` | repo-closed |
| 17 | API error standardization + 429 reconciliation (M6/M10) | `__tests__/unit/api/error-standardization.test.ts`; `__tests__/unit/api/cache-control.test.ts` | `api-error-standardization-remediation-2026-05-08.md`; `api-error-standardization-scout.md` | `02d5bb0` (`fix: reconcile M6 429 standardization guard`); shared helper at `8c4c4d8` | repo-closed |
| 18 | External fetch timeout + middleware AbortController (M7/M8) | `__tests__/unit/api/external-timeouts.test.ts`; `__tests__/unit/middleware.test.ts` | `m8-external-timeouts-closure-2026-05-08.md`; `middleware-api-audit.md` | `cee25c5` (`fix: close api external fetch timeout coverage`); Maps timeouts at `4138797` | repo-closed |
| 19 | Middleware fast paths (API + anonymous public pages) + route deadline helper | `__tests__/unit/middleware.test.ts`; `__tests__/unit/middleware/next15-proxy-coverage.test.ts`; deadline-helper unit guard | `p1-middleware-api-performance-audit-2026-05-08.md`; `p1-anonymous-public-page-fast-path-closure-2026-05-08.md`; `p1-route-deadline-helper-closure-2026-05-08.md` | `9ab96ed` (`perf: skip middleware auth for API routes`); anonymous fast path at `a8f7dbc`; deadline helper at `03e3b78` | repo-closed |
| 20 | Supabase factory + cookie hardening + refresh recovery | `__tests__/unit/auth/password-config-alignment.test.ts`; cookie/SSR unit guards under `__tests__/unit/lib/supabase/`; `__tests__/unit/data/dashboard-query-dedupe.test.ts` (parameter conflation guard) | `p1-duplicate-supabase-factory-closure-2026-05-08.md`; `db-architecture-recommendation.md` | `fc6069d` (`fix: consolidate duplicate Supabase factory`); cookie hardening at `90cee0f`; refresh helper at `9fd04bc`; password alignment at `f8164d0`; dedupe guard at `445a4cc` | repo-closed |
| 21 | Maps + paid-provider auth hardening (no-credential reads via anon client) | `__tests__/unit/api/maps-proxy-script.route.test.ts`; `__tests__/unit/app/api/maps/metro-boundaries/route.test.ts`; `__tests__/unit/app/supabase-proxy-route.test.ts` | `p0-full-route-api-endpoint-inventory-matrix-2026-05-08.md`; `p0-site-traversal-acceptance-matrix-2026-05-08.md`; `zillow-provider-production-grade-evaluation-2026-05-08.md` | `3fc00eb` (`fix: use anon client for metro boundaries`); proxy default-disable at `9ae88e9`; Maps hardening at `2a34a99` | repo-closed; paid/external positive execution remains approval-gated |
| 22 | Cron-secret admin/ingest endpoints opacity | existing per-route handler unit guards (`__tests__/unit/api/status-refresh-route.test.ts`, `__tests__/unit/api/generate-vibes-route.test.ts`, `__tests__/unit/api/ingest-zillow-route.test.ts`) | `phase0-live-probe-auth-cron-env-closure-2026-05-08.md`; `middleware-api-audit.md` | `2abb027` (`docs: reconcile phase0 live probe closure evidence`); see also handler-level commits in `25949e2` | repo-closed; positive execution paid/external-gated |
| 23 | Test-suite taxonomy + worker lane discipline | `__tests__/unit/database/migration-reset-readiness.test.ts` (worker lane reset guard); doc-side guard | `test-suite-taxonomy-2026-05-08.md` | `6fbdc46` (`docs: add test suite taxonomy report`); D22 index at `b3a1e10`; latest blocker reconciliation at `528c769` | repo-closed (documentation-only) |

## Held Phase 2+ product work (not authorized by this index)

These remain blocked until Phase 0/1 is honestly 100% closed or Shan signs a
written gate exception. They are referenced verbatim from
`phase2-phase6-execution-roadmap.md` and `og-business-readiness-backlog-2026-05-08.md`:

- **Phase 2 — Product UX, couples workflow, maps/images/SEO** (`t_ff763f6d`,
  `t_1009b931`, `t_eab22374`, `t_7dd78d5d`, `t_aa04c086`, `t_d258ca31`).
  Couples review/compare/annotate, saved-search/compare empty-loading-error
  states, accurate maps/images/metadata, public/private metadata isolation,
  authenticated browser QA.
- **Phase 3 — Matching, LLM, ingest hardening** (`t_11342c3d`, `t_4b4d5b96`,
  `t_498768f2`, `t_35ef5d03`, `t_3a7a7be2`, `t_377fda7d`). Matching eval set,
  LLM prompt/ranking robustness, ingest idempotency + source freshness +
  rollback safety. **No scaled LLM calls or paid ingestion without approval.**
- **Phase 4 — Test suite + TDD lane** (`t_acd542ca`, `t_af0f0dc4`,
  `t_d0b4cbb0`). Suite taxonomy work has begun in repo (row 23) but the full
  Playwright/integration coverage and TDD harness expansion remain held.
- **Phase 5 — Compliance, analytics, AdSense, Stripe** (`t_eface8fd`,
  `t_65920da3`, `t_8ba987bd`). All external dashboard/payment/legal work is
  approval-gated globally.
- **Phase 6 — Docs rewrite, launch readiness, final merge review**
  (`t_fd311981`, `t_aeba612c`, `t_d7d36f14`, `t_771292b6`).
- **OG business-readiness backlog** items not yet pulled into Phase 0/1:
  observability launch floor (Sentry/structured events), cost-control ledger
  for Maps/LLM/Zillow, data-quality/trust contract, admin console for
  ingest/triage/spend, growth loops, full-shareability SEO, and consent posture
  beyond the existing baseline. Repo-local first slices are described in
  `og-business-readiness-backlog-2026-05-08.md` but not authorized by this
  packet.

## What this index does NOT do

- Does not advance Phase 0/1 closure beyond what the canonical artifacts
  already record.
- Does not authorize any spending, paid/external API call, dashboard mutation,
  Docker reset, broad browser swarm, secret printing, deploy, remote DB
  mutation, or real-user data access.
- Does not replace
  `phase0-phase1-closure-matrix.md`,
  `p0-p1-blocker-evidence-index-2026-05-08.md`,
  `p0-p1-blocker-reconciliation-2026-05-08.md`,
  `p0-p1-remaining-blocker-taxonomy-2026-05-08.md`,
  `p1-decision-needed-register-2026-05-08.md`, or
  `test-suite-taxonomy-2026-05-08.md`. It is a reviewer fan-in only.
- Does not modify any source file in this slice; no type-check is required.

## Source artifacts (canonical, in this index's read set)

- `reports/home-match-revival/phase0-phase1-strict-closure-gate.md`
- `reports/home-match-revival/phase0-phase1-closure-matrix.md`
- `reports/home-match-revival/p0-p1-blocker-evidence-index-2026-05-08.md`
- `reports/home-match-revival/p0-p1-blocker-reconciliation-2026-05-08.md`
- `reports/home-match-revival/p0-p1-remaining-blocker-taxonomy-2026-05-08.md`
- `reports/home-match-revival/p1-decision-needed-register-2026-05-08.md`
- `reports/home-match-revival/test-suite-taxonomy-2026-05-08.md`
- `reports/home-match-revival/p0-site-traversal-acceptance-matrix-2026-05-08.md`
- `reports/home-match-revival/p0-full-route-api-endpoint-inventory-matrix-2026-05-08.md`
- `reports/home-match-revival/p0-p1-api-auth-smoke-matrix-2026-05-08.md`
- `reports/home-match-revival/p0-no-auth-traversal-smoke-guard-2026-05-08.md`
- `reports/home-match-revival/p0-no-auth-api-protected-redirect-probe-harness-2026-05-08.md`
- `reports/home-match-revival/p0-p1-strict-anonymous-protected-route-closure-2026-05-08.md`
- `reports/home-match-revival/p0-p1-strict-anonymous-live-probe-rerun-2026-05-08.md`
- `reports/home-match-revival/remote-supabase-test-seed-and-auth-probe-2026-05-08.md`
- `reports/home-match-revival/d1-service-role-rbac-authority-implementation-packet-2026-05-08.md`
- `reports/home-match-revival/d2-durable-rate-limiter-approval-gate-guard-2026-05-08.md`
- `reports/home-match-revival/d3-signup-verification-policy-decision-2026-05-08.md`
- `reports/home-match-revival/d3-signup-verification-repo-invariant-guard-2026-05-08.md`
- `reports/home-match-revival/d5-numeric-constraint-semantics-closure-2026-05-08.md`
- `reports/home-match-revival/d6-db-static-reset-readiness-closure-2026-05-08.md`
- `reports/home-match-revival/d7-disputed-route-exposure-closure-2026-05-08.md`
- `reports/home-match-revival/d22-migration-rollback-evidence-index-2026-05-08.md`
- `reports/home-match-revival/p1-internal-demo-surface-disposition-2026-05-08.md`
- `reports/home-match-revival/p1-route-scoped-limiter-key-closure-2026-05-08.md`
- `reports/home-match-revival/p1-route-deadline-helper-closure-2026-05-08.md`
- `reports/home-match-revival/p1-anonymous-public-page-fast-path-closure-2026-05-08.md`
- `reports/home-match-revival/p1-middleware-api-performance-audit-2026-05-08.md`
- `reports/home-match-revival/p1-performance-metrics-public-ingest-size-closure-2026-05-08.md`
- `reports/home-match-revival/p1-duplicate-supabase-factory-closure-2026-05-08.md`
- `reports/home-match-revival/p1-pg-trgm-text-search-decision-2026-05-08.md`
- `reports/home-match-revival/p1-dependency-cleanup-decision-2026-05-08.md`
- `reports/home-match-revival/p0-p1-env-prod-local-dev-closure-2026-05-08.md`
- `reports/home-match-revival/m8-external-timeouts-closure-2026-05-08.md`
- `reports/home-match-revival/api-error-standardization-remediation-2026-05-08.md`
- `reports/home-match-revival/zillow-provider-production-grade-evaluation-2026-05-08.md`
- `reports/home-match-revival/accessibility-core-flow-matrix.md`
- `reports/home-match-revival/no-auth-public-accessibility-smoke.md`
- `reports/home-match-revival/phase2-phase6-execution-roadmap.md`
- `reports/home-match-revival/og-business-readiness-backlog-2026-05-08.md`
- `config/signup-verification-launch-policy.json`
