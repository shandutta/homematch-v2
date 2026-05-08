# P0 Site Traversal Acceptance Matrix

Task: t_5379ec6b
Scope: read-only acceptance criteria from code/docs; no browser swarm, no external probes, no deploys, no paid APIs, no production/user data access.
Source repo inspected: /home/shan/projects/homematch-v2
Primary sources:
- reports/home-match-business-revival-operating-plan.md
- reports/home-match-revival/routes-and-endpoints.json
- reports/home-match-revival/browser-traversal.json
- reports/home-match-revival/api-probe-matrix.json
- middleware.ts
- src/lib/routing/protected-routes.ts
- src/app/** page.tsx and route.ts
- __tests__/e2e/smoke-min.spec.ts and route/component/unit/integration test inventory

## Executive readout

Current public/auth traversal split:
- Public page routes: 14 page routes plus metadata/static Next routes. Safe to verify locally without user credentials if the app can boot with local/env-safe config.
- Authenticated page routes: 15 page routes under /dashboard, /profile, /household, /settings, /validation, /couples, /properties. Need a Shan-approved seeded test auth session before live traversal.
- API/route handlers: 28 code-discovered endpoints. Only a small subset is safe for unauthenticated local live probing. Most should remain code-expectation-only until a local-only harness and test auth/session are approved.

Prior baseline already verified in a real local browser:
- / rendered with header, hero, feature sections, footer, and no browser console errors.
- /cookies rendered; cookie banner appeared; Accept worked; console stayed clean.

P0 remaining acceptance target:
- Every public page below gets a no-credential local render/navigation check.
- Every protected page below gets an unauthenticated redirect check now, then an authenticated UX/data check only after Shan approves test auth/session.
- Every API gets either a safe no-credential probe, an unauthenticated denial check, or an approval-gated authenticated/secret test case.

## Traversal guardrails

Allowed without Shan present/approval:
- Read code/docs/tests.
- Run local app only with repo-local safe env and no production writes.
- Browser-check public, non-mutating pages locally.
- Verify protected pages redirect to /login with redirectTo preserved.
- Hit /api/health and other explicitly safe read-only local endpoints only if local env cannot touch production/customer data.

Not allowed without explicit approval:
- Logging into production or using real user accounts.
- Browser swarms, broad external probes, deploys, paid APIs, or external dashboards.
- Cron/admin endpoints that generate vibes, ingest Zillow, refresh statuses, or invoke OpenRouter/Zillow/Google paid paths.
- Mutation endpoints that create/delete interactions, upload/delete avatars, send notifications, join/create households, or reset user data.

## Public no-credential traversal checklist

Use a single local browser session. Capture: HTTP status, final URL, core visible UI, console errors, network 4xx/5xx, mobile sanity if time allows. Do not submit forms against external services unless local mocks are active.

| Route | File | Expected behavior | Verify now without credentials | Evidence / current coverage | Action |
|---|---|---|---|---|---|
| / | src/app/page.tsx | Marketing landing. If user is already authenticated, redirects to /dashboard. Shows Header, HeroSection, FeatureGrid, HowItWorks, CtaBand, Footer, structured data. | Yes. In clean unauth session, load page, verify header/h1/footer/CTA links to /signup and /login, no hard console errors. | Already browser-verified in browser-traversal.json; e2e smoke-min covers render and CTA links. | Keep; rerun final P0 public traversal after local-dev guard is stable. |
| /about | src/app/about/page.tsx | Public about/marketing page with metadata. | Yes. Load, verify content, header/footer if present, metadata title, no console errors. | No direct test found. | Add to public traversal pass. |
| /contact | src/app/contact/page.tsx | Public contact page with metadata. | Yes, but do not submit external forms unless local-only. Verify page renders and any mail/contact links are inert/safe. | No direct test found. | Add to public traversal pass. |
| /cookies | src/app/cookies/page.tsx | Cookie policy/preferences surface; CookieConsent actions available. | Yes. Verify Accept, Reject, Manage, preference persistence in local storage/cookies. | Already browser-verified; unit coverage for cookie consent. | Keep; include manage/reject branches in final pass. |
| /demo/ads | src/app/demo/ads/page.tsx | Public ad monetization mock/demo. | Yes locally, but block actual ad network/account changes. Verify placeholder/demo UI only. | InFeedAd unit coverage. | Keep as public demo unless product decides to hide/delete. |
| /invite/:token | src/app/invite/[token]/page.tsx | Public invite acceptance entry. May redirect/login or show AcceptInviteForm depending token/session. | Partially. Use obviously invalid synthetic token only; verify graceful invalid/expired state and login redirect. Do not use real invites. | E2E coverage for accept-invite/edge cases. | Needs test token fixture for full positive path. |
| /login | src/app/login/page.tsx | Public sign-in form; authenticated users redirect onward. | Yes. Verify email/password fields, submit validation with invalid local-only inputs, forgot/reset links if present. Do not use real creds. | e2e smoke-min basic auth elements; auth login flow integration/e2e. | Keep; final unauth traversal must include redirectTo preservation from protected routes. |
| /privacy | src/app/privacy/page.tsx | Public privacy policy; AdSense/legal language. | Yes. Verify full render, links, no console errors. | No direct test found. | Add to public traversal pass. |
| /reset-password | src/app/reset-password/page.tsx | Public reset password form. | Yes with validation-only; do not trigger real emails unless local/test mail sink approved. | ResetPasswordForm unit coverage, no page traversal found. | Needs local-only reset-email strategy. |
| /signup | src/app/signup/page.tsx | Public signup form. | Yes with validation-only; do not create production users. | SignupForm unit coverage; smoke-min CTA reaches /signup. | Full create-account path needs test auth approval. |
| /sponsor-mockups | src/app/sponsor-mockups/page.tsx | Public sponsorship mockup page. | Yes. Verify render only; no ad dashboard changes. | No direct test found. | Keep or delete decision after product review. |
| /terms | src/app/terms/page.tsx | Public terms page. | Yes. Verify render/links. | No direct test found. | Add to public traversal pass. |
| /verify-email | src/app/verify-email/page.tsx | Public verify-email instruction/form page. | Yes display-only. Do not use real email links. | VerifyEmailForm unit coverage. | Positive token flow needs test auth/email fixture. |
| /auth/auth-code-error | src/app/auth/auth-code-error/page.tsx | Public auth error page. | Yes. Direct load and verify helpful error/call-to-action. | Auth component/helper unit coverage only. | Add to public traversal pass. |
| /auth/callback | src/app/auth/callback/route.ts | Public route handler for Supabase OAuth/code exchange. | Code-only without valid test auth code. Verify missing code/failure behavior locally if safe. | No direct test found. | Full positive flow approval-gated. |
| /robots.txt and /sitemap.xml | src/app/robots.ts, src/app/sitemap.ts | Metadata routes for crawlability. | Yes. Fetch locally and verify correct base URL, no private routes leaked. | metadata-routes unit coverage. | Include in public non-browser fetch pass. |
| /404 / not-found | src/app/not-found.tsx | Not-found UI. | Yes. Visit synthetic missing route and verify branded 404/no crash. | not-found unit coverage. | Include in public traversal pass. |
| /500, /error, /global-error | src/app/500.tsx, src/app/error.tsx, src/app/global-error.tsx | Error boundary surfaces. | Mostly code/unit only; avoid forcing broad runtime failures. | unit app/error and global-error coverage. | Use unit/e2e error simulation, not production probe. |

## Protected/authenticated page traversal checklist

Unauthenticated verification can run now: direct navigation should redirect to /login?redirectTo=<original path>. Full page UX/data acceptance requires Shan-approved test session with seeded local/test Supabase users and known fixture data.

| Route | File | Expected authenticated behavior | No-credential check now | Needs approved test auth/session | Existing coverage hints | Action |
|---|---|---|---|---|---|---|
| /dashboard | src/app/dashboard/page.tsx | Loads user profile/preferences, loadDashboardData, DashboardErrorBoundary, dashboard stats, property grid, swipe/view interactions, mutual likes section. | Redirect to /login with redirectTo=/dashboard. | Yes: verify seeded properties render; like/pass/view update UI; empty state; DB timeout/error boundary. | Dashboard components and e2e property UI coverage. | P0 auth primary smoke path. |
| /dashboard/activity | src/app/dashboard/activity/page.tsx | Household/user interaction activity list. | Redirect check. | Yes: verify list, empty state, pagination if present. | InteractionsList/interaction-pages tests. | Include after /dashboard. |
| /dashboard/liked | src/app/dashboard/liked/page.tsx | List liked properties. | Redirect check. | Yes: seed at least one liked property and empty state. | Dashboard/interactions tests. | Include. |
| /dashboard/mutual-likes | src/app/dashboard/mutual-likes/page.tsx | Mutual likes list. | Redirect check. | Yes: seed two household users with overlap and no-overlap states. | MutualLikesList/MutualLikesSection tests. | Include. |
| /dashboard/passed | src/app/dashboard/passed/page.tsx | Passed/skipped property list. | Redirect check. | Yes: seed skipped interactions and empty state. | Interactions tests. | Include. |
| /dashboard/viewed | src/app/dashboard/viewed/page.tsx | Viewed property list/grouping. | Redirect check. | Yes: seed viewed interactions. | GroupedViewedPropertiesPage tests. | Include. |
| /dashboard/vibes-test | src/app/dashboard/vibes-test/page.tsx | Internal vibes test UI. | Redirect check. | Yes, but avoid paid LLM/generation calls unless mocked. | Vibes service/route tests. | Candidate delete/hide unless product wants internal tool. |
| /profile | src/app/profile/page.tsx | Profile form, avatar picker/uploader, activity stats, household section. | Redirect check. | Yes: view/update profile using seeded local user; avatar upload/delete only with local storage/test bucket approval. | Profile component tests, avatar API unit tests. | Include, mutation branches approval-gated. |
| /settings | src/app/settings/page.tsx | Account, preferences, notifications, saved searches, location map selector. | Redirect check. | Yes: verify tabs/sections, saved search CRUD local-only, map selector with mocked/safe maps path. | Settings e2e/unit coverage. | Include; external Maps calls gated. |
| /household/create | src/app/household/create/page.tsx | CreateHouseholdForm; may redirect based on existing household state. | Redirect check. | Yes: with user without household, create local/test household only. | Household e2e/integration coverage. | Approval-gated positive mutation. |
| /household/join | src/app/household/join/page.tsx | JoinHouseholdForm; may redirect based on existing household state. | Redirect check. | Yes: use seeded invite/test household only. | Household/invite e2e coverage. | Approval-gated positive mutation. |
| /couples | src/app/couples/page.tsx | CouplesPageClient. Branches: no-household CTA, waiting-partner invite modal, active household with hero, disputed alert, mutual likes, activity, stats, refresh. | Redirect check preserving query params. | Yes: needs 3 fixture states: no household, one-member household, two-member household with mutual likes/disputes/activity. | Couples unit/integration/e2e coverage. | P0 auth secondary primary path. |
| /couples/decisions | src/app/couples/decisions/page.tsx | Couples decision/dispute surface. | Redirect check. | Yes: seed disputed/decision data. | Couples/disputed tests. | Include after /couples active fixture. |
| /properties/:id | src/app/properties/[id]/page.tsx | Property detail route/modal; map/images/gallery; notFound or redirect on missing/inaccessible property. | Redirect check for synthetic ID. | Yes: seed valid property ID, missing ID, image fallback, map. Avoid external map unless mocked/safe. | Property modal/map/gallery e2e + unit coverage. | Include with valid fixture ID. |
| /validation | src/app/validation/page.tsx | Validation/debug page. | Redirect check. | Yes only if intended to remain shipped. | fixtures-validation e2e. | Candidate restrict/delete after P0 if not user-facing. |

## API endpoint acceptance matrix

Probe classes:
- SAFE_PUBLIC_LOCAL: may be checked locally without credentials if no production data/external spend is touched.
- DENY_ONLY_NOW: verify unauthenticated request is rejected or redirected; full positive path requires auth/session/secret.
- APPROVAL_GATED: do not call except in local-only approved harness with seeded data/secrets/mocks.
- CODE_ONLY: reason from code/tests until a safe harness exists.

| Endpoint | Methods | Auth boundary | Probe class | Expected no-credential behavior | Full acceptance / gated positive check | Test coverage hint | Action |
|---|---:|---|---|---|---|---|---|
| /api/health | GET; rejects non-GET | public bypass in middleware | SAFE_PUBLIC_LOCAL | 200 JSON health or safe degraded info; non-GET rejected, no hang. | Verify local/test env markers and no secret leakage. | unit + integration health tests. | Keep. |
| /api/performance/metrics | POST; rejects GET | public middleware bypass | SAFE_PUBLIC_LOCAL with caution | POST with tiny synthetic metric should return accepted/no-op; GET rejected. | Confirm no external analytics/account write. | unit + integration performance-metrics. | Keep if local-only sink. |
| /api/properties/marketing | GET; rejects non-GET | public/none | SAFE_PUBLIC_LOCAL | 200 marketing-safe property payload or empty response; no auth. | Verify cache headers and no private fields. | unit + integration properties-marketing. | Keep. |
| /api/maps/metro-boundaries | GET | public/rate-limited-ish | SAFE_PUBLIC_LOCAL if data local | 200 for known metro or validation error for bad metro; no external paid call. | Verify debug does not leak internals. | no direct test found. | Add coverage. |
| /api/maps/script | GET | public/rate-limited-ish | CODE_ONLY or SAFE if key-mocked | Should return/proxy script config only with safe env; may expose public Maps key intentionally. | Verify cache/CORS and key restrictions after dashboard approval. | unit route test. | Keep, external key review gated. |
| /api/maps/proxy-script | GET | public/rate-limited-ish | CODE_ONLY or SAFE if key-mocked | Similar secure Maps script proxy behavior. | Verify no unrestricted key leakage. | unit proxy-script test. | Keep, external key review gated. |
| /api/maps/geocode | POST | public/rate-limited, external Google | APPROVAL_GATED | Without body/key, validation/error; do not send real geocode calls. | Mock Google or use approved key budget; verify validation/rate-limit/cache. | unit geocode route test. | Gate external calls. |
| /api/maps/places/autocomplete | POST | public/rate-limited, external Google | APPROVAL_GATED | Without body/key, validation/error; do not send real Places calls. | Mock Google or use approved key budget; verify validation/rate-limit/cache. | unit route tests. | Gate external calls. |
| /api/zillow/random-image | GET | public proxy/external Zillow | APPROVAL_GATED | Do not call if it reaches Zillow/RapidAPI. | Mock Zillow, verify cache/fallback/error. | unit random-image route test. | Gate external calls. |
| /auth/callback | GET | public Supabase auth exchange | CODE_ONLY / DENY_ONLY_NOW | Missing code should redirect/error safely. | Positive code exchange requires test auth provider/session. | no direct route test found. | Add missing-code test. |
| /supabase/:...path | ANY/proxy | none/proxy | CODE_ONLY | Do not broad-probe proxy. | Harness should verify allowed path/method set, no open proxy, auth/cookie handling. | no direct test found. | Security review needed. |
| /api/couples/activity | GET plus explicit unsupported rejections | user | DENY_ONLY_NOW | 401/standard auth error without bearer/session. Unsupported methods rejected, no hang. | With test household, verify limit/offset, empty, populated, bad auth. | integration activity spec; route inventory notes unsupported rejections. | Keep. |
| /api/couples/check-mutual | GET; rejects unsupported | user | DENY_ONLY_NOW | 401 without auth; validation error if propertyId missing under auth. | Seed two users/property; verify mutual true/false. | unit + integration tests. | Keep. |
| /api/couples/disputed | GET, PATCH | user | DENY_ONLY_NOW | 401 without auth; do not PATCH without local fixture. | Seed disputed property; verify GET list and PATCH resolution local-only. | unit/e2e disputed tests. | Keep; PATCH gated. |
| /api/couples/mutual-likes | GET | user | DENY_ONLY_NOW | 401 without auth. | Seed overlap/no-overlap; verify includeProperties=true. | unit + integration tests. | Keep. |
| /api/couples/notify | POST | user | DENY_ONLY_NOW | 401 without auth; do not send real notifications. | Mock notification side effects; verify validation/idempotency. | unit route test. | Gate side effects. |
| /api/couples/stats | GET | user | DENY_ONLY_NOW | 401 without auth. | Seed household and verify count math. | unit + integration tests. | Keep. |
| /api/interactions | GET, POST, DELETE | user | DENY_ONLY_NOW | 401 without auth. | Seed property; verify GET pagination, POST like/skip/view idempotency, DELETE local-only. | unit route/service/hooks + integration route. | Mutation gated. |
| /api/interactions/reset | DELETE | user | DENY_ONLY_NOW | 401 without auth. | Local-only destructive reset for seeded user; verify stricter rate limit. | unit route test. | Destructive approval-gated. |
| /api/neighborhoods/vibes | GET | user | DENY_ONLY_NOW | 401 without auth. | Seed/mocked neighborhood vibes; verify property/neighborhood query params. | unit route test. | Keep. |
| /api/properties/vibes | GET | user | DENY_ONLY_NOW | 401 without auth. | Seed properties/vibes; verify limit/offset/propertyId. | unit route test. | Keep. |
| /api/users/avatar | POST, DELETE | user | DENY_ONLY_NOW | 401 without auth. | Local storage/test bucket only; verify magic-byte validation, delete. | unit avatar route + uploader tests. | Mutation/storage gated. |
| /api/users/search | GET | user | DENY_ONLY_NOW | 401 without auth. | Seed users; verify q validation, RLS/household boundaries, rate-limit. | integration users-search. | Keep. |
| /api/admin/generate-neighborhood-vibes | POST | cron-secret | APPROVAL_GATED | 401/403 without cron secret. | Local-only with mocked LLM/Supabase; verify limit/force/delay. | no direct test found. | Gate; likely add unit. |
| /api/admin/generate-vibes | GET, POST | cron-secret | APPROVAL_GATED | 401/403 without cron secret. | Mock OpenRouter/vibes service; no paid LLM. | unit generate-vibes route. | Gate paid/external. |
| /api/admin/generate-vibes-zillow | POST | cron-secret + Zillow | APPROVAL_GATED | 401/403 without cron secret. | Mock Zillow and generation; no RapidAPI/paid calls. | no direct test found. | Gate. |
| /api/admin/ingest/zillow | POST | cron-secret + Zillow + DB writes | APPROVAL_GATED | 401/403 without cron secret. | Local-only DB and mocked Zillow; verify idempotency/dedupe/freshness. | unit ingest-zillow route. | Gate. |
| /api/admin/status-refresh | POST | cron-secret + Zillow + DB writes | APPROVAL_GATED | 401/403 without cron secret. | Local-only DB and mocked Zillow; verify batch/runtime/delay/rate-limit. | unit status-refresh route. | Gate. |

## Required Shan-approved test auth/session plan

Before authenticated traversal, ask Shan for approval to use one of these, in this order:
1. Local Supabase/test DB with seeded users from scripts/setup-test-users-admin.js or equivalent existing test fixtures.
2. A disposable non-production test account/session in a preview/local environment.
3. A manually supplied temporary browser session cookie for a test-only account.

Minimum fixture set:
- User A: no household, profile incomplete enough to show onboarding/profile/settings edges.
- User B: single-member household, used for waiting-partner state and invite modal.
- User C + User D: same household, seeded with properties, viewed/liked/passed interactions, at least one mutual like, at least one disputed property, saved searches/preferences, and avatar fixture.
- Property fixture: one valid property with images/map coords/vibes; one missing/deleted ID for notFound/error path; one property with broken/missing images.

Auth/session traversal acceptance:
- Login succeeds and lands on /dashboard.
- Protected route redirectTo is preserved when unauthenticated and respected after login.
- User menu/logout works and clears session.
- All protected routes render without hard console errors.
- All user APIs return standardized 401 without auth and 2xx/expected 4xx with test auth.
- Mutations are idempotent or test-resettable and only affect seeded local/test data.

## Manual traversal order

Public no-credential pass:
1. / -> verify header, hero, CTA to /signup and /login, footer, no console errors.
2. /about, /contact, /privacy, /terms -> legal/marketing content, links, metadata.
3. /cookies -> Accept, Reject, Manage, preferences persistence.
4. /login, /signup, /reset-password, /verify-email -> form presence and validation-only failure states.
5. /auth/auth-code-error, /invite/invalid-token, missing route -> graceful auth/error states.
6. /demo/ads, /sponsor-mockups -> render-only; flag for keep/delete product decision.
7. /robots.txt and /sitemap.xml -> crawlability and private-route exclusion.

Unauthenticated protected redirect pass:
1. Direct-load every protected route listed above.
2. Expected final URL: /login?redirectTo=<original path>.
3. Verify no protected content flashes before redirect.
4. Repeat one query-param path, e.g. /couples?tab=activity, to verify query preservation.

Authenticated pass after approval:
1. Login as User A -> /dashboard redirects/renders expected no-data states; /couples shows no-household CTA; profile/settings render.
2. Login as User B -> /couples waiting-partner state; invite modal opens; no real notification/email sent.
3. Login as User C -> /dashboard property grid, like/pass/view; /dashboard subpages; /properties/<fixture>; /couples active state; disputed resolution local-only if approved.
4. Login as User D -> confirm mutual-like visibility from counterpart perspective.
5. Logout -> protected routes redirect again.

## Coverage gaps / recommended follow-up tasks

High-priority P0 gaps:
- No final full public traversal artifact exists; previous browser traversal stopped after / and /cookies due to SLA.
- Authenticated traversal has not been run with an approved seeded session.
- Several public pages have no direct e2e smoke coverage: /about, /contact, /privacy, /terms, /sponsor-mockups, /reset-password, /verify-email, /auth/auth-code-error.
- API positive paths for cron/admin and external services are intentionally unprobed and need mocks/harnesses.
- /supabase/:...path proxy needs explicit open-proxy/security acceptance criteria before live probing.
- Internal/debug surfaces (/dashboard/vibes-test, /validation, /sponsor-mockups, /demo/ads) need keep/hide/delete decisions before launch.

Suggested implementation tasks after approval/gate:
- Add a no-credential Playwright public smoke matrix covering every public page and metadata route.
- Add a protected redirect Playwright matrix covering every protected page without auth.
- Add seeded-auth Playwright project with fixture users A-D and local-only reset/teardown.
- Add route-handler tests for missing gaps: auth callback missing-code, maps metro boundaries, cron-secret denial for admin routes, supabase proxy allowlist behavior.
- Add an API safety harness that blocks network egress to Zillow/OpenRouter/Google unless explicit mock/approval flag is set.

## Acceptance definition for closing P0 traversal

P0 site traversal is closed only when:
- Public no-credential matrix has been executed and logged with status for all public routes.
- Protected redirect matrix has been executed and logged for all protected routes.
- Authenticated traversal either has Shan-approved test session evidence for every protected route or an explicit approval-gated TODO per route.
- API matrix has evidence for public safe endpoints, deny-only auth boundaries, and code/test-only status for all gated external/mutation endpoints.
- Every route/API has an action: keep, fix, replace, hide/restrict, or delete.
- No real user data, paid API calls, deploys, or external dashboard/account changes were used to obtain the evidence.
