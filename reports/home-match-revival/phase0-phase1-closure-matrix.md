# Phase 0/1 Closure Matrix — Strict OG Gate

Generated: 2026-05-08T11:17Z

## Verdict

**Do not advance to Phase 2.** Phase 0 and Phase 1 are both still short of 100% closure.

## Phase 0 closure rollup

- Closed: local dev guard bypass; Maps paid API auth hardening; Docker/local-Supabase documentation clarity; README fast-dev/Docker optional guidance; worker-scope process correction; cron-secret endpoint opacity for missing-secret route behavior; local Supabase proxy disabled-by-default and loopback-target allowlist guard; `.env.prod` guard precision via tracked non-secret production-host config plus no-secret local-dev documentation.
- Newly materialized: full static route/API inventory matrix and site traversal acceptance matrix are preserved in repo reports from Kanban tasks `t_84ff95e6` and `t_5379ec6b`.
- Partial / not closed: API live probe execution; browser traversal execution.
- Closed in follow-up P0 metro-boundaries no-credential slice: `/api/maps/metro-boundaries?metro=bay-area` no longer calls the service-role client and instead uses the public anon API client path for the read-only neighborhoods query, preventing service-role authorization failures for no-credential public requests. Evidence: RED `systemd-run --user --scope -p MemoryMax=2G -p CPUQuota=200% pnpm exec jest __tests__/unit/app/api/maps/metro-boundaries/route.test.ts --runInBand` failed with `Unauthorized access to service role client`; GREEN same command passed 1/1; resource-limited `systemd-run --user --scope -p MemoryMax=3G -p CPUQuota=200% pnpm type-check` passed.
- Remaining open/blocking evidence from 2026-05-08 live slice: authenticated browser/API probes remain blocked by missing approved test credentials/session. `.env.prod` remains intentionally absent/untracked for local dev, and guard precision now comes from `config/supabase-production-hosts.json` plus `supabase.*` host-pattern checks.
- Closed in follow-up M6/M10 reconciliation: the `error-standardization.test.ts` 429 guard was classified as stale after M10 rate-limit consolidation because the four flagged callers now delegate to `checkRateLimit(...)`, whose shared implementation returns `ApiErrorHandler.tooManyRequests(...)`. The static guard now verifies the delegated path; resource-limited targeted Jest passed 30/30.
- Closed in follow-up P0 no-credential guard slice: `/supabase/*path` now has unit coverage for disabled-by-default behavior, no upstream `fetch` while disabled, rejection of non-loopback enabled targets without upstream `fetch`, and allowed forwarding only to explicit loopback targets. Evidence: RED `systemd-run --user --scope -p MemoryMax=2G -p CPUQuota=200% pnpm exec jest __tests__/unit/app/supabase-proxy-route.test.ts --runInBand` failed on the missing allowlist (expected 403, received 200); GREEN same command passed 3/3; resource-limited `systemd-run --user --scope -p MemoryMax=3G -p CPUQuota=200% pnpm type-check` passed.
- Blocked: authenticated flow verification and integration-test execution until approved test credentials/session plus local Supabase/Docker or a safeguarded remote-test path are available.
- API auth smoke matrix implementation exists at `__tests__/integration/api/auth-smoke-matrix.spec.ts` and is summarized in `reports/home-match-revival/p0-p1-api-auth-smoke-matrix-2026-05-08.md`: static matrix/skips pass, but closure-grade live execution remains blocked because this worker had no approved `API_AUTH_SMOKE_TOKEN` and no local app server on `127.0.0.1:3000`.
- Closed in follow-up env/local-dev closure slice: `scripts/guard-supabase-env.js` now honors `SKIP_SUPABASE_GUARD=true` from `.env.local`, blocks the tracked non-secret production Supabase host when `.env.prod` is absent, keeps `supabase.*` suffix checks without lookalike-domain bypass, and emits offender categories without env values. README/setup/workflow docs now state `.env.prod` is untracked/not required for routine local dev and that `config/supabase-production-hosts.json` must contain hostnames only. Evidence: targeted Jest passed 6/6; bypass guard exited 0; non-bypass guard exited 1 with `SUPABASE_URL_HOST, SUPABASE_HOST_PATTERN` only.

