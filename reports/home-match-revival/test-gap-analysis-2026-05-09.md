# HomeMatch v2 — Test Coverage Gap Analysis

**Date:** 2026-05-09
**Branch:** autonomy/test-gap
**Mode:** READ-ONLY (no source changes)

## 1. Test Suite Inventory (counts at scan time)

| Layer                                 | Files   | Notes                            |
| ------------------------------------- | ------- | -------------------------------- |
| Unit (`__tests__/unit`)               | 236     | Jest; runs against mocks         |
| Integration (`__tests__/integration`) | 47      | Vitest; hits real local Supabase |
| E2E (`__tests__/e2e`)                 | 30      | Playwright                       |
| Accessibility                         | 2       | RTL + axe                        |
| Performance                           | 2       | RTL render perf                  |
| **Source files (`src/**`)\*\*         | **320** | excluding `*.d.ts`, tests        |

> Note: `pnpm exec jest --listTests` is non-functional in this worktree because `node_modules/.bin/jest` is missing. All gap mapping below is by file/grep cross-reference, not by Jest's resolver.

## 2. Methodology

For every source file under `src/`, looked for:

1. A **direct** unit test by basename match (`Foo.tsx` → `Foo.test.tsx`).
2. An **import** of the module path from any test file.
3. **Indirect coverage** via integration / E2E flows that exercise the export.

A file is flagged as a gap when (1) no direct test exists, AND (2) no test imports the module path, AND (3) integration coverage either does not exist or only exercises a narrow happy-path.

---

## 3. Source files with NO direct or import-level test coverage

### 3.1 `src/lib/services/` — service layer (highest risk)

| File                                                        | LOC | Notes                                                                                                                                                                               |
| ----------------------------------------------------------- | --: | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `services/properties/crud.ts`                               | 312 | Indirect via `property-service-facade.integration.test.ts` only. No unit test for error paths (RLS denial, optimistic-lock loss, double-insert).                                    |
| `services/users.ts`                                         | 584 | **Server** UserService. Used by 10 tests by class name, but no dedicated unit test file. Profile/household/invitation/saved-search code paths only exercised via integration.       |
| `services/users-client.ts`                                  | 385 | Only `createHousehold` is unit-tested. `updateProfile`, `getProfile`, `createProfile`, household-invite & saved-search methods are untested in isolation.                           |
| `services/locations-client.ts`                              | 164 | Zero direct test coverage. Imported only by 1 component test indirectly.                                                                                                            |
| `services/base.ts`                                          | 367 | Cross-cutting helpers (`executeQuery`, `executeSingleQuery`, `handleSupabaseError`, `sanitizeInput`, `isNotFoundError`). Not unit-tested — every concrete service depends on these. |
| `services/utils/rpc-wrapper.ts`                             | 480 | RPC error-shaping wrapper. No direct tests; behavior only inferred from feature-level tests.                                                                                        |
| `services/vibes/backfill.ts`                                | 529 | Long-running backfill orchestration. Image-selector/openrouter-client are unit-tested; the orchestration glue is not.                                                               |
| `services/neighborhood-vibes/backfill.ts`                   | 534 | Same shape as `vibes/backfill.ts`. No unit tests; only `prompts.ts` is covered.                                                                                                     |
| `services/neighborhood-vibes/neighborhood-vibes-service.ts` | 199 | Generation entry point. Untested in unit, only smoke-tested via API route tests.                                                                                                    |

### 3.2 `src/lib/api/` — request plumbing

| File                              | LOC | Notes                                                                                                                                                                                       |
| --------------------------------- | --: | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `api/admin-rate-limit.ts`         |  15 | Tiny but un-mocked. IP-extraction precedence (`x-forwarded-for` vs. `x-real-ip` vs. `unknown`) is not asserted.                                                                             |
| `api/fetch-timeout.ts`            |  57 | No direct test. AbortController integration with caller-supplied `signal` and `FetchTimeoutError` propagation is non-trivial; only consumed by `external-timeouts.test.ts` via static scan. |
| `api/zillow-client.ts`            | 523 | Only consumed by `zillow-ingest.test.ts` for a structural source check ("module limited to used exports"). Auth header signing, retry, pagination, error mapping have no behavior tests.    |
| `api/route-side-effect-policy.ts` | 229 | Only one static-scan test (`api-route-side-effect-policy.test.ts`); no unit test of the policy logic itself.                                                                                |

