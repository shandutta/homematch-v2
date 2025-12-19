# Development Workflows

This guide captures the practical day-to-day workflows for HomeMatch development. Use `package.json` as the source of truth for scripts.

## Local Development

```bash
pnpm dev                # Starts Supabase, resets DB, seeds, creates test users
pnpm dev:integration    # Runs dev server without reset
pnpm dev:warmup         # Warmup wrapper used by tests
```

## Code Quality

```bash
pnpm lint
pnpm lint:fix
pnpm type-check
pnpm format
```

The repo uses simple-git-hooks with a pre-commit hook (`scripts/pre-commit-hook.js`) and commitlint for Conventional Commits.

## Testing Workflow

```bash
pnpm test
pnpm test:unit
pnpm test:integration
pnpm test:e2e
```

See `docs/TESTING.md` and `docs/testing/README.md` for deeper guidance and test-specific helpers.

## Database Workflow

```bash
pnpm run db:reset       # Local Supabase start + reset (used by pnpm dev)
pnpm migrate            # Run migration helper
```

For raw Supabase CLI operations:

```bash
pnpm dlx supabase@latest start
pnpm dlx supabase@latest db reset
```

## CI Expectations

Before opening a PR:

1. `pnpm lint`
2. `pnpm type-check`
3. `pnpm test`
4. Update docs if behavior changes

## Useful Scripts

```bash
pnpm validate:deployment
pnpm ingest:zillow
pnpm refresh:zillow-status
pnpm auto:commit
```

See `docs/auto-commit.md` and `docs/RAPIDAPI_ZILLOW.md` for details.
