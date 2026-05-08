# Rate-Limit Gap Scout — Middleware/API M5

Generated: 2026-05-08T02:10:15Z  
Worktree: `/home/shan/projects/homematch-v2.worktrees/p4-quality-compliance`  
Scope: Phase 0/1 closure scout only; read-only code inspection except this report artifact. No broad tests/builds run.

## Verdict

M5 is still **open**. Existing rate limiting covers several user mutating/paid routes, but remaining gaps are concentrated in cron-secret admin endpoints, one authenticated destructive interaction endpoint, one authenticated couples mutation, one authenticated service-role-backed resolution mutation, and unauthenticated performance metrics ingestion.

## Existing limiter primitives observed

- `src/lib/middleware/rateLimiter.ts`: `rateLimit(request, tier)` / `withRateLimit(request, handler, tier)` using `rate-limiter-flexible` memory store; identity currently resolves to `user_<id>` if session lookup succeeds, otherwise `ip_<x-forwarded-for|x-real-ip|unknown>`; tiers include `strict`, `standard`, `relaxed`, `auth`.
- `src/lib/utils/rate-limit.ts`: `apiRateLimiter.check(identifier)` in-memory helper; current default is 100 requests/minute and routes pass authenticated `user.id` directly.
- Phase 1 blocker still applies: durable production limiter decision is outside this repo-only scout. Repo-only remediation can still standardize coverage with the current in-repo limiter(s), but production durability remains a separate decision.

## Route matrix

| Method/path | File | Existing limiter evidence | Recommended limiter identity/key | Safe to remediate repo-only? |
| --- | --- | --- | --- | --- |
| `POST /api/admin/status-refresh` | `src/app/api/admin/status-refresh/route.ts` | **Gap.** Cron-secret auth at lines 97-153; no limiter import/call. | `admin:status-refresh:{cron-secret-present}:{ip}` or preferably `admin:status-refresh:{hash(secret or configured cron id)}:{ip}`; strict/very low frequency because it triggers RapidAPI and DB upserts. | **Yes**, if using existing in-repo limiter and no secret logging. Durable backend still blocked/decision-needed. |
| `POST /api/admin/ingest/zillow` | `src/app/api/admin/ingest/zillow/route.ts` | **Gap.** Cron-secret auth at lines 106-114; no limiter import/call. | `admin:ingest-zillow:{cron-secret-present}:{ip}`; strict/cron tier; include route-specific key to avoid consuming normal user quota. | **Yes**, repo-only limiter wrapper is safe; avoid printing/querying secrets. |
| `POST /api/admin/generate-vibes` | `src/app/api/admin/generate-vibes/route.ts` | **Gap.** Cron-secret auth at lines 49-64; no limiter import/call; performs OpenRouter work and DB writes. | `admin:generate-vibes:{cron-secret-present}:{ip}`; strict/admin tier, low burst. | **Yes**, repo-only; should add unit/static coverage only. |
| `GET /api/admin/generate-vibes` | `src/app/api/admin/generate-vibes/route.ts` | **Gap for admin route.** Secret query auth at lines 361-368; no limiter. Read-only but admin/status route. | `admin:generate-vibes:get:{cron-secret-present}:{ip}`; relaxed/admin-read tier. | **Yes**; lower priority than POST but within admin route hardening. |
| `POST /api/admin/generate-neighborhood-vibes` | `src/app/api/admin/generate-neighborhood-vibes/route.ts` | **Gap.** Cron-secret auth at lines 17-28; no limiter; OpenRouter/DB upserts. | `admin:generate-neighborhood-vibes:{cron-secret-present}:{ip}`; strict/admin tier. | **Yes**, repo-only limiter call safe. |
| `POST /api/admin/generate-vibes-zillow` | `src/app/api/admin/generate-vibes-zillow/route.ts` | **Gap.** Cron-secret auth at lines 287-299; no limiter; RapidAPI + OpenRouter preview work. | `admin:generate-vibes-zillow:{cron-secret-present}:{ip}`; strict/admin tier. | **Yes**, repo-only; route has no DB write but paid external calls warrant strict limit. |
| `PATCH /api/couples/disputed` | `src/app/api/couples/disputed/route.ts` | **Gap.** Auth at lines 361-367; service-role upsert to `household_property_resolutions` at lines 403-417; no limiter. | Authenticated `user.id` plus route/method, e.g. `user:{id}:PATCH:/api/couples/disputed`; standard or strict. | **Yes**, repo-only. No product decision needed for adding per-user throttle. |
| `POST /api/couples/notify` | `src/app/api/couples/notify/route.ts` | **Gap.** Auth at lines 12-18; no limiter; invokes couples notification flow. | Authenticated `user.id` plus route/method; standard tier. | **Yes**, repo-only. |
| `DELETE /api/interactions` | `src/app/api/interactions/route.ts` | **Gap.** Auth at lines 410-417; no `apiRateLimiter.check()` in DELETE path. POST path is limited by `apiRateLimiter.check(user.id)` at lines 25-40. | Authenticated `user.id` plus route/method; strict/destructive tier. If staying with `apiRateLimiter`, key should avoid sharing quota unintentionally: `interactions:delete:{user.id}`. | **Yes**, repo-only; should align with reset route behavior. |
| `POST /api/performance/metrics` | `src/app/api/performance/metrics/route.ts` | **Gap.** Unauthenticated ingestion at lines 74-135; in-memory store only; no limiter. | IP-based key, e.g. `ip:{x-forwarded-for|x-real-ip}:POST:/api/performance/metrics`; relaxed/standard. Optional URL-origin bucketing if spoofing is a concern. | **Yes**, for basic IP throttle. Stronger anti-spam/origin policy is a product/ops decision. |
| `POST /api/maps/geocode` | `src/app/api/maps/geocode/route.ts` | Covered: `apiRateLimiter` import and `apiRateLimiter.check(auth.user.id)` at lines 54-56 per search results; authenticated paid API route. | Existing authenticated `user.id`; route-specific key would be better during limiter consolidation. | No gap; repo-only cleanup optional under M10, not M5 gap closure. |
| `POST /api/maps/places/autocomplete` | `src/app/api/maps/places/autocomplete/route.ts` | Covered: `apiRateLimiter` import and `apiRateLimiter.check(auth.user.id)` at lines 65-67 per search results; authenticated paid API route. | Existing authenticated `user.id`; route-specific key preferred eventually. | No gap; repo-only cleanup optional under M10. |
| `POST /api/interactions` | `src/app/api/interactions/route.ts` | Covered: `apiRateLimiter.check(user.id)` at lines 34-40. | Existing `user.id`; route-specific `interactions:post:{user.id}` preferred eventually. | No M5 gap. |
| `DELETE /api/interactions/reset` | `src/app/api/interactions/reset/route.ts` | Covered: `apiRateLimiter.check(user.id)` at lines 17-23. | Existing `user.id`; destructive route-specific key preferred. | No M5 gap. |
| `POST /api/users/avatar` | `src/app/api/users/avatar/route.ts` | Covered: `rateLimit(request, 'strict')` at lines 51-56 before upload handling. | Existing `user_<id>`/IP fallback from `rateLimiter.ts`; route-specific user key preferred after consolidation. | No M5 gap. |
| `DELETE /api/users/avatar` | `src/app/api/users/avatar/route.ts` | Covered: `rateLimit(request, 'standard')` at lines 185-190. | Existing `user_<id>`/IP fallback; route-specific user key preferred after consolidation. | No M5 gap. |
| `GET /api/couples/activity` | `src/app/api/couples/activity/route.ts` | Covered for GET with `withRateLimit(request, ...)` at lines 29-31; exported POST/PUT/DELETE/PATCH are 405 only. | Existing `user_<id>`/IP fallback. | No mutating gap. |
| 405-only exported methods (`/api/health`, `/api/properties/marketing`, `/api/couples/check-mutual`, `/api/couples/activity`) | Respective route files | POST/PUT/PATCH/DELETE handlers return 405 and do not mutate; no limiter needed for M5 closure. | Not applicable. | No M5 gap; do not spend closure work here. |

