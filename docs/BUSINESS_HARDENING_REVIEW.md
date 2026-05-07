# Business Hardening Review

_Last updated: 2026-05-07 during `autonomy/6h-business-hardening`._

This is the working product-readiness review for HomeMatch v2. It is intentionally opinionated and should stay close to the code: update it when routes, data flows, auth, monetization, or compliance posture changes.

## Executive decisions

### Auth provider

**Decision: keep Supabase Auth for the next production iteration; do not migrate to Clerk/Auth0 inside this hardening pass.**

Why:

- The application already uses Supabase RLS, RPCs, realtime channels, storage-adjacent avatar flows, server components, and route handlers that depend on Supabase user IDs.
- Replacing auth would require a user-ID mapping layer, RLS policy rewrites, session propagation redesign, migration tooling, and a rollback plan. That is too risky for a single hardening tick.
- The existing custom code is not a full custom auth provider; it is mostly Supabase session plumbing. The correct near-term move is to isolate policy and reduce bespoke middleware branches, not add a second identity provider.

Migration trigger later: choose Clerk only if product needs hosted organization/team management, richer fraud controls, or enterprise SSO. If that happens, start with a dedicated `auth_identity_links` table and dual-session shadow reads before any cutover.

### Local development / Docker

**Decision: prefer Vercel-linked local Next.js + Supabase cloud/dev project as the default path. Keep Docker/Supabase CLI paths only for integration parity and schema work.**

The current `dev` script still hard-depends on Docker through `ensure:docker` and a DB reset. That is high-friction for normal product work. The repo should eventually split:

- `dev`: no Docker, no destructive reset, fast Next.js loop.
- `dev:db`: explicit local Supabase/Docker reset for schema or RLS work.
- `test:integration`: owns any required DB lifecycle.

## Verification matrix

| Area                 | Current status     | Findings                                                                                                                                                                                                                                                                                                                            | Next action                                                                                        |
| -------------------- | ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Frontend routes      | Inventory complete | 29 page routes under `src/app`; most protected pages do their own server auth check. Middleware missed singular `/household/*` before this pass.                                                                                                                                                                                    | Browser-traverse public + authenticated flows and capture design issues.                           |
| API routes           | Improved           | 26 API routes. New `requireUserFromRequest` API boundary standardizes bearer-token fallback and `UNAUTHORIZED` response shape. Activity, user search, property vibes, neighborhood vibes, interactions, and interactions/reset now use it. Remaining direct `supabase.auth.getUser()` calls are isolated in notify/disputed/avatar. | Continue converting remaining authenticated routes and add route-level tests for each conversion.  |
| Middleware           | Improved           | Protected-route policy moved into `src/lib/routing/protected-routes.ts`; stale `/households` and `/helloworld_notes` branches removed; `/household/*` and `/settings` explicitly protected.                                                                                                                                         | Add integration smoke for redirects once dev server is available.                                  |
| Supabase schema      | Inventory complete | Active migrations are in `supabase/migrations`; tracked backup migration directory was dead historical noise and removed.                                                                                                                                                                                                           | Review RLS/indexes with Supabase CLI or remote read-only metadata.                                 |
| Tests                | Verified           | Unit suite is green after this tick: 133 suites / 1518 tests. Lint, type-check, and production build are green.                                                                                                                                                                                                                     | Run integration/E2E when local app ownership is clean.                                             |
| Auth                 | Improved           | Stay on Supabase Auth; isolate custom policy first. API auth now has a shared `requireUserFromRequest` helper with unit tests for bearer-token fallback and standardized 401 responses. Middleware still owns page redirects/cookie refresh.                                                                                        | Convert remaining API auth callsites and keep third-party auth as a later, planned migration only. |
| Maps/images          | Inventory complete | Server Maps key expected; map script/proxy API routes exist. Zillow random image route and image refresh marker migration exist.                                                                                                                                                                                                    | Probe map endpoints without exposing keys; review image metadata fallbacks.                        |
| Matching/couples     | Inventory complete | Household, invite, mutual-like, disputed, stats, realtime, and resolution tables/functions exist.                                                                                                                                                                                                                                   | Review couples UX with real session; improve empty/error states.                                   |
| LLM/vibes            | Inventory complete | OpenRouter-backed property/neighborhood vibes and admin generators exist.                                                                                                                                                                                                                                                           | Review prompts for generic copy and enforce structured output quality.                             |
| Ingest               | Inventory complete | Zillow ingest/status refresh scripts and cron-secret-protected admin routes exist.                                                                                                                                                                                                                                                  | Confirm idempotency, rate-limit behavior, and stale listing handling.                              |
| Legal/compliance     | Improved           | Privacy, Terms, Cookies, Contact pages exist. Consent manager stores explicit optional categories and now has unit coverage for stale/malformed choices.                                                                                                                                                                            | Decide region-specific banner copy/legal review before large-scale paid ads.                       |
| Analytics            | Improved           | Vercel Speed Insights is loaded only through `AnalyticsGate` after analytics consent. PostHog deps present but no broad event system was verified.                                                                                                                                                                                  | Define consent-aware funnel event names before adding PostHog capture calls.                       |
| Ads                  | Improved           | AdSense script loading is centralized in `AdSenseGate`; dead duplicate route/script loader removed. In-feed ad uses shared AdSense constants and respects the global ads-enabled flag.                                                                                                                                              | Keep ad density low; avoid ads on decision-critical couple flows.                                  |
| Stripe/subscriptions | Gap                | No Stripe dependency or API routes found in `package.json`/route inventory.                                                                                                                                                                                                                                                         | Add product plan and scaffold only after pricing/gating decision.                                  |
| Docs                 | Improved           | This review adds a current source of truth; historical duplicated reports remain.                                                                                                                                                                                                                                                   | Collapse stale testing/refactoring/task docs into fewer maintained docs.                           |

## Business readiness recommendations

1. **Subscriptions before ads.** Ads should be secondary; the premium wedge is household collaboration, richer neighborhood/property intelligence, saved shortlist depth, and AI-assisted tradeoff summaries.
2. **Consent before monetization scripts.** The app now has a small consent abstraction and tests for stored choices. Keep every optional analytics/ad loader behind that boundary and complete legal review before paid traffic.
3. **Make matching inspectable.** Couples need to understand why a home is mutual, disputed, or recommended. Store/expose reasons, not just scores.
4. **Keep Zillow ingest boring.** Prefer idempotent upserts, explicit stale markers, source timestamps, and clear image attribution over clever scraping expansion.
5. **Reduce auth surface area.** Supabase is the provider; custom code should only express HomeMatch policy (which routes require auth, how redirect destinations are sanitized, and which API helper returns the current user).
