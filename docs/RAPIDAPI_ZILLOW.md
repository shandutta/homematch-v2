# RapidAPI Zillow Integration

HomeMatch uses the Zillow API via RapidAPI for property ingestion and status updates.

**Approval required**: paid API calls need explicit approval before execution.

## Configuration

```bash
RAPIDAPI_KEY=your_rapidapi_key
RAPIDAPI_HOST=us-housing-market-data1.p.rapidapi.com  # optional; code defaults to this
```

## Request Headers

```ts
{
  'X-RapidAPI-Key': process.env.RAPIDAPI_KEY,
  'X-RapidAPI-Host': process.env.RAPIDAPI_HOST || 'us-housing-market-data1.p.rapidapi.com',
}
```

## Common Endpoints

- `GET /propertyExtendedSearch` — property discovery
- `GET /property-details` / `GET /property` — details and status
- `GET /images` — full image gallery

## Pipeline CLI

Unified CLI for all data operations:

```bash
pnpm exec tsx scripts/pipeline.ts <subcommand> [args]
```

Subcommands:

| Command         | Description                              | Example                                                                                 |
| --------------- | ---------------------------------------- | --------------------------------------------------------------------------------------- |
| `discover`      | Stage 1: fetch + upsert listings         | `pnpm exec tsx scripts/pipeline.ts discover --sort=Newest --maxPages=10`                |
| `verify`        | Stage 3: status refresh + price update   | `pnpm exec tsx scripts/pipeline.ts verify --limit=600 --delayMs=350`                    |
| `enrich-images` | Image enrichment for a property          | `pnpm exec tsx scripts/pipeline.ts enrich-images --zpid=12345678`                       |
| `coverage`      | Coverage gap report (DB vs RapidAPI)     | `pnpm exec tsx scripts/pipeline.ts coverage --locations="Oakland, CA;SF, CA" --showAll` |
| `dry-run`       | Estimate request count without executing | `pnpm exec tsx scripts/pipeline.ts dry-run --maxPages=10`                               |

Or use npm scripts:

```bash
pnpm pipeline:discover --sort=Newest --maxPages=10
pnpm pipeline:verify --limit=600
pnpm pipeline:enrich-images --zpid=12345678
pnpm pipeline:coverage --showAll
pnpm pipeline:dry-run
```

**Legacy scripts** (still available for backward compatibility):

- `pnpm exec tsx scripts/ingest-zillow.ts`
- `pnpm exec tsx scripts/refresh-zillow-status.ts`
- `pnpm exec tsx scripts/report-zillow-coverage.ts`

Source modules: `src/lib/ingestion/zillow.ts`, `src/lib/ingestion/zillow-images.ts`, `src/lib/ingest/pipeline.ts`. Legacy client: `src/lib/api/zillow-client.ts`.

## Rate Limits

Ultra plan: 45,000 requests/month, 3 requests/second. Default delay: 350ms. Override with `STATUS_DETAIL_DELAY_MS`.

Status refresh defaults to `STATUS_REFRESH_MAX_ITEMS=600` (tune with `?limit=`). Prioritizes active listings (`is_active=true`) and rotates through the queue by `updated_at`.

## Coverage Check

```bash
pnpm exec tsx scripts/pipeline.ts coverage
# or with legacy script:
ENV_FILE=.env.prod pnpm exec tsx scripts/report-zillow-coverage.ts
```

Compares Supabase active listings by city vs RapidAPI `totalResultCount`. Uses `ZILLOW_LOCATIONS`. Flags ratios `< 0.8` (missing coverage) or `> 1.3` (stale actives). ~1 request per city.

## Cron

```cron
# Daily ingestion (Newest)
30 2 * * * curl -sS -X POST "https://<host>/api/admin/ingest/zillow?sort=Newest&maxPages=10" -H "x-cron-secret: $ZILLOW_CRON_SECRET"

# Daily status refresh (active listings, 600 requests)
10 3 * * * curl -sS -X POST "https://<host>/api/admin/status-refresh?limit=600&delayMs=350" -H "x-cron-secret: $STATUS_REFRESH_CRON_SECRET"

# Weekly coverage boost (Price_Low_High, Sunday)
0 4 * * 0 curl -sS -X POST "https://<host>/api/admin/ingest/zillow?sort=Price_Low_High&maxPages=10" -H "x-cron-secret: $ZILLOW_CRON_SECRET"
```

Local equivalents (via unified CLI):

```bash
pnpm exec tsx scripts/pipeline.ts discover --sort=Price_Low_High --maxPages=10
pnpm exec tsx scripts/pipeline.ts verify --limit=600
pnpm exec tsx scripts/pipeline.ts coverage
pnpm exec tsx scripts/pipeline.ts dry-run --maxPages=10
```

## Related

- Property vibes backfill: `docs/property-vibes-backfill.md`
