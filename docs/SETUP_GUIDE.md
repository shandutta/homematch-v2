# HomeMatch Setup Guide

Reading path: `docs/README.md` -> `docs/SETUP_GUIDE.md` -> `docs/ARCHITECTURE.md` -> `docs/TESTING.md`

## Current Status

Working now:

- Supabase auth (email/password + Google) with protected routes
- Dashboard swipe experience with like/pass/view tracking
- Couples mutual likes surfaced on the dashboard
- Marketing landing pages and dynamic cards
- Liked/Passed/Viewed pages plus profile/settings screens

In progress:

- Property search UI and filtering beyond the dashboard feed
- ML ranking and recommendations
- Household invitations and shared decision lists
- Background jobs (Inngest/cron)

## Prerequisites

- Node.js 24.x (matches Vercel) and pnpm
- Docker (for local Supabase)
- Supabase CLI (`pnpm dlx supabase@latest`)
- Optional: RapidAPI (Zillow), OpenRouter, Google Maps API keys

## Environment Setup

1. Copy the example env file:

```bash
cp .env.example .env.local
```

2. Fill in required values in `.env.local`. Use `.env.example` as the source of truth for required and optional keys.

3. If you are running local Supabase, you can export keys with:

```bash
supabase status -o env
```

Note: `pnpm dev` runs a guard that blocks production Supabase credentials. Keep `.env.prod` updated if you use it so the guard can detect prod values.

## Local Development

### Standard dev (recommended)

```bash
pnpm dev
```

`pnpm dev` will:

- Start local Supabase
- Reset and seed the database
- Create test users via `scripts/setup-test-users-admin.js`
- Generate `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` if missing

### Dev without resets

If you already have Supabase running and want to avoid a reset:

```bash
pnpm dev:integration
```

### Manual Supabase start

```bash
pnpm dlx supabase@latest start -x studio,mailpit,imgproxy,storage-api,logflare,vector,supavisor,edge-runtime
```

## Test Users

Run `pnpm test:setup-users` to create local test users. The default accounts live in `scripts/setup-test-users-admin.js`:

- `test1@example.com` / `testpassword123`
- `test2@example.com` / `testpassword456`
- `test3@example.com` / `testpassword789`
- `test-worker-0@example.com` .. `test-worker-7@example.com` / `testpassword123`

If you use a proxy or remote Supabase, set `ALLOW_REMOTE_SUPABASE=true` to bypass the local-only guard.

## Next Steps

- Architecture and services: `docs/ARCHITECTURE.md`
- Testing and CI: `docs/TESTING.md` and `docs/CI_INTEGRATION_TESTS.md`
- Workflows: `docs/DEVELOPMENT_WORKFLOWS.md`
- Troubleshooting: `docs/TROUBLESHOOTING_AUTH.md`
