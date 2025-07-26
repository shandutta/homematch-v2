# CLAUDE.md

This file provides guidance to Claude Code when working with this repository.

## Essential Commands

```bash
# Development
pnpm run dev              # Start dev server
pnpm run type-check       # TypeScript check
pnpm run lint             # ESLint

# Testing
pnpm run test             # Full test suite
pnpm run test:fast        # Quick tests (type-check, lint, jest)
pnpm run test:unit        # Unit tests only
pnpm run test:integration # Integration tests
pnpm run test:e2e         # E2E Playwright tests

# Database & Data
pnpm run db:migrate       # Supabase migrations
pnpm run db:seed          # Seed test data
pnpm run ingest:properties # Ingest Zillow data
pnpm run scoring:update   # Update ML scores

# Build
pnpm run build            # Production build
```

## Architecture

Next.js 15 app with clean architecture principles.

**📋 See [`NEW_ARCHITECTURE.md`](./NEW_ARCHITECTURE.md) for detailed system design**  
**🚀 See [`REBUILD_FROM_SCRATCH_PLAN.md`](./REBUILD_FROM_SCRATCH_PLAN.md) for implementation plan**

### Key Directories

- `/app` - Next.js App Router (pages, API routes)
- `/lib` - Business logic (auth, services, ML, API clients)
- `/components` - React components by feature
- `/types` - TypeScript definitions

### Environment Variables

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# External APIs
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=
RAPIDAPI_KEY=                    # Zillow API
QWEN_API_KEY=                    # Natural language search

# Deployment
VERCEL_URL=
CRON_SECRET=
INTERNAL_API_KEY=
```

### Authentication

- **Supabase Auth** with Google OAuth
- Server-side sessions with RLS policies
- Key files: `lib/auth/supabase.ts`, `middleware.ts`

### Key Features

1. **ML Scoring**: 3-phase system (cold-start → online-LR → LightGBM)
2. **Households**: Multi-user property sharing
3. **Geographic**: PostGIS polygon neighborhoods
4. **NL Search**: AI-powered complex queries
5. **Real Estate**: Zillow API integration

### Common Patterns

- Start with API route in `/app/api`
- Business logic in `/lib/services`
- Validation schemas in `/lib/schemas`
- Use Supabase RLS for auth
- Store ML scores in JSONB
- Test with auth helpers

## Migration Notes

- **Status**: V2 rebuild on `v2-clean` branch
- **Preserve**: Property data, neighborhood polygons, ML models
- **Reference**: Production code on `origin/main`

See architecture docs above for comprehensive details.
