# HomeMatch v2 — Route Inventory

**Date**: 2026-05-09
**Branch**: autonomy/route-audit
**Scope**: All routes under `src/app/` — 28 API routes, 30 page routes, plus `robots.ts` / `sitemap.ts`.
**Source-of-truth**: `src/app/`, `middleware.ts`, `src/lib/routing/protected-routes.ts`, `src/lib/routing/internal-preview.ts`, `__tests__/`.

---

## How auth is enforced

Three layers stack:

1. **`middleware.ts`** — runs on every request that matches the matcher (excludes `_next`, static assets). Bypasses `/api/health` + `/api/performance/metrics` and returns early for all other `/api/*` paths (security headers only). For non-API paths, redirects anonymous users to `/login?redirectTo=…` when the path matches one of the protected prefixes in `PROTECTED_PATH_PREFIXES`. Authenticated users hitting `/login` or `/signup` are redirected to `/dashboard` (or a safe `redirectTo`).
2. **`PROTECTED_PATH_PREFIXES`** in `src/lib/routing/protected-routes.ts:1`: `/dashboard`, `/profile`, `/household`, `/settings`, `/validation`, `/couples`, `/properties`.
3. **In-route guards** — API routes call `requireUserFromRequest()`, admin/cron routes verify `x-cron-secret` (or `?cron_secret=…`), some pages call `requireInternalPreviewAccess()` which `notFound()`s unless `HOMEMATCH_ENABLE_INTERNAL_PREVIEW=true`, and some pages perform their own `supabase.auth.getUser()` redirect even though middleware already covers them.

Auth tags used below:
- `public` — no auth check.
- `auth` — requires authenticated Supabase user (cookie or Bearer token via `requireUserFromRequest`).
- `cron-secret` — requires `x-cron-secret` header or `?cron_secret=` query matching `VIBES_CRON_SECRET` / `ZILLOW_CRON_SECRET` / `STATUS_REFRESH_CRON_SECRET`.
- `internal-preview` — pages gated by env flag `HOMEMATCH_ENABLE_INTERNAL_PREVIEW`; otherwise return 404.
- `dev-proxy` — only enabled when `SUPABASE_LOCAL_PROXY=true` and the target is a localhost address; production traffic returns 404/403.

---

## API routes

