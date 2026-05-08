---
date: 2026-05-08
phase: P0/P1 evidence
scope: read-only index of admin / cron / ingest / generation endpoints with side-effect or credential risk, their in-repo protections, and remaining approval-gated live checks
authors: hermes-claude (worktree d128-admin-cron-side-effect-gate-index-2026)
status: HELD — repo-side static index; no live invocation, no secret printing, no Phase 2+ implementation
related:
  - reports/home-match-revival/admin-tooling-gap-index-2026-05-08.md
  - reports/home-match-revival/security-evidence-index-2026-05-08.md
  - reports/home-match-revival/phase0-live-probe-auth-cron-env-closure-2026-05-08.md
  - reports/home-match-revival/p0-p1-blocker-evidence-index-2026-05-08.md
  - reports/home-match-revival/d2-durable-rate-limiter-approval-gate-guard-2026-05-08.md
  - reports/home-match-revival/m8-external-timeouts-closure-2026-05-08.md
---

# Admin / Cron Side-Effect Gate Index — Phase 0/1

## 0. Purpose & boundary

This file is a **read-only index** of every admin / cron / ingest / generation
HTTP route in `src/app/api/admin/**` that has either a credential dependency
(cron secret, paid third-party key, service-role Supabase client) or a
side-effect surface (DB writes, paid external calls). For each route it
records the in-repo gate ordering that already exists, points at the prior
Phase 0 evidence that exercised the rejection path, and names the remaining
checks that stay approval-gated.

It does **not**:

- invoke any of these routes (live, local, or staged);
- read, log, or print any cron secret or third-party API key value;
- change route behavior, gate ordering, or rate-limit policy;
- add tests, migrations, or new monitoring;
- duplicate the operator-tooling roadmap in
  `admin-tooling-gap-index-2026-05-08.md` — that file owns the *gap* view;
  this file owns the *side-effect / credential surface* view of the routes
  that already exist.

Vercel cron schedules are intentionally out of scope: `vercel.json` does not
declare any `crons` entry today, so the "cron" surface in this index is
entirely the cron-secret-gated POST endpoints below, not a platform schedule.

## 1. Routes in scope

Discovery basis: every file under `src/app/api/admin/**/route.ts` at HEAD
`2170964` on `autonomy/hm-d128-admin-cron-side-effect-gate-index-2026`.

```
src/app/api/admin/
├── generate-neighborhood-vibes/route.ts
├── generate-vibes/route.ts
├── generate-vibes-zillow/route.ts
├── ingest/zillow/route.ts
└── status-refresh/route.ts
```

There is no `src/app/admin/**` route group; the operator surface is API-only.
Outside `src/app/api/admin/**`, no other route declares a cron secret check
or invokes `createStandaloneClient()` from a request handler — `grep`
confirmed cron-secret references only in the five files above plus a
dashboard test page (`src/app/dashboard/vibes-test/page.tsx`, client-only).

## 2. Per-route side-effect / credential matrix

Columns:

- **Side-effect class** — what the route does past the gate.
- **Credentials touched** — env keys the route reads (names only — no
  values are read, logged, or persisted by this index).
- **In-repo gate order** — sequence the request must pass before any
  external call or DB write. All five gates resolve in the same module
  (`src/lib/api/admin-rate-limit.ts` → `src/lib/middleware/rateLimiter.ts`)
  and reject with `ApiErrorHandler.unauthorized` / `serviceUnavailable`.
- **Phase 0 rejection evidence** — the artifact that already shows the
  unauthenticated request returning 401 before any side effect.

