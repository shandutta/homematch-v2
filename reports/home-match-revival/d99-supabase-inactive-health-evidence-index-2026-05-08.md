# D99 — Supabase Inactive / Prod Health Failure Evidence Index

Generated: 2026-05-08 (worker `d99-supabase-inactive-health-doc-2017`).

## Scope

Strict Phase 0/1 indexing slice. Maps the "remote Supabase project is inactive/paused/unreachable" failure mode to the evidence that already exists in this repo: route behavior, static guards, unit/integration tests, and prior live-probe artifacts. No secrets are inspected, copied, printed, or committed; no live calls were made; no migrations or dashboards were touched.

This is an index, not new code. It does not advance Phase 0/1 closure. The strict OG gate still applies per `phase0-phase1-strict-closure-gate.md` and `phase0-phase1-closure-matrix.md`.

## Failure mode being indexed

A remote Supabase project (e.g., the one referenced as the production-host pattern guarded by `config/supabase-production-hosts.json` and `scripts/guard-supabase-env.js`) can become temporarily unreachable for any of the following non-secret reasons:

- Free-tier project paused for inactivity (project must be unpaused via the dashboard owner, not by this worker).
- Network/regional outage between the local app and Supabase.
- Anon/service-role key rotated or revoked while `.env.local` still references the old value.
- Local guard bypass (`SKIP_SUPABASE_GUARD=true`) running against a project that is unreachable for any other reason.

In all of the above, the symptom at the app boundary is the same: `/api/health` reports `database: error` with a non-secret error message, and authenticated user-auth API endpoints return their normal 401 (because the guard rejects before any DB call), but DB-backed reads/writes fail.

## Repo-side evidence map

| Surface                           | File                                                                                                                                               | What it proves about inactive-Supabase health                                                                                                                                                                                                                                                                                    |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Health route handler              | `src/app/api/health/route.ts`                                                                                                                      | Wraps the DB probe in try/catch; on failure sets `response.database = 'error'` with a sanitized `database_error` string and returns HTTP 503 with `Cache-Control: no-cache, no-store, must-revalidate`. Keys, URLs, and tokens are never echoed into the body.                                                                   |
| Health route unit test (healthy)  | `__tests__/unit/app/api/health/route.test.ts` (`returns healthy response when DB connectivity succeeds`)                                           | Pins 200 + `status: healthy` + `database: connected` when the Supabase mock resolves with `error: null`.                                                                                                                                                                                                                         |
| Health route unit test (degraded) | `__tests__/unit/app/api/health/route.test.ts` (`returns degraded response when DB connectivity fails`)                                             | Pins 503 + `database: error` + `database_error` containing the underlying message when the Supabase mock returns an error. This is the static guard for the inactive/paused-Supabase symptom.                                                                                                                                    |
| Health route integration test     | `__tests__/integration/api/health.spec.ts`                                                                                                         | Asserts `[200, 503].includes(response.status)`, requires `database` ∈ {`connected`, `error`}, and requires a non-empty `database_error` string when `database === 'error'`. Intentionally does not fail CI when the remote DB is down — it pins the contract instead.                                                            |
| Cache-control static guard        | `__tests__/unit/api/cache-control.test.ts` (`src/app/api/health/route.ts ... declares explicit no-store cache policy for health/status responses`) | Prevents an inactive-Supabase 503 from being cached by intermediaries: requires `Cache-Control` with `no-cache, no-store, must-revalidate` to remain in the route source.                                                                                                                                                        |
| Env-host guard                    | `scripts/guard-supabase-env.js`, `config/supabase-production-hosts.json`                                                                           | Blocks `pnpm dev` against production-host patterns by default; exit code/error output reports offender categories only (e.g. `SUPABASE_URL_HOST`, `SUPABASE_HOST_PATTERN`), never values. Inactive-Supabase recovery work that needs the dashboard owner to unpause the project must not bypass this guard with secret printing. |
| Dev warmup readiness contract     | `scripts/dev-warmup.js`                                                                                                                            | Treats `/api/health` as the readiness probe (`WARMUP_READINESS_PATH` default) and accepts any `>=400` as "server is up" so an inactive-Supabase 503 still proceeds to route warming instead of looping forever.                                                                                                                  |

## Prior live-probe evidence (already on disk)

