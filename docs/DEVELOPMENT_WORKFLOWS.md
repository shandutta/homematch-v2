# Development Workflows

This guide captures the practical day-to-day workflows for HomeMatch development. Use `package.json` as the source of truth for scripts.

## Local Development

```bash
pnpm dev                # Fast Next.js dev loop; no Docker/DB reset
pnpm dev:db             # Explicit local Supabase start/reset + seed + test users
pnpm dev:integration    # Runs integration-test dev server without reset
pnpm dev:warmup         # Warmup wrapper used by tests
```

`pnpm dev` runs the Supabase env guard before starting Next.js. For normal local-only work, keep `.env.local` pointed at localhost, `supabase.local`, or the documented dev proxy. If you intentionally use a remote Supabase project for a read-only local dev loop, run `SKIP_SUPABASE_GUARD=true pnpm dev` and do not run mutation, reset, integration, cron, or admin workflows against real production data.

`.env.prod` is intentionally untracked and not required for local dev. The guard keeps precision without committing secrets by reading `config/supabase-production-hosts.json`, which may contain production hostnames only. Never put API keys, service-role keys, passwords, database URLs, or copied `.env.prod` values in tracked files.

## Code Quality

```bash
pnpm lint
pnpm lint:fix
pnpm type-check
pnpm check
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
pnpm db:reset           # Explicit local Supabase start + reset (also used by pnpm dev:db)
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
pnpm report:zillow-coverage
pnpm auto:commit
```

See `docs/auto-commit.md` and `docs/RAPIDAPI_ZILLOW.md` for details.
