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

## CLI scripts

Standalone scripts under `scripts/`. Each requires `RAPIDAPI_KEY` in `.env.local`, plus `HOMEMATCH_ALLOW_PAID_RAPIDAPI=1` for any path that issues paid calls (gated by `src/lib/api/rapidapi-approval-gate.ts`).

| Command                                              | Description                                                                                                               |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `pnpm refresh:zillow-status`                         | Status refresh + price update for existing listings. Tunable via `STATUS_REFRESH_MAX_ITEMS` and `STATUS_DETAIL_DELAY_MS`. |
| `pnpm exec tsx scripts/fetch-zillow-images.ts`       | Fetch the full image gallery for a property and write to `public/images/properties/`.                                     |
| `pnpm exec tsx scripts/update-seed-zillow-images.ts` | Update seed data with current image URLs.                                                                                 |
| `pnpm report:zillow-coverage`                        | Coverage report — DB rows vs RapidAPI availability.                                                                       |
| `pnpm cleanup:properties:ba`                         | Hard-delete properties outside the Bay-area city allowlist. Service-role; destructive.                                    |

Runtime status refresh is also exposed at `POST /api/admin/status-refresh` (admin-gated).

Pure ingest helpers (idempotency keys, freshness TTLs) live in `src/lib/ingest/{idempotency.ts,freshness.ts}`. There is no orchestrator/`pipeline.ts` in this branch — the previous unified CLI was removed; the standalone scripts above are the current path.

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
