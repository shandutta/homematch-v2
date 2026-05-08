# P1 Timeout/Deadline Policy Evidence Index — 2026-05-08

Generated: 2026-05-08 (worktree `d104-timeout-policy-evidence-2019`).

Scope: Phase 0/1 docs/evidence slice. Maps the two repo-side timeout helpers
(`fetchWithTimeout`, `withRouteDeadline`) to the API route families that adopt
them, and surfaces the routes still on ad-hoc `Promise.race` patterns or with
no timeout policy at all. No code changes; this is a reviewer/PM index over the
existing closure artifacts (M8 + P1 route-deadline) so the remaining gaps are
visible in one place.

## Helpers

| Helper | Source | Failure mode | Tests | Closure note |
| --- | --- | --- | --- | --- |
| `fetchWithTimeout(input, { timeoutMs, timeoutMessage, ... })` (default 10s) — outbound HTTP wrapper using `AbortController`; throws `FetchTimeoutError`. | `src/lib/api/fetch-timeout.ts` | Aborts the outbound `fetch`; caller decides response shape (typically `ApiErrorHandler.gatewayTimeout`). | `__tests__/unit/api/external-timeouts.test.ts` (Maps geocode + autocomplete, proxy-script, Zillow random-image, admin status-refresh, admin generate-vibes-zillow). | `reports/home-match-revival/m8-external-timeouts-closure-2026-05-08.md` |
| `withRouteDeadline(label, timeoutMs, handler)` — inbound handler-side deadline; resolves with `ApiErrorHandler.gatewayTimeout(...)` 504 + label warning when the handler exceeds the budget. | `src/lib/api/route-deadline.ts` | Returns 504 to the client; logs `[label] exceeded Xms route deadline`. | `__tests__/unit/lib/api/route-deadline.test.ts` (helper behavior + static adoption check on the three target routes). | `reports/home-match-revival/p1-route-deadline-helper-closure-2026-05-08.md` |

## Adoption matrix (per route family)

Generated from a static scan of `src/app/api/**/route.ts`. "Outbound" = the
route makes an external HTTP call. "Long Supabase-heavy" = the route runs
unbounded Supabase work that could exceed a request budget under load.

| Route family | File | Outbound? | Long Supabase-heavy? | Helper(s) used | Budget / notes |
| --- | --- | --- | --- | --- | --- |
| Maps geocode | `src/app/api/maps/geocode/route.ts` | yes (Google Geocoding) | no | `fetchWithTimeout` | default 10s |
| Maps places autocomplete | `src/app/api/maps/places/autocomplete/route.ts` | yes (Google Places) | no | `fetchWithTimeout` | default 10s |
| Maps proxy script | `src/app/api/maps/proxy-script/route.ts` | yes (Google Maps JS bootstrap) | no | `fetchWithTimeout` | default 10s |
| Maps metro boundaries | `src/app/api/maps/metro-boundaries/route.ts` | no | no (static GeoJSON dispatch) | none | not required by current scope |
| Maps script | `src/app/api/maps/script/route.ts` | no (loader stub) | no | none | not required by current scope |
| Zillow random image | `src/app/api/zillow/random-image/route.ts` | yes (RapidAPI Zillow) | no | `fetchWithTimeout` | default 10s; `Zillow search/image fetch timed out` messages |
| Admin status refresh | `src/app/api/admin/status-refresh/route.ts` | yes (RapidAPI Zillow) | yes (paginated) | `fetchWithTimeout` | configurable via `STATUS_DETAIL_FETCH_TIMEOUT_MS` (default 10s) |
| Admin generate-vibes-zillow | `src/app/api/admin/generate-vibes-zillow/route.ts` | yes (RapidAPI Zillow) | yes (per-zpid fan-out) | `fetchWithTimeout` | `ZILLOW_FETCH_TIMEOUT_MS` (default 10s) for property + image calls |
| Admin generate-vibes (LLM) | `src/app/api/admin/generate-vibes/route.ts` | LLM client wrapper | yes | none in route file | timeout policy lives in the LLM client, not the route — out of scope for this index |
| Admin generate-neighborhood-vibes | `src/app/api/admin/generate-neighborhood-vibes/route.ts` | LLM client wrapper | yes | none in route file | same as above |
| Admin ingest (Zillow) | `src/app/api/admin/ingest/zillow/route.ts` | upstream provider via service | yes | none in route file | provider-side; gated by paid/external-approval row in `p0-p1-blocker-evidence-index-2026-05-08.md` |
| Users search | `src/app/api/users/search/route.ts` | no | yes (search query) | `withRouteDeadline` | `users:search`, 2s |
| Users avatar | `src/app/api/users/avatar/route.ts` | no (storage) | yes (upload/delete + Storage API) | `withRouteDeadline` | `users:avatar:post` 10s, `users:avatar:delete` 8s |
| Couples disputed | `src/app/api/couples/disputed/route.ts` | no | yes (multi-step join) | `withRouteDeadline` | `couples:disputed`, 4s |
| Couples activity | `src/app/api/couples/activity/route.ts` | no | yes | ad-hoc `Promise.race` + 10s `setTimeout` (`Activity fetch timed out`) | not yet on `withRouteDeadline` |
| Couples mutual-likes | `src/app/api/couples/mutual-likes/route.ts` | no | yes | ad-hoc `Promise.race` + 10s `setTimeout` (`Mutual likes fetch timed out`) | not yet on `withRouteDeadline` |
| Couples stats | `src/app/api/couples/stats/route.ts` | no | yes | none | unbudgeted; not yet on `withRouteDeadline` |
| Couples check-mutual | `src/app/api/couples/check-mutual/route.ts` | no | yes | none | unbudgeted; not yet on `withRouteDeadline` |
| Couples notify | `src/app/api/couples/notify/route.ts` | no (notification side effect) | yes | none | unbudgeted; live email/notification side effects are external-approval-gated |
| Interactions GET/POST | `src/app/api/interactions/route.ts` | no | yes | ad-hoc `Promise.race` (10s for summary RPC; 10s for list query) | summary path returns 504; list path gracefully degrades to empty page on timeout — not yet on `withRouteDeadline` |
| Interactions reset | `src/app/api/interactions/reset/route.ts` | no | yes (bulk delete) | ad-hoc `Promise.race` + 10s `setTimeout` (`Reset interactions timed out`) | not yet on `withRouteDeadline` |
| Properties vibes | `src/app/api/properties/vibes/route.ts` | no | yes (read) | none | unbudgeted; small read shape |
| Properties marketing | `src/app/api/properties/marketing/route.ts` | no | yes (read) | none | unbudgeted; small read shape |
| Neighborhoods vibes | `src/app/api/neighborhoods/vibes/route.ts` | no | yes (read) | none | unbudgeted; small read shape |
| Performance metrics | `src/app/api/performance/metrics/route.ts` | no | minimal | none | telemetry write; budget not required |
| Health | `src/app/api/health/route.ts` | no | no | none | static probe |

