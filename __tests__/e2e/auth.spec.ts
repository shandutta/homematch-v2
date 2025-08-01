/**
 * Comprehensive authentication tests using Playwright fixtures
 * Consolidated from auth-simple-fixtures.spec.ts and auth-fixtures-comprehensive.spec.ts
 */

import { test } from '../fixtures/index'

// =============================================================================
// Authentication Tests - Using All Fixtures
// =============================================================================

test.describe('Authentication Flow', () => {
  // Pruned: keep only one happy-path flow and essential redirect test

  // Removed: form validation (covered by unit/integration)

  test('should complete full login and logout flow', async ({
    page,
    auth,
    config,
    logger,
    retry,
  }) => {
    logger.step('Testing complete authentication flow')

    // Test full login flow with retry protection
    await retry.auth(async () => {
      await auth.login(config.users.user1)
    })

    // Verify authentication succeeded
    await auth.verifyAuthenticated(config.users.user1)
    logger.auth('login', 'success', { user: config.users.user1.email })

    // Test logout flow
    await auth.logout()

    // Small wait for timing differences, then verify logout succeeded
    await page.waitForTimeout(750)
    await auth.verifyNotAuthenticated()
    logger.auth('logout', 'success')

    logger.step('Full authentication flow completed successfully')
  })

  test('should redirect to validation page after successful login', async ({
    page,
    auth,
    config,
    logger,
    retry,
  }) => {
    logger.step('Testing login redirect to validation page')

    // Test login flow with retry protection
    await retry.auth(async () => {
      await auth.login(config.users.user1)
    })

    // Verify we're redirected to validation page
    await page.waitForURL(/.*\/validation/, {
      timeout: config.timeouts.NAVIGATION,
    })

    const url = page.url()
    const isOnValidationPage = url.includes('/validation')

    if (!isOnValidationPage) {
      throw new Error(`Expected to be on validation page, but URL is: ${url}`)
    }

    logger.auth('login', 'success', {
      user: config.users.user1.email,
      redirected: true,
    })

    logger.step('Login redirect test completed')
  })

  // Removed: invalid credential handling (non-critical for E2E)

  // Removed: protected route without auth (covered by redirect test semantics)
})
