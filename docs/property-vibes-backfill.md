# Property Vibes backfill (prod)

## What this does

- Generates `property_vibes` rows for `properties` using a vision LLM (Qwen3-VL via OpenRouter).
- Optionally refreshes `properties.images` by fetching the full Zillow gallery via RapidAPI.

## Run manually (start with 10)

### Option A: newest 10 eligible properties

```bash
ENV_FILE=.env.prod pnpm exec tsx scripts/backfill-vibes.ts --limit=10 --force=true --refreshImages=false
```

### Option B: specific property IDs (UUIDs)

```bash
ENV_FILE=.env.prod pnpm exec tsx scripts/backfill-vibes.ts --propertyIds="uuid1,uuid2,uuid3" --force=true --refreshImages=false
```

Notes:

- Don’t use angle brackets like `--propertyIds=<...>` in bash; `<` is shell redirection.
- The script prints `supabaseHost=...` so you can confirm you’re pointed at prod.
- If `OPENROUTER_API_KEY` isn’t in `.env.prod`, it can live in `.env.local` (the script loads `.env.local` as a non-overriding fallback for API keys).
- A report is written to `.logs/backfill-vibes-report.json` and archived with a timestamp.

## Verify results (Supabase SQL Editor)

- Use `scripts/property-vibes-review.sql`:
  - Pick 10 missing properties
  - Coverage snapshot (missing vs present)
  - Latest vibes + deep dive + tag distribution

## Verify results (CLI)

```bash
ENV_FILE=.env.prod pnpm exec tsx scripts/report-vibes-backfill.ts --limit=10
```

## Scale to the full DB

Recommended pattern (resume-friendly):

```bash
ENV_FILE=.env.prod pnpm exec tsx scripts/backfill-vibes.ts --limit=200 --force=false --refreshImages=false
```

Then repeat until the “missing” count in `scripts/property-vibes-review.sql` hits 0.

## VPS cron (suggested)

Example nightly job (uses a lock to prevent overlaps):

```cron
0 23 * * * cd /home/shan/homematch-v2 && flock -n /tmp/homematch-backfill-vibes.lock bash -lc 'set -a; source .env.prod; set +a; ENV_FILE=.env.prod pnpm exec tsx scripts/backfill-vibes.ts --limit=200 --force=false --refreshImages=false' >> /home/shan/homematch-v2/.logs/backfill-vibes.cron.log 2>&1
```
