# HomeMatch Architecture

Reading path: `docs/README.md` -> `docs/SETUP_GUIDE.md` -> `docs/ARCHITECTURE.md` -> `docs/TESTING.md`

## Overview

HomeMatch is a Next.js App Router application backed by Supabase. The UI is React 19, the data layer is Supabase (Postgres + Auth + RLS), and the business logic lives in a dedicated service layer under `src/lib/services`.

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
    api/               API helpers (errors, auth, clients)
    services/          Business logic services
    schemas/           Zod schemas
    supabase/          Supabase clients and factories
    utils/             Shared utilities
  types/               TypeScript types
supabase/              DB migrations, seed, and config
scripts/               Automation, ingestion, and ops scripts
__tests__/             Unit, integration, and E2E tests
```

## Application Layers

### UI and Routing

- App Router pages live in `src/app`.
- Shared UI components live in `src/components/ui`.
- Feature components live in `src/components/features`.

### Service Layer

Business logic is organized under `src/lib/services`:

- `properties` (facade, search, CRUD, neighborhoods, geographic)
- `interactions` (likes/pass/view tracking)
- `couples` and `couples-middleware` (household flows and caching)
- `users` / `users-client` (profile management)
- `vibes` and `neighborhood-vibes` (LLM-based descriptions)

The PropertyService uses a facade pattern (`src/lib/services/properties/facade.ts`) to allow gradual refactors without breaking callers.

### Data Access

Supabase clients live in `src/lib/supabase`:

- `client.ts` for browser usage
- `server.ts` for server components and route handlers
- `service-role-client.ts` for admin operations
- `factory.ts` for unified client creation

### API Layer

Route handlers live under `src/app/api`. Request validation uses Zod schemas in `src/lib/schemas`, and API errors are normalized via `src/lib/api/errors.ts`.

### State Management

- TanStack Query manages server state and caching.
- Zustand holds client-only UI state.

## Database

The schema lives in `supabase/migrations`. Seeds are in `supabase/seed.sql`, with migrated reference data in `migrated_data/`.

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

## Background Jobs and Ingestion

- Inngest libraries are present for background workflows.
- Zillow ingestion and status refresh scripts live in `scripts/`.
- Vibes backfill flows are documented in `docs/property-vibes-backfill.md`.

## Configuration

Environment variables are documented in `.env.example`. Use `.env.local` for local dev and `.env.prod` for production settings.

## Related Docs

- Setup: `docs/SETUP_GUIDE.md`
- Testing: `docs/TESTING.md`
- CI: `docs/CI_INTEGRATION_TESTS.md`
- Workflows: `docs/DEVELOPMENT_WORKFLOWS.md`
