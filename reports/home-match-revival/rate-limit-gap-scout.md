# Rate-Limit Gap Scout — Middleware/API M5

Generated: 2026-05-08T02:10:15Z  
Worktree: `/home/shan/projects/homematch-v2.worktrees/p4-quality-compliance`  
Scope: Phase 0/1 closure scout only; read-only code inspection except this report artifact. No broad tests/builds run.

## Verdict

M5 route coverage is **closed for repo-code coverage**, and M10 duplicate rate-limit system consolidation is now **closed repo-side**. Admin cron endpoints, user mutations, paid Maps routes, interactions reset/delete, and performance metrics ingestion all use the single `src/lib/middleware/rateLimiter.ts` implementation through `checkRateLimit`, `rateLimit`, `withRateLimit`, or the admin helper wrapper. Durable production limiter storage remains a separate blocked/decision-needed ops item.

## Existing limiter primitives observed

- `src/lib/middleware/rateLimiter.ts`: single repo-side limiter after M10 consolidation. It exposes `rateLimit(request, tier)`, `withRateLimit(request, handler, tier)`, and explicit-key `checkRateLimit(identifier, tier?)`, all backed by `rate-limiter-flexible` memory store. Request identity resolves to `ip_<x-forwarded-for|x-real-ip|unknown>` without Supabase auth calls; authenticated routes pass `user.id` or route-scoped user keys explicitly.
- Phase 1 blocker still applies: durable production limiter storage is outside this repo-only scout. Repo-only remediation can standardize coverage on the current in-repo limiter, but production durability remains a separate decision.

## Route matrix

| Method/path                                                                                                                  | File                                                     | Current limiter evidence                                                                              | Status           |
| ---------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | ---------------- |
| `POST /api/admin/status-refresh`                                                                                             | `src/app/api/admin/status-refresh/route.ts`              | Uses `rateLimitAdminRoute(request, 'admin:status-refresh')`, backed by `checkRateLimit`.              | Closed repo-side |
| `POST /api/admin/ingest/zillow`                                                                                              | `src/app/api/admin/ingest/zillow/route.ts`               | Uses `rateLimitAdminRoute(request, 'admin:ingest-zillow')`, backed by `checkRateLimit`.               | Closed repo-side |
| `POST /api/admin/generate-vibes`                                                                                             | `src/app/api/admin/generate-vibes/route.ts`              | Uses `rateLimitAdminRoute(request, 'admin:generate-vibes')`, backed by `checkRateLimit`.              | Closed repo-side |
| `GET /api/admin/generate-vibes`                                                                                              | `src/app/api/admin/generate-vibes/route.ts`              | Uses `rateLimitAdminRoute(request, 'admin:generate-vibes')`, backed by `checkRateLimit`.              | Closed repo-side |
| `POST /api/admin/generate-neighborhood-vibes`                                                                                | `src/app/api/admin/generate-neighborhood-vibes/route.ts` | Uses `rateLimitAdminRoute(request, 'admin:generate-neighborhood-vibes')`, backed by `checkRateLimit`. | Closed repo-side |
| `POST /api/admin/generate-vibes-zillow`                                                                                      | `src/app/api/admin/generate-vibes-zillow/route.ts`       | Uses `rateLimitAdminRoute(request, 'admin:generate-vibes-zillow')`, backed by `checkRateLimit`.       | Closed repo-side |
| `PATCH /api/couples/disputed`                                                                                                | `src/app/api/couples/disputed/route.ts`                  | Uses `checkRateLimit("couples:disputed:${user.id}")`.                                                 | Closed repo-side |
| `POST /api/couples/notify`                                                                                                   | `src/app/api/couples/notify/route.ts`                    | Uses `checkRateLimit("couples:notify:${user.id}")`.                                                   | Closed repo-side |
| `POST /api/interactions`                                                                                                     | `src/app/api/interactions/route.ts`                      | Uses `checkRateLimit(user.id)`.                                                                       | Closed repo-side |
| `DELETE /api/interactions`                                                                                                   | `src/app/api/interactions/route.ts`                      | Uses `checkRateLimit("interactions:delete:${user.id}")`.                                              | Closed repo-side |
| `DELETE /api/interactions/reset`                                                                                             | `src/app/api/interactions/reset/route.ts`                | Uses `checkRateLimit(user.id)`.                                                                       | Closed repo-side |
| `POST /api/performance/metrics`                                                                                              | `src/app/api/performance/metrics/route.ts`               | Uses `checkRateLimit("performance:metrics:${ip}")` with forwarded/real IP fallback.                   | Closed repo-side |
| `POST /api/maps/geocode`                                                                                                     | `src/app/api/maps/geocode/route.ts`                      | Uses `checkRateLimit(auth.user.id)`.                                                                  | Closed repo-side |
| `POST /api/maps/places/autocomplete`                                                                                         | `src/app/api/maps/places/autocomplete/route.ts`          | Uses `checkRateLimit(auth.user.id)`.                                                                  | Closed repo-side |
| `POST /api/users/avatar`                                                                                                     | `src/app/api/users/avatar/route.ts`                      | Uses `rateLimit(request, 'strict')`.                                                                  | Closed repo-side |
| `DELETE /api/users/avatar`                                                                                                   | `src/app/api/users/avatar/route.ts`                      | Uses `rateLimit(request, 'standard')`.                                                                | Closed repo-side |
| `GET /api/couples/activity`                                                                                                  | `src/app/api/couples/activity/route.ts`                  | Uses `withRateLimit(request, ..., 'standard')`.                                                       | Closed repo-side |
| 405-only exported methods (`/api/health`, `/api/properties/marketing`, `/api/couples/check-mutual`, `/api/couples/activity`) | Respective route files                                   | Handlers return 405 and do not mutate; no limiter needed for M5 closure.                              | No M5 gap        |

