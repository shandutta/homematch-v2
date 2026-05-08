# D127 Maps & Paid External Surface Gate Index — 2026-05-08

Lane: `d127-maps-paid-surface-gate-index-2026` · branch
`autonomy/hm-d127-maps-paid-surface-gate-index-2026` · base HEAD `2170964`.

Scope: read-only static index of every Phase 0/1 surface that loads or
proxies a **paid third-party API** (Google Maps / Places, Google AdSense,
RapidAPI/Zillow, OpenRouter), plus the existing repo-side proof artifacts
that already gate those surfaces, plus what remains owner-approval-gated
before launch. No secrets read, no `GOOGLE_MAPS_SERVER_API_KEY` /
`RAPIDAPI_KEY` / `OPENROUTER_API_KEY` / AdSense client value printed, no
live Google / RapidAPI / OpenRouter / AdSense calls invoked, no browser
swarm, no production data inspected, no Supabase mutations, no deploy.

This file does not authorize Phase 2+, does not change any gate verdict in
`phase0-phase1-closure-matrix.md` or `phase0-phase1-strict-closure-gate.md`,
and does not re-open any item already closed in
`p0-p1-blocker-evidence-index-2026-05-08.md`. It only collects the
paid-surface gates in one place so a reviewer can confirm in a single read
that every paid external call is auth-gated, rate-limited, timeout-bounded,
consent-gated (where applicable), or skipped from automated probes.

## 1. Paid external surfaces in the repo

| # | Surface | Route / source | Paid provider | Server key env | Client-exposed? |
|---|---|---|---|---|---|
| M1 | Google Maps JS API loader (key indirection) | `src/app/api/maps/script/route.ts` | Google Maps Platform | `GOOGLE_MAPS_SERVER_API_KEY` | No — returns `{ scriptUrl: '/api/maps/proxy-script' }` only |
| M2 | Google Maps JS API proxy fetch | `src/app/api/maps/proxy-script/route.ts` | Google Maps Platform | `GOOGLE_MAPS_SERVER_API_KEY` | No — server-side fetch with `fetchWithTimeout` 10s, key never reaches the browser |
| M3 | Google Geocoding API proxy | `src/app/api/maps/geocode/route.ts` | Google Maps Platform | `GOOGLE_MAPS_SERVER_API_KEY` | No — auth-required (`requireUserFromRequest`) + per-user rate limit `maps:geocode` + `fetchWithTimeout` 10s |
| M4 | Google Places Autocomplete proxy | `src/app/api/maps/places/autocomplete/route.ts` | Google Maps Platform | `GOOGLE_MAPS_SERVER_API_KEY` | No — auth-required + per-user rate limit `maps:places:autocomplete` + `fetchWithTimeout` 10s |
| M5 | Maps marker library opt-in | `src/lib/maps/config.ts` | Google Maps Platform | `NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID` (public, non-secret map id) | Yes — only widens loaded JS library set; no separate paid call |
| M6 | Metro boundaries (Supabase-backed, no Google call) | `src/app/api/maps/metro-boundaries/route.ts` | none — local PostGIS via Supabase | n/a | n/a — included here so the row is not confused for a paid Google surface |
| A1 | Google AdSense client loader | `src/components/legal/AdSenseGate.tsx`, `src/lib/adsense.ts` | Google AdSense | n/a (publisher id is hard-coded `ca-pub-…` in `src/lib/adsense.ts:1`) | Yes — gated by `NEXT_PUBLIC_ADSENSE_ENABLED !== 'false'`, `NODE_ENV === 'production'`, and `consent.advertising` from cookie banner |
| A2 | In-feed ad slot | `src/components/ads/InFeedAd.tsx` | Google AdSense | n/a | Yes — same triple gate as A1 |
| Z1 | Zillow ingestion (cron/admin) | `src/app/api/admin/ingest/zillow/route.ts`, `src/lib/api/zillow-client.ts`, `src/lib/ingestion/zillow*.ts` | RapidAPI / `*.p.rapidapi.com` | `RAPIDAPI_KEY`, `RAPIDAPI_HOST` | No — cron-secret-gated admin route |
| Z2 | Zillow status detail refresh | `src/app/api/admin/status-refresh/route.ts` | RapidAPI / Zillow | `RAPIDAPI_KEY`, `RAPIDAPI_HOST`, `STATUS_DETAIL_FETCH_TIMEOUT_MS` (default 10s) | No — cron-secret-gated |
| Z3 | Zillow random-image | `src/app/api/zillow/random-image/route.ts` | RapidAPI / Zillow | `RAPIDAPI_KEY`, `RAPIDAPI_HOST` | No — server-side; `fetchWithTimeout` |
| Z4 | Admin Zillow vibe generation | `src/app/api/admin/generate-vibes-zillow/route.ts` | RapidAPI / Zillow + OpenRouter | `RAPIDAPI_KEY`, `RAPIDAPI_HOST`, `OPENROUTER_API_KEY` | No — cron-secret-gated |
| O1 | OpenRouter LLM client | `src/lib/services/vibes/openrouter-client.ts`, `src/app/api/admin/generate-*` | OpenRouter | `OPENROUTER_API_KEY`, `OPENROUTER_MODEL` | No — server-side only |
| C1 | CSP allowlist for paid client surfaces | `middleware.ts:55-66` | n/a | n/a | n/a — declares `script-src` / `connect-src` / `frame-src` for `maps.googleapis.com`, `pagead2.googlesyndication.com`, `googleads.g.doubleclick.net`, `tpc.googlesyndication.com`, `securepubads.g.doubleclick.net`, `fundingchoicesmessages.google.com`; production-only emission today (G1 in CSP inventory) |