| Path | Methods | Auth | Purpose | Notes |
|------|---------|------|---------|-------|
| `/api/admin/generate-neighborhood-vibes` | POST | cron-secret + admin rate-limit | LLM-generates neighborhood vibe summaries via OpenRouter. | Requires `OPENROUTER_API_KEY`; reads `neighborhoods` + `neighborhood_stats`. |
| `/api/admin/generate-vibes` | GET, POST | cron-secret + admin rate-limit | POST: LLM-generates property vibes from images. GET: status snapshot (counts of properties with/without vibes). | Uses `createStandaloneClient` + `OPENROUTER_API_KEY`. |
| `/api/admin/generate-vibes-zillow` | POST | cron-secret + admin rate-limit + paid RapidAPI gate | Generates property vibes by hitting RapidAPI Zillow first. | Returns 503 unless `RAPIDAPI_PAID_APPROVED=true`. |
| `/api/admin/ingest/zillow` | POST | cron-secret + admin rate-limit + paid RapidAPI gate | Bulk-ingests Zillow listings for Bay Area metros into `properties`. | Long-running; default location list hard-coded. |
| `/api/admin/status-refresh` | POST | cron-secret + admin rate-limit + paid RapidAPI gate | Refreshes `homeStatus` / `is_pending` / `price` for stale properties via RapidAPI. | Has built-in deadline + batch limits. |
| `/api/couples/activity` | GET, OPTIONS (POST/PUT/DELETE/PATCH → 405) | auth + `withRateLimit` | Returns paginated household activity feed. | `limit` clamped 1–100, `offset` ≥ 0. |
| `/api/couples/check-mutual` | GET, OPTIONS (POST/PUT/DELETE/PATCH → 405) | auth | Predicts whether a like on `propertyId` would create a mutual match; returns partner display name + property address. | |
| `/api/couples/disputed` | PATCH | auth + rate-limit + service-role + route-deadline | Update resolution state of a disputed property. | Uses service-role to read partner data; `@service-role-capability` annotation present. |
| `/api/couples/mutual-likes` | GET | auth + `withRateLimit` | Lists properties multiple household members liked, with optional property enrichment. | Cached in `CouplesService`. |
| `/api/couples/notify` | POST | auth + rate-limit | Records an interaction notification + triggers mutual-like notification flow. | Validates body via Zod (`propertyId` UUID, `interactionType` enum). |
| `/api/couples/stats` | GET | auth | Household stats summary for current user. | |
| `/api/health` | GET, OPTIONS (POST/PUT/DELETE/PATCH → 405) | public | Liveness + DB ping. Optional `?expectTest=true` enforces test-mode. | In `PUBLIC_BYPASS_PATHS`. |
| `/api/interactions` | GET, POST, DELETE | auth + rate-limit | Create / list / soft-delete user property interactions (like/dislike/skip/view). | Uses Zod request schemas. |
| `/api/interactions/reset` | DELETE | auth + strict rate-limit | Bulk-delete all interactions for current user; uses 10 s timeout race. | |
| `/api/maps/geocode` | POST | auth + rate-limit | Server-side proxy for Google Maps Geocoding API. | Hides `GOOGLE_MAPS_SERVER_API_KEY`. |
| `/api/maps/metro-boundaries` | GET | public | Returns precomputed MECE neighborhood polygons for a metro. | In-memory 1 h cache. |
| `/api/maps/places/autocomplete` | POST | auth + rate-limit | Server-side proxy for Google Places Autocomplete. | |
| `/api/maps/proxy-script` | GET | public | Streams the Google Maps JS bundle without exposing the key (test-mode returns inline stub). | |
| `/api/maps/script` | GET | public | Returns `{ scriptUrl: '/api/maps/proxy-script', status: 'ready' }` if `GOOGLE_MAPS_SERVER_API_KEY` is set. | |
| `/api/match` | POST, OPTIONS (GET/PUT/DELETE/PATCH → 405) | public | Mock LLM property-match endpoint (`lib/llm/matcher`). | "safe-by-default" mock until LLM client is wired. |
| `/api/neighborhoods/vibes` | GET | auth | Lists neighborhood vibes (joined with `neighborhoods`). Optional `neighborhoodId` filter. | Returns 503 if `neighborhood_vibes` table missing (`42P01`). |
| `/api/performance/metrics` | GET, POST | public (POST rate-limited) | POST: ingest Web Vitals batches; GET: aggregate p50/p75/p95/p99 by metric. | In `PUBLIC_BYPASS_PATHS`; in-memory store, no DB. |
| `/api/properties/marketing` | GET, OPTIONS (POST/PUT/DELETE/PATCH → 405) | public | Static marketing-card payload (mock data). | Wrapped in `withPerformanceTracking`. |
| `/api/properties/vibes` | GET | auth | Lists property vibes joined with `properties`. Optional `propertyId` filter. | |
| `/api/users/avatar` | POST, DELETE | auth + rate-limit (`strict`) + 10 s deadline | Upload / delete a user avatar; validates magic bytes for PNG/JPEG/WebP, max 2 MB. | Uses `avatars` storage bucket. |
| `/api/users/search` | GET | auth + rate-limit + service-role + 2 s deadline | Email-prefix search of onboarded users (excludes self). Min query length 3. | Service-role; `@service-role-capability` annotation present. |
| `/api/zillow/random-image` | GET | public + paid RapidAPI gate | Resolves a random San Francisco property card via RapidAPI Zillow. | 503 unless `RAPIDAPI_PAID_APPROVED=true`. |
| `/auth/callback` | GET | public | Supabase OAuth callback; exchanges `code` for session and redirects to `next` (default `/dashboard`). | Hard-coded `'use server'`. |
| `/supabase/[...path]` | GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD | dev-proxy | Local-only Supabase proxy (next.config rewrite mirror). 404 if disabled, 403 if target is non-loopback. | |

