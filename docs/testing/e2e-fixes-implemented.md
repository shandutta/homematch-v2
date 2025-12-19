# E2E Test Fixes Implemented

Note: This is a historical fixes summary. Confirm current Playwright status via `pnpm test:e2e` or CI.

## Summary

This document captures patterns that were used to stabilize E2E tests when a large batch was failing. Some file references from the original effort no longer exist; use the current fixtures and configs as the source of truth.

## Patterns That Helped

- Prefer stable selectors (`data-testid`) and avoid brittle CSS selectors.
- Wait for hydration/settling after navigation (`page.waitForLoadState('networkidle')` + short delays when needed).
- Wrap flaky flows in retry helpers.
- Keep auth flows centralized in Playwright fixtures.

## Where to Look Today

- Fixtures: `__tests__/fixtures/*`
- Playwright config: `playwright.config.ts`
- E2E tests: `__tests__/e2e/`

## Example Fixture Usage

```ts
import { test, expect } from '@/__tests__/fixtures'

test('auth flow', async ({ page, auth, retry }) => {
  await retry.auth(async () => {
    await auth.login()
    await auth.verifyAuthenticated()
  })

  await page.goto('/dashboard')
  await expect(page.locator('[data-testid="dashboard"]')).toBeVisible()
})
```
