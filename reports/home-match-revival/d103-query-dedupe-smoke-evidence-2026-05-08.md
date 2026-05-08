# D103 — Dashboard query/fetch dedupe + smoke evidence

Date: 2026-05-08
Branch: autonomy/d103-query-dedupe-smoke-doc-2019
Scope: Phase 0/1 only. Documents the current shape of dashboard query dedupe and the
smoke coverage that exercises it, then names the exact validation gaps that remain
inside Phase 0/1 boundaries (no Phase 2+ work).

## Where dedupe lives today

| Layer | Source | Notes |
| --- | --- | --- |
| In-flight Map (per Node process) | `src/lib/data/loader.ts:51`, `:215-242` | `inFlightDashboardSearches` keyed on `JSON.stringify({ searchParams, options })`. `runDedupedDashboardSearch` returns the existing promise; `.finally` deletes the entry whether the inner search resolved or rejected, so failures do not poison subsequent calls. |
| Cached search overlay | `src/lib/data/loader.ts:89-105`, `:310-331` | `unstable_cache(['dashboard-properties'], { revalidate: 60 })` wraps `searchProperties` for the anon path. Activated only when `useCache=true`, `NODE_ENV !== 'test'`, and an anon factory was constructed. |
| Neighborhood result dedupe | `src/lib/data/loader.ts:286-296` | `Map<string, Neighborhood>` collapses overlapping per-city results into a single id-keyed list. |
| Locations client dedupe | `src/lib/services/locations-client.ts:32-44`, `:154-162` | `LocationsClient.getCities` and `getMetroAreas` collapse PostgREST rows by lowercased composite key before returning. No test today (see gaps). |

## What the unit tests prove

`__tests__/unit/data/dashboard-query-dedupe.test.ts` covers the two structural
invariants of the dedupe path:

1. **Coalescing** — two `loadDashboardData` calls issued with structurally identical
   options while a search promise is pending resolve to the same result and only
   call `searchProperties` once; service-boundary params (`filters.cities`,
   `select`, `includeCount`, `includeNeighborhoods`) are forwarded verbatim
   (`dashboard-query-dedupe.test.ts:60-107`).
2. **Failure clearance** — when the underlying search rejects, the next
   `loadDashboardData` call issues a fresh search rather than re-attaching to the
   poisoned promise (`dashboard-query-dedupe.test.ts:109-116`).

`__tests__/unit/data/loader-dashboard.test.ts` rounds this out with the
preference→filter projection and neighborhood-fetch skip rules
(`loader-dashboard.test.ts:50-191`).

## Smoke surfaces that touch the dedupe path

| Spec | What it exercises | Hits dedupe? |
| --- | --- | --- |
| `__tests__/e2e/smoke-min.spec.ts` | Landing render, hero/secondary CTA → /signup and /login, login page shape, footer brand. | No. Dashboard not entered; `loadDashboardData` not called. |
| `__tests__/e2e/no-auth-public-accessibility.spec.ts` | 11 public routes + `/dashboard`, `/dashboard/liked`, `/profile`, `/settings`, `/household/*`, `/couples*`, `/properties/<id>`, `/validation` redirect to `/login`; robots/sitemap/404. | No. Anonymous redirect happens before `loadDashboardData` is reached. |

So the dedupe code path is currently guarded **only** by the unit tests above.
No e2e or integration spec exercises the live in-flight collision path.

## Exact Phase 0/1 validation gaps that remain

Listed strictly within Phase 0/1 scope (no Phase 2+ scope creep):

1. **No authenticated `/dashboard` smoke** — the only seeded path (`/dashboard`) is
   currently asserted via the anonymous-redirect smoke in
   `no-auth-public-accessibility.spec.ts:107-120`. Authenticated traversal is still
   blocked on test-auth approval per `reports/home-match-revival/p0-site-traversal-acceptance-matrix-2026-05-08.md:78`.
   Until that approval lands, `loadDashboardData` is not exercised end-to-end.
2. **`unstable_cache` overlay is mocked away in unit tests** — `jest.mock('next/cache', …)`
   in both `dashboard-query-dedupe.test.ts:5-8` and `loader-dashboard.test.ts:5-8`
   replaces `unstable_cache` with an identity wrapper. The 60s revalidate window and
   cache-key composition in `loader.ts:316-326` therefore have no automated guard.
3. **Module-singleton scope is undocumented** — `inFlightDashboardSearches` is a
   per-process Map (`loader.ts:51`). On serverless / multi-worker deployments
   collisions only collapse within a single worker; this invariant is implicit in
   the code but not stated in any doc reviewed under `reports/home-match-revival/`.
4. **`LocationsClient` dedupe is unguarded** — `getCities` and `getMetroAreas`
   dedupe by lowercased key (`locations-client.ts:32-44`, `:154-162`); no unit or
   integration test asserts this. Browser-side neighborhood selectors depend on
   it.
5. **No live-collision integration test** — `dashboard-query-dedupe.test.ts`
   constructs a deferred mock; there is no Vitest integration spec under
   `__tests__/integration/` that drives two real concurrent
   `loadDashboardData` callers against a stubbed Supabase to verify the
   end-to-end coalescing including the `Promise.all` branch with neighborhoods
   (`loader.ts:333-336`).

## Disposition

- Dedupe implementation: closed for Phase 0/1 — code path exists, two unit
  invariants pinned.
- Smoke wiring around dedupe: open — gaps 1–5 above are the precise outstanding
  Phase 0/1 validation tasks. Gap 1 is the only one that is approval-gated; the
  rest are bounded test additions.
- No code change is recommended in this evidence pass; this report exists so the
  Phase 0/1 closure matrix can cite a single source for "dedupe present, these
  five smoke holes remain."

## Cross-refs

- `src/lib/data/loader.ts`
- `src/lib/services/locations-client.ts`
- `__tests__/unit/data/dashboard-query-dedupe.test.ts`
- `__tests__/unit/data/loader-dashboard.test.ts`
- `__tests__/e2e/smoke-min.spec.ts`
- `__tests__/e2e/no-auth-public-accessibility.spec.ts`
- `reports/home-match-revival/p0-site-traversal-acceptance-matrix-2026-05-08.md`
- `reports/home-match-revival/phase0-phase1-closure-matrix.md`
