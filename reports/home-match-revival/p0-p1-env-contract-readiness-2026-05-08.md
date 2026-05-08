# P0/P1 Env Contract Readiness — 2026-05-08

Generated: 2026-05-08
Scope: read-only Phase 0/1 env-contract artifact. Catalogs the required and
optional environment variables that gate prod readiness, the local-dev
counterparts that must run with placeholders only, and which Phase 0/1
blockers each variable belongs to. **No secrets were read, copied,
inspected, decoded, or printed; no production dashboards were touched; no
paid APIs were invoked; no `.env.prod` was created.** This file does not
authorize Phase 2+ or any external execution. It only records the contract
shape so a reviewer can validate prod-readiness coverage and Phase 0/1
gaps without digging through 80+ revival reports.

This index is **not** a re-statement of:

- `phase0-phase1-strict-closure-gate.md` (the gate itself).
- `phase0-phase1-closure-matrix.md` (the canonical matrix).
- `p0-p1-blocker-evidence-index-2026-05-08.md` (the broader Phase 0/1
  blocker → proof index).
- `p0-p1-env-prod-local-dev-closure-2026-05-08.md` (the prior
  `.env.prod` guard precision and local-dev no-secret docs closure).
- `phase0-live-probe-auth-cron-env-closure-2026-05-08.md` (the prior
  Phase 0 live probe + cron-secret + `.env.prod` guard closure).

Those remain canonical. This file is a single env-shape catalog tied to
the existing tracked guards so the contract cannot drift silently.

## Authority and redaction policy

- The only tracked example file with placeholder env values is
  `.env.example`. It is statically guarded by
  `__tests__/unit/docs/env-example-guard.test.ts` (placeholder-only,
  no JWT/`sb_*`/`sk_*`/`pk_*` shapes, no postgres URLs with credentials,
  no opaque base64 ≥40 chars, no `.env.prod` reference, no embedded
  password URLs).
- The only tracked production-host metadata file is
  `config/supabase-production-hosts.json`. By policy and by file
  comment, it stores **hostnames only** — never API keys, service-role
  keys, passwords, or database URLs. The supabase-env guard
  (`scripts/guard-supabase-env.js`) consumes that list when `.env.prod`
  is intentionally absent and is statically guarded by
  `__tests__/unit/scripts/guard-supabase-env.test.ts` (block on
  tracked prod host, allow `SKIP_SUPABASE_GUARD=true`, suffix-anchored
  supabase host detection, offender categories only — never raw
  values, full URLs, or passwords).
- This artifact uses placeholder names (`your_*`, `base64_*`,
  `<redacted>`) only. Real values must never appear here. The
  companion guard test
  `__tests__/unit/docs/env-contract-readiness.test.ts` asserts the
  same redaction shape against this file.

## Required production variables

Each row documents the minimum production-launch contract. The
`Source` column points to the live consumer in `src/` so a reviewer can
trace each variable to the code that depends on it without grepping
the tree.

| Variable | Required for prod | Local-dev placeholder | Source (consumer) |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | yes | `your_supabase_url` or `http://127.0.0.1:54321` | `src/lib/supabase/client.ts`, `src/lib/supabase/server.ts` |
| `SUPABASE_URL` | yes (server) | `your_supabase_url` or local | `src/lib/services/base.ts`, `src/lib/supabase/standalone.ts` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | yes | `your_supabase_anon_key` | `src/lib/supabase/client.ts`, `src/lib/data/loader.ts` |
| `SUPABASE_ANON_KEY` | yes (server) | `your_supabase_anon_key` | server-side service helpers |
| `SUPABASE_SERVICE_ROLE_KEY` | yes (server-only) | `your_supabase_service_role_key` | `src/lib/supabase/server.ts:182`, `src/lib/services/base.ts`, `src/lib/supabase/standalone.ts` |
| `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` | yes | `base64_encoded_32_byte_key_for_server_actions` | enforced by `scripts/ensure-server-action-key.js` |
| `GOOGLE_MAPS_SERVER_API_KEY` | yes (Maps routes) | `your_server_restricted_api_key` | `src/app/api/maps/{geocode,proxy-script,script,places/autocomplete}/route.ts` |
| `RAPIDAPI_KEY` | yes (Zillow ingest, status refresh) | `your_rapidapi_key` | `src/app/api/admin/{ingest/zillow,status-refresh,generate-vibes-zillow}/route.ts`, `src/app/api/zillow/random-image/route.ts` |
| `RAPIDAPI_HOST` | optional (defaults in code) | `us-housing-market-data1.p.rapidapi.com` | same as above |
| `OPENROUTER_API_KEY` | yes (vibes generation) | `your_openrouter_api_key` | `src/lib/services/vibes/openrouter-client.ts`, all `generate-*-vibes` admin routes |
| `OPENROUTER_MODEL` | optional | `openai/gpt-4o-mini` | `src/lib/services/vibes/openrouter-client.ts` |
| `ZILLOW_CRON_SECRET` | yes (cron auth) | `your_random_cron_secret` | `src/app/api/admin/ingest/zillow/route.ts`; fallback for status-refresh and vibes routes |
| `STATUS_REFRESH_CRON_SECRET` | yes (cron auth) | `your_random_cron_secret` | `src/app/api/admin/status-refresh/route.ts` |
| `VIBES_CRON_SECRET` | yes (cron auth) | `your_random_cron_secret` | `src/app/api/admin/generate-vibes{,-zillow}/route.ts`, `src/app/api/admin/generate-neighborhood-vibes/route.ts` |
| `NEXT_PUBLIC_BASE_URL` | yes | `http://localhost:3000` | `src/app/layout.tsx`, `src/lib/seo/route-{policy,metadata}.ts` |