| Artifact                                                                            | What it captured                                                                                                                                                                                                                         | Status today                                                                                                                                      |
| ----------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `reports/home-match-revival/phase0-live-probe-auth-cron-env-closure-2026-05-08.md`  | Local app boot via `SKIP_SUPABASE_GUARD=true pnpm dev`; `/api/health` returned 200 with `Cache-Control: no-cache, no-store, must-revalidate`.                                                                                            | Snapshot of a healthy state; does not prove behavior under inactive Supabase.                                                                     |
| `reports/home-match-revival/remote-supabase-test-seed-and-auth-probe-2026-05-08.md` | Local app on `127.0.0.1:3100` against remote Supabase host `lpwlbbowavozpywnpamn.supabase.co`; auth-smoke matrix passed; secrets handled via `.env.local` and `SETUP_TEST_USERS_REDACT_OUTPUT=true` with no key printing.                | Snapshot of a reachable remote project. The host string is a non-secret project ref only; rotating credentials does not invalidate this artifact. |
| `reports/home-match-revival/p0-p1-strict-anonymous-live-probe-rerun-2026-05-08.md`  | After the `src/middleware.ts` discovery fix, anonymous protected routes redirect with HTTP 307 + `Location` before page rendering; `/api/health` carries middleware security headers (`x-frame-options: DENY`, COOP/CORP `same-origin`). | Confirms middleware stays in front of `/api/health` even on the failure path.                                                                     |

No prior artifact captures a real remote-Supabase-paused 503 against this repo. That live capture is gated by ownership of the remote project (dashboard owner must be the one who pauses/unpauses) and is therefore external-approval-gated; it is not authorized by this index.

## Phase 0/1 blocker positioning

This failure mode does not introduce a new blocker. It maps onto existing rows from `reports/home-match-revival/p0-p1-blocker-evidence-index-2026-05-08.md`:

- Row 3 (API auth smoke live token + server) — an inactive-Supabase 503 from `/api/health` invalidates the prereq for the auth-smoke matrix; the matrix already refuses non-local targets unless `ALLOW_REMOTE_API_AUTH_SMOKE=1` is set, so degradation is contained.
- Row 7 (D6 DB reset/lint/rollback/integration validation) — a paused remote project keeps the live execution leg blocked; the static reset-readiness guards in `__tests__/unit/database/migration-reset-readiness.test.ts` remain green because they do not call out.
- Row 1 / Row 2 / Row 11 / Row 12 (authenticated traversal, lifecycle, mutation flows, accessibility positive traversal) — all become blocked again until the project is reachable; the local Supabase/Docker lane (Row 7 option A) remains the bounded recovery path.

`config/signup-verification-launch-policy.json` and the D3 invariants do not change under this failure mode; they are static repo policy.

## Secret-handling discipline preserved by this index

- No anon key, service-role key, password, bearer token, cookie, or 1Password session token is referenced or printed.
- The remote Supabase host `lpwlbbowavozpywnpamn.supabase.co` is a non-secret project ref already documented in `reports/home-match-revival/remote-supabase-test-seed-and-auth-probe-2026-05-08.md` and used by `config/supabase-production-hosts.json` for guard purposes only; including it here does not widen secret exposure.
- Health-route 503 bodies surface `database_error` strings sourced from the Supabase client (`error.message`) or a generic fallback. The route does not interpolate URLs, keys, or auth state into that string. If a future Supabase client version changes to include credentials in error messages, the unit test in `__tests__/unit/app/api/health/route.test.ts` would still pass but would silently leak; treat that as a future static-guard follow-up rather than something to assert here.

## What this index does NOT do

- Does not authorize unpausing/restarting a remote Supabase project.
- Does not authorize running migrations, seeds, or destructive resets against any environment.
- Does not authorize Phase 2+, paid APIs, browser swarms, or production-dashboard mutations.
- Does not change Phase 0/1 verdict or matrix entries.
- Does not modify the `/api/health` route, its tests, or the env guard.

## Recommended next bounded action (not executed here)

If/when a Phase 0/1 lane needs a real captured 503-from-inactive-Supabase artifact, the smallest safe slice is:

1. Wait until the remote project is intentionally paused (or pause a disposable test project the dashboard owner has approved).
2. From the worktree, run `SKIP_SUPABASE_GUARD=true pnpm dev` and `curl -sS -D - http://127.0.0.1:3000/api/health` once, with the body redirected to a temp file under `/tmp/`.
3. Persist only the status line, the `database`/`database_error` JSON keys, and the `Cache-Control` header into a new `reports/home-match-revival/d99-...` evidence file. Never persist `.env.local`, the body verbatim if it contains URLs/keys, or any 1Password output.

This index exists so that follow-up step has a stable home and does not need to re-derive the failure-mode contract.
