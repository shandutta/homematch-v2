# Paid Zillow / RapidAPI provider — autonomous-worker approval gate

Date: 2026-05-08
Phase: P1 readiness slice (defensive guard only — no provider migration work)
Companion report: `zillow-provider-production-grade-evaluation-2026-05-08.md`
Mode: read-only inspection of routes/config + a static source-level gate. No
outbound paid calls, no Supabase mutations, no provider keys read.

## Why this gate exists

The 2026-05-08 provider evaluation concluded that the current Zillow path is
an unofficial paid RapidAPI aggregator (`us-housing-market-data1.p.rapidapi.com`)
and must not be the canonical production listing dependency until the
subscription, terms, and budget are re-approved. Until that approval lands,
no autonomous worker should be able to issue billable RapidAPI calls just
because `RAPIDAPI_KEY` happens to be present in the environment it inherits.

## Gate seam

A single env var, `HOMEMATCH_ALLOW_PAID_RAPIDAPI`, must be set to `1` or
`true` (case-insensitive, trimmed) for the four paid RapidAPI routes to
proceed. Anything else (unset, blank, `0`, `false`, `approved`, `production`,
or any other value) fails closed with HTTP 503 and the canonical message
`Paid RapidAPI Zillow provider call requires explicit owner approval before
production use`.

The gate is implemented in `src/lib/api/rapidapi-approval-gate.ts` as two
exports:

- `isPaidRapidApiApproved(): boolean` — read by API route handlers.
- `assertPaidRapidApiApprovalOrThrow(): void` — for libraries/scripts.

## Protected entry points

| Route                                              | Purpose                                                    | Gate location                                                         |
| -------------------------------------------------- | ---------------------------------------------------------- | --------------------------------------------------------------------- |
| `src/app/api/admin/ingest/zillow/route.ts`         | Bulk Bay Area listing ingest (74 cities × 10 pages)        | After `RAPIDAPI_KEY` presence check, before `ingestZillowLocations()` |
| `src/app/api/admin/status-refresh/route.ts`        | Per-`zpid` active-listing status refresh (default 600/day) | After `RAPIDAPI_KEY` presence check, before `fetchDetails()` loop     |
| `src/app/api/zillow/random-image/route.ts`         | Demo `/propertyExtendedSearch` + `/images` calls           | After `RAPIDAPI_KEY` presence check, before search fetch              |
| `src/app/api/admin/generate-vibes-zillow/route.ts` | `/property` + `/images` for LLM vibe generation            | After `RAPIDAPI_KEY` presence check, before `Promise.all(fetch...)`   |

The `__tests__/unit/lib/api/rapidapi-approval-gate.test.ts` guard enforces
that every file matching `RAPIDAPI_KEY` in the routes list above also imports
the gate symbols, so a future contributor cannot add a new RapidAPI route
that skips the gate without tripping the test.

## What this gate does NOT do

- Does not touch `scripts/*.ts` RapidAPI consumers
  (`scripts/ingest-zillow.ts`, `scripts/refresh-zillow-status*.ts`,
  `scripts/fetch-zillow-images.ts`, `scripts/report-zillow-coverage.ts`,
  `scripts/update-seed-zillow-images.ts`, `scripts/backfill-vibes*.ts`).
  Scripts are an explicit follow-up — the rationale is that scripts only run
  when a human types `pnpm exec tsx scripts/...`, while the four API routes
  are reachable by any process that can hold the cron secret.
- Does not change provider selection, plan, host, or quota math.
- Does not migrate to RentCast / MLS / IDX / RESO. Those remain owner-approval
  gated per the companion evaluation report.
- Does not call any provider, mock fetch, or read secrets.

## How to approve a paid RapidAPI run

Set `HOMEMATCH_ALLOW_PAID_RAPIDAPI=1` in the environment of the specific
process that has been approved to make billable calls (cron worker, manual
admin run, etc.). Leave it unset everywhere else — including in any
autonomous worker's environment template — so the gate fails closed by
default.