### Pages

| Path | Auth | Purpose | Notes |
|------|------|---------|-------|
| `/` | public | Landing page (marketing). Authenticated users are NOT redirected on hit. | `dynamic = 'force-dynamic'`. |
| `/about` | public | Marketing about page. | |
| `/contact` | public | Contact info / support. | |
| `/cookies` | public | Cookie policy + preferences panel. | |
| `/privacy` | public | Privacy policy. | |
| `/terms` | public | Terms of service. | |
| `/login` | public; redirects authed → `/dashboard` (middleware) | Login form. | `dynamic = 'force-dynamic'`. |
| `/signup` | public; redirects authed → `/dashboard` (middleware) | Signup form. | `dynamic = 'force-dynamic'`. |
| `/reset-password` | public | Password reset flow. | `dynamic = 'force-dynamic'`. |
| `/verify-email` | public | Email verification entry. | `dynamic = 'force-dynamic'`. |
| `/auth/auth-code-error` | public | Auth-callback error landing. | |
| `/invite/[token]` | public | Invite-acceptance landing; uses service role to look up invite by opaque token before auth. | `@service-role-capability` annotation present. |
| `/dashboard` | auth (middleware + page-level redirect) | Main swipe / activity dashboard. | Server component; performs its own `supabase.auth.getUser()` redirect. |
| `/dashboard/activity` | auth (middleware) | Household activity feed page. | |
| `/dashboard/liked` | auth (middleware) | Liked properties list. | |
| `/dashboard/mutual-likes` | auth (middleware) | Mutual-likes list. | |
| `/dashboard/passed` | auth (middleware) | Passed (skip) list. | |
| `/dashboard/viewed` | auth (middleware) | Viewed properties grouped by household. | |
| `/dashboard/vibes-test` | auth + internal-preview | Internal preview of LLM vibes generation. | Layout calls `requireInternalPreviewAccess()`. |
| `/profile` | auth (middleware + page-level redirect) | Profile + activity summary. | |
| `/settings` | auth (middleware + page-level redirect) | Settings tabs (filters, account, notifications). | |
| `/household/create` | auth (middleware + page-level redirect) | Create new household. | |
| `/household/join` | auth (middleware + page-level redirect) | Join existing household by code. | |
| `/couples` | auth (middleware + page-level redirect) | Household management (members + invitations). | `dynamic = 'force-dynamic'`. |
| `/couples/decisions` | auth (middleware) | Disputed-properties resolution view. | |
| `/properties/[id]` | auth (middleware + page-level redirect) | Property detail modal route. | `dynamic = 'force-dynamic'`. |
| `/validation` | auth (middleware) + internal-preview | Internal migration validation dashboard. | `requireInternalPreviewAccess()` → 404 if env flag off. |
| `/demo/ads` | internal-preview only | Preview of ad placements. | NOT in `PROTECTED_PATH_PREFIXES`. |
| `/sponsor-mockups` | internal-preview only | Preview of sponsor placements. | NOT in `PROTECTED_PATH_PREFIXES`. |
| `/robots.txt` (`robots.ts`) | public | Robots policy from `ROBOTS_DISALLOW_PATHS`. | |
| `/sitemap.xml` (`sitemap.ts`) | public | Sitemap from `SEO_PUBLIC_ROUTES`. | |

### Top-level error UI (not routes per se)
- `src/app/layout.tsx` — root layout with consent gates / fonts / Sentry-aware providers.
- `src/app/error.tsx` — root error boundary.
- `src/app/global-error.tsx` — root global-error boundary.
- `src/app/not-found.tsx` — root 404.
- `src/app/500.tsx` — explicit 500 page (referenced by deploy).

---

## Test coverage map

