# Property Vibes Backfill

Generates `property_vibes` rows using a vision LLM via OpenRouter. Optionally refreshes property images from Zillow via RapidAPI.

**Approval required**: paid API calls (OpenRouter, RapidAPI Zillow) need explicit approval before execution. Uses `.env.prod`.

## What It Does

- Default model: `qwen/qwen3-vl-8b-instruct` via OpenRouter. Override with `OPENROUTER_MODEL`.
- When `--refreshImages=true` and `--force=false`: only regenerates vibes for properties that are missing, stale (source hash changed), or had images change. Doesn't overwrite existing vibes or burn tokens unnecessarily.

## Run Manually

### Newest 10 eligible properties

```bash
ENV_FILE=.env.prod pnpm exec tsx scripts/backfill-vibes.ts --limit=10 --force=true --refreshImages=false
```

### Specific property IDs

```bash
ENV_FILE=.env.prod pnpm exec tsx scripts/backfill-vibes.ts --propertyIds="uuid1,uuid2,uuid3" --force=true --refreshImages=false
```

Notes:

- Don't use angle brackets (`<...>`) in bash — `<` is shell redirection.
- The script prints `supabaseHost=...` so you can confirm target.
- If `OPENROUTER_API_KEY` isn't in `.env.prod`, it loads from `.env.local` as fallback.
- Report: `.logs/backfill-vibes-report.json` (archived with timestamp).

## Verify

**SQL**: `scripts/property-vibes-review.sql` — missing properties, coverage snapshot, latest vibes, tag distribution.

**CLI**:

```bash
ENV_FILE=.env.prod pnpm exec tsx scripts/report-vibes-backfill.ts --limit=10
```

## Scale to Full DB

Resume-friendly pattern:

```bash
ENV_FILE=.env.prod pnpm exec tsx scripts/backfill-vibes.ts --limit=200
```

Repeat until missing count hits 0 in the review SQL.

Or auto-loop (`--limit=200` batches, writes `.logs/backfill-vibes-resume-report.json`):

```bash
ENV_FILE=.env.prod pnpm exec tsx scripts/backfill-vibes-resume.ts --limit=200
```

Full refresh (regen vibes + refresh images, cursor-based at `.logs/backfill-vibes-resume-state.json`):

```bash
ENV_FILE=.env.prod pnpm exec tsx scripts/backfill-vibes-resume.ts --limit=200 --fullRefresh=true
```

Suggested: apply migration `supabase/migrations/20251213034000_add_zillow_images_refresh_marker.sql` first so properties with small galleries don't re-hit RapidAPI.

Optional knobs:

- `--minImages=30` — raise "needs more images" threshold
- `--forceImages=true` — force refetch even when images look complete
- `--resetCursor=true` — restart from beginning

## Tail Logs

```bash
tail -F .logs/backfill-vibes-resume.log
```

Override log path: `--logFile=.logs/my-run.log`

## Cron

Example nightly job (uses `flock` to prevent overlaps):

```cron
0 23 * * * cd /home/shan/homematch-v2 && flock -n /tmp/homematch-backfill-vibes.lock bash -lc 'set -a; source .env.prod; set +a; ENV_FILE=.env.prod pnpm exec tsx scripts/backfill-vibes.ts --limit=200 --force=false --refreshImages=false' >> /home/shan/homematch-v2/.logs/backfill-vibes.cron.log 2>&1
```
