# HomeMatch v2 Context Analysis

## Project Overview

**HomeMatch v2** is an AI-assisted home discovery application designed to help households (couples, families) shortlist homes together. It features a "Tinder-like" swipe interface for properties, real-time collaboration, and ML-powered ranking.

## Tech Stack

- **Framework**: Next.js 15.4.5 (App Router)
- **Language**: TypeScript (Strict mode)
- **Styling**: Tailwind CSS 4, shadcn/ui, Framer Motion
- **Database & Auth**: Supabase (PostgreSQL, Auth, Realtime, Storage)
- **State Management**: TanStack Query (Server state), Zustand (Client state)
- **Validation**: Zod + React Hook Form
- **Testing**: Jest (Unit), Vitest (Integration), Playwright (E2E)
- **Analytics**: PostHog
- **Job Queue**: Inngest (libraries present)

## Architecture

The project follows a modular architecture with a clear separation of concerns:

### Directory Structure

- `src/app`: Next.js App Router pages and layouts.
- `src/components`: React components, divided into `ui` (shadcn) and `features`.
- `src/lib`: Core logic and utilities.
  - `services/`: Business logic layer (see Domain Model below).
  - `schemas/`: Zod validation schemas.
  - `supabase/`: Supabase client configuration.
  - `hooks/`: Custom React hooks.
- `src/types`: TypeScript type definitions, including generated database types.
- `scripts/`: extensive automation for testing, migrations, and maintenance.

### Domain Model (Services)

The business logic is encapsulated in `src/lib/services`:

- **Properties** (`properties.ts`): Managing property data, fetching from Zillow/MLS (via scripts).
- **Users** (`users.ts`, `users-client.ts`): User profile management.
- **Couples/Households** (`couples.ts`, `couples-middleware.ts`): Logic for linking users into households and shared workflows.
- **Interactions** (`interactions.ts`): Handling likes, passes, and views.
- **Storytelling** (`storytelling.ts`): Likely for AI-generated descriptions or match reasons.

### Database

- Uses Supabase (PostgreSQL).
- Types are generated in `src/types/database.ts`.
- Migrations are in `supabase/migrations`.

## Key Features (Current Status)

- **Authentication**: Implemented via Supabase (Email/Password + Google).
- **Dashboard**: Swipe interface for properties.
- **Couples Workflow**: Mutual likes, celebration states.
- **Marketing Site**: Landing pages and dynamic cards.

## Testing Strategy

- **Unit**: Jest for individual functions/components.
- **Integration**: Vitest for service/database integration.
- **E2E**: Playwright for full user flows.
- **Scripts**: `pnpm test`, `pnpm test:unit`, `pnpm test:integration`, `pnpm test:e2e`.

## Development Workflow

- **Linting**: ESLint + Prettier.
- **Commits**: Conventional Commits enforced.
- **CI/CD**: GitHub Actions (implied by `.github` directory).

## Observations

- The project is well-structured with a strong emphasis on testing and code quality.
- There is a significant amount of tooling scripts in `scripts/`.
- The `src/lib/services` pattern suggests a desire to keep business logic separate from UI components.
