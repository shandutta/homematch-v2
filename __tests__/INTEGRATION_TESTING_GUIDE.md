# Real Integration Testing Guide

## Overview

This guide explains how to write integration tests that use real database connections instead of heavy mocking, resulting in more reliable and maintainable tests.

## Key Principles

1. **Real Database Connections**: Use actual Supabase connections instead of mocks
2. **Test Data Factories**: Create consistent test data with factories
3. **Automatic Cleanup**: Clean up test data after each test
4. **Isolated Test Scenarios**: Each test creates its own data
5. **Performance Monitoring**: Track API response times

## Setup Requirements

### 1. Local Supabase Instance

```bash
# Start local Supabase (already configured!)
pnpm dlx supabase@latest start

# Database will be available at:
# - PostgreSQL: localhost:54201
# - API: localhost:54200
```

### 2. Environment Configuration

Create `.env.test.local` if it doesn't exist:

```env
# Test Database Configuration
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54200
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-local-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-local-service-key

# Test API Configuration
TEST_API_URL=http://localhost:3000
TEST_AUTH_TOKEN=test-jwt-token
```

### 3. Test Server Setup

For API endpoint testing, you need a test server running:

```bash
# In one terminal, run the Next.js dev server
pnpm dev

# In another terminal, run tests
pnpm test:integration
```

## Writing Integration Tests

### 1. Using Test Data Factory

```typescript
import { TestDataFactory } from '@/__tests__/utils/test-data-factory'

describe('My Integration Test', () => {
  let factory: TestDataFactory

  beforeAll(() => {
    factory = new TestDataFactory()
  })

  afterAll(async () => {
    await factory.cleanup()
  })

  test('should create and retrieve data', async () => {
    // Create test data
    const user = await factory.createUser()
    const property = await factory.createProperty()
    const interaction = await factory.createInteraction(
      user.id,
      property.id,
      'like'
    )

    // Test your actual service/API
    const result = await myService.getUserInteractions(user.id)

    expect(result).toContainEqual(
      expect.objectContaining({
        property_id: property.id,
        interaction_type: 'like',
      })
    )
  })
})
```

### 2. Testing API Endpoints

```typescript
describe('API Endpoint Test', () => {
  test('should handle real requests', async () => {
    // Create test data
    const scenario = await factory.createCouplesScenario()

    // Make real API call
    const response = await fetch('/api/couples/activity', {
      headers: {
        'x-test-user-id': scenario.users[0].id,
      },
    })

    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.activity).toBeDefined()
  })
})
```

### 3. Complex Scenarios

```typescript
test('should handle couples with mutual likes', async () => {
  // Use pre-built scenarios
  const scenario = await factory.createCouplesScenario()

  // scenario includes:
  // - 2 users in a household
  // - 3 properties
  // - Mutual likes on property1
  // - Individual likes on other properties

  const mutualLikes = await queries.getHouseholdMutualLikes(
    scenario.household.id
  )

  expect(mutualLikes).toContain(scenario.properties[0].id)
})
```

## Test Utilities

### TestDataFactory Methods

- `createUser(overrides?)` - Create a test user
- `createHousehold(memberIds?, overrides?)` - Create household with members
- `createProperty(overrides?)` - Create a test property
- `createInteraction(userId, propertyId, type)` - Create user interaction
- `createCouplesScenario()` - Create complete couples test scenario
- `createGeographicProperties(count, lat, lng)` - Create properties in area
- `createMLScoringScenario()` - Create ML training data
- `cleanup()` - Remove all created test data

### Database Test Helpers

- `withTransaction(testFn)` - Run test with automatic cleanup
- `resetTestDatabase()` - Clear all test data
- `waitForDatabase(ms)` - Wait for eventual consistency
- `TestDatabaseQueries` - Common query helpers
- `TestDatabaseAssertions` - Database assertion utilities

## Best Practices

### 1. Test Isolation

```typescript
describe('Feature Test', () => {
  let factory: TestDataFactory

  beforeEach(() => {
    // Fresh factory for each test
    factory = new TestDataFactory()
  })

  afterEach(async () => {
    // Clean up after each test
    await factory.cleanup()
  })
})
```

### 2. Avoid Shared State

```typescript
// ❌ Bad: Shared test data
const sharedUser = await factory.createUser()

// ✅ Good: Create fresh data per test
test('test 1', async () => {
  const user = await factory.createUser()
  // ...
})
```

### 3. Use Descriptive Test Data

```typescript
// ✅ Good: Clear test data
const seattleBuyer = await factory.createUser({
  first_name: 'Test',
  last_name: 'Buyer',
  preferences: {
    preferred_cities: ['Seattle'],
    min_price: 400000,
    max_price: 600000,
  },
})
```

### 4. Test Real Behaviors

```typescript
// ❌ Bad: Testing mocks
jest.mock('@/lib/services/couples')
expect(mockService.getActivity).toHaveBeenCalled()

// ✅ Good: Testing real behavior
const activity = await couplesService.getActivity(userId)
expect(activity).toContainEqual(
  expect.objectContaining({ property_id: propertyId })
)
```

## Running Tests

```bash
# Run all integration tests
pnpm test:integration

# Run specific test file
pnpm test __tests__/integration/api/couples/activity-real.test.ts

# Run with coverage
pnpm test:integration --coverage

# Run in watch mode
pnpm test:integration --watch
```

## Troubleshooting

### Database Connection Issues

```bash
# Check if Supabase is running
pnpm dlx supabase@latest status

# Restart Supabase
pnpm dlx supabase@latest stop
pnpm dlx supabase@latest start
```

### Test Data Not Cleaning Up

```typescript
// Force cleanup in afterAll
afterAll(async () => {
  await cleanupAllTestData()

  // Additional manual cleanup if needed
  const client = createClient()
  await client.from('user_interactions').delete().like('user_id', 'test-%')
})
```

### Slow Tests

1. Use smaller data sets for unit-like integration tests
2. Run database-heavy tests in parallel with proper isolation
3. Consider using database snapshots for complex scenarios

## Migration from Mock-Based Tests

### Before (Mock-Based)

```typescript
jest.mock('@/lib/supabase/server')
const mockClient = {
  from: jest.fn().mockReturnThis(),
  select: jest.fn().mockResolvedValue({ data: mockData }),
}
```

### After (Real Database)

```typescript
const factory = new TestDataFactory()
const realData = await factory.createProperty()
const client = createClient()
const { data } = await client.from('properties').select().eq('id', realData.id)
```

## Next Steps

1. **Convert existing mock-based tests** gradually to use real database
2. **Add performance benchmarks** to integration tests
3. **Implement database snapshots** for complex test scenarios
4. **Create GitHub Actions** workflow for integration tests with test database
5. **Add test coverage** requirements for new features

## Benefits of This Approach

✅ **More Reliable**: Tests actual database behavior, not mock assumptions
✅ **Better Coverage**: Tests real SQL queries, constraints, and triggers
✅ **Easier Maintenance**: No need to update mocks when implementation changes
✅ **Catches Real Bugs**: Finds issues mocks would miss (SQL errors, constraints)
✅ **Performance Testing**: Can measure actual query performance
✅ **Confidence**: Tests prove the system actually works end-to-end