### 3.3 `src/lib/supabase/` — auth & client wiring

| File                           | LOC | Notes                                                                                                                                                                                                                                           |
| ------------------------------ | --: | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `supabase/refresh-recovery.ts` | 109 | Token-refresh recovery on stale cookies. Imported by `client-refresh-recovery` and `server-refresh-recovery` tests, but only the **callsite** is tested — the helper's branching (no-session, expired, network-error) is not directly asserted. |
| `supabase/standalone.ts`       |  59 | Used by 14 tests as a factory but never tested for its own URL/key fallback resolution behavior.                                                                                                                                                |
| `supabase/storage-keys.ts`     |  44 | Storage path & key derivation. One indirect ref (`avatar-upload.integration.test.ts`); no unit test for path-traversal / illegal-character handling.                                                                                            |

### 3.4 `src/lib/maps/`, `src/lib/llm/`, `src/lib/realtime/`

| File                           | LOC | Notes                                                                                                                                                                                                                                                                                                                         |
| ------------------------------ | --: | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `maps/secure-client.ts`        | 178 | Browser-side calls into the proxy routes. No tests; CORS / 4xx / network-failure handling unverified.                                                                                                                                                                                                                         |
| `maps/config.ts`               |   9 | Small but untested.                                                                                                                                                                                                                                                                                                           |
| `llm/safety.ts`                |  61 | `redactPII` / `validateAndRedact` are imported by the matcher test file, but `safety.ts` has no dedicated unit test for redaction edge cases (multi-PII strings, unicode emails, partial SSN).                                                                                                                                |
| `llm/prompts.ts`               |  56 | No test; prompt-string drift would silently change LLM behavior.                                                                                                                                                                                                                                                              |
| `realtime/couples-realtime.ts` | 251 | The single existing test (`couples-realtime-db-closure.test.ts`) is a **source-text closure check** — it greps the file for required substrings. The actual subscribe/unsubscribe lifecycle, payload validation (`toRealtimeMutualLikePayload`), and reconnect behavior have **zero behavioral coverage**. High-priority gap. |

### 3.5 `src/lib/utils/` & misc

| File                                        |     LOC | Notes                                                                                                                                                                                                                                                       |
| ------------------------------------------- | ------: | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `utils/performance.ts`                      |     112 | Untested. Performance marks/measures abstraction.                                                                                                                                                                                                           |
| `utils/performance-tracker.ts`              |     585 | Untested. Substantial — buffer, flush, sampling logic.                                                                                                                                                                                                      |
| `performance/metrics.ts`                    |     415 | Untested aggregation/serialization for the perf metrics route. The route is tested but the metric construction is not.                                                                                                                                      |
| `data/loader.ts`                            |     394 | Imported by `loader-dashboard.test.ts` & `loader-preferences.test.ts`. Tests cover dashboard fetch + preferences read but **not** cache-invalidation, sentinel city handling for `ALL_CITIES_SENTINEL_THRESHOLD`, or `unstable_cache` failure fall-through. |
| `seo/route-policy.ts`                       |     109 | Static-scan tests only; routing decisions are not behaviorally covered.                                                                                                                                                                                     |
| `routing/internal-preview.ts`               |      11 | Tiny, untested.                                                                                                                                                                                                                                             |
| `cookies/use-cookie-consent.ts`             |      48 | Hook untested; `cookies/consent.ts` core is covered but the React hook wrapper is not.                                                                                                                                                                      |
| `query/config.ts`                           |      33 | TanStack Query default options untested (retry / staleTime / gcTime).                                                                                                                                                                                       |
| `migration/data-transformer.ts`             |     502 | Migration script, untested in unit.                                                                                                                                                                                                                         |
| `migration/migration-runner.ts`             |     605 | Untested.                                                                                                                                                                                                                                                   |
| `migration/relaxed-property-transformer.ts` |     277 | Untested.                                                                                                                                                                                                                                                   |
| `migration/metro-state-mapping.ts`          | (small) | Untested.                                                                                                                                                                                                                                                   |
| `ingestion/zillow.ts`                       |     712 | Partial coverage via `zillow-ingest.test.ts` — covers `buildSearchUrl`, `fetchZillowSearchPage`, `mapSearchItemToRaw`, `ingestZillowLocations` happy path. Gaps: rate-limit retry, malformed response normalization, partial-page failure recovery.         |
| `ingestion/city-normalization.ts`           |      23 | Untested; consumed by zillow ingestion.                                                                                                                                                                                                                     |
| `ingestion/default-zips.ts`                 | (small) | Untested.                                                                                                                                                                                                                                                   |
| `ingest/pipeline.ts`                        |     290 | Untested. The 4-stage pipeline (validate→dedupe→enrich→store) is the orchestration glue for ingestion — only individual helpers (`freshness.ts`, `idempotency.ts`) are unit-tested.                                                                         |
| `storytelling/tagAliases.ts`                |      10 | Trivial map, untested.                                                                                                                                                                                                                                      |
| `adsense.ts`                                |       6 | Trivial constants, untested.                                                                                                                                                                                                                                |

