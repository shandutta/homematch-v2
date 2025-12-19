# Integration Testing Guide

This guide focuses on real Supabase-backed integration tests.

## Quick Start

```bash
pnpm test:integration
```

This command:

- Resets and seeds local Supabase
- Creates test users
- Starts a Next.js dev server
- Runs the Vitest integration suite

## Local Supabase

If you want to manage Supabase yourself:

```bash
pnpm dlx supabase@latest start
```

Then run:

```bash
pnpm test:integration:watch
```

## Environment Setup

Use `.env.test.local` to override `.env.local` for tests. At minimum, provide:

```env
SUPABASE_URL=http://localhost:54200
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54200
SUPABASE_ANON_KEY=your-local-anon-key
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-local-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-local-service-key
```

## Writing Integration Tests

### Test Data Factory

```ts
import { TestDataFactory } from '@/__tests__/utils/test-data-factory'

describe('My Integration Test', () => {
  let factory: TestDataFactory

  beforeAll(() => {
    factory = new TestDataFactory()
  })

  afterAll(async () => {
    await factory.cleanup()
  })

  test('creates and queries data', async () => {
    const user = await factory.createUser()
    const property = await factory.createProperty()
    await factory.createInteraction(user.id, property.id, 'like')

    const result = await myService.getUserInteractions(user.id)
    expect(result).toContainEqual(
      expect.objectContaining({ property_id: property.id })
    )
  })
})
```

### API Endpoint Tests

Prefer real HTTP requests against the dev server and avoid heavy mocking unless necessary.

## Related Docs

- Core testing guide: `docs/TESTING.md`
- Testing appendix index: `docs/testing/README.md`
