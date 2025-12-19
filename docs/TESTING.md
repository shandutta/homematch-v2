# Testing Guide

HomeMatch uses Jest for unit tests, Vitest for integration tests, and Playwright for E2E. The scripts in `package.json` are the source of truth.

## Quick Start

```bash
pnpm test                 # Unit + integration + E2E
pnpm test:unit            # Jest unit tests
pnpm test:integration     # Vitest integration tests
pnpm test:e2e             # Playwright E2E tests
```

Note: `pnpm test` runs unit and integration tests in parallel, then runs E2E. Integration tests reset and seed the local database.

## Unit Tests (Jest)

```bash
pnpm test:unit
pnpm test:unit:watch
pnpm test:unit:debug
pnpm test:coverage
```

Unit tests live under `__tests__/unit/` and focus on components, utilities, and service-level logic.

## Integration Tests (Vitest)

```bash
pnpm test:integration
pnpm test:integration:watch
```

`pnpm test:integration` runs `scripts/run-integration-tests.js`, which:

- Resets and seeds local Supabase
- Creates test users
- Starts the Next.js dev server
- Runs the Vitest integration suite

Integration tests live under `__tests__/integration/` and prefer real Supabase connections over heavy mocking.

## E2E Tests (Playwright)

```bash
pnpm test:e2e
pnpm test:e2e:headed
pnpm test:e2e:ui
pnpm test:e2e:smoke
pnpm test:e2e:validate
```

Notes:

- The Playwright wrapper sets `NEXT_PUBLIC_TEST_MODE=true`.
- If you need to force a DB reset for E2E, run `pnpm test:integration` once to seed and set up the local DB.

## Test Environment

Use `.env.test.local` to override `.env.local` for tests. At minimum, provide:

```env
SUPABASE_URL=http://localhost:54200
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54200
SUPABASE_ANON_KEY=your-local-anon-key
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-local-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-local-service-key
```

## Test Infrastructure Helpers

```bash
pnpm test:infra:start
pnpm test:infra:restart
pnpm test:infra:stop
pnpm test:infra:health
pnpm test:db:reset
pnpm test:cleanup
```

## Test Users

Use `pnpm test:setup-users` to create local test users. The default users are defined in `scripts/setup-test-users-admin.js`.

## CI

CI runs lint/type-check, unit tests, and integration tests. See `docs/CI_INTEGRATION_TESTS.md` for details.

## Troubleshooting

- Supabase not starting: verify Docker is running and the Supabase CLI is installed.
- Auth failures: check `docs/TROUBLESHOOTING_AUTH.md`.
- For deeper test guidance and historical reports, see `docs/testing/README.md`.
