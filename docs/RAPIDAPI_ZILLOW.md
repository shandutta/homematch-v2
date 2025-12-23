# RapidAPI Zillow Integration

HomeMatch uses the Zillow API via RapidAPI for property ingestion, image refresh, and status updates.

## Configuration

Environment variables (see `.env.example`):

```bash
RAPIDAPI_KEY=your_rapidapi_key
RAPIDAPI_HOST=us-housing-market-data1.p.rapidapi.com
```

`RAPIDAPI_HOST` is optional; code defaults to `us-housing-market-data1.p.rapidapi.com`.

## Request Headers

```ts
{
  'X-RapidAPI-Key': process.env.RAPIDAPI_KEY,
  'X-RapidAPI-Host': process.env.RAPIDAPI_HOST || 'us-housing-market-data1.p.rapidapi.com',
}
```

## Common Endpoints Used

- `GET /propertyExtendedSearch` (property discovery)
- `GET /property-details` and `GET /property` (property details/status)
- `GET /images` (full image gallery)

## Scripts That Use RapidAPI

- `scripts/ingest-zillow.ts`
- `scripts/refresh-zillow-status.ts`
- `scripts/refresh-zillow-status-search.ts`
- `scripts/refresh-zillow-status-detail.ts`
- `scripts/fetch-zillow-images.ts`
- `scripts/update-seed-zillow-images.ts`
- `scripts/report-zillow-coverage.ts`

## Client Locations

- API client: `src/lib/api/zillow-client.ts`
- Ingestion helpers: `src/lib/ingestion/`

## Rate Limits and Safety

- Expect rate limits based on your RapidAPI plan.
- Use backoff for bulk jobs.
- Defaults target ~3 rps with headroom: ingestion delay is 350ms and status refresh delay is 350ms.
- Prefer small batches when running ingestion or refresh scripts (override with `STATUS_DETAIL_DELAY_MS` if needed).
- Status refresh defaults to `STATUS_REFRESH_MAX_ITEMS=600` (tune with query param `?limit=` or env).
- Status refresh prioritizes active listings (`is_active=true`) and updates `updated_at` so each run rotates through the queue.

## Plan Math (Ultra)

Ultra plan limits (current): **45,000 requests/month** and **3 requests/second**.

Default Bay Area ingestion settings:

Requests per run = `locations * maxPages` (pageSize doesn't change request count).
Default `pageSize` is 50 (RapidAPI allows up to 50 results per page).

With the full Bay Area list (74 cities in `src/app/api/admin/ingest/zillow/route.ts` and `.env.prod`):

- Worst-case requests per run: `74 locations * 10 pages = 740` (per sort).

Recommended schedule within budget:

- Daily ingestion with `sort=Newest`: `740 * 30 ≈ 22,200`.
- Daily status refresh via API route default limit (600): `600 * 30 ≈ 18,000`.
- Weekly follow-up with `sort=Price_Low_High`: `740 * 4 ≈ 2,960`.
- Total: ~43,160 requests/month, leaving ~1,800 for images, manual runs, or spikes.

If you need more coverage, add another weekly sort or expand `ZILLOW_LOCATIONS` before raising `maxPages`.

## Coverage Check Script

Goal: compare Supabase active listings by city vs RapidAPI `totalResultCount` for ForSale listings to spot ingestion gaps (low ratio) or stale actives (high ratio).

```bash
ENV_FILE=.env.prod pnpm exec tsx scripts/report-zillow-coverage.ts
```

Defaults:

- Uses `ZILLOW_LOCATIONS`.
- Treats `active` + `pending` as active.
- Flags ratios `< 0.8` (missing coverage) or `> 1.3` (stale actives).
- Costs ~1 request per city (~74 total).

## Cron Examples

Suggested VPS cron schedule (Ultra, within budget):

```cron
# Daily ingestion (Newest) at 02:30
30 2 * * * curl -sS -X POST "https://<host>/api/admin/ingest/zillow?sort=Newest&maxPages=10" -H "x-cron-secret: $ZILLOW_CRON_SECRET"

# Daily status refresh (active listings only, 600 requests) at 03:10
10 3 * * * curl -sS -X POST "https://<host>/api/admin/status-refresh?limit=600&delayMs=350" -H "x-cron-secret: $STATUS_REFRESH_CRON_SECRET"

# Weekly coverage boost (Price_Low_High) Sunday at 04:00
0 4 * * 0 curl -sS -X POST "https://<host>/api/admin/ingest/zillow?sort=Price_Low_High&maxPages=10" -H "x-cron-secret: $ZILLOW_CRON_SECRET"
```

Daily ingestion:

```bash
curl -X POST "https://<host>/api/admin/ingest/zillow?sort=Newest&maxPages=10" \
  -H "x-cron-secret: $ZILLOW_CRON_SECRET"
```

Weekly coverage boost:

```bash
curl -X POST "https://<host>/api/admin/ingest/zillow?sort=Price_Low_High&maxPages=10" \
  -H "x-cron-secret: $ZILLOW_CRON_SECRET"
```

Daily status refresh (active listings only, 600 requests):

```bash
curl -X POST "https://<host>/api/admin/status-refresh?limit=600&delayMs=350" \
  -H "x-cron-secret: $STATUS_REFRESH_CRON_SECRET"
```

Local script (same idea):

```bash
pnpm exec tsx scripts/ingest-zillow.ts --sort=Price_Low_High --maxPages=10
```

## One-Time Backfill (Expanded Coverage)

With 74 cities, the regular cron leaves ~1,800 requests/month. That is enough for a one-time extra sort (740 requests) or two (1,480 requests) without changing cron.

If you want a deeper backfill (e.g., 3-4 extra sorts or price bands), temporarily pause the weekly sort or drop daily status refresh to `limit=500` for that month to stay under 45k.

## Related Docs

- Property vibes backfill: `docs/property-vibes-backfill.md`