### 3.6 `src/hooks/`

| Hook                            | Tested?                                                                                   |
| ------------------------------- | ----------------------------------------------------------------------------------------- |
| `useCouplesFeatures.ts`         | yes                                                                                       |
| `useCurrentUserAvatar.ts`       | yes                                                                                       |
| `useInteractions.ts`            | yes (hooks test)                                                                          |
| `useMousePosition.ts`           | yes                                                                                       |
| `useValidatedForm.ts`           | yes                                                                                       |
| `useCouples.ts`                 | indirect (used in component tests)                                                        |
| `useNeighborhoodVibes.ts`       | indirect                                                                                  |
| `usePropertyVibes.ts`           | indirect                                                                                  |
| `useSwipePhysics.ts`            | indirect                                                                                  |
| **`useCouplesInteractions.ts`** | **NO direct or indirect coverage**                                                        |
| **`useCouplesRealtime.ts`**     | **NO direct or indirect coverage** — the hook that wires `couples-realtime.ts` into React |
| **`useSecureGoogleMaps.ts`**    | **NO coverage** — gates Maps script load on consent and origin                            |

### 3.7 `src/components/` — untested components

Filtering out shadcn/ui pass-throughs (which are dependency wrappers and arguably do not need direct tests), the meaningful gaps are:

| Component                                          | Risk                                                          |
| -------------------------------------------------- | ------------------------------------------------------------- |
| `couples/CouplesActivityFeed.tsx`                  | Realtime UI, no test                                          |
| `couples/CouplesHero.tsx`                          | Hero/empty-state UI                                           |
| `couples/CouplesMicroInteractions.tsx`             | Animation glue                                                |
| `couples/CouplesMutualLikesSection.tsx`            | Display of mutual likes                                       |
| `dashboard/EnhancedDashboardPageImpl.tsx`          | **Main dashboard page implementation** — only covered via E2E |
| `dashboard/HouseholdActivityPage.tsx`              | Household activity feed page                                  |
| `dashboard/DashboardSkeleton.tsx`                  | Loading state                                                 |
| `features/couples/CouplesMilestoneCelebration.tsx` | Milestone celebration overlay                                 |
| `legal/AdSenseGate.tsx`                            | Consent gate for ads — privacy-critical                       |
| `legal/AnalyticsGate.tsx`                          | Consent gate for analytics — privacy-critical                 |
| `legal/CookieConsentBanner.tsx`                    | Consent banner — only `lib/cookies/consent.ts` is unit-tested |
| `legal/CookiePreferencesPanel.tsx`                 | Preferences UI for consent                                    |
| `marketing/AdMonetizationMockup.tsx`               | Marketing-only                                                |
| `marketing/DopamineCtaPreview.tsx`                 | Marketing-only                                                |
| `marketing/ParallaxStarsCanvas.tsx`                | Canvas animation                                              |
| `marketing/ParallaxStars.tsx`                      | Animation                                                     |
| `marketing/ScrollZoomShowcase.tsx`                 | Scroll-based animation                                        |
| `property/EnhancedPropertyMap.tsx`                 | Map rendering wrapper                                         |
| `property/PropertyDetailRouteModal.tsx`            | Route-modal wrapper for property detail                       |
| `providers/CouplesProgressProvider.tsx`            | Cross-cutting context provider                                |
| `settings/LocationMapSelector.tsx`                 | Interactive map for location preferences                      |
| `shared/PerformanceProvider.tsx`                   | Wraps app with perf instrumentation                           |
| `shared/ProfileMenu.tsx`                           | Auth menu in header                                           |
| `shared/PropertyCardSkeleton.tsx`                  | Loading state                                                 |
| `shared/home-match-logo.tsx`                       | SVG logo                                                      |

