/**
 * Error Simulation Tests for Couples API
 *
 * These tests use API mocking to verify error handling UI behavior.
 * They simulate specific error conditions to test how the UI responds.
 * These are UI error handling tests, not full E2E flow tests.
 */
import { test, expect } from '@playwright/test'
import { createWorkerAuthHelper } from '../../utils/auth-helper'

test.describe('Couples API Error Simulation', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    // Use worker-specific authentication
    const { auth, testUser } = createWorkerAuthHelper(page, testInfo)
    await auth.authenticateWithStorageState(testInfo.workerIndex, testUser)
    await auth.verifyAuthenticated()
  })

  test('handles mutual-likes API error gracefully', async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForLoadState('domcontentloaded')

    // Mock API to return error - testing UI error handling, not server behavior
    await page.route('**/api/couples/mutual-likes', (route) => {
      route.fulfill({
        status: 500,
        body: JSON.stringify({ error: 'Server error' }),
      })
    })

    // Reload to trigger the error
    await page.reload()
    await page.waitForLoadState('domcontentloaded')

    // Look for error states or graceful degradation
    const errorSelectors = [
      '[data-testid="mutual-likes-error"]',
      '[data-testid="error-message"]',
      '[role="alert"]',
      'text="Failed to fetch"',
      'text="Error"',
      '.error',
    ]

    let errorFound = false
    for (const selector of errorSelectors) {
      if ((await page.locator(selector).count()) > 0) {
        await expect(page.locator(selector).first()).toBeVisible()
        errorFound = true
        break
      }
    }

    // Either error UI is shown OR the app gracefully degrades (empty state)
    // Main content should still be visible (nav, main structure)
    const mainContent = page.locator('main, [role="main"], nav')
    await expect(mainContent.first()).toBeVisible()

    if (!errorFound) {
      // App gracefully degraded - verify empty state or main UI is still functional
      const dashboardContent = page.locator(
        '[data-testid="dashboard-content"], .dashboard, main'
      )
      await expect(dashboardContent.first()).toBeVisible()
    }
  })
})