Coverage tiers:
- **U** = direct unit/route test in `__tests__/unit/...`
- **I** = direct integration test in `__tests__/integration/...`
- **E** = direct E2E spec in `__tests__/e2e/...`
- **policy-only** = referenced only by sweep guards (cron-secret opacity, admin method policy, error-envelope scan, rate-limit adoption scan, side-effect policy, etc.) — not behavior tests for the route's own logic.
- **none** = not referenced by any test, including sweeps.

| Route | U | I | E | Notes |
|-------|---|---|---|-------|
| `/api/admin/generate-neighborhood-vibes` | policy-only | — | — | No dedicated route test; only cron/rate-limit/error sweep guards. |
| `/api/admin/generate-vibes` | `__tests__/unit/api/generate-vibes-route.test.ts` | — | — | |
| `/api/admin/generate-vibes-zillow` | policy-only | — | — | No dedicated route test. |
| `/api/admin/ingest/zillow` | `__tests__/unit/api/ingest-zillow-route.test.ts` | — | — | |
| `/api/admin/status-refresh` | `__tests__/unit/api/status-refresh-route.test.ts` | — | — | |
| `/api/couples/activity` | — | `__tests__/integration/api/activity.spec.ts` | — | No dedicated unit test under `__tests__/unit/app/api/couples/`. |
| `/api/couples/check-mutual` | `__tests__/unit/app/api/couples/check-mutual/route.test.ts` | `__tests__/integration/api/couples-check-mutual.spec.ts` | — | |
| `/api/couples/disputed` | `__tests__/unit/app/api/couples/disputed/route.test.ts` | — | `__tests__/e2e/couples-disputed-properties.spec.ts` | |
| `/api/couples/mutual-likes` | `__tests__/unit/app/api/couples/mutual-likes/route.test.ts` | `__tests__/integration/api/mutual-likes.spec.ts` | — | |
| `/api/couples/notify` | `__tests__/unit/app/api/couples/notify/route.test.ts` | — | — | No integration test. |
| `/api/couples/stats` | `__tests__/unit/app/api/couples/stats/route.test.ts` | `__tests__/integration/api/couples-stats.spec.ts` | — | |
| `/api/health` | `__tests__/unit/app/api/health/route.test.ts` | `__tests__/integration/api/health.spec.ts` | — | |
| `/api/interactions` | `__tests__/unit/app/api/interactions/route.test.ts` | `__tests__/integration/api/interactions-route.integration.test.ts` | — | |
| `/api/interactions/reset` | `__tests__/unit/app/api/interactions/reset/route.test.ts` | — | — | |
| `/api/maps/geocode` | `__tests__/unit/api/maps/geocode.route.test.ts` + `__tests__/unit/api/maps/failure-envelope.test.ts` | — | — | |
| `/api/maps/metro-boundaries` | `__tests__/unit/app/api/maps/metro-boundaries/route.test.ts` | `__tests__/integration/api/map-boundaries.integration.test.ts` | `__tests__/e2e/location-map-precomputed.spec.ts` | |
| `/api/maps/places/autocomplete` | `__tests__/unit/app/api/maps/places-autocomplete/route.test.ts` + `__tests__/unit/api/maps/places-autocomplete.route.test.ts` | — | — | |
| `/api/maps/proxy-script` | `__tests__/unit/api/maps-proxy-script.route.test.ts` | — | — | |
| `/api/maps/script` | `__tests__/unit/app/api/maps/script/route.test.ts` | — | — | |
| `/api/match` | **none** (only `__tests__/unit/lib/llm/matcher.test.ts` covers the underlying lib) | — | — | Route handler not exercised by any test. |
| `/api/neighborhoods/vibes` | `__tests__/unit/app/api/neighborhoods/vibes/route.test.ts` | `__tests__/integration/api/neighborhood-vibes.spec.ts` | — | |
| `/api/performance/metrics` | `__tests__/unit/app/api/performance/metrics/route.test.ts` | `__tests__/integration/api/performance-metrics.spec.ts` | — | |
| `/api/properties/marketing` | `__tests__/unit/app/api/properties/marketing/route.test.ts` | `__tests__/integration/api/properties-marketing.spec.ts` | — | |
| `/api/properties/vibes` | `__tests__/unit/app/api/properties/vibes/route.test.ts` | `__tests__/integration/api/property-vibes.spec.ts` | `__tests__/e2e/property-vibes-ui.spec.ts` | |
| `/api/users/avatar` | `__tests__/unit/app/api/users/avatar/route.test.ts` | `__tests__/integration/api/avatar-upload.integration.test.ts` | — | |
| `/api/users/search` | policy-only (`service-role-route-capability-guard`, `route-deadline`, `auth-boundary-consolidation`) | `__tests__/integration/data-layer/users-search.integration.test.ts` | — | No dedicated route unit test. |
| `/api/zillow/random-image` | `__tests__/unit/app/api/zillow/random-image/route.test.ts` | — | — | |
| `/auth/callback` | **none** | — | — | Code-exchange handler is untested. |
| `/supabase/[...path]` | `__tests__/unit/app/supabase-proxy-route.test.ts` | — | — | |

