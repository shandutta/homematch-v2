/**
 * Simple test to validate basic Playwright fixtures
 * This is a simple test to ensure fixtures work without circular dependencies
 */

import { test, expect } from '../fixtures'

test('Basic Fixtures - should load page and use utils', async ({
  page,
  utils,
  logger,
}) => {
  logger.step('Testing basic page load and utils')

  // Navigate to home page
  await page.goto('/')
  await utils.waitForReactToSettle()

  // Clear auth state
  await utils.clearAuthState()

  // Verify page loads correctly
  await expect(page).toHaveTitle(/HomeMatch/)
  await expect(page.locator('h1')).toContainText('HomeMatch')

  logger.step('Basic page load test completed')
})

test('Basic Fixtures - should handle navigation with retry', async ({
  page,
  utils,
  retry,
  logger,
}) => {
  logger.step('Testing navigation with retry')

  // Test navigation with retry
  await retry.network(async () => {
    await utils.navigateWithRetry('/')
    await utils.waitForReactToSettle()
  })

  // Verify we're on the right page
  await expect(page.locator('h1')).toBeVisible()

  logger.step('Navigation retry test completed')
})

test('Basic Fixtures - should check authentication state', async ({
  page,
  utils,
  config,
  logger,
}) => {
  logger.step('Testing authentication state check')

  await page.goto('/')
  await utils.clearAuthState()

  // Should not be authenticated after clearing state
  const isAuth = await utils.isAuthenticated()
  expect(isAuth).toBe(false)

  logger.step('Authentication state test completed')
})