## Recommended Phase 0/1 repo-only remediation shape

- Add a small route-local or shared helper for admin cron routes that rate-limits before expensive work but after/alongside secret validation, without logging secret values.
- Prefer route/method-scoped keys so admin/paid/destructive endpoints do not share a single per-user quota unexpectedly.
- For authenticated mutations, use `user.id` as the primary identity; fall back to IP only when auth is absent or before auth parsing is intentionally required.
- For cron-secret admin routes, do **not** use raw secret as a logged/stored key. Use route + IP, or a non-reversible short hash if a secret-derived dimension is required.
- Add narrow unit/static tests per touched route/helper; do not run broad suites for this closure task.

## Remaining M5 gap list

None for repo-code route coverage. Durable multi-instance limiter storage remains outside this repo-only M5/M10 closure and is tracked as a separate production decision.

## Notes / non-goals

- No external dashboards, deploys, secrets, paid API calls, or live API probing were used.
- This does not dispatch Phase 2+ or resolve the separate durable-rate-limiter production decision (M10/auth audit blocker). It closes duplicate repo-side limiter implementation and route coverage on current primitives only.

## Remediation slice — user/performance route limits

Status: **M5 partial**.

Closed in this slice:

- `PATCH /api/couples/disputed` now checks `checkRateLimit(`couples:disputed:${user.id}`)`.
- `POST /api/couples/notify` now checks `checkRateLimit(`couples:notify:${user.id}`)`.
- `DELETE /api/interactions` now checks `checkRateLimit(`interactions:delete:${user.id}`)`.
- `POST /api/performance/metrics` now checks `checkRateLimit(`performance:metrics:${ip}`)` using forwarded/real IP fallback.

Verification:

- RED: `hm-rate-red-1778206578.service` failed before limiter adoption.
- GREEN: `hm-rate-green-1778206625.service` passed static coverage.
- Final targeted: `hm-rate-test-final-1778206649.service` passed rate-limit + cache-control tests.
- Type-check: `hm-rate-typecheck-1778206654.service` passed.
- Diff check: passed.

Remaining M5 gaps are concentrated in admin cron-secret routes:

1. `POST /api/admin/status-refresh`
2. `POST /api/admin/ingest/zillow`
3. `POST /api/admin/generate-vibes`
4. `GET /api/admin/generate-vibes`
5. `POST /api/admin/generate-neighborhood-vibes`
6. `POST /api/admin/generate-vibes-zillow`

## Remediation slice — admin cron route limits

Status: **M5 closed for repo-code route coverage**.

Closed in this slice:

- Added `src/lib/api/admin-rate-limit.ts` with `rateLimitAdminRoute(request, routeKey)` using route + IP keys and no secret-derived/logged key material.
- `POST /api/admin/status-refresh` now uses `admin:status-refresh`.
- `POST /api/admin/ingest/zillow` now uses `admin:ingest-zillow`.
- `POST` and `GET /api/admin/generate-vibes` now use `admin:generate-vibes`.
- `POST /api/admin/generate-neighborhood-vibes` now uses `admin:generate-neighborhood-vibes`.
- `POST /api/admin/generate-vibes-zillow` now uses `admin:generate-vibes-zillow`.

Verification:

- RED: `hm-admin-rate-red-1778206764.service` failed before admin helper adoption.
- GREEN: `hm-admin-rate-green-1778206860.service` passed admin coverage.
- Final targeted: `hm-admin-rate-test-final2-1778206953.service` passed rate-limit + cache-control tests.
- Type-check: `hm-admin-rate-typecheck2-1778206957.service` passed.
- Diff check: passed.

Remaining note: the limiter is still in-process memory backed, matching existing project primitives. Durable production storage is tracked separately as an ops/architecture decision, not an M5 route-coverage gap.

## Remediation slice — M10 duplicate limiter consolidation

Status: **M10 closed repo-side**.

Closed in this slice:

- Removed the duplicate custom Map helper `src/lib/utils/rate-limit.ts` and its unit test.
- Added explicit-key `checkRateLimit(identifier, tier?)` and shared test reset helper in `src/lib/middleware/rateLimiter.ts` so route-scoped keys and wrapper-style routes share one `rate-limiter-flexible` memory store.
- Updated `src/lib/api/admin-rate-limit.ts` and route-scoped Maps/interactions/couples/performance callers to import `@/lib/middleware/rateLimiter` only.
- Added consolidated limiter coverage in `__tests__/unit/lib/middleware/rate-limiter-check.test.ts` and updated static route coverage in `__tests__/unit/api/rate-limit-coverage.test.ts`.
- Added Jest ignores for `<rootDir>/.worktrees/` so stale in-repo worktrees do not get discovered as duplicate tests/packages during targeted verification.

Verification:

- Targeted Jest: `pnpm exec jest --runTestsByPath __tests__/unit/api/maps/geocode.route.test.ts __tests__/unit/api/maps/places-autocomplete.route.test.ts __tests__/unit/app/api/interactions/reset/route.test.ts __tests__/unit/app/api/interactions/route.test.ts __tests__/unit/lib/middleware/rate-limiter-check.test.ts __tests__/unit/api/rate-limit-coverage.test.ts --runInBand --no-cache` passed 52/52.
- Type-check: `pnpm type-check` passed.