## Recommended Phase 0/1 repo-only remediation shape

- Add a small route-local or shared helper for admin cron routes that rate-limits before expensive work but after/alongside secret validation, without logging secret values.
- Prefer route/method-scoped keys so admin/paid/destructive endpoints do not share a single per-user quota unexpectedly.
- For authenticated mutations, use `user.id` as the primary identity; fall back to IP only when auth is absent or before auth parsing is intentionally required.
- For cron-secret admin routes, do **not** use raw secret as a logged/stored key. Use route + IP, or a non-reversible short hash if a secret-derived dimension is required.
- Add narrow unit/static tests per touched route/helper; do not run broad suites for this closure task.

## Remaining M5 gap list

1. `POST /api/admin/status-refresh`
2. `POST /api/admin/ingest/zillow`
3. `POST /api/admin/generate-vibes`
4. `GET /api/admin/generate-vibes` (admin read/status hardening)
5. `POST /api/admin/generate-neighborhood-vibes`
6. `POST /api/admin/generate-vibes-zillow`
7. `PATCH /api/couples/disputed`
8. `POST /api/couples/notify`
9. `DELETE /api/interactions`
10. `POST /api/performance/metrics`

## Notes / non-goals

- No code was modified in this scout.
- No broad tests/builds were run.
- This does not dispatch Phase 2+ or resolve the separate durable-rate-limiter production decision (M10/auth audit blocker). It only inventories M5 coverage gaps that can be closed repo-only with current primitives if approved.
