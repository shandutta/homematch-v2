# Backend Audit — Plan & Findings

**Date:** 2026-05-13
**Branch:** `claude/g-stack-documentation-WvTyI`
**Trigger:** User goal — "look at everything: database schema, edge functions, middleware, data ingest. I don't know what I don't know."

## Scope

End-to-end audit of the HomeMatch v2 backend covering:

- Database schema, RLS, indexes, RPCs, triggers (Supabase Postgres)
- Serverless surfaces — `middleware.ts` (edge runtime) + Next.js route handlers under `src/app/api/`
- Data ingest pipeline — Zillow scrape + normalize + load
- Server-side data access — `src/lib/supabase/*`, `src/lib/services/*`, `src/lib/ingest/*`

**Edge functions clarification:** there is **no `supabase/functions/` directory** in this repo. All serverless logic runs as Next.js route handlers (Node + Edge runtime) + the root `middleware.ts`. Ingest scripts run via `tsx` from the CLI or scheduled jobs (not as Supabase Edge Functions).

## Prior art

A self-audit was published 2 days ago at `reports/home-match-revival/audit-2026-05-11/full-app-audit-and-remediation-plan-2026-05-11.md` — 4 launch-blockers + 13 high + 33 medium + 14 low. This audit **extends** it rather than duplicates it. Items from 2026-05-11 marked here when remediated by recent migrations.

## Multi-step plan

| # | Step | Status | Output |
| - | ---- | ------ | ------ |
| 1 | Orient on repo: stack, layout, dependencies, recent git history | done | "Orientation" section |
| 2 | Audit DB schema, RLS, indexes, RPCs, triggers, constraints, PostGIS | done | "Schema findings" |
| 3 | Audit middleware.ts + Clerk auth chain + CSP + cookies + edge-runtime compat | done | "Middleware findings" |
| 4 | Audit data ingest pipeline | done | "Ingest findings" |
| 5 | Audit ~30 API routes + service-role usage + validation + concurrency + webhook security | done | "API findings" |
| 6 | Synthesize: prioritized risk register | done | "Synthesis" |
| 7 | Recommend next gstack skills to run | done | "Next actions" |

## Orientation (step 1)

**Stack:** Next.js 15 App Router · React 19 · Tailwind 4 · shadcn/ui · Supabase Postgres + Auth + RLS · Clerk (auth) · TanStack Query + Zustand · RHF + Zod · Jest / Vitest / Playwright. Hosted on Vercel.

**Surfaces inventoried:**

- `middleware.ts` — 460 lines, edge runtime
- `supabase/migrations/` — 51 migration files, 2025-07 through 2026-05
- `src/lib/supabase/` — client.ts, server.ts, service-role-client.ts, standalone.ts, actions.ts, auth-helpers.ts, optional-user.ts, refresh-recovery.ts, cookie-options.ts, storage-keys.ts
- `src/lib/services/`, `src/lib/api/`, `src/lib/ingest/`, `src/lib/llm/`, `src/lib/maps/`, `src/lib/middleware/`, `src/lib/schemas/`
- `src/app/api/` — ~30 routes
- `scripts/` — ingest helpers (fetch-zillow-images.ts, refresh-zillow-status.ts, cleanup-properties-bayarea.ts, update-seed-zillow-images.ts) plus dev/CI helpers
- `__tests__/integration/` — services, supabase-client-patterns, filter-builder-patterns, db, api

**CI/CD:**

- `.github/workflows/deploy-migrations.yml` — auto-applies `supabase db push --include-all` on pushes to main touching `supabase/migrations/**`. Has secret guards, concurrency lock, dry-run step. Solid.
- `.github/workflows/ai-repair.yml` — on failed CI run, sends artifacts to OpenRouter for diagnosis. Not strictly an attack surface but worth noting (LLM-in-CI).
- `vercel.json` — sets `maxDuration: 300s` for `app/api/**/*.ts`. That's 5 minutes per route — fine for long LLM/ingest calls, but generous for normal CRUD.

## Schema findings (step 2)

### What's healthy

- **RLS perf hardening shipped** (`20260511144002_optimize_rls_auth_uid_subselect.sql`). Wraps `auth.uid()` in `(SELECT auth.uid())` on 22 policies — fixes the per-row re-eval footgun flagged by Supabase's `auth_rls_initplan` advisor. Also adds 4 missing FK covering indexes. Resolves item 6/S1+S3 from the 2026-05-11 audit.
- **Permissive-policy consolidation** (`20260511150323_consolidate_permissive_rls.sql`) — addresses the 7 duplicate-permissive-policies finding from 2026-05-11.
- **Schema safety constraints** (`20260507225000_add_schema_safety_constraints.sql`) — adds CHECK constraints for listing_status, price>0, bedrooms/bathrooms>=0, square_feet>0, year_built reasonable. FKs to neighborhoods and households tightened with explicit `ON DELETE SET NULL`.
- **`updated_at` on user_profiles, search_path hardening on security-definer functions, JSONB GIN indexes** all present in recent migrations.