| # | Route | Side-effect class | Credentials touched | In-repo gate order | Phase 0 rejection evidence |
|---|---|---|---|---|---|
| 1 | `POST /api/admin/ingest/zillow` | DB write (`properties` upsert via `ingestZillowLocations`) + paid RapidAPI Zillow fetches | `ZILLOW_CRON_SECRET`, `RAPIDAPI_KEY`, `RAPIDAPI_HOST`, service-role Supabase via `createStandaloneClient` | (a) cron-secret check (header `x-cron-secret` or `?cron_secret=`); (b) `rateLimitAdminRoute('admin:ingest-zillow')`; (c) `RAPIDAPI_KEY` presence → 503 if absent; (d) `ingestZillowLocations` | `phase0-live-probe-auth-cron-env-closure-2026-05-08.md` row `POST /api/admin/ingest/zillow → 401` |
| 2 | `POST /api/admin/status-refresh` | DB write (`properties` upsert of `listing_status` / `is_active` / `price`) + paid RapidAPI fetches in a paginated loop | `STATUS_REFRESH_CRON_SECRET` (falls back to `ZILLOW_CRON_SECRET`), `RAPIDAPI_KEY`, `RAPIDAPI_HOST`, service-role Supabase via `createStandaloneClient` | (a) `CRON_SECRET` env presence → 500 if missing; (b) `RAPIDAPI_KEY` presence → 503 if missing; (c) cron-secret comparison → 401; (d) `rateLimitAdminRoute('admin:status-refresh')`; (e) Supabase select → upsert loop with deadline + per-fetch `fetchWithTimeout` | `phase0-live-probe-auth-cron-env-closure-2026-05-08.md` row `POST /api/admin/status-refresh → 401` |
| 3 | `POST /api/admin/generate-vibes` | DB write (`property_vibes` upsert) + paid OpenRouter LLM batch | `VIBES_CRON_SECRET` (falls back to `ZILLOW_CRON_SECRET`), `OPENROUTER_API_KEY`, service-role Supabase via `createStandaloneClient` | (a) cron-secret comparison → 401; (b) `rateLimitAdminRoute('admin:generate-vibes')`; (c) `OPENROUTER_API_KEY` presence → 503; (d) Supabase select → batch generate → upsert | `phase0-live-probe-auth-cron-env-closure-2026-05-08.md` row `POST /api/admin/generate-vibes → 401` |
| 4 | `GET  /api/admin/generate-vibes` | Read-only counts on `property_vibes` and `properties` (no write); leaks `openRouterConfigured` boolean | `VIBES_CRON_SECRET` (falls back to `ZILLOW_CRON_SECRET`), service-role Supabase via `createStandaloneClient` | (a) cron-secret comparison (query-only) → 401; (b) `rateLimitAdminRoute('admin:generate-vibes')`; (c) `noStoreJson` response | `phase0-live-probe-auth-cron-env-closure-2026-05-08.md` row `GET /api/admin/generate-vibes → 401` |
| 5 | `POST /api/admin/generate-vibes-zillow` | Paid RapidAPI fetch + paid OpenRouter LLM call, returned to caller for preview (no DB write per route comment) | `VIBES_CRON_SECRET` (falls back to `ZILLOW_CRON_SECRET`), `RAPIDAPI_KEY`, `OPENROUTER_API_KEY` | (a) cron-secret comparison → 401; (b) `rateLimitAdminRoute('admin:generate-vibes-zillow')`; (c) `RAPIDAPI_KEY` presence → 503; (d) `OPENROUTER_API_KEY` presence → 503; (e) Zillow detail fetch via `fetchWithTimeout` (`ZILLOW_FETCH_TIMEOUT_MS = 10_000`); (f) vibes generation | `phase0-live-probe-auth-cron-env-closure-2026-05-08.md` row `POST /api/admin/generate-vibes-zillow → 401` |
| 6 | `POST /api/admin/generate-neighborhood-vibes` | DB write (`neighborhood_vibes` upsert) + paid OpenRouter LLM batch + Supabase RPC `neighborhood_stats` | `VIBES_CRON_SECRET` (falls back to `ZILLOW_CRON_SECRET`), `OPENROUTER_API_KEY`, service-role Supabase via `createStandaloneClient` | (a) cron-secret comparison → 401; (b) `rateLimitAdminRoute('admin:generate-neighborhood-vibes')`; (c) `OPENROUTER_API_KEY` presence → 503; (d) RPC + select → batch generate → upsert | `phase0-live-probe-auth-cron-env-closure-2026-05-08.md` row `POST /api/admin/generate-neighborhood-vibes → 401` |

Cross-cutting observations (held, not asserted as bugs):

- **Identity gate is rate-limit + cron-secret only.** None of these routes
  require an authenticated admin session. Whether that is acceptable for
  Phase 1 dogfooding is the held decision tracked in
  `admin-tooling-gap-index-2026-05-08.md` §2.1 and is *not* re-litigated
  here.
