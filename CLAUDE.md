# CLAUDE.md

Project context and guidelines for Claude Code when working with this repository.

## Development Environment

- Start directory: `homematch-v2` (Git Bash shell)
- Commands: Use `pnpm` for package management

### Shell (Windows)

Always run commands directly in Git Bash—never wrap them in `Bash()` or prefix with `bash`, as this triggers the `Files\Git\bin\bash.exe` path error.

## Workflow Guidelines

- **Plan first**: Write plans to `.claude/tasks/TASK_NAME.md`, get approval before implementing
- **Update plans**: Document changes, mark tasks as completed, and handoff details as you work
- **Think MVP**: Avoid over-planning, focus on essential functionality
- **Research**: Use MCPs and Task tool for external knowledge/packages

## Code Standards

- **TypeScript**: Strict mode, proper typing, no `any` types
- **Quality**: Always run `pnpm run lint` and `pnpm run type-check` after changes
- **Style**: Prettier (no semicolons, single quotes, 2-space indent)

## Essential Commands

```bash
pnpm run dev           # Start development server
pnpm run lint          # Lint and type-check
pnpm run test          # Run test suite
pnpm run db:migrate    # Apply database migrations
pnpm run build         # Production build
```

## Project Structure

```
/app                   # Next.js App Router (pages, API routes)
/lib                   # Business logic (auth, services, ML, API clients)
  /supabase           # Database clients
  /services           # Business logic
  /schemas            # Validation schemas
/components            # React components by feature
/types                # TypeScript definitions
```

## Key Features

1. **ML Scoring**: 3-phase system (cold-start → online-LR → LightGBM)
2. **Households**: Multi-user property sharing
3. **Geographic**: PostGIS polygon neighborhoods
4. **NL Search**: AI-powered complex queries
5. **Real Estate**: Zillow API integration

## Common Patterns

- API routes: `/app/api` → business logic in `/lib/services`
- Validation: Zod schemas in `/lib/schemas`
- Auth: Supabase RLS policies for data access
- Data: Store ML scores in JSONB fields
- Testing: Use auth helpers for protected routes
- **Migrations**: When naming Supabase migrations, always prefix the file with the current system date and time in `YYYYMMDDHHMMSS` format.

## Environment Setup

See [`docs/IMPLEMENTATION_PLAN.md`](./docs/IMPLEMENTATION_PLAN.md) Step 2.1 for complete environment variable setup.
**Quick start**: Set Supabase variables first, add external APIs as needed.

### Supabase CLI (Windows)

Use **only**  
`pnpm dlx supabase@latest <subcommand>`  
(e.g. `pnpm dlx supabase@latest start -x studio`)
Never call `supabase …` or `pnpm exec supabase …`.

## Documentation

> **📚 Complete Guide**: See [`docs/README.md`](./docs/README.md) for comprehensive documentation index.

### Essential References

- **📋 Architecture**: [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) - System design
- **🚀 Implementation**: [`docs/IMPLEMENTATION_PLAN.md`](./docs/IMPLEMENTATION_PLAN.md) - Setup guide
- **🧪 Testing**: [`docs/TESTING.md`](./docs/TESTING.md) - Complete testing strategy
- **⚙️ Workflows**: [`docs/DEVELOPMENT_WORKFLOWS.md`](./docs/DEVELOPMENT_WORKFLOWS.md) - Development processes
- **🔧 API Reference**: [`docs/RAPIDAPI_ZILLOW.md`](./docs/RAPIDAPI_ZILLOW.md) - Zillow integration

## Tech Stack

Next.js 15, Supabase, TypeScript, Tailwind CSS, shadcn/ui, TanStack Query, Inngest (background jobs)