`.env.example` references for the keys above: `GOOGLE_MAPS_SERVER_API_KEY:6`,
`NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID:9`, `RAPIDAPI_KEY:29`, `RAPIDAPI_HOST:30`,
`OPENROUTER_API_KEY:36`, `OPENROUTER_MODEL:37`. No real values printed.

## 2. Repo-side proof already in place

| Gate property | Where it is proven (repo-side) | Status |
|---|---|---|
| Maps server key never reaches the client | `src/app/api/maps/script/route.ts` returns the proxy URL only; `src/app/api/maps/proxy-script/route.ts` fetches Google with the key server-side | Closed, repo-static |
| Maps geocode / places autocomplete reject anonymous callers before any paid Google call | `__tests__/unit/api/maps/geocode.route.test.ts`, `__tests__/unit/api/maps/places-autocomplete.route.test.ts`, `__tests__/unit/app/api/maps/places-autocomplete/route.test.ts`; live anonymous probes returned 401 in `phase0-live-probe-auth-cron-env-closure-2026-05-08.md` rows for `/api/maps/geocode` and `/api/maps/places/autocomplete` | Closed, repo-static + live anonymous probe |
| Maps geocode / places autocomplete are per-user rate-limited | `src/app/api/maps/geocode/route.ts:57`, `src/app/api/maps/places/autocomplete/route.ts:68`; covered by `__tests__/unit/lib/middleware/rate-limiter-check.test.ts` and `__tests__/unit/api/rate-limit-coverage.test.ts` | Closed, repo-static |
| Every Maps outbound `fetch` uses `fetchWithTimeout` (10s default) | `m8-external-timeouts-closure-2026-05-08.md`; test `__tests__/unit/api/external-timeouts.test.ts` and `__tests__/unit/api/maps-proxy-script.route.test.ts` | Closed, repo-static |
| Maps proxy script uses a derived `referer` (no caller-controlled header passthrough that could leak the key) | `src/app/api/maps/proxy-script/route.ts:39-63` (`getGoogleReferer`) | Closed, repo-static |
| Maps script returns a deterministic test stub when `NEXT_PUBLIC_TEST_MODE=true` so automated test suites never call paid Google | `src/app/api/maps/proxy-script/route.ts:5-33,67-77` | Closed, repo-static |
| AdSense load is triple-gated (env flag, NODE_ENV=production, consent.advertising) | `src/components/legal/AdSenseGate.tsx`, `src/components/ads/InFeedAd.tsx`, `src/lib/cookies/use-cookie-consent.ts` | Closed, repo-static |
| RapidAPI/Zillow + OpenRouter live calls are not exercised by unit/integration suites | `p0-p1-api-auth-smoke-matrix-2026-05-08.md` explicit-skip table covers `/api/properties/vibes`, `/api/neighborhoods/vibes`, and the entire `/api/admin/*` family for paid-call avoidance; admin family also requires cron-secret bearer | Closed, repo-static |
| CSP declares the paid-surface external origins (Google Maps, AdSense kin) | `p0-p1-csp-and-external-origin-policy-inventory-2026-05-08.md` §3 (CSP directive map) and §4 (external-origin → CSP cross-check) | Closed, repo-static; production-only emission tracked as G1 |
| Anonymous live probes confirm cron/admin endpoints reject without secret before any paid call | `phase0-live-probe-auth-cron-env-closure-2026-05-08.md` cron-secret table (5/5 routes returned 401) | Closed, live anonymous probe |

