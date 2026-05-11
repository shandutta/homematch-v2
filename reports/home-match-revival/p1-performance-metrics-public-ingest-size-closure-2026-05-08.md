# P1 Performance Metrics Public Ingest Size Closure — 2026-05-08

## Scope

Strict Phase 0/1 repo-local closure slice for the public `/api/performance/metrics` ingest surface identified in `p0-full-route-api-endpoint-inventory-matrix-2026-05-08.md`.

No credentials, production data, external APIs, browsers, deploys, broad installs, or Phase 2+ implementation were used.

## Change

Closed a bounded abuse-control gap on `POST /api/performance/metrics`:

- Added an explicit 64 KiB `content-length` guard that rejects oversized metrics payloads before parsing JSON.
- Added schema-level public-ingest bounds:
  - max 100 web-vital metrics per payload
  - max 100 custom metrics per payload
  - bounded metric names, IDs, navigation types, custom units/tags, URL, and user-agent strings
- Preserved existing route-scoped IP rate limiting and in-memory max-batch retention.
- Updated the unit route test mock to reapply `NextResponse.json` implementation in `beforeEach`, matching this repo's `resetMocks: true` behavior.

## Evidence

RED:

```bash
systemd-run --user --scope -p MemoryMax=2G -p CPUQuota=200% pnpm exec jest __tests__/unit/app/api/performance/metrics/route.test.ts --runInBand
```

Expected new failure observed before production-code change:

- `rejects metrics payloads over the route payload size cap before parsing`
- expected `413`, received success/default status from the existing route

GREEN targeted Jest:

```bash
systemd-run --user --scope -p MemoryMax=2G -p CPUQuota=200% pnpm exec jest __tests__/unit/app/api/performance/metrics/route.test.ts --runInBand
```

Result: 4/4 tests passed.

Resource-limited type-check:

```bash
systemd-run --user --scope -p MemoryMax=3G -p CPUQuota=200% pnpm type-check
```

Result: passed (`pnpm exec tsc --noEmit`).

## Closure status

Repo-local P1 public metrics abuse-control slice is closed for request size and payload shape. Remaining production-grade observability decisions, if any, are outside this strict Phase 0/1 slice and should be handled as a separate owner-approved durability/observability decision.