UI primitives without dedicated tests (lower priority — mostly shadcn pass-throughs): `alert-dialog`, `alert`, `avatar`, `badge`, `dropdown-menu`, `form`, `motion-button`, `motion-components`, `progress`, `sheet`, `skeleton`, `slider`, `sonner`, `switch`, `tabs`.

### 3.8 `src/app/api/` — routes without direct functional tests

| Route                                            | Coverage status                                                                                                                                  |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `api/match/route.ts`                             | **No test of any kind** — neither functional nor scan-level. The only POST handler hits `match()` from `lib/llm/matcher` and returns its result. |
| `api/admin/generate-neighborhood-vibes/route.ts` | Scan-level only (cache-control / rate-limit / error-envelope scans). No functional test of behavior.                                             |
| `api/admin/generate-vibes/route.ts`              | Same — scan-level only.                                                                                                                          |
| `api/admin/generate-vibes-zillow/route.ts`       | Scan-level only.                                                                                                                                 |
| `api/couples/activity/route.ts`                  | Scan-level only. No functional test of the realtime activity feed payload shape.                                                                 |
| `api/maps/geocode/route.ts`                      | Scan-level only (`maps/failure-envelope.test.ts` + scans). The `geocode.route.test.ts` file tests the **client wrapper**, not the route handler. |
| `api/maps/proxy-script/route.ts`                 | Scan-level only.                                                                                                                                 |
| `api/users/search/route.ts`                      | Scan-level only. Search-injection coverage exists in `security/search-injection.test.ts` but no positive-path test.                              |

---

## 4. Low-coverage modules (tests exist, but narrow)

These modules **have** tests but the tests skip important branches:

1. **`src/lib/realtime/couples-realtime.ts`** — only a static-text closure test. No subscribe / payload-validation / unsubscribe / channel-cleanup behavior tests. The `toRealtimeMutualLikePayload` validator's null-shape branch is untested; a malformed RPC reply would silently fall through.

2. **`src/lib/services/properties/facade.ts`** — covered by integration tests against a live Supabase, but no unit test of the facade's delegation contract (i.e., that `getById` actually calls `crudService.getById` and not `searchService.getById`). A miswiring would only surface in integration runs, which are slow and DB-dependent.

3. **`src/lib/services/properties/crud.ts`** — covered only by integration `property-service-facade.integration.test.ts` happy-path. No unit test for: RLS denial mapping, conflict on insert (`409`), `updated_at` race, optimistic-lock loss.

4. **`src/lib/services/users-client.ts`** — only `createHousehold` has a unit test. The 10+ other static methods (saved-searches, invitations, profile updates) are untested directly.

5. **`src/lib/data/loader.ts`** — `loader-dashboard.test.ts` covers happy-path dashboard load and `loader-preferences.test.ts` covers preferences read. Untested branches:
   - `unstable_cache` miss when `next/cache` is unavailable (test-mode fallback).
   - `ALL_CITIES_SENTINEL_THRESHOLD` boundary (≥ vs > threshold).
   - `DEFAULT_PRICE_RANGE` substitution when `priceMin`/`priceMax` are absent.
   - Service throwing — does the loader surface a typed error or fall through?

6. **`src/lib/api/zillow-client.ts`** — the only test is a structural source-scan ("module limited to used exports"). No behavior tests for: HMAC signing of RapidAPI requests, retry on 429, pagination cursor handling, response normalization.

7. **`src/lib/llm/matcher.ts`** — `matcher.test.ts` covers `parseLLMResponse`, `mockRank`, and the high-level `match()`. Gaps: `LLMClient` failure paths (network error, malformed JSON, model truncation), `validateAndRedact` integration with adversarial inputs, model-default fallback when `opts.model` is absent.

8. **`src/lib/middleware/rateLimiter.ts`** — three tests (`rate-limiter-check.test.ts`, `rate-limiter-durable-provider-guard.test.ts`, `rate-limiter-speed.test.ts`). Gaps:
   - No test of the cross-process key namespacing under concurrent requests with the same IP.
   - No test of fail-open vs fail-closed behavior when the durable backend (Upstash) is unreachable.

9. **`src/lib/ingestion/zillow.ts`** — happy-path is covered. Gaps:
   - 429 / 5xx retry behavior.
   - Listing missing required fields (e.g., no `zpid`) — does it skip or throw?
   - Photo URL normalization for protocol-relative URLs.