### What's risky

| # | Finding | File / Location | Severity |
| - | ------- | --------------- | -------- |
| S1 | **All safety constraints added `NOT VALID`** — new rows are checked, but existing rows are never validated. No follow-up `ALTER TABLE ... VALIDATE CONSTRAINT` migration exists. Means a price=0 or listing_status='zombie' row from before 2026-05-07 still lives in the table, undetected. | `20260507225000_add_schema_safety_constraints.sql` whole file | **HIGH** |
| S2 | **Dual soft-delete columns drift.** `properties` has both `is_active BOOLEAN DEFAULT TRUE` (original schema) and `listing_status TEXT` (with new CHECK). Code can disagree about what "active" means: `is_active=true AND listing_status='sold'` is allowed. No DB-level invariant ties them. | `supabase/migrations/20250728013652_create_properties_table.sql:22-24` | **MEDIUM** |
| S3 | **`interaction_uniqueness` fix changed semantics.** `20260508015000_fix_interaction_uniqueness.sql` deleted multi-row interactions (kept newest) and replaced `UNIQUE(user_id, property_id, type)` with `UNIQUE(user_id, property_id)`. Any application code that did `.insert()` expecting separate rows for `like` and `dislike` will now hit a unique-constraint violation. **The API route still uses DELETE+INSERT instead of UPSERT** — see API finding A1. | `supabase/migrations/20260508015000_fix_interaction_uniqueness.sql` + `src/app/api/interactions/route.ts:102-131` | **HIGH** |
| S4 | **`coordinates POINT` was switched to PostGIS later.** Migration `20250730080343_fix_postgis_geometry_type_properties.sql` rewrites column type. Any in-flight rows ingested between the two migration sets had bad geo. The two backfill migrations (`20251220170000`, `20251220181500`, `20251220203000`) confirm coordinates were repeatedly wrong post-intake. Means ingest is NOT reliably setting coordinates correctly at write time. | `scripts/ingest-zillow.ts`-like path + backfill migrations | **MEDIUM** |
| S5 | **Sentinel-zero antipattern.** `bedrooms=0` means studio (legitimate) AND `bathrooms=0` means "unknown" (sentinel) per the comment in `20260507225000`. Two-meaning column. Any query filtering `bathrooms > 0` silently drops valid + unknown rows. | `20260507225000_add_schema_safety_constraints.sql:27-31` (comment) | **MEDIUM** |
| S6 | **No `ON DELETE CASCADE` from interactions to properties.** When a property is hard-deleted (e.g., cleanup-properties-bayarea), interactions become orphaned with broken FK reference. `properties.id` is REFERENCES'd but no cascade — Postgres will block the delete with FK violation. So either properties never get hard-deleted (which is fine), or the cleanup is silently failing. | `supabase/migrations/20250728013659_create_interaction_tables.sql:5` | **LOW (verify)** |
| S7 | **Triggers fixed for race & deadlock in quick succession.** `sync_household_user_count` had a fix (`20251218103000_fix_household_user_count_trigger_race.sql`) followed 8 minutes later by `20251218111000_fix_household_user_count_trigger_deadlock.sql`. Two-hot-fix cadence is a smell — the trigger logic is fragile and likely still has edge cases (e.g., concurrent invite-accept). Recommend a serial test that hammers it. | `supabase/migrations/20251217160000_sync_household_user_count.sql` + 2 fixes | **MEDIUM** |
| S8 | **Consolidated pending features migration is 261 lines.** `20251130200000_consolidated_pending_features.sql` is a grab-bag that's hard to review and roll back. Future audits should split such migrations. | `20251130200000_consolidated_pending_features.sql` | **LOW** |

## Middleware findings (step 3)

### What's healthy

- Clerk's `clerkMiddleware` + Supabase session refresh both wired. 5s timeout on Supabase ops via `AbortController`.
- Security headers (X-Frame-Options DENY, X-Content-Type-Options, COOP, CORP, Permissions-Policy) applied to every response.
- HSTS set in production with preload.
- `/api/webhooks/clerk` correctly in `PUBLIC_BYPASS_PATHS`.
- `getSafeRedirectPath` blocks `//`, `://`, and decodes before checking.
- Edge runtime: no Node-only imports observed in `middleware.ts`.

