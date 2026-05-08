# P0 Full Route/API Endpoint Inventory Matrix

Task: t_84ff95e6
Scope: read-only inventory from code/tests; no browser swarms, external probes, deploys, paid APIs, or repo mutations during worker execution.

## Summary

Completed read-only HomeMatch route/API inventory. Found 28 route-handler files (26 under /api plus auth callback and local Supabase proxy), 29 page routes, 2 metadata routes, 1 server-action file, and middleware; no local/live requests or tests were run per read-only/no-deploy constraints.

## Counts

- route_handler_files: 28
- api_route_handlers: 26
- non_api_route_handlers: 2
- page_routes: 29
- metadata_routes: 2
- server_action_files: 1
- middleware: 1
- tests_scanned_excluding_worktrees: 288

## Global findings

- Middleware protects page prefixes: /dashboard, /profile, /household, /settings, /validation, /couples, /properties.
- Middleware public bypasses /api/performance/metrics and /api/health.
- Admin/cron endpoints use x-cron-secret or cron_secret query plus admin rate limiting; query-secret support should be reviewed before production because URLs/logs can leak secrets.
- Public paid-provider surfaces exist for Google Maps script proxy and Zillow random image; they have cache/timeout coverage but no user auth.
- /api/performance/metrics is public POST with IP rate limit; keep only if needed and add abuse/storage limits.
- Several routes explicitly export non-GET methods only to return methodNotAllowed; keep/delete decisions should treat these as blocked methods, not active mutating surfaces.

## Approval-gated checklist

- If live status is required, get explicit approval before hitting production/local services because endpoints may touch Supabase, Google Maps, Zillow/RapidAPI, OpenRouter, or email systems.
- If admin/cron endpoint validation is required, use synthetic local env and fake/mock upstreams; do not use real secrets while Shan is sleeping.
- Before revival launch, decide whether demo/dev pages (/demo/ads, /sponsor-mockups, /dashboard/vibes-test, /validation) should be hidden, gated, or deleted.

## Endpoint matrix