## Remaining gaps (Phase 1 scope)

1. **Ad-hoc `Promise.race` timeouts not yet migrated to `withRouteDeadline`.**
   The 504 shape is consistent (or graceful degradation in the interactions
   list case), but the deadlines are inline in handler bodies and aren't
   captured in the `users-avatar` / `users-search` / `couples-disputed` test
   adoption guard. Routes:
   - `src/app/api/interactions/route.ts` (summary RPC + list query, 10s each)
   - `src/app/api/interactions/reset/route.ts` (bulk delete, 10s)
   - `src/app/api/couples/activity/route.ts` (10s)
   - `src/app/api/couples/mutual-likes/route.ts` (10s)
2. **Long Supabase-heavy routes with no timeout policy at all.** Risk: under
   slow-DB conditions these requests can hang for the platform-default request
   timeout instead of returning a budgeted 504. Routes:
   - `src/app/api/couples/stats/route.ts`
   - `src/app/api/couples/check-mutual/route.ts`
   - `src/app/api/couples/notify/route.ts` (notification side effect — any
     change still gated by the external-approval row in the blocker index)
3. **LLM/admin generation routes** (`admin/generate-vibes`,
   `admin/generate-neighborhood-vibes`, `admin/ingest/zillow`) defer their
   timeout policy to provider clients/services. Validating those budgets is
   gated by the paid/external row 10 in
   `reports/home-match-revival/p0-p1-blocker-evidence-index-2026-05-08.md` and
   is out of scope for this docs slice.
4. **No central adoption guard.** The static adoption check in
   `__tests__/unit/lib/api/route-deadline.test.ts` only enumerates the three
   target routes. There is no negative guard preventing future
   long-Supabase-heavy routes from skipping the helper, and no scan that flags
   raw `setTimeout` timeout patterns in `src/app/api/**/route.ts`. Adding such
   a guard would convert gap (1) and (2) above into a static repo-side
   blocker.

## Verdict

- M8 outbound-timeout coverage on Next.js API routes is **closed** (per
  `m8-external-timeouts-closure-2026-05-08.md`).
- `withRouteDeadline` helper exists and is **adopted on the three audited
  long-Supabase-heavy routes** (`users:search`, `couples:disputed`,
  `users:avatar:post/delete`) per `p1-route-deadline-helper-closure-2026-05-08.md`.
- Inbound timeout coverage across the rest of the long-Supabase-heavy surface
  is **partial**: four routes use ad-hoc `Promise.race`, three more are
  unbudgeted. None of these are net-new regressions; they pre-date the helper
  and are listed here so the next bounded slice can migrate them or
  consciously defer them.
- This index does **not** change the Phase 0/1 gate verdict. It only documents
  remaining timeout-policy gaps so the migration to `withRouteDeadline` (or an
  explicit deferral) can be scoped without re-scanning the API surface.

## Source artifacts

- `src/lib/api/fetch-timeout.ts`
- `src/lib/api/route-deadline.ts`
- `__tests__/unit/api/external-timeouts.test.ts`
- `__tests__/unit/lib/api/route-deadline.test.ts`
- `reports/home-match-revival/m8-external-timeouts-closure-2026-05-08.md`
- `reports/home-match-revival/p1-route-deadline-helper-closure-2026-05-08.md`
- `reports/home-match-revival/p0-p1-blocker-evidence-index-2026-05-08.md`
- `reports/home-match-revival/phase0-phase1-closure-matrix.md`
