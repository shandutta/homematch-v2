# Shan Approval + Test Credential Update — 2026-05-08

## New owner input

Shan clarified:

- Keep using the Kanban worker approach.
- Continue running autonomously.
- Update the plan based on these inputs rather than stopping the run.
- Blanket approval is granted for HomeMatch recovery/hardening work **except spending money or making paid-resource/subscription changes**.
- Ask first before any paid API subscription, paid cloud resource, billing-impacting production change, or new external paid plan.
- Tiny live probes are approved.
- Test account credentials should already exist in docs/scripts and/or 1Password.
- Zillow/RapidAPI subscription may be inactive; investigate whether the current route/provider is production-grade or if a better listing-data endpoint/provider should replace it.

## Immediate findings from control-plane inspection

### Local test users exist in repo docs/scripts

Docs and scripts confirm seeded local test users:

- `docs/SETUP_GUIDE.md` documents `pnpm test:setup-users` and lists default accounts.
- `scripts/setup-test-users-admin.js` defines the source of truth.
- `AGENTS.md` instructs browser/auth workers to use `scripts/setup-test-users-admin.js` as source of truth.
- `scripts/run-local-seeded-auth-lifecycle.js` wraps local-only seeded auth lifecycle smoke and refuses non-local Supabase URLs.

Default local accounts from docs/script:

- `test1@example.com` / `testpassword123`
- `test2@example.com` / `testpassword456`
- `test3@example.com` / `testpassword789`
- `test-worker-0@example.com` .. `test-worker-7@example.com` / `testpassword123`

Caveat: these are local/dev seed credentials, not proof that accounts exist in a live/remote target. The setup script requires `SUPABASE_SERVICE_ROLE_KEY`, defaults to local Supabase at `http://127.0.0.1:54200`, and refuses remote Supabase unless explicitly overridden.

### 1Password availability

The `op` CLI is installed, but the current shell was not signed in during inspection. Workers should use existing local 1Password helpers if available and avoid printing secrets.

### Zillow/current provider shape

Current code/docs use RapidAPI host:

- `us-housing-market-data1.p.rapidapi.com`

Repo usage includes:

- `GET /propertyExtendedSearch` for discovery
- `GET /property-details` / `GET /property` for details/status
- `GET /images` for galleries

Important code paths:

- `src/lib/api/zillow-client.ts`
- `src/lib/ingestion/zillow.ts`
- `src/lib/ingestion/zillow-images.ts`
- `src/app/api/zillow/random-image/route.ts`
- `src/app/api/admin/ingest/zillow/route.ts`
- `scripts/ingest-zillow.ts`
- `scripts/refresh-zillow-status*.ts`

Initial web check: RapidAPI pages were not extractable from the control-plane environment; HouseCanary article lists HouseCanary, ATTOM, Zillow, RealEstateAPI.com, Datafiniti, Homesage.ai, RentCast, and PropStream as relevant alternatives. A proper provider decision needs a dedicated read-only researcher task.

## Plan updates

1. Treat seeded local auth/session as approved when using local/dev-only scripts and local Supabase guardrails.
2. Treat tiny live probes as approved, with hard limits:
   - smallest useful request count
   - no bulk ingestion
   - no paid subscription activation or plan upgrade
   - no production data mutation unless explicitly scoped as a safe test path
3. Add a P0/P1 worker lane to verify/recover local seeded auth lifecycle using the documented test users.
4. Add a read-only provider-research lane for current RapidAPI/Zillow endpoint health and production-grade alternatives.
5. Keep using the 3-worker cap: one writer plus up to two read-only scouts.
6. Do not spend money, subscribe, upgrade, deploy paid usage, or mutate paid/provider dashboards without asking Shan first.
