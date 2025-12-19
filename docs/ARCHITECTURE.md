# HomeMatch Architecture

Reading path: `docs/README.md` -> `docs/SETUP_GUIDE.md` -> `docs/ARCHITECTURE.md` -> `docs/TESTING.md`

## Overview

HomeMatch is a Next.js App Router application backed by Supabase. UI is React 19; the data layer is Supabase (Postgres + Auth + RLS); business logic lives in `src/lib/services`.

For exact versions, see `package.json`.

## Stack Summary

- Next.js 15 (App Router), React 19, TypeScript
- Tailwind CSS 4 + shadcn/ui
- Supabase (Postgres, Auth, Storage, Realtime)
- TanStack Query + Zustand
- Zod + React Hook Form
- Jest + Vitest + Playwright

## Directory Layout

```
src/
  app/                 Next.js App Router routes and layouts
  components/          UI components (features/ and ui/)
  lib/
    api/               API helpers (auth, errors, clients)
    services/          Business logic services
    schemas/           Zod schemas
    supabase/          Supabase clients and factories
    ingestion/         Zillow ingestion helpers
    maps/              Maps proxy/config helpers
    middleware/        Shared middleware (rate limiting)
    utils/             Shared utilities
  types/               TypeScript types
supabase/              DB migrations, seed, and config
scripts/               Automation, ingestion, and ops scripts
__tests__/             Unit, integration, and E2E tests
```

## Runtime and Routing

- App Router pages live in `src/app`.
- Shared UI components live in `src/components/ui`.
- Feature components live in `src/components/features`.
- Route handlers live under `src/app/api`.

## Auth and Security

- Auth is provided by Supabase.
- `middleware.ts` protects authenticated routes.
- RLS policies live in `supabase/migrations`.
- API error normalization uses `src/lib/api/errors.ts`.
- Rate limiting is handled in `src/lib/middleware/rateLimiter.ts`.

## Service Layer

Business logic is organized under `src/lib/services`:

- Properties: facade + search/CRUD/neighborhood/geographic services
- Interactions: like/pass/view tracking and statistics
- Couples: household flows, caching, and mutual likes
- Users: profile management and client helpers
- Vibes: OpenRouter-backed property and neighborhood descriptions

The PropertyService uses a facade pattern (`src/lib/services/properties/facade.ts`) to allow gradual refactors without breaking callers.

## Data Access

Supabase clients live in `src/lib/supabase`:

- `client.ts` for browser usage
- `server.ts` for server components and route handlers
- `service-role-client.ts` for admin operations
- `factory.ts` for unified client creation

Zod schemas live in `src/lib/schemas` and are used for validation across API routes and forms.

## Database

The schema lives in `supabase/migrations`. Seeds are in `supabase/seed.sql`, with reference data in `migrated_data/`.

Core tables include:

- `user_profiles`
- `households`
- `household_invitations`
- `properties`
- `neighborhoods`
- `user_property_interactions`
- `property_vibes`
- `neighborhood_vibes`
- `saved_searches`
- `household_property_resolutions`

PostGIS is enabled for spatial queries.

## Ingestion and Background Jobs

- Zillow ingestion and status refresh scripts live in `scripts/`.
- Vibes backfill flows are documented in `docs/property-vibes-backfill.md`.
- Inngest libraries are present for background workflows (jobs may still be pending wiring).

## Related Docs

- Setup: `docs/SETUP_GUIDE.md`
- Testing: `docs/TESTING.md`
- CI: `docs/CI_INTEGRATION_TESTS.md`
- Workflows: `docs/DEVELOPMENT_WORKFLOWS.md`