- **All five reject before any side-effect path** in the in-repo flow
  (verified by reading the route ordering above; verified at runtime in
  the local dev probe captured by `phase0-live-probe-auth-cron-env-closure-2026-05-08.md`).
- **Rate-limit key is per-IP-per-route**: `rateLimitKey(routeKey, ip)` from
  `src/lib/api/admin-rate-limit.ts` → `src/lib/middleware/rateLimiter.ts`.
  Durable / cross-instance behavior remains the held approval surface
  tracked in `d2-durable-rate-limiter-approval-gate-guard-2026-05-08.md`.
- **Service-role client construction** flows through
  `createStandaloneClient` from `src/lib/supabase/standalone.ts`. The same
  helper is the subject of the public-route service-role bug captured as
  the `/api/maps/metro-boundaries` 500 in the Phase 0 live probe artifact;
  on the admin side it is reached only after the cron-secret gate.

## 3. What is already covered by repo-side evidence

- **Static rejection ordering** — confirmed by reading the routes above at
  HEAD `2170964`; no in-repo bypass path exists that skips the cron-secret
  check before a DB write or paid external call.
- **Rate-limit invocation** — every admin route imports
  `rateLimitAdminRoute` and calls it before any external fetch / DB write.
  The cross-route adoption scan
  (`reports/home-match-revival/p1-route-scoped-limiter-key-closure-2026-05-08.md`)
  remains the canonical adoption record.
- **External-call timeouts** — RapidAPI calls in `status-refresh` and
  `generate-vibes-zillow` go through `fetchWithTimeout`; the broader
  external-timeout closure is `m8-external-timeouts-closure-2026-05-08.md`.
- **Anonymous live-rejection probe** — the 401-before-side-effects probe
  is captured in `phase0-live-probe-auth-cron-env-closure-2026-05-08.md`
  rows referenced per route in §2.

## 4. Remaining approval-gated live checks (held — not run here)

Each item below requires explicit operator approval and a real cron secret;
none of them are within this worker's bounded scope.

| # | Check | What it would prove | Why held |
|---|---|---|---|
| L1 | Authenticated POST to each admin route with a valid cron secret in a sealed local environment, asserting the route returns the structured success envelope and writes the expected rows. | The success path past the gate works end-to-end, not just the rejection path. | Requires a real cron secret + a sandboxed Supabase + paid RapidAPI / OpenRouter quota; none are authorized in this worker. |
| L2 | Wrong-secret POST returning 401 *with rate-limit headers populated*. | The rate-limit counter advances on rejected attempts, not just accepted ones. | Requires a request shape with a deliberately wrong secret repeated past the limiter threshold; safer to run inside the durable-limiter approval slice (`d2-durable-rate-limiter-approval-gate-guard-2026-05-08.md`). |
| L3 | Concurrency / deadline behavior of `status-refresh` against a populated `properties` table near `STATUS_REFRESH_MAX_RUNTIME_MS`. | The deadline buffer + pagination cleanly stop the loop without partial upserts at the boundary. | Requires real RapidAPI calls and a populated DB; held until ingest observability gate opens (see `admin-tooling-gap-index-2026-05-08.md` §3.1). |
| L4 | Spend attribution check across one `generate-vibes` batch + one `generate-neighborhood-vibes` batch. | The reported `totalCostUsd` matches the OpenRouter usage records for the run. | Requires paid OpenRouter calls + access to billing; held until the spend-visibility gate opens (`admin-tooling-gap-index-2026-05-08.md` §3.4). |
| L5 | Service-role client invocation audit for the admin path (vs. the known-bad public path on `/api/maps/metro-boundaries`). | Confirms that `createStandaloneClient` is only reached after a cron-secret-gated handler and never from a public route. | Static read of `createStandaloneClient` callers is in scope and is recorded in `security-evidence-index-2026-05-08.md`; the *runtime* assertion on a deployed environment is held. |

## 5. Snapshot freshness

This index reflects repository state at HEAD `2170964` on branch
`autonomy/hm-d128-admin-cron-side-effect-gate-index-2026` as of 2026-05-08.
It is a static snapshot of route ordering, env-key reads, and existing
evidence cross-references — not a live attestation. Re-grep
`src/app/api/admin/**` and re-read each row in §2 before quoting this
index in a future planning doc; the in-repo gate ordering is the part
most likely to drift if any of these routes is touched.