## Phase 1 closure rollup

- Closed: httpOnly Supabase cookies; Maps auth hardening; local dev guard bypass; Docker optional decision; COOP/CORP; properties RLS read-policy hardening; SECURITY DEFINER search-path hardening; property stats RPC; interaction uniqueness migration; middleware matcher exclusions; successful GET route cache-policy classification; M5 route-scoped limiter coverage for identified mutating/admin gaps; M6 JSON API error standardization route conversion; M6/M10 429 guard reconciliation; M7 middleware AbortController timeout cleanup; M8 external-call timeout coverage for all Next.js API route outbound fetches; M9 dead server-action cleanup; M10 duplicate rate-limit system consolidation; M11 test-only export cleanup; M12 duplicate RPC wrapper cleanup; M13 dead Zillow factory cleanup; M14 unused CouplesMiddleware cleanup; M15 stale neighborhood TODO cleanup; service-role-client bypass gate; factory async-stub removal; service-client cache/key-rotation hardening; Supabase password policy alignment; user-profile delete RLS policy; JSONB GIN indexes; partial schema safety constraints; numeric constraint semantics for bedrooms/bathrooms zero values; auth client consolidation slice; interactions service-role fallback removal; duplicate auth getUser monkey-patch removal; DB P1.2 dashboard query in-flight dedupe; DB P1.3 CouplesRealtime mutual-like RPC enrichment; DB P1.4 Phase 1 rollback/DOWN static coverage; DB P2.3/P2.4 inline DB typing cleanup for realtime payloads and dashboard select columns; duplicate Supabase factory consolidation; API middleware fast path; route-scoped limiter keys; route-deadline helper for long Supabase-heavy APIs; anonymous public-page middleware fast path; dependency cleanup launch-path decision; pg_trgm text-search launch-path decision (not required until property free-text UI/API is wired); disputed-route email/profile exposure closure (partner email removed from the route DTO and service-role profile query limited to id/display name); public performance metrics ingest size/shape hardening (64 KiB pre-parse content-length cap plus bounded metrics/customMetrics/string fields).
- Open: E2E auth lifecycle; API auth smoke live execution with approved local/non-production bearer token.
- Newly materialized: read-only auth provider decision memo (`t_7f0cbab3`) recommends keeping Supabase Auth for the revival gate and focusing on Supabase-specific hardening; read-only middleware/API performance audit (`t_99b5c6d4`) narrowed the repo-local performance slice to skipping Supabase auth/client work for `/api/*` in middleware while preserving API route handler auth/rate/cache ownership; implementation task `t_1087ad80` closed that API fast-path slice with targeted middleware tests and type-check evidence. Implementation task `t_06b0f222` closed anonymous public-page middleware fast path by bypassing Supabase SSR client construction for no-cookie public/auth-page requests while preserving protected-route redirects, authenticated auth-page redirects, security headers, and API fast-path behavior.
- Blocked/decision-needed: real service-role RBAC model; durable rate-limiter decision; DB reset/lint/integration environment. Production email confirmation/CAPTCHA is policy-decided by `reports/home-match-revival/d3-signup-verification-policy-decision-2026-05-08.md`, and repo-side D3 invariants are statically guarded by `__tests__/unit/auth/signup-verification-policy-invariants.test.ts` plus `reports/home-match-revival/d3-signup-verification-repo-invariant-guard-2026-05-08.md`: `supabase/config.toml` is local-only evidence, production must not launch with confirmations disabled or CAPTCHA absent, and external/live signup-verification execution remains approval-gated. D5 numeric semantics is repo-side closed by `reports/home-match-revival/d5-numeric-constraint-semantics-closure-2026-05-08.md`: zero bedrooms intentionally covers studios/lofts, zero bathrooms remains the current unknown/missing external-ingestion sentinel, and DB/schema/API static guards now preserve non-negative semantics. D7 disputed-route email/profile exposure is repo-side closed by `reports/home-match-revival/d7-disputed-route-exposure-closure-2026-05-08.md`: partner email is neither selected nor returned, while current UX keeps display name/interaction data. Approved external/config implementation and local/E2E environment setup remain blocked. See `reports/home-match-revival/p1-decision-needed-register-2026-05-08.md` and `reports/home-match-revival/p0-p1-blocker-reconciliation-2026-05-08.md` for the concise owner-decision register and blocker reconciliation.