#### Page coverage (high-level)

Most pages have only indirect coverage (component tests for the inner client component, the no-auth E2E sweep, or auth-redirect guards). Pages with **no direct test** beyond the no-auth-public-accessibility sweep / metadata guards:

- `/about`, `/contact`, `/cookies`, `/privacy`, `/terms`, `/auth/auth-code-error` — only no-auth E2E sweep.
- `/dashboard/activity`, `/dashboard/liked`, `/dashboard/passed`, `/dashboard/viewed`, `/dashboard/mutual-likes` — wrap pre-existing components with light component-level tests; no page-level E2E asserting routing/redirect behaviour.
- `/dashboard/vibes-test` — internal preview only; covered solely by `dashboard-route-inventory-drift-guard.test.ts` policy.
- `/sponsor-mockups`, `/demo/ads` — internal preview only; covered by `demo-surface-production-gate.test.ts` policy guard. No behavior tests.
- `/validation` — internal preview only; covered by routing/no-auth-traversal guard. No content-level test.
- `/invite/[token]` — covered by `invite-household-auth-boundary.test.ts` (auth boundary policy) and `couples-leave-household-accept-invite.spec.ts` E2E. No dedicated page test for the rendered invite landing.
- `/reset-password`, `/verify-email`, `/login`, `/signup` — covered indirectly via component tests (`LoginForm.test.tsx`, `SignupForm.test.tsx`, `ResetPasswordForm.test.tsx`, `VerifyEmailForm.test.tsx`) + E2E auth-lifecycle specs; no page-level snapshot test.
- `/properties/[id]` — covered via `properties-route-auth.spec.ts` E2E + property modal E2E suite.
- `/profile`, `/settings`, `/household/create`, `/household/join`, `/couples`, `/couples/decisions`, `/dashboard` — covered via E2E + component tests; redirect behavior covered by `protected-page-auth-redirects.test.tsx`.

---

## Routes with NO test coverage (route-handler logic untested)

These are routes whose handler bodies are not exercised by any unit, integration, or E2E test. Sweep guards (cron-secret opacity, error envelope scan, rate-limit adoption, side-effect policy) only assert structural invariants — they do not validate behaviour.

1. **`/api/match` (POST)** — no test references the route handler at all. Only `lib/llm/matcher.test.ts` covers the underlying function.
2. **`/auth/callback` (GET)** — Supabase code-exchange handler has no test, despite being a security-sensitive surface.
3. **`/api/admin/generate-neighborhood-vibes` (POST)** — only swept by policy guards; no behaviour test.
4. **`/api/admin/generate-vibes-zillow` (POST)** — only swept by policy guards; no behaviour test.
5. **`/api/users/search` (GET)** — only an integration test exists at the data-layer level; no dedicated route handler test (sweep guards only).
6. **`/api/couples/activity` (GET)** — integration test exists; **no unit test** under `__tests__/unit/app/api/couples/`. Pagination clamp logic is not unit-asserted.
7. **`/api/couples/notify` (POST)** — unit test exists; **no integration test** to validate the cross-service notification path end-to-end.
8. **`/api/interactions/reset` (DELETE)** — unit test exists; **no integration test** for the multi-row delete + race timeout behaviour.
9. **`/api/zillow/random-image` (GET)** — unit test exists; **no integration test** against fixture or live RapidAPI.
10. **`/api/maps/geocode` (POST)**, **`/api/maps/places/autocomplete` (POST)**, **`/api/maps/proxy-script` (GET)**, **`/api/maps/script` (GET)** — unit tests only; **no integration tests**.

