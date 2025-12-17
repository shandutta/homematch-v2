# Property Vibes backfill (prod)

## What this does

- Generates `property_vibes` rows for `properties` using a vision LLM (Qwen3-VL via OpenRouter).
- Optionally refreshes `properties.images` by fetching the full Zillow gallery via RapidAPI.
- When `--refreshImages=true` and `--force=false`, it only regenerates vibes for properties that are missing, stale (source hash changed), or had images change during the refresh (so you don’t overwrite existing vibes / burn tokens unnecessarily).

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
ENV_FILE=.env.prod pnpm exec tsx scripts/backfill-vibes.ts --limit=200
```

Then repeat until the “missing” count in `scripts/property-vibes-review.sql` hits 0.

Or run the loop automatically until completion (writes `.logs/backfill-vibes-resume-report.json`):

```bash
ENV_FILE=.env.prod pnpm exec tsx scripts/backfill-vibes-resume.ts --limit=200
```

### Full refresh (regen vibes + refresh images)

This walks through the entire DB without reprocessing the same newest rows, using an offset cursor stored at `.logs/backfill-vibes-resume-state.json`:

```bash
ENV_FILE=.env.prod pnpm exec tsx scripts/backfill-vibes-resume.ts --limit=200 --fullRefresh=true
```

Prereq (recommended): apply the migration `supabase/migrations/20251213034000_add_zillow_images_refresh_marker.sql` so properties with small Zillow galleries don’t re-hit RapidAPI forever.

Optional knobs:

- Raise the “needs more images” threshold: `--minImages=30`
- Force a refetch even when images look complete: `--forceImages=true`
- Restart from the beginning: `--resetCursor=true`

## Tail logs (recommended)

The backfill scripts write a real log file you can `tail` (no `tee` needed):

```bash
tail -F .logs/backfill-vibes-resume.log
```

Optional:

- Change the log path with `--logFile=.logs/my-run.log`
- If you break commands across lines, use `\` for line continuation (otherwise bash treats the next line like a new command).

## VPS cron (suggested)

Example nightly job (uses a lock to prevent overlaps):

```cron
0 23 * * * cd /home/shan/homematch-v2 && flock -n /tmp/homematch-backfill-vibes.lock bash -lc 'set -a; source .env.prod; set +a; ENV_FILE=.env.prod pnpm exec tsx scripts/backfill-vibes.ts --limit=200 --force=false --refreshImages=false' >> /home/shan/homematch-v2/.logs/backfill-vibes.cron.log 2>&1
```