| Path | Method | Auth | Rate limit | Outbound calls | Timeout | Cache | Tests | Live/local | Action |
|---|---|---|---|---|---|---|---|---|---|
| /middleware | middleware | Supabase session refresh; redirects unauthenticated users on protected page prefixes | none | Supabase auth getUser | MIDDLEWARE_SUPABASE_TIMEOUT_MS with AbortController | none/default; security headers applied | __tests__/unit/middleware.test.ts, __tests__/unit/lib/routing/protected-routes.test.ts, __tests__/unit/lib/middleware/rate-limiter-check.test.ts | not run | keep |
| /api/admin/generate-neighborhood-vibes | POST | cron secret via x-cron-secret or cron_secret | rateLimitAdminRoute | Supabase, OpenRouter/LLM | none found | default/none | __tests__/integration/api/neighborhood-vibes.spec.ts, __tests__/integration/api/property-vibes.spec.ts | not run | keep/fix: review query-secret support and add explicit timeout if LLM call can hang |
| /api/admin/generate-vibes-zillow | POST | cron secret via x-cron-secret or cron_secret | rateLimitAdminRoute | Zillow/RapidAPI, OpenRouter/LLM | fetchWithTimeout for Zillow fetches | default/none | __tests__/unit/api/generate-vibes-route.test.ts, __tests__/unit/api/ingest-zillow-route.test.ts | not run | keep/fix: cron/admin paid-upstream surface |
| /api/admin/generate-vibes | GET,POST | cron secret; POST accepts header or query, GET query only | rateLimitAdminRoute | Supabase, OpenRouter/LLM | none found | noStoreJson/cache-control helper | __tests__/unit/api/generate-vibes-route.test.ts, __tests__/integration/api/property-vibes.spec.ts | not run | keep/fix: remove query secret if possible; add timeout |
| /api/admin/ingest/zillow | POST | ZILLOW_CRON_SECRET via header or query | rateLimitAdminRoute | Supabase, Zillow/RapidAPI | none found at route level | default/none | __tests__/unit/api/ingest-zillow-route.test.ts, __tests__/unit/ingestion/zillow-ingest.test.ts | not run | keep/fix: cron paid-upstream ingestion surface |
| /api/admin/status-refresh | POST | STATUS_REFRESH_CRON_SECRET or ZILLOW_CRON_SECRET via header or query | rateLimitAdminRoute plus internal hit counters | Supabase, Zillow/RapidAPI | fetchWithTimeout; deadline buffer envs | default/none | __tests__/unit/api/status-refresh-route.test.ts | not run | keep/fix: cron paid-upstream surface |
| /api/couples/activity | GET plus OPTIONS/POST/PUT/PATCH/DELETE methodNotAllowed | requireUserFromRequest | withRateLimit | Supabase, couples service | Promise.race timeout for activity fetch | noStoreJson | __tests__/integration/api/activity.spec.ts, __tests__/unit/components/profile/ActivityStats.test.tsx | not run | keep |
| /api/couples/check-mutual | GET plus OPTIONS/POST/PUT/PATCH/DELETE methodNotAllowed | requireUserFromRequest | none found | Supabase, couples service, email notification path likely in service | none found | noStoreJson | __tests__/integration/api/couples-check-mutual.spec.ts, __tests__/unit/app/api/couples/check-mutual/route.test.ts | not run | keep/fix: consider rate limit because it can trigger mutual-check work |
| /api/couples/disputed | GET,PATCH | requireUserFromRequest | checkRateLimit on PATCH | Supabase | none found | noStoreJson | __tests__/e2e/couples-disputed-properties.spec.ts, __tests__/unit/app/api/couples/disputed/route.test.ts | not run | keep |
| /api/couples/mutual-likes | GET | requireUserFromRequest | withRateLimit | Supabase, couples service | Promise.race timeout | noStoreJson | __tests__/integration/api/mutual-likes.spec.ts, __tests__/unit/app/api/couples/mutual-likes/route.test.ts | not run | keep |
| /api/couples/notify | POST | requireUserFromRequest | checkRateLimit couples:notify:user | Supabase, couples service/email | none found | default/none | __tests__/unit/app/api/couples/notify/route.test.ts | not run | keep/fix: add timeout around email/service call if absent in service |
| /api/couples/stats | GET | requireUserFromRequest | none found | Supabase, couples service | none found | noStoreJson | __tests__/integration/api/couples-stats.spec.ts, __tests__/unit/app/api/couples/stats/route.test.ts | not run | keep |
| /api/health | GET,OPTIONS plus POST/PUT/PATCH/DELETE methodNotAllowed | public bypass in middleware | none | Supabase connectivity select | none found | Cache-Control no-cache/no-store | __tests__/integration/api/health.spec.ts, __tests__/unit/app/api/health/route.test.ts | not run | keep/fix: add DB timeout or make shallow health separate from DB health |
| /api/interactions | GET,POST,DELETE | requireUserFromRequest | checkRateLimit on GET/POST | Supabase, couples service | Promise.race timeouts on summary/query paths | noStoreJson | __tests__/integration/api/interactions-route.integration.test.ts, __tests__/unit/app/api/interactions/route.test.ts | not run | keep |
| /api/interactions/reset | DELETE | requireUserFromRequest | checkRateLimit | Supabase, couples service | Promise.race timeout | default/none | __tests__/unit/app/api/interactions/reset/route.test.ts, __tests__/e2e/settings-filters-reset.spec.ts | not run | keep |
| /api/maps/geocode | POST | requireUserFromRequest | checkRateLimit by user | Google Maps Geocoding | fetchWithTimeout 10s | default/none | __tests__/unit/api/maps/geocode.route.test.ts | not run | keep |
| /api/maps/metro-boundaries | GET | public | none | Supabase service-role client | none found | Cache-Control public max-age=3600 | __tests__/integration/api/map-boundaries.integration.test.ts, __tests__/integration/security/rls-boundaries.test.ts | not run | keep/fix: confirm public data and service-role exposure are intentional |
| /api/maps/places/autocomplete | POST | requireUserFromRequest | checkRateLimit by user | Google Places Autocomplete | fetchWithTimeout 10s | default/none | __tests__/unit/api/maps/places-autocomplete.route.test.ts, __tests__/unit/app/api/maps/places-autocomplete/route.test.ts | not run | keep |
| /api/maps/proxy-script | GET | public | none | Google Maps JS script | fetchWithTimeout 10s | Cache-Control no-store for errors / public max-age=3600 for script | __tests__/unit/api/maps-proxy-script.route.test.ts | not run | keep/fix: paid-key proxy; add/refine rate/referrer/origin controls if needed |
| /api/maps/script | GET | public | none | Google Maps config/script response | none found | noStoreJson/cache helper | __tests__/unit/app/api/maps/script/route.test.ts | not run | keep/fix: ensure it never returns raw server key if endpoint remains public |
| /api/neighborhoods/vibes | GET | requireUserFromRequest | none found | Supabase | none found | noStoreJson | __tests__/integration/api/neighborhood-vibes.spec.ts, __tests__/unit/app/api/neighborhoods/vibes/route.test.ts | not run | keep |
| /api/performance/metrics | GET,POST | public bypass in middleware | checkRateLimit by IP for POST plus 64 KiB content-length cap and bounded metrics/customMetrics/string schema | none obvious | none found | noStoreJson/cache helper | __tests__/integration/api/performance-metrics.spec.ts, __tests__/unit/app/api/performance/metrics/route.test.ts | targeted unit run passed 2026-05-08 | keep with public-ingest size/shape controls; durable observability sink remains separate production decision |
| /api/properties/marketing | GET plus OPTIONS/POST/PUT/PATCH/DELETE methodNotAllowed | public | none | static marketing payload/performance utilities | none found | default/none | __tests__/integration/api/properties-marketing.spec.ts, __tests__/unit/app/api/properties/marketing/route.test.ts | not run | keep |
| /api/properties/vibes | GET | requireUserFromRequest | none found | Supabase | none found | noStoreJson | __tests__/integration/api/property-vibes.spec.ts, __tests__/unit/app/api/properties/vibes/route.test.ts | not run | keep |
| /api/users/avatar | POST,DELETE | requireUserFromRequest | rateLimit strict/standard | Supabase storage/database | none found | default/none | __tests__/integration/api/avatar-upload.integration.test.ts, __tests__/unit/app/api/users/avatar/route.test.ts | not run | keep/fix: consider upload timeout/size validation if not elsewhere |
| /api/users/search | GET | requireUserFromRequest | checkRateLimit by user | Supabase | none found | noStoreJson | __tests__/integration/data-layer/users-search.integration.test.ts | not run | keep |
| /api/zillow/random-image | GET | public | none | Zillow/RapidAPI | fetchWithTimeout 10s | noStoreJson/cache helper; route has Next config | __tests__/unit/app/api/zillow/random-image/route.test.ts, __tests__/integration/ui/property-detail-modal-images.test.tsx | not run | keep/fix: paid-upstream public demo surface; cache/rate-limit or gate if revived |
| /auth/callback | GET | public OAuth/email callback | none | Supabase auth exchangeCodeForSession | none found | default/none | none found | not run | keep |
| /supabase/*path | GET,POST,PUT,PATCH,DELETE,OPTIONS,HEAD | public but disabled unless SUPABASE_LOCAL_PROXY=true; enabled target restricted to loopback HTTP hosts | none | local Supabase proxy target fetch only after disabled/allowlist gates | none found | fetch cache no-store | __tests__/integration/infrastructure/supabase-proxy.integration.test.ts; __tests__/unit/app/supabase-proxy-route.test.ts | local targeted Jest passed 3/3 via systemd-run | keep/fixed: proxy remains disabled by default and refuses non-loopback targets without upstream fetch |
| / | GET page | public | n/a | page/data imports may use Supabase | none found | Next page config | marketing/component unit tests | not run | keep |
| /about | GET page | public | n/a | none obvious | none | default | none found | not run | keep |
| /contact | GET page | public | n/a | none obvious/static | none | default | none found | not run | keep |
| /cookies | GET page | public | n/a | none obvious/static | none | default | __tests__/unit/lib/cookies/consent.test.ts | not run | keep |
| /privacy | GET page | public | n/a | none obvious/static policy text | none | default | none found | not run | keep |
| /terms | GET page | public | n/a | none obvious/static policy text | none | default | none found | not run | keep |
| /login | GET page | public; redirects to dashboard if already authed via middleware | n/a | auth UI only | none | Next config | __tests__/e2e/auth-login-flow.spec.ts, __tests__/integration/auth/login-flow.integration.test.tsx | not run | keep |
| /signup | GET page | public; redirects to dashboard if already authed via middleware | n/a | auth UI only | none | Next config | __tests__/unit/components/auth/SignupForm.test.tsx | not run | keep |
| /verify-email | GET page | public | n/a | auth UI only | none | Next config | __tests__/unit/components/auth/VerifyEmailForm.test.tsx | not run | keep |
| /reset-password | GET page | public | n/a | Supabase auth client via form | none | Next config | __tests__/unit/components/features/auth/ResetPasswordForm.test.tsx | not run | keep |
| /auth/auth-code-error | GET page | public | n/a | none obvious | none | Next config | error-handling E2E coverage | not run | keep |
| /dashboard | GET page | protected by middleware | n/a | Supabase/data loaders | some page/data timeout signal found | Next config | __tests__/unit/components/DashboardStats.test.tsx, dashboard component/e2e tests | not run | keep |
| /dashboard/activity | GET page | protected by middleware | n/a | client/API usage | none found | default | __tests__/integration/api/activity.spec.ts | not run | keep |
| /dashboard/liked | GET page | protected by middleware | n/a | client/API usage | none | default | none found | not run | keep |
| /dashboard/mutual-likes | GET page | protected by middleware | n/a | client/API usage | none | default | __tests__/unit/components/dashboard/MutualLikesListPage.test.tsx | not run | keep |
| /dashboard/passed | GET page | protected by middleware | n/a | client/API usage | none | default | none found | not run | keep |
| /dashboard/viewed | GET page | protected by middleware | n/a | client/API usage | none | default | __tests__/unit/components/dashboard/GroupedViewedPropertiesPage.test.tsx | not run | keep |
| /dashboard/vibes-test | GET page | protected by middleware | n/a | vibes/OpenRouter/Zillow demo/test UI | none found | default | property-vibes related tests | not run | delete or gate before revival launch |
| /profile | GET page | protected by middleware | n/a | Supabase/profile services | none | default | profile component/unit tests | not run | keep |
| /settings | GET page | protected by middleware | n/a | Supabase/settings services | none | default | settings E2E/unit tests | not run | keep |
| /validation | GET page | protected by middleware | n/a | validation UI | none | Next config | __tests__/e2e/fixtures-validation.spec.ts | not run | delete or gate before revival launch |
| /couples | GET page | protected by middleware | n/a | Supabase/couples services | none | Next config | couples e2e/accessibility/component tests | not run | keep |
| /couples/decisions | GET page | protected by middleware | n/a | client/API usage | none | default | none found | not run | keep |
| /properties/:id | GET page | protected by middleware | n/a | Supabase/property data | none | Next config | property detail/modal tests | not run | keep |
| /household/create | GET page | protected by middleware | n/a | Supabase/users service | none | default | __tests__/unit/services/users-client.createHousehold.test.ts | not run | keep |
| /household/join | GET page | protected by middleware | n/a | Supabase/household join UI | none | default | household clipboard/join E2E related | not run | keep |
| /invite/:token | GET page | page/action auth checks; not in middleware protected prefixes | none found | Supabase, email/couples invite flow | none found | default | invite/couples E2E related | not run | keep/fix: verify unauthenticated invite-token handling is intended |
| /invite/:token | server actions | server action calls createClient/getUser flow | none found | Supabase | none found | n/a | invite/couples E2E related | not run | keep |
| /demo/ads | GET page | public | n/a | ad demo/static | none | default | __tests__/unit/components/ads/InFeedAd.test.tsx | not run | delete or gate before revival launch |
| /sponsor-mockups | GET page | public | n/a | static mockups | none | default | none found | not run | delete or gate before revival launch |
| /robots | GET metadata | public | n/a | none | none | default | __tests__/unit/app/metadata-routes.test.ts | not run | keep |
| /sitemap | GET metadata | public | n/a | none | none | default | __tests__/unit/app/metadata-routes.test.ts | not run | keep |

## Next closure implications

- P0 inventory is materially complete as a static matrix, but live/local evidence is still incomplete.
- Safe next repo-local work: add/extend no-credential route/endpoint guard tests for public pages, protected redirects, missing-code auth callback, metro-boundaries, cron-secret denials, and Supabase proxy safety.
- Authenticated positive traversal remains approval-gated on a seeded test auth/session and safe local/test data path.
