/**
 * Error Simulation Tests for Properties Services
 *
 * These tests use API mocking to verify error handling and fallback behavior.
 * They simulate service failures to test how the UI responds gracefully.
 * These are UI error handling tests, not full E2E flow tests.
 */
import { test, expect } from '../../fixtures'

test.describe('Properties Service Error Simulation', () => {
  test('handles analytics service failure gracefully', async ({
    page,
    config,
    logger,
    auth,
  }) => {
    logger.step('Testing facade handling of analytics service failure')

    await auth.loginIfNeeded(config.users.user1)

    // Intercept analytics service to fail while other services work
    await page.route('**/api/properties/analytics*', (route) => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Analytics service unavailable' }),
      })
    })

    await page.goto(`${config.baseUrl}/dashboard`)
    await page.waitForTimeout(1000)

    // Properties should still load even if analytics fails
    try {
      await page.waitForSelector('[data-testid="dashboard-content"]', {
        timeout: 30000,
      })
      await page.waitForSelector(
        '[data-testid="property-card"], .property-card',
        { timeout: 30000 }
      )

      const properties = await page
        .locator('[data-testid="property-card"], .property-card')
        .all()
      expect(properties.length).toBeGreaterThan(0)

      // Basic data should be present
      const firstProperty = properties[0]
      await expect(
        firstProperty
          .locator('[data-testid="property-price"], .price, [class*="price"]')
          .first()
      ).toBeVisible()

      // Analytics data might be missing but shouldn't break the UI
      const matchScore = firstProperty
        .locator('[data-testid="match-score"], .match-score, [class*="score"]')
        .first()
      try {
        if (await matchScore.isVisible({ timeout: 2000 })) {
          const scoreText = await matchScore.textContent()
          logger.info(`Match score during failure: ${scoreText}`)
        } else {
          logger.info('Match score hidden during analytics service failure')
        }
      } catch {
        logger.info('Match score element not accessible during service failure')
      }

      logger.info('Facade handled service failure gracefully')
    } catch (error) {
      const currentUrl = page.url()
      if (currentUrl.includes('/login')) {
        logger.info('Redirected to login - retrying after authentication')
        await auth.login(config.users.user1)
        await page.goto(`${config.baseUrl}/dashboard`)

        await page.waitForSelector('[data-testid="dashboard-content"]', {
          timeout: 30000,
        })
        await page.waitForSelector(
          '[data-testid="property-card"], .property-card',
          { timeout: 30000 }
        )

        const properties = await page
          .locator('[data-testid="property-card"], .property-card')
          .all()
        expect(properties.length).toBeGreaterThan(0)
        logger.info(
          'Facade handled service failure gracefully after auth retry'
        )
      } else {
        throw error
      }
    }
  })

  test('provides fallback data when multiple services are unavailable', async ({
    page,
    config,
    logger,
    auth,
  }) => {
    logger.step('Testing facade fallback behavior with multiple failures')

    await auth.loginIfNeeded(config.users.user1)

    // Make analytics service fail
    await page.route('**/api/properties/analytics*', (route) => {
      route.abort('failed')
    })

    // Make geographic service slow
    await page.route('**/api/properties/geographic*', async (route) => {
      await page.waitForTimeout(2000)
      route.continue()
    })

    await page.goto(`${config.baseUrl}/dashboard`)
    await page.waitForTimeout(1000)

    // Properties should still load with fallback data
    try {
      await page.waitForSelector('[data-testid="dashboard-content"]', {
        timeout: 30000,
      })
      await page.waitForSelector(
        '[data-testid="property-card"], .property-card',
        { timeout: 30000 }
      )

      const properties = await page
        .locator('[data-testid="property-card"], .property-card')
        .all()
      expect(properties.length).toBeGreaterThan(0)

      // Check that basic data is present even with service failures
      const firstProperty = properties[0]
      const hasEssentialData = await firstProperty
        .locator('[data-testid="property-price"], .price')
        .isVisible()
      expect(hasEssentialData).toBeTruthy()

      logger.info('Facade provided fallback data successfully')
    } catch (error) {
      const currentUrl = page.url()
      if (currentUrl.includes('/login')) {
        logger.info('Redirected to login - need to authenticate first')
        await auth.login(config.users.user1)
        await page.goto(`${config.baseUrl}/dashboard`)

        await page.waitForSelector('[data-testid="dashboard-content"]', {
          timeout: 30000,
        })
        await page.waitForSelector(
          '[data-testid="property-card"], .property-card',
          { timeout: 30000 }
        )

        const properties = await page
          .locator('[data-testid="property-card"], .property-card')
          .all()
        expect(properties.length).toBeGreaterThan(0)
        logger.info(
          'Facade provided fallback data successfully after auth retry'
        )
      } else {
        throw error
      }
    }
  })
})
