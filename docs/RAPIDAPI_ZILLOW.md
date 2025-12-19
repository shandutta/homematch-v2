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

## Rate Limits and Safety

- Expect rate limits based on your RapidAPI plan.
- Use backoff for bulk jobs.
- Prefer small batches when running ingestion or refresh scripts.

## Related Docs

- Property vibes backfill: `docs/property-vibes-backfill.md`
