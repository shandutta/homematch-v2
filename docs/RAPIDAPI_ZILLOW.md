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

## Client Locations

- API client: `src/lib/api/zillow-client.ts`
- Ingestion helpers: `src/lib/ingestion/`

## Rate Limits and Safety

- Expect rate limits based on your RapidAPI plan.
- Use backoff for bulk jobs.
- Prefer small batches when running ingestion or refresh scripts.

## Plan Math (Ultra)

Ultra plan limits (current): **45,000 requests/month** and **3 requests/second**.

Default Bay Area ingestion settings:

- Locations: 74 cities (see defaults in `src/app/api/admin/ingest/zillow/route.ts`).
- Max pages: 10 per location.
- Worst-case requests per run: `74 locations * 10 pages = 740` (per sort).

Recommended schedule within budget:

- Daily ingestion with `sort=Newest`: `740 * 30 ≈ 22,200` requests/month.
- Weekly follow-up with `sort=Price_Low_High`: `740 * 4 ≈ 2,960` requests/month.
- Daily status refresh via API route default limit (430): `430 * 30 ≈ 12,900` requests/month.
- Total: ~38k requests/month, leaving ~7k for images, manual runs, or spikes.

If you need more coverage, add another weekly sort rather than another daily run.

## Cron Examples

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

Local script (same idea):

```bash
pnpm exec tsx scripts/ingest-zillow.ts --sort=Price_Low_High --maxPages=10
```

## Related Docs

- Property vibes backfill: `docs/property-vibes-backfill.md`
