# Development Workflows

Day-to-day commands. `package.json` is the source of truth.

## Dev Servers

```bash
pnpm dev                 # Fast loop; no Docker, no DB reset
pnpm dev:db              # Local Supabase start/reset + seed + test users
pnpm dev:integration     # Integration-test config, no reset
pnpm dev:warmup          # Warmup wrapper (used by tests)
```

`pnpm dev` runs the Supabase env guard. For read-only remote dev: `SKIP_SUPABASE_GUARD=true pnpm dev`. Do not run mutations, resets, or admin workflows against production data. Production hostnames (no secrets) live in `config/supabase-production-hosts.json`.

## Code Quality

```bash
pnpm lint
pnpm lint:fix
pnpm type-check
pnpm check               # lint + type-check
pnpm format
```

Pre-commit hook: `scripts/pre-commit-hook.js`. Commit messages: Conventional Commits (enforced by commitlint).

## Testing Workflow

```bash
pnpm test
pnpm test:unit
pnpm test:integration
pnpm test:e2e
```

Full guidance: `docs/TESTING.md` and `docs/testing/README.md`.

## Database

```bash
pnpm db:reset            # Local Supabase start + reset (also used by pnpm dev:db)
pnpm migrate             # Migration helper
pnpm dlx supabase@latest start
pnpm dlx supabase@latest db reset
```

## Before Opening a PR

1. `pnpm lint`
2. `pnpm type-check`
3. `pnpm test`
4. Update docs if behavior changes

## Utility Scripts

```bash
pnpm validate:deployment
pnpm ingest:zillow
pnpm refresh:zillow-status
pnpm report:zillow-coverage
pnpm auto:commit
```

See `docs/RAPIDAPI_ZILLOW.md` for Zillow ingestion details. Auto-commit docs were archived to `reports/home-match-revival/archived-docs/auto-commit.md`.
