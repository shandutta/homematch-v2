# Playwright Fixtures

These fixtures live in `__tests__/fixtures` and provide shared helpers for Playwright E2E tests.

## Structure

- `config.ts` - timeouts and test users
- `utils.ts` - page utilities
- `logger.ts` - debug logging
- `retry.ts` - retry helpers
- `auth.ts` - authentication flows
- `index.ts` - combined fixtures export

## Usage

```ts
import { test, expect } from '@/__tests__/fixtures'

test('auth flow', async ({ page, auth, logger }) => {
  logger.step('logging in')
  await auth.login()
  await auth.verifyAuthenticated()
})
```

## Notes

- The fixtures are dependency-injected by Playwright to avoid circular imports.
- Use `retry` helpers for flaky UI operations.
- Update test users in `__tests__/fixtures/config.ts`.
