# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Environment

- **Package Manager**: Use `pnpm` exclusively (specified in package.json)
- **Node Version**: 20+ required for Next.js 15 compatibility
- **Shell**: Git Bash on Windows (never wrap commands in `Bash()` or prefix with `bash`)

## Essential Commands

### Development

```bash
pnpm run dev           # Start development server with Turbopack
pnpm run build         # Production build
pnpm run start         # Start production server
```

### Code Quality

```bash
pnpm run check         # Run lint + type-check together
pnpm run lint          # ESLint with auto-fix
pnpm run type-check    # TypeScript compilation check
pnpm run format        # Prettier formatting
```

### Testing

```bash
pnpm run test          # Run all test suites (unit + integration + e2e)
pnpm run test:unit     # Jest unit tests (82/82 passing)
pnpm run test:integration  # Vitest integration tests (36/36 passing)
pnpm run test:e2e      # Playwright E2E tests
pnpm run test:unit:watch   # Watch mode for unit tests
```

### Database

```bash
pnpm dlx supabase@latest start    # Start local Supabase
pnpm dlx supabase@latest stop     # Stop local Supabase
pnpm run migrate       # Run custom migrations
```

### Performance

```bash
pnpm run perf:test     # Performance benchmarks
pnpm run perf:lighthouse   # Lighthouse CI
```

## Architecture Overview

This is a Next.js 15 + Supabase application with comprehensive testing and type safety.

### Core Structure

```
src/
├── app/                    # Next.js App Router (pages, API routes)
│   ├── api/               # API routes (couples, properties, maps, etc.)
│   ├── dashboard/         # Main app pages
│   └── auth/              # Authentication pages
├── components/            # React components organized by feature
│   ├── features/          # Feature-specific components (auth, couples, etc.)
│   ├── ui/               # shadcn/ui components
│   └── shared/           # Shared utilities and error boundaries
├── lib/
│   ├── services/         # Business logic layer (properties, interactions, etc.)
│   ├── schemas/          # Zod validation schemas
│   ├── supabase/         # Database clients (client.ts, server.ts)
│   └── utils/            # Utility functions
├── hooks/                # Custom React hooks
└── types/                # TypeScript definitions
```

### Key Features

1. **Property Browsing**: Tinder-style swipe interface with real-time interactions
2. **Couples Feature**: Multi-user property sharing and mutual likes
3. **Geographic Search**: PostGIS-powered spatial queries
4. **ML Scoring**: 3-phase recommendation system (planned)
5. **Real Estate Data**: Zillow API integration

## Development Patterns

### API Architecture

- **Routes**: `/app/api/*` → business logic in `/lib/services/*`
- **Validation**: Zod schemas in `/lib/schemas/*` for all inputs/outputs
- **Error Handling**: Consistent error responses with `lib/api/errors.ts`
- **Rate Limiting**: Implemented via `lib/middleware/rateLimiter.ts`

### Database Patterns

- **Auth**: Supabase RLS policies control all data access
- **Types**: Auto-generated from Supabase schema in `types/database.ts`
- **Client Management**: Separate clients for server (`server.ts`) and client (`client.ts`)
- **Migrations**: Prefix files with `YYYYMMDDHHMMSS` format

### State Management

- **Server State**: TanStack Query for API calls and caching
- **Client State**: Zustand for lightweight local state
- **Forms**: React Hook Form + Zod resolvers
- **Real-time**: Supabase subscriptions for live updates

### Testing Strategy

- **Unit Tests**: Jest for components and utilities (`__tests__/unit/`)
- **Integration Tests**: Vitest for API routes and database (`__tests__/integration/`)
- **E2E Tests**: Playwright for user workflows (`__tests__/e2e/`)
- **Fixtures**: Comprehensive test data in `__tests__/fixtures/`

## Code Quality Standards

### TypeScript

- **Strict mode**: No `any` types allowed
- **Validation**: Runtime validation with Zod for all external data
- **Generated Types**: Use Supabase auto-generated types

### Style Guide

- **Formatting**: Prettier with no semicolons, single quotes, 2-space indent
- **Components**: Feature-based organization, use shadcn/ui patterns
- **Hooks**: Custom hooks in `/hooks` directory with `use` prefix
- **Imports**: Absolute imports configured via tsconfig paths

### Performance

- **Monitoring**: Sentry integration for error tracking
- **Analytics**: PostHog for user behavior
- **Optimization**: Framer Motion for animations, lazy loading for components

## Environment Setup

### Required Variables

```bash
# Supabase (required)
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=$SUPABASE_SERVICE_ROLE_KEY

# Optional APIs
GOOGLE_MAPS_SERVER_API_KEY=$GOOGLE_MAPS_SERVER_API_KEY
```

See [docs/IMPLEMENTATION_PLAN.md](./docs/IMPLEMENTATION_PLAN.md) for complete setup.

### Supabase CLI Usage

- **Always use**: `pnpm dlx supabase@latest <command>`
- **Never use**: `supabase` or `pnpm exec supabase`
- **Local development**: `pnpm dlx supabase@latest start -x studio`

## Documentation

- **[Architecture](./docs/ARCHITECTURE.md)**: Complete system design and tech stack
- **[Testing](./docs/TESTING.md)**: Comprehensive testing strategy and workflows
- **[Setup Guide](./docs/SETUP_GUIDE.md)**: Environment setup and getting started
- **[API Reference](./docs/RAPIDAPI_ZILLOW.md)**: External API integrations
- **[Workflows](./docs/DEVELOPMENT_WORKFLOWS.md)**: Git workflows and processes

## Tech Stack

**Frontend**: Next.js 15, React 19, TypeScript 5, Tailwind CSS 4, shadcn/ui, Framer Motion
**Backend**: Supabase (PostgreSQL + Auth + RLS), Inngest (background jobs)
**State**: TanStack Query, Zustand, React Hook Form, Zod
**Testing**: Jest, Vitest, Playwright, React Testing Library
**Tools**: ESLint 9, Prettier, pnpm, Turbopack