Notes:

- Supabase URL and anon key appear in both public (`NEXT_PUBLIC_*`) and
  server-side keys because `src/lib/services/base.ts` falls back to
  `SUPABASE_URL` when only `NEXT_PUBLIC_SUPABASE_URL` is set, and
  server-only paths read either form.
- Cron secrets fall back across families inside the admin routes
  (`VIBES_CRON_SECRET || ZILLOW_CRON_SECRET`,
  `STATUS_REFRESH_CRON_SECRET || ZILLOW_CRON_SECRET`). The contract
  still requires distinct secrets per family for production rotation
  and incident-response separation; the static cron-secret rejection
  evidence is in `phase0-live-probe-auth-cron-env-closure-2026-05-08.md`
  rows for all five admin route families.

## Optional / feature-gate variables

These are not Phase 0/1 launch blockers but appear in tracked code and
must remain placeholder-shaped if added to `.env.example` in the
future:

| Variable | Effect | Default if unset |
| --- | --- | --- |
| `NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID` | Enables Advanced Markers | feature off |
| `NEXT_PUBLIC_ENABLE_LOCATION_MAP_VIEW` | Settings location map view | `false` |
| `NEXT_PUBLIC_ADSENSE_ENABLED` | AdSense gate (prod-only) | enabled in prod when not `false` |
| `NEXT_PUBLIC_ENABLE_PERFORMANCE_TRACKING` | Performance tracker | off |
| `NEXT_PUBLIC_MAP_DEBUG` | Map debug overlay | off |
| `SUPABASE_LOCAL_PROXY` / `SUPABASE_LOCAL_PROXY_TARGET` | HTTPS-dev proxy through Next.js | off |
| `ZILLOW_LOCATIONS` | Override metro list for ingest | Bay Area defaults in code |
| `HOMEMATCH_ENABLE_INTERNAL_PREVIEW` | Gates `/dashboard/vibes-test`, `/validation`, `/demo/ads`, `/sponsor-mockups` | 404 in production |
| `RATE_LIMIT_STORAGE_PROVIDER` | Durable rate-limit adapter (D2) | `memory`; non-memory provider names fail closed |

## Phase 0/1 blocker linkage

Each row maps an env-related decision to its already-tracked Phase 0/1
proof artifact and the unresolved owner action. Closure remains gated
exactly where the prior canonical artifacts say it is gated; this
table only collects the env shape so a reviewer can see the
prod-readiness contract in one place.