10. **`src/lib/ingest/pipeline.ts`** — completely untested despite being the orchestration spine for ingestion. The four-stage contract (validate → dedupe → enrich → store) is the highest-leverage place to gain confidence per test written.

---

## 5. Edge-case gaps in otherwise well-tested modules

| Module                                | Existing test                           | Missing edge case                                                                                                                                                     |
| ------------------------------------- | --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `lib/cookies/consent.ts`              | `cookies/consent.test.ts`               | TTL expiry mid-session, malformed cookie value, SameSite enforcement under cross-site fetches.                                                                        |
| `lib/api/errors.ts`                   | `lib/api/errors.test.ts`                | Localized error messages, error chaining (`cause`), redaction of stack traces in production responses.                                                                |
| `lib/api/route-deadline.ts`           | `lib/api/route-deadline.test.ts`        | Deadline carried across `Promise.all` branches; deadline plus user-supplied `AbortSignal` interaction.                                                                |
| `lib/supabase/cookie-options.ts`      | covered + negative test                 | `__Host-` / `__Secure-` prefix invariants when running behind preview deploys with non-`https` origins.                                                               |
| `lib/supabase/service-role-client.ts` | covered                                 | Capability boundary when service role escapes through a downstream RPC that re-uses the same client.                                                                  |
| `lib/services/PropertyFilterBuilder`  | unit-tested                             | SQL-injection in free-text filter, NaN price bounds, infinite `limit`.                                                                                                |
| `lib/services/interactions.ts`        | `services/interactions.service.test.ts` | Concurrent like + dislike on the same property by the same user (interaction-uniqueness migration enforces this at DB layer; the service layer handling is untested). |
| `lib/utils/coordinates.ts`            | covered                                 | Antimeridian crossing (lat/lng wrap-around), polar-edge bounds.                                                                                                       |
| `app/api/users/avatar/route.ts`       | route + integration tests               | EXIF / SVG XSS / oversized payload rejection — `storage-upload-policy-guard` test exists but does not exercise the route end-to-end with adversarial files.           |
| `lib/middleware/rateLimiter.ts`       | check + speed tests                     | Memory provider vs durable provider equivalence under burst load.                                                                                                     |

---

## 6. Cross-cutting structural concerns

1. **Static "scan" tests dominate API routes.** Many `__tests__/unit/api/*.test.ts` files (`route-error-envelope-scan.test.ts`, `route-rate-limit-adoption-scan.test.ts`, `cache-control.test.ts`, etc.) work by `readFileSync`-ing route source and grepping for required imports. They prove a route imports the right helper but not that the helper produces the right behavior at runtime. Several routes are listed as "tested" by these scans but have no functional test (`api/admin/generate-vibes`, `api/maps/proxy-script`, `api/users/search`, `api/couples/activity`).

2. **Realtime is structurally underspecified.** `couples-realtime.ts` (251 LOC) + `useCouplesRealtime.ts` together drive every live couples feature. Combined behavioral test coverage is **zero** — only a closure-style source-grep.

3. **Backfill scripts are untested.** Both `services/vibes/backfill.ts` (529 LOC) and `services/neighborhood-vibes/backfill.ts` (534 LOC) are large, long-running orchestrators. A regression here corrupts data at scale. Only an integration test exists for backfill (`backfill-vibes.integration.test.ts`) and it gates on `SKIP_RPC_TESTS`.

4. **Migration helpers are untested.** `migration/data-transformer.ts`, `migration/migration-runner.ts`, `migration/relaxed-property-transformer.ts`, `migration/metro-state-mapping.ts` — combined ~1.4k LOC, zero unit tests. These run during data migrations; failures are usually discovered in production.

5. **`base.ts` and `utils/rpc-wrapper.ts` are dependency cores with no direct tests.** Every concrete service inherits from `BaseService` or wraps RPCs through these helpers. Bugs here surface as "everything is broken" rather than "this one feature is broken," which is exactly the case where unit-level mock-based assertion is most valuable.

6. **Hooks coverage is uneven.** `useCouplesInteractions`, `useCouplesRealtime`, `useSecureGoogleMaps` are entirely uncovered despite being the React-side glue for three feature areas (couples interactions, couples realtime, maps).

7. **`api/match/route.ts` is uniquely uncovered** — not even by scan tests. It accepts arbitrary JSON, validates via Zod, and forwards to `llm/matcher`. The matcher itself has tests but the route path (auth boundary, request-shape errors, deadline / rate-limit) is untested.