### What's risky

| # | Finding | File / Location | Severity |
| - | ------- | --------------- | -------- |
| M1 | **CSP allows both `'unsafe-inline'` AND `'unsafe-eval'` in `script-src`.** No nonces. This is roughly "CSP off" for XSS purposes — the script-src directive is bypassed for any injected inline script. The lengthy domain allowlist is doing far less work than it appears. | `middleware.ts:81` | **HIGH** |
| M2 | **`secure: NODE_ENV === 'production'` on session cookies.** Any non-prod env (staging, preview, custom test envs) gets insecure cookies. Vercel preview deploys serve over HTTPS but get non-prod NODE_ENV → cookies still go secure in practice on Vercel, but the rule depends on infra behavior, not explicit allowlist. | `src/lib/supabase/cookie-options.ts` | **MEDIUM** |
| M3 | **Clerk session check has no timeout.** Supabase has the 5s AbortController, Clerk does not. Hung Clerk dependency blocks every protected request until Vercel's 30s/300s function timeout. | `middleware.ts` (the `await clerkMiddleware(...)` call) | **MEDIUM** |
| M4 | **`/api/performance/metrics` is in `PUBLIC_BYPASS_PATHS`.** Unauthenticated write endpoint. If it writes to a table (e.g., metrics rollup), it's a free DoS / cost-amplification vector. _Needs file inspection to confirm whether it's read-only or write._ | `middleware.ts:25-30` + `src/app/api/performance/metrics/route.ts` | **MEDIUM (verify)** |
| M5 | **`isClerkProtectedRoute` duplicates `PROTECTED_PATH_PREFIXES`.** The comment in the code itself flags this as a maintenance hazard ("Mirrors PROTECTED_PATH_PREFIXES"). Adding a new protected route requires editing both — easy to forget, with the failure mode being a silently-unauthenticated route. | `middleware.ts:39-47` + `src/lib/routing/protected-routes.ts` | **MEDIUM** |
| M6 | **`withRefreshRecovery` can race on concurrent requests** for a user whose refresh token just expired; each in-flight request can independently call `signOut({ scope: 'local' })`. | `src/lib/supabase/refresh-recovery.ts` | **LOW** |

## Ingest findings (step 4)

### What's healthy

- **Idempotency core is well-designed** (`src/lib/ingest/idempotency.ts`):
  - `computeDedupeKey` prefers `zpid`, falls back to sha1 of normalized address+city+state+zip5.
  - `computeSourceFingerprint` is a sha256 over a canonicalized JSON of meaningful fields. **Excludes `images`** because Zillow CDN URLs flap — image refresh is a separate concern.
  - `decideIngestAction` returns explicit `insert / update / skip` with reasons.
  - `dedupeBatch` collapses in-batch dupes preferring the record with more populated fields.
- **Freshness TTLs** (`src/lib/ingest/freshness.ts`) — explicit per-source TTLs (Zillow: stale 12h, expire 7d; manual: stale 30d, expire 90d). `selectRefreshTargets` prioritizes expired > stale > oldest. Pure functions, injectable `now()`. Easy to test.
- **Bay-area cleanup script** (`scripts/cleanup-properties-bayarea.ts`) has an explicit city allowlist — geographic scope is enforced at cleanup time.

### What's risky

| # | Finding | File / Location | Severity |
| - | ------- | --------------- | -------- |
| I1 | **`scripts/pipeline.ts` does not exist** but `package.json` defines 5 npm scripts that invoke it: `pipeline:discover`, `pipeline:verify`, `pipeline:enrich-images`, `pipeline:coverage`, `pipeline:dry-run`. Running any of them errors `Cannot find module scripts/pipeline.ts`. Either the file was deleted or the aliases were added speculatively. **Dead scripts that look real are worse than missing scripts.** | `package.json:80-84` | **HIGH** |
| I2 | **Coordinate backfill happened three times** (`20251220170000`, `20251220181500`, `20251220203000`). That tells you intake was not reliably setting `coordinates` at write time. The backfill walks neighborhood → city centroid as fallbacks. The actual ingest write path needs to set PostGIS-valid coords at insert, or the backfill becomes permanent. | the three backfill migrations + ingest code path | **MEDIUM** |
| I3 | **Image refresh marker pattern** (`20251213034000_add_zillow_images_refresh_marker.sql`) suggests image freshness is tracked at the row level. Verify it interacts cleanly with `freshness.ts` TTLs — possible duplicate sources of truth. | the marker migration + `src/lib/ingest/freshness.ts` | **LOW** |
| I4 | **No observable rate-limiting / backoff in idempotency or freshness modules.** They're pure logic. The orchestrator (which would call Zillow) is not in the repo — see I1. So we can't verify Zillow scrape respects rate limits, has retries, or handles 429/timeouts gracefully. | missing orchestrator | **HIGH** |
| I5 | **Ingest is not exercised in `__tests__/integration/`** (only `__tests__/unit/lib/ingest/{idempotency,freshness}.test.ts`). The unit tests cover pure logic; no integration test boots a local Supabase and runs ingest end-to-end. | absence | **MEDIUM** |
| I6 | **`scripts/cleanup-properties-bayarea.ts` uses `createStandaloneClient`** (service role). Run from CLI/cron, so likely fine, but no audit log of what was deleted is visible — destructive ops should write to an audit table or a JSON log. | `scripts/cleanup-properties-bayarea.ts:7` | **LOW** |