| Blocker | Env surface | Latest proof artifact | Unresolved owner action |
| --- | --- | --- | --- |
| `.env.prod` guard precision | `SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `POSTGRES_HOST`, `POSTGRES_URL` | `p0-p1-env-prod-local-dev-closure-2026-05-08.md`; `phase0-live-probe-auth-cron-env-closure-2026-05-08.md`; `config/supabase-production-hosts.json`; `scripts/guard-supabase-env.js`; `__tests__/unit/scripts/guard-supabase-env.test.ts` | Maintain `.env.prod` as untracked; rotate hostnames in `config/supabase-production-hosts.json` only. No keys, passwords, or database URLs in tracked files. |
| Cron-secret endpoint opacity | `ZILLOW_CRON_SECRET`, `STATUS_REFRESH_CRON_SECRET`, `VIBES_CRON_SECRET` | `phase0-live-probe-auth-cron-env-closure-2026-05-08.md` (5 admin routes reject missing secrets with 401); `__tests__/unit/api/{ingest-zillow,status-refresh,generate-vibes}-route.test.ts` | Rotate per-family secrets; document incident-response and rotation policy outside the repo. |
| D1 service-role authority | `SUPABASE_SERVICE_ROLE_KEY` | `d1-service-role-rbac-authority-implementation-packet-2026-05-08.md`; `src/lib/supabase/server.ts:checkServiceRoleAuthorization`; `supabase/migrations/20260508024000_create_admin_role_assignments.sql` | Live integration of `admin_role_assignments` is D6-gated; no further authority decision open for this revival gate. |
| D2 durable rate limiter | `RATE_LIMIT_STORAGE_PROVIDER` | `d2-durable-rate-limiter-approval-gate-guard-2026-05-08.md`; `__tests__/unit/lib/middleware/rate-limiter-durable-provider-guard.test.ts` | External-approval-gated: choose memory / Upstash / Vercel KV; do not provision until approved. |
| D3 production verification + CAPTCHA | (CAPTCHA secrets are external; in-repo policy only) | `d3-signup-verification-policy-decision-2026-05-08.md`; `d3-signup-verification-repo-invariant-guard-2026-05-08.md`; `config/signup-verification-launch-policy.json` | External-approval-gated: dashboard config + CAPTCHA provider + non-prod email sink for tests. |
| API auth smoke live token + server | `API_AUTH_SMOKE_TOKEN`, `API_AUTH_SMOKE_RUN`, `ALLOW_REMOTE_API_AUTH_SMOKE` | `p0-p1-api-auth-smoke-matrix-2026-05-08.md`; `__tests__/integration/api/auth-smoke-matrix.spec.ts` | Approve seeded non-production token + local or explicitly-approved non-prod target. Never point at production. |
| No-credential live probe target | `NO_AUTH_LIVE_PROBES_BASE_URL`, `NO_AUTH_LIVE_PROBES_RUN`, `NO_AUTH_LIVE_PROBES_READY_TIMEOUT_MS` | `p0-no-auth-api-protected-redirect-probe-harness-2026-05-08.md`; `scripts/run-no-auth-live-probes.js`; `__tests__/integration/routing/no-auth-live-probe.spec.ts` | Run only against a local app target; harness already refuses non-local base URLs. |
| Authenticated test users (local only) | `TEST_USER_1_EMAIL`/`PASSWORD`, `TEST_USER_2_EMAIL`/`PASSWORD`, `TEST_USER_3_EMAIL`/`PASSWORD`, `TEST_AUTH_TOKEN`, `LOCAL_SEEDED_AUTH_LIFECYCLE`, `ALLOW_REMOTE_SUPABASE` | `remote-supabase-test-seed-and-auth-probe-2026-05-08.md`; `scripts/setup-test-users-admin.js`; `AGENTS.md` | Live-evidenced; never store plaintext creds in tracked files; treat the seeding script as the source of truth. |
| Local-dev fast loop bypasses | `SKIP_SUPABASE_GUARD`, `SKIP_DOCKER` | `README.md`; `docs/SETUP_GUIDE.md`; `docs/DEVELOPMENT_WORKFLOWS.md`; `__tests__/unit/docs/readme-local-dev.test.ts` | Bypasses are local-only and must remain absent from `.env.example` (already guarded). |

## What this artifact does NOT do

- Does not advance Phase 0/1 closure. Each row is still gated where the
  prior canonical artifact says it is gated.
- Does not authorize spending money, calling paid/external APIs,
  mutating live Supabase, running broad browser swarms, or rotating
  secrets. Rotation, storage, transport, and incident-response policy
  are ops/security decisions and are not inferable from this file.
- Does not replace `phase0-phase1-closure-matrix.md`,
  `p0-p1-blocker-reconciliation-2026-05-08.md`, or
  `p0-p1-blocker-evidence-index-2026-05-08.md`. Those remain canonical;
  this file simply collects the env-shape contract and the redaction
  policy in one place so prod-readiness coverage is auditable.
- Does not introduce new env vars, change `.env.example`, or modify
  `config/supabase-production-hosts.json`. Pure documentation slice.

## Source artifacts (canonical)

- `reports/home-match-revival/p0-p1-env-prod-local-dev-closure-2026-05-08.md`
- `reports/home-match-revival/phase0-live-probe-auth-cron-env-closure-2026-05-08.md`
- `reports/home-match-revival/p0-p1-blocker-evidence-index-2026-05-08.md`
- `reports/home-match-revival/d1-service-role-rbac-authority-implementation-packet-2026-05-08.md`
- `reports/home-match-revival/d2-durable-rate-limiter-approval-gate-guard-2026-05-08.md`
- `reports/home-match-revival/d3-signup-verification-policy-decision-2026-05-08.md`
- `reports/home-match-revival/d3-signup-verification-repo-invariant-guard-2026-05-08.md`
- `reports/home-match-revival/p0-p1-api-auth-smoke-matrix-2026-05-08.md`
- `reports/home-match-revival/p0-no-auth-api-protected-redirect-probe-harness-2026-05-08.md`
- `reports/home-match-revival/remote-supabase-test-seed-and-auth-probe-2026-05-08.md`
- `.env.example`
- `config/supabase-production-hosts.json`
- `config/signup-verification-launch-policy.json`
- `scripts/guard-supabase-env.js`
- `scripts/ensure-server-action-key.js`
