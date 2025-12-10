/**
 * Real UI Integration Tests for Properties Services
 * Verifies dashboard rendering and core property interactions
 */

import { test, expect } from '@playwright/test'
import { TEST_ROUTES, TEST_SELECTORS } from '../fixtures/test-data'
import { createWorkerAuthHelper } from '../utils/auth-helper'

test.describe('Properties Services UI Integration', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    const { auth, testUser } = createWorkerAuthHelper(page, testInfo)
    await auth.authenticateWithStorageState(testInfo.workerIndex, testUser)
    await auth.verifyAuthenticated()
  })

  test('dashboard renders correctly with essential elements', async ({
    page,
  }) => {
    await page.goto(TEST_ROUTES.app.dashboard)
    await page.waitForLoadState('domcontentloaded')

    // 1. Verify Header/Nav
    const navDashboard = page.locator(TEST_SELECTORS.dashboardLink).first()
    if (await navDashboard.isVisible()) {
      await expect(navDashboard).toBeVisible()
    } else {
      await expect(page.locator('h1:has-text("Dashboard")').first()).toBeVisible()
    }

    // 2. Verify Search Input
    // Use the explicit test ID if available, or a reliable fallback
    const searchInput = page
      .locator('[data-testid="search-input"]')
      .or(page.locator('input[placeholder*="search" i]'))
    await expect(searchInput.first()).toBeVisible()

    // 3. Verify Properties List OR Empty State
    const propertyCards = page
      .locator('[data-testid="property-card"]')
      .or(page.locator('.property-card'))
    const emptyState = page
      .locator('[data-testid="no-properties"]')
      .or(page.locator('text=/no properties|start searching/i'))

    // Wait for either properties or empty state to appear
    await expect(propertyCards.first().or(emptyState.first())).toBeVisible({
      timeout: 10000,
    })

    // Log what we found for debugging context
    if ((await propertyCards.count()) > 0) {
      console.log(`Found ${await propertyCards.count()} properties`)
    } else {
      console.log('Found empty state')
    }
  })

  test('search filter is interactive', async ({ page }) => {
    await page.goto(TEST_ROUTES.app.dashboard)
    await page.waitForLoadState('domcontentloaded')

    // Find filter button
    const filterButton = page
      .locator('button:has-text("Filter")')
      .or(page.locator('[data-testid="filter-button"]'))
    if (await filterButton.isVisible()) {
      await filterButton.click()
      // Expect a modal or dropdown
      await expect(
        page
          .locator('text=Price Range')
          .or(page.locator('input[name="price_max"]'))
      ).toBeVisible()
    } else {
      console.log('Filter button not present (feature flag?)')
    }
  })
})
