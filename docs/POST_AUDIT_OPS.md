# Post-Audit Ops Runbook

Companion to `.gstack/qa-reports/qa-report-prod-2026-05-13-full-tour.md`.
The code fixes from that audit (PRs #37–#42) all landed in May 2026.
The remaining items below are operational tasks that need production
credentials or admin-console access, so they cannot run from a
developer machine without explicit authorization.

## 1. USERNAME-DROP (Clerk dashboard only)

The Sign-Up form's Username field is configured in the Clerk dashboard,
not in code (`src/app/sign-up/[[...sign-up]]/page.tsx` mounts the stock
`<SignUp />` widget with no field overrides). To remove it:

1. Sign in to <https://dashboard.clerk.com/> with an admin Clerk
   account for the HomeMatch tenant.
2. Navigate to **User & Authentication → Email, Phone, Username**.
3. Toggle the **Username** row to "Off" (uncheck both _Used for sign-in_
   and _Used for sign-up_).
4. Save. The next signup will not show the field.

Compatibility note: `src/lib/auth/ensure-profile.ts:44` reads
`clerkUser.username` as a fallback when constructing the display name.
That branch still works for existing accounts that have a username; new
accounts will fall through to the email-derived fallback in the same
function (no code change required).

## 2. Zillow description + amenities backfill (RapidAPI)

PR #38 fixed the _ingest_ path so all new properties arrive with
`description` and `amenities` populated. Existing rows (≈13K)
predate the fix and still have NULL values, which is half of the LLM
hallucination root cause. Backfill script:

```bash
# Dry run first to confirm row count
pnpm tsx scripts/backfill-zillow-description-amenities.ts --dryRun=true

# Real run. ~76 minutes for 13K rows at 350ms delay (RapidAPI courtesy).
pnpm tsx scripts/backfill-zillow-description-amenities.ts

# Optional flags:
#   --limit=N         cap rows processed (default: all)
#   --batchSize=N     log progress every N rows (default: 25)
#   --delayMs=N       per-request delay (default: 350)
```

Required env (script reads `.env.local`):

- `RAPIDAPI_KEY` — your US Housing Market Data plan key
- `RAPIDAPI_HOST` — defaults to `us-housing-market-data1.p.rapidapi.com`
- `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` — for the service-role
  client (writes bypass RLS)

The query naturally excludes already-populated rows, so a second run
after a partial completion (network drop, key rotation) picks up only
the remainder. Cost: 1 RapidAPI billable call per property.

## 3. Re-run property vibes for backfilled rows

After §2 finishes, the backfilled rows need their vibes re-generated so
the LLM sees the new `description` + `amenities` context. The admin
route handles batching:

```bash
# Forces regeneration even though source_data_hash hasn't changed.
# `force=true` is required because the hash is computed from the
# property record and we want to pick up the new amenities/description.
curl -X POST "$PROD_BASE_URL/api/admin/generate-vibes?force=true&count=50" \
  -H "x-cron-secret: $VIBES_CRON_SECRET"
```

Required env on the Vercel project:

- `VIBES_CRON_SECRET` or `ZILLOW_CRON_SECRET`
- `OPENROUTER_API_KEY`

Cost: 1 OpenRouter vision call per property (model
`qwen/qwen3-vl-8b-instruct` by default). Budget accordingly — full
13K rerun is multiple dollars; sample-test with `count=50` first to
confirm grounded output before kicking off the full batch.

## 4. LLM trust audit re-run

After §2 + §3 finish, repeat the audit's Section 1 analysis to confirm
the regression. The original audit lives at
`.gstack/qa-reports/qa-report-prod-2026-05-13-full-tour.md`; the
procedure is reproduced here so the next pass is mechanical.

### Tag-frequency check

```sql
-- Run against prod Supabase. Compare counts to the audit's baseline.
select tag, count(*) as occurrences
from property_vibes,
     lateral unnest(suggested_tags) as tag
group by tag
order by occurrences desc
limit 30;
```

The audit's baseline hot offenders (pre-PR-#39 gating) were:

| Tag                   | Before |
| --------------------- | -----: |
| Remote Work Ready     |  6,469 |
| Walkable Neighborhood |  4,663 |
| Growing Family        |  4,328 |
| Pet Paradise          |  4,120 |
| Hardwood Throughout   |  1,987 |
| Quiet Cul-de-sac      |    880 |

After PR #39's `gateTagsAgainstInput`, these should drop to ~0 unless a
caller bypasses the gate (search the codebase for `.suggested_tags`
direct writes — should be exactly one in
`src/lib/services/vibes/vibes-service.ts`).

### Confidence distribution

```sql
select round(confidence::numeric, 1) as bucket, count(*)
from property_vibes
group by bucket order by bucket;
```

Pre-PR-#39 every row was exactly `0.85`. After re-run, you should see a
distribution with `< 0.5` rows correlating with NULL `description` or
`amenities` — those are candidates for re-shoot or de-prioritization in
the dashboard.

### Spot-check sample

The original audit sampled 5 properties manually. Re-run with the same
seed for comparability:

```sql
select p.id, p.address, p.year_built, p.lot_size_sqft,
       cardinality(p.amenities) as amenity_count,
       v.suggested_tags, v.confidence, v.tagline
from property_vibes v
join properties p on p.id = v.property_id
where p.id in (
  -- audit's original five (preserve order); replace if rows changed
  select id from properties where p.id is not null limit 5
)
order by random()
limit 5;
```

For each row, manually verify each suggested_tag is supportable from
`year_built` / `lot_size_sqft` / `amenities` / `description`. The bar
is the same as the original audit: any tag in `ALWAYS_DROPPED_TAGS`
should be absent; era tags should match `year_built`; lot-dependent
tags should require `lot_size_sqft >= 2000`; multi-room visual tags
should require `image_count >= 4`. These rules live in
`src/lib/services/vibes/output-gating.ts`.

### Run the offline regression eval

The full regression eval runs locally and proves the gating rules still
catch every audit-identified failure mode:

```bash
pnpm exec jest __tests__/unit/eval/vibes/
VIBES_EVAL_REPORT=1 pnpm exec jest __tests__/unit/eval/vibes/regression-eval.test.ts
```

The second invocation prints a `PASS scenario-id (conf=X, kept=N, dropped=M)`
line per scenario for the CI log.

---

Owner: whoever holds the Clerk dashboard + RapidAPI + OpenRouter keys.
This runbook stays valid until the audit's Section 1 baseline is
re-established; after that, archive it under `.gstack/qa-reports/`.
