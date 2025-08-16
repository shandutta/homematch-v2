/**
 * Fixtures validation tests - ensuring all fixtures work correctly
 * Consolidated from fixtures-test.spec.ts, fixtures-complete.spec.ts, and fixtures-validation.spec.ts
 */

import { test, expect } from '../fixtures'

test.describe('Fixtures Validation', () => {
  test(
    'should validate all fixtures work together',
    async ({ utils, config, logger, retry }) => {
      logger.step('Testing all fixtures integration')

      // Test basic page operations
      await retry.network(async () => {
        await utils.navigateWithRetry('/')
        await utils.waitForReactToSettle()
      })

      // Test authentication state
      await utils.clearAuthState()
      const isAuth = await utils.isAuthenticated()
      expect(isAuth).toBe(false)

      // Test logger functionality
      logger.info('TEST', 'All fixtures working correctly')

      // Test config access
      expect(config.timeouts.PAGE_LOAD).toBeGreaterThan(0)
      expect(config.users.user1.email).toBeDefined()

      logger.step('All fixtures validation completed')
    }
  )

  test(
    'should handle navigation with retry mechanism',
    async ({ page, utils, retry, logger }) => {
      logger.step('Testing retry fixture with navigation')

      // Test navigation with retry
      await retry.network(async () => {
        await utils.navigateWithRetry('/')
        await utils.waitForReactToSettle()
      })

      // Verify page loaded
      await expect(page.locator('h1')).toBeVisible()

      logger.step('Navigation retry test completed')
    }
  )
})