---

## 7. Prioritized remediation list

Ordered by risk × leverage. The number of files affected is in parentheses to estimate test-writing effort.

### P0 — write within next iteration

1. **`src/lib/realtime/couples-realtime.ts`** behavioral tests (subscribe/payload-validation/unsubscribe). (1 file)
2. **`src/hooks/useCouplesRealtime.ts`** + **`useCouplesInteractions.ts`** hook tests. (2 files)
3. **`src/lib/services/base.ts`** unit tests (`executeQuery`, `executeSingleQuery`, `handleSupabaseError`, `isNotFoundError`, `sanitizeInput`). (1 file)
4. **`src/app/api/match/route.ts`** route test (auth, validation, deadline, error envelope). (1 file)
5. **`src/lib/services/users.ts`** unit tests for the server `UserService` methods that are not currently covered in unit (profile lifecycle, household ops, invitations, saved searches). (1 file)

### P1 — meaningful risk, mid effort

6. **`src/lib/ingest/pipeline.ts`** — orchestration test using `MockZillowSource` and a writer stub.
7. **`src/lib/api/zillow-client.ts`** — sign / retry / pagination / error-mapping behavior.
8. **`src/lib/data/loader.ts`** — sentinel city threshold, default price range, cache fall-through.
9. **`src/lib/services/users-client.ts`** — methods other than `createHousehold`.
10. **`src/lib/services/utils/rpc-wrapper.ts`** — direct unit tests rather than relying on consumers.
11. **`src/lib/api/admin-rate-limit.ts`** + **`src/lib/api/fetch-timeout.ts`** — small files, easy wins; the timeout helper handles caller-signal interaction that is currently unverified.
12. **`src/components/legal/{AdSenseGate,AnalyticsGate,CookieConsentBanner,CookiePreferencesPanel}.tsx`** — privacy-critical consent UI.

### P2 — backfill / migration / non-critical UI

13. **`src/lib/services/vibes/backfill.ts`** + **`services/neighborhood-vibes/backfill.ts`** — orchestration tests with mocked OpenRouter & DB writers.
14. **`src/lib/migration/*`** — at minimum cover `data-transformer.ts` and `relaxed-property-transformer.ts` with a fixture-driven snapshot test.
15. **`src/components/dashboard/EnhancedDashboardPageImpl.tsx`** + **`HouseholdActivityPage.tsx`** — dashboard pages currently only covered E2E.
16. **`src/components/property/EnhancedPropertyMap.tsx`** + **`PropertyDetailRouteModal.tsx`** + **`settings/LocationMapSelector.tsx`** — interactive map/modal components.

### P3 — nice-to-have

17. **Edge-case suite for `cookies/consent.ts`** — TTL expiry + malformed cookie + SameSite.
18. **PropertyFilterBuilder** — adversarial-input suite (NaN bounds, infinite limit, free-text injection).
19. **`coordinates.ts`** — antimeridian / polar-edge cases.
20. **shadcn/ui primitive smoke tests** — only if a contributor depends on a non-default prop combination.

---

## 8. Summary numbers

- **Source files scanned:** 320
- **Source files with no direct or import-level test reference:** ~46 (excluding small shadcn/ui pass-throughs and trivial constants)
- **Source files with only static-scan / closure-style coverage:** ~9 (notably `couples-realtime.ts`, `zillow-client.ts`, `route-side-effect-policy.ts`, several admin routes)
- **API routes without functional tests:** 8 (`match`, `admin/generate-neighborhood-vibes`, `admin/generate-vibes`, `admin/generate-vibes-zillow`, `couples/activity`, `maps/geocode`, `maps/proxy-script`, `users/search`)
- **Hooks without behavior coverage:** 3 (`useCouplesInteractions`, `useCouplesRealtime`, `useSecureGoogleMaps`)
- **Largest untested modules:** `services/properties/geographic.ts` (1040 LOC, integration-only), `ingestion/zillow.ts` (712, partial), `migration/migration-runner.ts` (605), `utils/performance-tracker.ts` (585), `services/users.ts` (584).

The single highest-leverage gap is **`src/lib/realtime/couples-realtime.ts` + `useCouplesRealtime`** — they are central to a flagship feature, are 250+ LOC of nontrivial branching logic, and the only existing test is a source-text grep that would not catch any runtime regression.
