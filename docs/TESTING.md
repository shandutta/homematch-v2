# Testing Guide

Jest for unit tests, Vitest for integration, Playwright for E2E. `package.json` is the source of truth for scripts.

## Commands

```bash
pnpm test                 # Unit + integration (parallel) then E2E
pnpm test:unit            # Jest unit tests
pnpm test:integration     # Vitest integration tests
pnpm test:e2e             # Playwright E2E tests
```

`pnpm test:integration` resets and seeds the local database.

## Unit Tests (Jest)

```bash
pnpm test:unit
pnpm test:unit:watch
pnpm test:unit:debug
pnpm test:coverage
```

Tests: `__tests__/unit/`. Components, utilities, service-level logic.

## Integration Tests (Vitest)

```bash
pnpm test:integration
pnpm test:integration:watch
```

`scripts/run-integration-tests.js` handles: Supabase reset/seed, test user creation, dev server start, Vitest suite run. Tests: `__tests__/integration/`. Prefer real Supabase connections over mocking.

## E2E Tests (Playwright)

```bash
pnpm test:e2e
pnpm test:e2e:headed
pnpm test:e2e:ui
pnpm test:e2e:smoke
pnpm test:e2e:validate
```

Playwright wrapper sets `NEXT_PUBLIC_TEST_MODE=true`. For a DB reset before E2E, run `pnpm test:integration` first.

## Test Environment

Override `.env.local` with `.env.test.local`. Minimum:

```env
SUPABASE_URL=http://localhost:54200
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54200
SUPABASE_ANON_KEY=your-local-anon-key
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-local-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-local-service-key
```

## Infrastructure Helpers

```bash
pnpm test:infra:start
pnpm test:infra:restart
pnpm test:infra:stop
pnpm test:infra:health
pnpm test:db:reset
pnpm test:cleanup
```

## Test Users

```bash
pnpm test:setup-users
```

Accounts defined in `scripts/setup-test-users-admin.js`.

## CI

CI runs lint, type-check, unit tests, integration tests. Details: `docs/CI_INTEGRATION_TESTS.md`.

## Troubleshooting

- Supabase not starting: verify Docker + Supabase CLI
- Auth failures: see Google OAuth and email verification troubleshooting in `docs/SETUP_GUIDE.md`