## 3. Approval-gated before launch (still NOT closed in this lane)

These items intentionally remain held; this index does not decide them.

| # | Item | Why it is held | Where the decision lives |
|---|---|---|---|
| H1 | Provisioning a real `GOOGLE_MAPS_SERVER_API_KEY` (with HTTP-referer + API-restriction policy) into `.env.prod` / Vercel project env | Spending money on a paid API key + restriction posture is owner-approval-gated per the Phase 0/1 strict closure gate ("approve or mock any paid/external route checks") | `phase0-phase1-closure-matrix.md` §"Approval-gated", `phase0-phase1-strict-closure-gate.md` |
| H2 | Provisioning real `RAPIDAPI_KEY` / `RAPIDAPI_HOST` for production ingestion | Same paid-spend gate | `zillow-provider-production-grade-evaluation-2026-05-08.md`, `phase0-phase1-strict-closure-gate.md` |
| H3 | Provisioning real `OPENROUTER_API_KEY` / `OPENROUTER_MODEL` for production vibe generation | Same paid-spend gate; LLM cost ceiling is not yet defined repo-side | `phase0-phase1-strict-closure-gate.md` |
| H4 | Activating `NEXT_PUBLIC_ADSENSE_ENABLED` for production | Activation requires owner sign-off on AdSense policy compliance + the cookie banner copy + tax/payee setup; AdSense publisher id is already in source but the loader is consent + prod gated | `og-business-readiness-backlog-2026-05-08.md`, `p1-property-card-trust-copy-audit-2026-05-08.md` |
| H5 | Cron-secret rotation + storage policy for `/api/admin/*` paid-call routes | Secret strength, storage, and rotation are an ops decision; only no-secret rejection is repo-proven today | `phase0-live-probe-auth-cron-env-closure-2026-05-08.md` §"Cron-secret endpoint opacity" |
| H6 | Production-shape CSP for non-prod prod-like surfaces (Docker preview, self-hosted staging) | CSP + HSTS only emit when `NODE_ENV === 'production'`; affects how paid-surface origins are constrained on preview/staging | `p0-p1-csp-and-external-origin-policy-inventory-2026-05-08.md` §5 G1, G2 |
| H7 | Authenticated live probe of `/api/maps/geocode` and `/api/maps/places/autocomplete` against an approved seeded test user | Requires an approved non-production seeded session + a billable Google project; would exercise paid Google APIs | `phase0-live-probe-auth-cron-env-closure-2026-05-08.md`, `p0-p1-api-auth-smoke-matrix-2026-05-08.md` |
| H8 | Live AdSense render verification | Requires production deploy + AdSense activation + consent-accepted browser session; not run repo-side | `og-business-readiness-backlog-2026-05-08.md` |
| H9 | `/api/maps/metro-boundaries` service-role usage decision | Local probe in `phase0-live-probe-auth-cron-env-closure-2026-05-08.md` returned 500 with `Unauthorized access to service role client`; design choice between making the route service-role-internal or returning a public-safe DTO is still open. Not a paid call, but listed here because the route lives in the maps surface family | `phase0-live-probe-auth-cron-env-closure-2026-05-08.md` row for `/api/maps/metro-boundaries` |

## 4. What this index does NOT do

- Does not change any verdict in `phase0-phase1-closure-matrix.md` or
  `phase0-phase1-strict-closure-gate.md`.
- Does not authorize live execution of any paid Google / RapidAPI /
  OpenRouter / AdSense call.
- Does not provision or rotate any key listed in §1 or §3.
- Does not duplicate `p0-p1-csp-and-external-origin-policy-inventory-2026-05-08.md`
  (CSP details for paid origins live there) or
  `m8-external-timeouts-closure-2026-05-08.md` (timeout proof lives there).
  This index only points at those artifacts.
- Does not implement Phase 2+ (no scoring, no recommendations, no UI).

## 5. Verification

- Docs-only change in this lane; no source files modified.
- `git diff --check` is sufficient for whitespace; no `pnpm type-check` or
  test run needed because no `.ts`/`.tsx` source changed.
- No paid API was contacted while writing this report.