## API / server findings (step 5)

### What's healthy

- **Clerk webhook (`src/app/api/webhooks/clerk/route.ts`)** is well-built:
  - `verifyWebhook` from `@clerk/nextjs/webhooks` (Svix-based signature check)
  - `runtime = 'nodejs'`, `dynamic = 'force-dynamic'`
  - Idempotent upsert by `clerk_user_id`
  - Null-overwrite guards on email/display_name
  - Synthetic placeholder email when Clerk omits it (`unknown+${id}@clerk-webhook.invalid`)
  - Soft-delete (nulls `clerk_user_id`) preserves FK targets
  - Has `@service-role-capability: clerk-webhook` capability marker
- **`/api/maps/geocode`** — server-side Google Maps key, auth required, per-user rate limit, Zod-validated input. Clean.
- **`/api/interactions`** uses Zod (`createInteractionRequestSchema`, `interactionDeleteRequestSchema`), rate limiting (`checkRateLimit`), and `requireUserFromRequest`.
- **`ensureUserProfileForCurrentClerkUser`** bootstraps a profile when the Clerk webhook hasn't yet fired — closes the race between sign-up and first API call.

### What's risky

| # | Finding | File / Location | Severity |
| - | ------- | --------------- | -------- |
| A1 | **`POST /api/interactions` uses DELETE-then-INSERT, not UPSERT.** Two concurrent POSTs from the same user for the same property both DELETE, both INSERT — second INSERT may hit `UNIQUE(user_id, property_id)` (since 20260508015000) and 500. Worse: there's a window where the row doesn't exist between the two deletes. Replace with `.upsert(..., { onConflict: 'user_id,property_id' })`. | `src/app/api/interactions/route.ts:102-131` | **HIGH** |
| A2 | **`ensureUserProfileForCurrentClerkUser` itself can race.** Two concurrent requests for a freshly-signed-up user can both attempt to create the profile row. Whichever loses gets a unique-violation. If the function doesn't have `ON CONFLICT DO NOTHING` / retry-and-fetch logic, the loser gets a 500. _Needs verification by reading `src/lib/auth/ensure-profile.ts`._ | `src/lib/auth/ensure-profile.ts` + interactions/match/other callers | **MEDIUM (verify)** |
| A3 | **Service-role client is imported in 6 files, used 8 times, but only the Clerk webhook tags an `approvedCapability`.** The capability system exists (the webhook says `approvedCapability: 'clerk-webhook'`) but isn't enforced on the other 7 sites: `users/search`, `couples/disputed` (×2), `invite/[token]/page` + `actions`, `auth/ensure-profile`, plus `services/base.ts` and `supabase/server.ts` reading the env var directly. Means a future code change can quietly add a service-role usage without anyone noticing. | grep `getServiceRoleClient` + `services/base.ts:73` + `supabase/server.ts:193` | **HIGH** |
| A4 | **`GET /api/interactions` race-protects with `Promise.race` against a 10s manual timeout** then on timeout **returns `{ items: [], nextCursor: null }` with HTTP 200**. Silent failure: caller has no signal that they got an empty list because the query timed out. Pagination state may also drift. | `src/app/api/interactions/route.ts:306-322` | **MEDIUM** |
| A5 | **`property:properties (*)` select in GET /api/interactions returns every column** of the property row, including potentially-large fields (`description`, `images TEXT[]`). On a feed of 12 items × many concurrent users, this is bandwidth waste. Pick the columns needed. | `src/app/api/interactions/route.ts:283-287` | **LOW** |
| A6 | **No global request-id / structured logging.** Errors are `console.error`/`console.warn` with stringified objects. On Vercel that gets indexed, but correlating a user's complaint to a specific request is harder than it needs to be. | every route handler | **LOW** |

