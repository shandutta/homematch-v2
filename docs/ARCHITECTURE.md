# HomeMatch Architecture

Next.js 15 App Router + Supabase. React 19 UI, Postgres + Auth + RLS data layer, business logic in `src/lib/services`.

## Stack

- Next.js 15 (App Router), React 19, TypeScript
- Tailwind CSS 4 + shadcn/ui
- Supabase (Postgres, Auth, Storage, Realtime)
- TanStack Query + Zustand
- Zod + React Hook Form
- Jest + Vitest + Playwright

For exact versions: `package.json`.

## Directory Layout

```
src/
  app/                 App Router routes and layouts
  components/          UI components (features/ and ui/)
  lib/
    api/               API helpers (auth, errors, clients)
    services/          Business logic services
    schemas/           Zod schemas
    supabase/          Supabase clients and factories
    ingestion/         Zillow ingestion helpers
    maps/              Maps proxy/config helpers
    middleware/         Rate limiting
    utils/             Shared utilities
  types/               TypeScript types
supabase/              Migrations, seed, config
scripts/               Automation, ingestion, ops
__tests__/             Unit, integration, E2E tests
```

## Routing

- App Router pages: `src/app`
- Shared UI: `src/components/ui`
- Feature components: `src/components/features`
- Route handlers: `src/app/api`

## Auth & Security

- Auth: Supabase (`middleware.ts` protects authenticated routes)
- RLS policies: `supabase/migrations`
- API errors: `src/lib/api/errors.ts`
- Rate limiting: `src/lib/middleware/rateLimiter.ts`

## Service Layer

Organized under `src/lib/services`:

- **Properties**: facade + search/CRUD/neighborhood/geographic services
- **Interactions**: like/pass/view tracking and statistics
- **Couples**: household flows, caching, mutual likes
- **Users**: profile management, client helpers
- **Vibes**: OpenRouter-backed property and neighborhood descriptions

PropertyService uses a facade (`src/lib/services/properties/facade.ts`) to isolate refactors from callers.

## Data Access

Supabase clients in `src/lib/supabase`:

- `client.ts` — browser
- `server.ts` — server components, route handlers
- `service-role-client.ts` — admin operations
- `factory.ts` — unified client creation

Zod schemas in `src/lib/schemas` for API routes and forms.

## Database

Schema: `supabase/migrations`. Seeds: `supabase/seed.sql`. Reference data: `migrated_data/`.

Core tables: `user_profiles`, `households`, `household_invitations`, `properties`, `neighborhoods`, `user_property_interactions`, `property_vibes`, `neighborhood_vibes`, `saved_searches`, `household_property_resolutions`.

PostGIS enabled for spatial queries.

## Ingestion & Background Jobs

- Zillow ingestion/refresh scripts: `scripts/`
- Vibes backfill: `docs/property-vibes-backfill.md`
- Inngest libraries present for background workflows

## Related Docs

- Setup: `docs/SETUP_GUIDE.md`
- Testing: `docs/TESTING.md`
- CI: `docs/CI_INTEGRATION_TESTS.md`
