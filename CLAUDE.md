# CLAUDE.md

This file provides guidance to Claude Code when working with this repository.

## Development Environment

- Claude will most likely always start in the homematch-v2 directory when using Git Bash shell
- Can run pnpm, npm, and other bash commands directly without changing directory

## Plan & Review

### Before starting work

- Always in plan mode to make a plan
- After get the plan, make sure you Write the plan to .claude/tasks/TASK_NAME.md.
- The plan should be a detailed implementation plan and the reasoning behind them, as well as tasks broken down.
- If the task require external knowledge or certain package, also research to get latest knowledge (Use relevant MCPs and Task tool for research)
- Don't over plan it, always think MVP.
- Once you write the plan, firstly ask me to review it. Do not continue until I approve the plan.

### While implementing

- You should update the plan as you work.
- After you complete tasks in the plan, you should update and append detailed descriptions of the changes you made, so following tasks can be easily hand over to other engineers.

## Code Quality Standards

**ALL code must follow these standards:**

- **TypeScript**: Strict mode, ES2017+ syntax, proper typing, don't use any types
- **ESLint**: Next.js core-web-vitals + TypeScript rules (runs on pre-commit)
- **Prettier**: No semicolons, single quotes, 2-space indentation, Tailwind CSS plugin
- **Always run `pnpm run lint` and `pnpm run type-check` after code changes**

## Essential Commands

```bash
# Development
pnpm run dev              # Start dev server
pnpm run type-check       # TypeScript check
pnpm run lint             # ESLint
pnpm run format           # Prettier formatting
pnpm run lint:fix         # Auto-fix ESLint issues

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

Next.js 15 app with clean architecture principles. Technology stack fully audited and verified.

**📋 See [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) for detailed system design**  
**🚀 See [`docs/IMPLEMENTATION_PLAN.md`](./docs/IMPLEMENTATION_PLAN.md) for implementation plan**

### Project Status

- ✅ **Day 1 Technology Stack**: Complete - All dependencies verified and installed with enhancements
- ✅ **Authentication System**: Complete - Supabase Auth with Google OAuth, advanced validation, route protection
- 📋 **Database**: Schema designed, migration ready for deployment
- 📋 **Frontend**: Component structure established, auth components implemented

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

### Authentication ✅ **IMPLEMENTED**

- **Supabase Auth** with Google OAuth and email/password
- Server-side sessions with RLS policies and route protection
- Advanced forms with React Hook Form + Zod validation (password regex, confirmation)
- OAuth callback handling and error management
- Key files: `src/lib/supabase/`, `src/utils/supabase/`, `src/components/features/auth/`, `src/lib/schemas/auth.ts`, `middleware.ts`

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

## Supabase MCP Integration

Supabase MCP server configured for AI-assisted database operations (schema analysis, migration generation, queries). Read-only mode enabled. Config: `.mcp.json` + `SUPABASE_MCP_TOKEN` in `.env.local`.