## Decision-needed register

| ID  | Decision                                     | Current block                                                                                                                                                                                            |
| --- | -------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | Service-role RBAC authority                  | `user_profiles.role === 'admin'` remains placeholder-grade authority for service-role access.                                                                                                            |
| D2  | Durable production rate limiter              | Repo coverage is consolidated, but limiter storage is still in-process memory.                                                                                                                           |
| D3  | Production email confirmation/CAPTCHA policy | Supabase email confirmations remain disabled and CAPTCHA remains unconfigured.                                                                                                                           |
| D4  | `.env.prod` handling model                   | Closed repo-side for Phase 0/1: `.env.prod` stays untracked/absent for local dev, while `config/supabase-production-hosts.json` provides non-secret host precision and docs forbid tracked secrets/URLs. |
| D5  | Numeric constraint semantics                 | Closed repo-side for Phase 0/1: zero bedrooms intentionally supports studio/loft listings; zero bathrooms remains the current unknown/missing-value sentinel for external ingestion/API fallbacks until product introduces a nullable/unknown model. |
| D6  | DB reset/lint/integration environment        | DB reset/lint/rollback/integration validation lack an approved local Supabase/Docker or safeguarded remote-test path.                                                                                    |
| D7  | Disputed-route email/profile exposure        | Closed repo-side for Phase 0/1: `/api/couples/disputed` no longer selects or returns partner email, and keeps only partner id/display name plus interaction metadata needed by the current UX.           |

## Gate decision

- Phase 0: **not 100% complete**.
- Phase 1: **not 100% complete**.
- Phase 2/3/4/5/6: **held** until the open/block items are resolved or Shan explicitly approves a written gate exception.

## Source artifacts

- `reports/home-match-revival/phase0-closure-scout.md`
- `reports/home-match-revival/phase1-remediation-closure-scout.md`
- `reports/home-match-revival/m8-external-timeouts-closure-2026-05-08.md`
- `reports/home-match-revival/phase0-live-probe-auth-cron-env-closure-2026-05-08.md`
- `reports/home-match-revival/p1-decision-needed-register-2026-05-08.md`
- `reports/home-match-revival/p1-duplicate-supabase-factory-closure-2026-05-08.md`
- `reports/home-match-revival/p0-full-route-api-endpoint-inventory-matrix-2026-05-08.md`
- `reports/home-match-revival/p0-site-traversal-acceptance-matrix-2026-05-08.md`
- `reports/home-match-revival/p1-auth-provider-replacement-decision-memo-2026-05-08.md`
- `reports/home-match-revival/p1-middleware-api-performance-audit-2026-05-08.md`
- `reports/home-match-revival/p0-p1-api-auth-smoke-matrix-2026-05-08.md`
- `reports/home-match-revival/p1-route-scoped-limiter-key-closure-2026-05-08.md`
- `reports/home-match-revival/p1-route-deadline-helper-closure-2026-05-08.md`
- `reports/home-match-revival/p1-anonymous-public-page-fast-path-closure-2026-05-08.md`
- `reports/home-match-revival/p1-dependency-cleanup-decision-2026-05-08.md`
- `reports/home-match-revival/p0-p1-env-prod-local-dev-closure-2026-05-08.md`
- `reports/home-match-revival/p1-pg-trgm-text-search-decision-2026-05-08.md`
- `reports/home-match-revival/d3-signup-verification-policy-decision-2026-05-08.md`
- `reports/home-match-revival/d3-signup-verification-repo-invariant-guard-2026-05-08.md`
- `reports/home-match-revival/p0-p1-blocker-reconciliation-2026-05-08.md`
- `reports/home-match-revival/d5-numeric-constraint-semantics-closure-2026-05-08.md`
- `reports/home-match-revival/d7-disputed-route-exposure-closure-2026-05-08.md`
- `reports/home-match-revival/p1-performance-metrics-public-ingest-size-closure-2026-05-08.md`