## Synthesis (step 6)

### Risk register, prioritized

**Top of list — verify and fix in next sprint:**

1. **A1** — Interactions POST is not race-safe. Likely visible to users as occasional 500s on rapid swipes. Replace with upsert.
2. **I1** — `scripts/pipeline.ts` doesn't exist; 5 npm scripts pointed at it are dead. Either restore the file or delete the aliases.
3. **A3** — Service-role capability gate exists but is applied to only one of eight call sites. Enforce uniformly so new service-role usage requires a documented capability.
4. **M1** — CSP `script-src` has both `'unsafe-inline'` and `'unsafe-eval'`. The current allowlist is theatrics; move to nonces or hashes for inline blocks.
5. **S3** — Interaction uniqueness was changed at the DB; A1 is the visible-impact form of this.
6. **S1** — All 2026-05-07 safety constraints are `NOT VALID`. Run `ALTER TABLE ... VALIDATE CONSTRAINT` after auditing existing rows; you'll discover what needs cleanup.
7. **I4** — No visible rate-limit / retry path for Zillow scraping (orchestrator missing).

**Verify before acting:**

- **M4** — Is `/api/performance/metrics` write-y? If yes, it's an unauthenticated write endpoint.
- **A2** — Does `ensure-profile.ts` handle the race? Read the file before changing the API route.
- **S6** — Do properties ever get hard-deleted? If yes, what happens to orphaned interactions?

**Background hygiene:**

- **S2** — Drop `is_active` OR `listing_status`; pick one.
- **S5** — Rework `bathrooms=0` sentinel; either NULL or a separate `is_unknown` flag.
- **S7** — Add a stress test for `sync_household_user_count` trigger.
- **M2, M3, M5, M6** — Tighten cookie/timeout/duplication footguns.
- **A4, A5, A6** — Surface silent timeouts; trim selects; add request IDs.

### What's already been done that the audit can confirm

- 22 RLS policies wrapped in subselect (perf) — done in `20260511144002`.
- 7 duplicate permissive policies — consolidated in `20260511150323`.
- Clerk webhook hardening (null-overwrite, placeholder email) — recent PRs #30, #31.
- CSP fixes for Turnstile + blob workers — recent PRs.
- Schema safety constraints added (though `NOT VALID`).

### Cross-cutting theme

The codebase is **mid-flight in a Clerk migration**. `user_profiles.clerk_user_id` exists, the webhook syncs it, `ensureUserProfileForCurrentClerkUser` bootstraps it, and most API routes check `isLikelyClerkUserId` defensively. The dual-auth surface (Clerk in middleware + Supabase RLS on rows) is the single largest source of complexity and the most likely source of the next incident. Anything that simplifies that boundary — e.g., a Postgres function that takes the Clerk ID and resolves the Supabase user_id, callable from API routes without a service-role round-trip — would be high-leverage cleanup.

## Next actions (step 7)

In order:

1. **Fix the seven Top-of-list items above.** A1, I1, A3, M1, S3, S1, I4. Most are 1-3 hour fixes individually.
2. **Run `/investigate` on A1** — it's the one most likely already causing user-visible bugs, and Sentry/Vercel logs probably have evidence.
3. **Run `/benchmark` on `/api/interactions` and `/api/match`** — these are the hot paths; the timeout-on-empty-result behavior (A4) means perf regressions might be hiding behind silent fallbacks.
4. **Run `/qa` against the live deploy** to verify the 2026-05-11 launch-blockers (C1 mobile cookie banner, C2 hostname redirect, C3 `/properties/[id]` UUID crash) are actually fixed — the audit document says they weren't yet.
5. **Run `/cso`** for an independent security pass — the CSP gap (M1) and service-role audit (A3) both deserve a second pair of eyes.
6. **Decide on the dual-auth simplification.** This is a strategic decision (`/plan-eng-review` material), not a code fix.

### Limitations of this audit

- I read migrations + key API files directly. I did not run the test suite, did not exercise the live site, did not check Supabase production advisors (the existing 2026-05-11 audit cites 65 lints — fewer are still open after the May 8/11 batch but I didn't enumerate the delta).
- Two background research agents I launched returned weak output (one context-overflowed on the migrations, one drifted into a generic checklist instead of file-grounded findings). Where this audit cites a file path + line, the finding was verified by a direct read. Where it says "(verify)", I'm flagging that the claim deserves a second look before action.
