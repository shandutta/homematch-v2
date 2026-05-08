# Phase 0/1 Closure Matrix — Strict OG Gate

Generated: 2026-05-08T08:28Z

## Verdict

**Do not advance to Phase 2.** Phase 0 and Phase 1 are both still short of 100% closure.

## Phase 0 closure rollup

- Closed: local dev guard bypass; Maps paid API auth hardening; Docker/local-Supabase documentation clarity; README fast-dev/Docker optional guidance; worker-scope process correction; cron-secret endpoint opacity for missing-secret route behavior; local Supabase proxy disabled-by-default and loopback-target allowlist guard.
- Newly materialized: full static route/API inventory matrix and site traversal acceptance matrix are preserved in repo reports from Kanban tasks `t_84ff95e6` and `t_5379ec6b`.
- Partial / not closed: API live probe execution; browser traversal execution; `.env.prod` guard precision.
- Open/blocking evidence from 2026-05-08 live slice: `/api/maps/metro-boundaries?metro=bay-area` returns 500 because the public route calls a service-role client outside an authorized context; authenticated browser/API probes remain blocked by missing approved test credentials/session; `.env.prod` remains absent.
- Closed in follow-up M6/M10 reconciliation: the `error-standardization.test.ts` 429 guard was classified as stale after M10 rate-limit consolidation because the four flagged callers now delegate to `checkRateLimit(...)`, whose shared implementation returns `ApiErrorHandler.tooManyRequests(...)`. The static guard now verifies the delegated path; resource-limited targeted Jest passed 30/30.
- Closed in follow-up P0 no-credential guard slice: `/supabase/*path` now has unit coverage for disabled-by-default behavior, no upstream `fetch` while disabled, rejection of non-loopback enabled targets without upstream `fetch`, and allowed forwarding only to explicit loopback targets. Evidence: RED `systemd-run --user --scope -p MemoryMax=2G -p CPUQuota=200% pnpm exec jest __tests__/unit/app/supabase-proxy-route.test.ts --runInBand` failed on the missing allowlist (expected 403, received 200); GREEN same command passed 3/3; resource-limited `systemd-run --user --scope -p MemoryMax=3G -p CPUQuota=200% pnpm type-check` passed.
- Blocked: authenticated flow verification and integration-test execution until approved test credentials/session plus local Supabase/Docker or a safeguarded remote-test path are available.

## Phase 1 closure rollup

- Closed: httpOnly Supabase cookies; Maps auth hardening; local dev guard bypass; Docker optional decision; COOP/CORP; properties RLS read-policy hardening; SECURITY DEFINER search-path hardening; property stats RPC; interaction uniqueness migration; middleware matcher exclusions; successful GET route cache-policy classification; M5 route-scoped limiter coverage for identified mutating/admin gaps; M6 JSON API error standardization route conversion; M6/M10 429 guard reconciliation; M7 middleware AbortController timeout cleanup; M8 external-call timeout coverage for all Next.js API route outbound fetches; M9 dead server-action cleanup; M10 duplicate rate-limit system consolidation; M11 test-only export cleanup; M12 duplicate RPC wrapper cleanup; M13 dead Zillow factory cleanup; M14 unused CouplesMiddleware cleanup; M15 stale neighborhood TODO cleanup; service-role-client bypass gate; factory async-stub removal; service-client cache/key-rotation hardening; Supabase password policy alignment; user-profile delete RLS policy; JSONB GIN indexes; partial schema safety constraints; auth client consolidation slice; interactions service-role fallback removal; duplicate auth getUser monkey-patch removal; DB P1.2 dashboard query in-flight dedupe; DB P1.3 CouplesRealtime mutual-like RPC enrichment; DB P1.4 Phase 1 rollback/DOWN static coverage; DB P2.3/P2.4 inline DB typing cleanup for realtime payloads and dashboard select columns; duplicate Supabase factory consolidation.
- Open: E2E auth lifecycle; remaining dependency cleanup decision; pg_trgm text-search index if still required; README/local-dev validation cleanup; API middleware fast path; anonymous public-page fast path; route-scoped limiter keys; route-deadline helper for long Supabase-heavy APIs.
- Newly materialized: read-only auth provider decision memo (`t_7f0cbab3`) recommends keeping Supabase Auth for the revival gate and focusing on Supabase-specific hardening; read-only middleware/API performance audit (`t_99b5c6d4`) narrows the next repo-local performance slice to skipping Supabase auth/client work for `/api/*` in middleware while preserving API route handler auth/rate/cache ownership.
- Blocked/decision-needed: real service-role RBAC model; durable rate-limiter decision; production email confirmation/CAPTCHA policy; `.env.prod` secret handling; numeric constraint semantics; DB reset/lint/integration environment; disputed-route email/profile field exposure decision. See `reports/home-match-revival/p1-decision-needed-register-2026-05-08.md` for the concise owner-decision register.

## Decision-needed register

| ID | Decision | Current block |
| --- | --- | --- |
| D1 | Service-role RBAC authority | `user_profiles.role === 'admin'` remains placeholder-grade authority for service-role access. |
| D2 | Durable production rate limiter | Repo coverage is consolidated, but limiter storage is still in-process memory. |
| D3 | Production email confirmation/CAPTCHA policy | Supabase email confirmations remain disabled and CAPTCHA remains unconfigured. |
| D4 | `.env.prod` handling model | `.env.prod` remains absent; guard relies on fallback host-pattern detection unless an accepted policy says otherwise. |
| D5 | Numeric constraint semantics | Bedrooms/bathrooms allow zero despite the original `1-50` audit target. |
| D6 | DB reset/lint/integration environment | DB reset/lint/rollback/integration validation lack an approved local Supabase/Docker or safeguarded remote-test path. |
| D7 | Disputed-route email/profile exposure | `/api/couples/disputed` still exposes partner email/profile fields pending product/security decision. |

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