### Pages with no dedicated direct test
(only no-auth-public-accessibility E2E sweep + metadata/seo policy guards)

- `/about`, `/contact`, `/cookies`, `/privacy`, `/terms`
- `/auth/auth-code-error`
- `/dashboard/vibes-test`
- `/demo/ads`, `/sponsor-mockups`
- `/validation`

---

## Cross-cutting observations

- **API routes are fully self-guarded**; middleware does not enforce auth on `/api/*`. Each handler must call `requireUserFromRequest` or check `x-cron-secret`. Sweep guards (`auth-boundary-consolidation`, `cron-admin-secret-opacity`, `service-role-route-capability-guard`) validate this is consistently done.
- **All `_/api/admin/*`** routes share a single auth pattern: `VIBES_CRON_SECRET || ZILLOW_CRON_SECRET` (status-refresh adds `STATUS_REFRESH_CRON_SECRET`); RapidAPI-paid surfaces additionally require `RAPIDAPI_PAID_APPROVED=true`.
- **Service-role-capable surfaces** (annotated `@service-role-capability`): `/api/couples/disputed`, `/api/users/search`, `/invite/[token]`. All are flagged for D1 follow-up to migrate to constrained RPCs.
- **Unprotected by middleware** but auth-checked in-handler: every protected page calls `supabase.auth.getUser()` itself in addition to relying on middleware. Defense in depth, but doubles auth round-trips on first render.
- **Internal preview surfaces** (`/demo/ads`, `/sponsor-mockups`, `/dashboard/vibes-test`, `/validation`) all return `notFound()` in production unless `HOMEMATCH_ENABLE_INTERNAL_PREVIEW=true`. They are SEO-noindexed via metadata. Note that `/demo/ads` and `/sponsor-mockups` are NOT in `PROTECTED_PATH_PREFIXES` — anonymous traffic with the env flag enabled would render them.
- **The `/supabase/[...path]` proxy** is a development-only safety hatch; both the env-flag and a localhost-only target check are required before traffic is forwarded. Production hits return 404.
- **Performance metrics endpoint** is one of two paths bypassed by middleware (`PUBLIC_BYPASS_PATHS`); GET is unauthenticated and returns aggregated metrics. POST is rate-limited but also unauthenticated. There is no privilege check guarding the GET aggregation.

---

## Counts

- API route files: **28** (27 under `/api/`, plus `/auth/callback`, plus `/supabase/[...path]`).
- Distinct API HTTP method handlers: **GET** 17, **POST** 16, **DELETE** 4, **PATCH** 1, **OPTIONS** 6 (excluding 405-only stubs and the `[...path]` catch-all that maps every method to one handler).
- Page routes: **30** (excluding `layout.tsx` / `error.tsx` / `not-found.tsx` / `globals.css`).
- Protected page prefixes (middleware): **7** (`/dashboard`, `/profile`, `/household`, `/settings`, `/validation`, `/couples`, `/properties`).
- Internal-preview-gated pages: **4** (`/demo/ads`, `/sponsor-mockups`, `/dashboard/vibes-test`, `/validation`).
- Routes with **no behaviour test**: **5** API handlers (`/api/match`, `/auth/callback`, `/api/admin/generate-neighborhood-vibes`, `/api/admin/generate-vibes-zillow`, `/api/users/search`-route-level), plus several pages whose only coverage is sweep guards.

---
*Read-only audit; no source files modified.*
