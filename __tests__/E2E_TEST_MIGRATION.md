# E2E Test Migration Documentation

## Overview
Tests have been reorganized to properly separate different testing levels:
- **Unit Tests**: Pure functions and isolated components (Jest)
- **Integration Tests**: Module integration with mocks and patterns (Vitest)
- **E2E Tests**: Full application stack with real database/server (Vitest/Playwright)

## Migration Phases

### Phase 1: HTTP-based Tests (Completed)
Tests that require a running Next.js development server have been moved from `__tests__/integration/` to `__tests__/e2e/`.

## Moved Tests
The following tests were moved to `__tests__/e2e/api/` because they make HTTP requests to `http://localhost:3000`:

### API Endpoint Tests
1. `interactions.route.int.test.ts` → `interactions.route.spec.ts`
   - Tests `/api/interactions` endpoints
   - Requires authenticated requests with Bearer token

2. `health.test.ts` → `health.spec.ts`
   - Tests `/api/health` endpoint
   - Verifies health check and database connectivity

3. `properties-marketing.test.ts` → `properties-marketing.spec.ts`
   - Tests marketing property endpoints
   - Requires running server for API calls

4. `performance-metrics.test.ts` → `performance-metrics.spec.ts`
   - Tests performance monitoring endpoints
   - Measures API response times

5. `couples-check-mutual.test.ts` → `couples-check-mutual.spec.ts`
   - Tests couples mutual checking API
   - Requires authenticated requests

6. `couples-stats.test.ts` → `couples-stats.spec.ts`
   - Tests couples statistics API
   - Requires running server

7. `couples/activity-simple.test.ts` → `activity-simple.spec.ts`
   - Tests activity tracking API
   - Makes fetch calls to activity endpoints

8. `couples/activity.test.ts` → `activity.spec.ts`
   - Tests couples activity API
   - Requires server for HTTP requests

9. `couples/activity-real.test.ts` → `activity-real.spec.ts`
   - Real integration tests for activity API
   - Uses TEST_API_URL or localhost:3000

10. `couples/mutual-likes.test.ts` → `mutual-likes.spec.ts`
    - Tests mutual likes API endpoints
    - Makes HTTP requests to server

11. `couples/mutual-likes-real.test.ts` → `mutual-likes-real.spec.ts`
    - Real integration tests for mutual likes
    - Requires running server

12. `couples-api-e2e.test.ts` → `couples-api.spec.ts`
    - Already named as e2e test, moved to proper location
    - Tests full couples API flow

### Phase 2: Mock-heavy Tests (Completed)
Additional tests with complex mocking that work better with real database:

1. `mutual-likes-improved.test.ts` → `mutual-likes-improved.spec.ts`
   - Complex mock setup for couples service
   - Better tested with real database

2. `couples-frontend-real.test.tsx` → `couples-frontend-real.spec.tsx`
   - Component integration with real data
   - Tests UI with actual database state

3. `auth/login-flow-simplified.test.tsx` → `auth-login-flow.spec.tsx`
   - Authentication flow testing
   - Requires real auth service

4. `properties/error-handling.test.ts` → `properties-error-handling.spec.ts`
   - Error handling scenarios
   - More reliable with real database errors

5. `properties/facade-delegation.test.ts` → `properties-facade-delegation.spec.ts`
   - Service delegation patterns
   - Tests real service interactions

6. `services/properties-integration.test.ts` → `services-properties-integration.spec.ts`
   - Property service integration
   - Tests with real Supabase client

## Running the Tests

### Integration Tests (No Server Required)
```bash
# Run only integration tests (excludes e2e)
pnpm test:integration
```

### E2E Tests (Server Required)
```bash
# Start the dev server first
pnpm run dev

# In another terminal, run e2e tests
pnpm test:e2e

# Or run specific API e2e tests
pnpm exec playwright test __tests__/e2e/api/
```

## Test Identification Pattern
Tests that should be in e2e directory typically:
- Use `fetch()` or similar HTTP clients to make requests
- Reference `BASE_URL` or `http://localhost:3000`
- Require `TEST_AUTH_TOKEN` for authenticated endpoints
- Test the full request/response cycle through HTTP

Tests that should remain in integration:
- Directly import and test route handlers
- Use mocked Supabase clients
- Test business logic in isolation
- Don't make actual HTTP requests

## Current Test Status

### Remaining Integration Test Issues (5 files)
These tests need fixing but should remain as integration tests:

1. **filter-builder-patterns.test.ts** - Missing PropertyService initialization
2. **supabase-client-patterns.test.ts** - Client mock issues
3. **error-handling-patterns.test.ts** - Mock service setup problems
4. **database/index.test.ts** - Occasional timing issues
5. **performance-benchmark.test.ts** - Environment-sensitive timing

### Skipped Tests (84 total)
- Tests that skip in CI environment when database isn't available
- Performance tests that require specific environments
- These are intentionally skipped and working as designed

## Environment Requirements

### For E2E API Tests
- `BASE_URL`: Default is `http://localhost:3000`
- `TEST_AUTH_TOKEN`: JWT token for authenticated requests (generated by `scripts/integration-test-setup.js`)
- Running Next.js server: `pnpm run dev`

### For Integration Tests
- Local Supabase Docker stack
- Test database with migrations applied
- No running server required