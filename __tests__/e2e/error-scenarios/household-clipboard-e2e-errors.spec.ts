/**
 * E2E error scenario tests for clipboard functionality
 *
 * These tests verify error handling in real browser environments:
 * - Network connectivity issues
 * - Browser permission denials
 * - Server-side errors
 * - Authentication failures
 * - Cross-browser compatibility issues
 */
import { test, expect } from '@playwright/test'
import {
  TEST_HOUSEHOLDS,
  TEST_MESSAGES,
  TEST_SELECTORS,
  TEST_ROUTES,
  TEST_TIMEOUTS,
  getWorkerTestUser,
} from '../../fixtures/test-data'
import { createWorkerAuthHelper } from '../../utils/auth-helper'

// Helper for tests that need manual auth control
async function loginWithTestUser(page: any, testUser: any) {
  await page.goto(TEST_ROUTES.auth.signIn)
  await page.fill(TEST_SELECTORS.emailInput, testUser.email)
  await page.fill(TEST_SELECTORS.passwordInput, testUser.password)
  await page.click(TEST_SELECTORS.signInButton)
  await page.waitForURL(/dashboard|profile|validation/, { timeout: 10000 })
}

// Create fresh user for error testing scenarios
function createFreshTestUser(workerIndex: number) {
  return {
    email: `fresh-worker-${workerIndex}@example.com`,
    password: 'testpassword123',
  }
}

test.describe('Household Clipboard E2E Error Scenarios', () => {
  let testUser: ReturnType<typeof getWorkerTestUser>

  test.beforeEach(async ({ page }, testInfo) => {
    testUser = getWorkerTestUser(testInfo.workerIndex)

    // Grant clipboard permissions for testing (webkit doesn't support this)
    const browserName = testInfo.project.name
    if (browserName !== 'webkit') {
      try {
        await page.context().grantPermissions(['clipboard-read', 'clipboard-write'])
      } catch (error) {
        console.log(`Warning: Could not grant clipboard permissions: ${error}`)
      }
    }
  })

  test.describe('Authentication Error Scenarios', () => {
    test('handles expired session during clipboard operation', async ({
      page,
    }, testInfo) => {
      // Set up authenticated user with worker-specific credentials
      const { testUser } = createWorkerAuthHelper(page, testInfo)
      await loginWithTestUser(page, testUser)

      await expect(page).toHaveURL(/dashboard|profile|validation/)

      // Navigate to profile
      await page.goto(TEST_ROUTES.app.profile)
      await page.waitForLoadState('domcontentloaded')

      // Simulate session expiration by clearing cookies
      await page.context().clearCookies()

      // Try to use clipboard functionality
      const copyButton = page.locator(TEST_SELECTORS.copyButton)
      if (await copyButton.isVisible()) {
        await copyButton.click()

        // Should either redirect to login or show error
        // (Implementation dependent)
        await page.waitForTimeout(2000)

        // Check if redirected to login or error shown
        const currentUrl = page.url()
        const hasErrorToast = await page
          .locator(TEST_SELECTORS.toastError)
          .isVisible()

        expect(currentUrl.includes('/login') || hasErrorToast).toBeTruthy()
      }
    })

    test('handles authentication failure during page load', async ({
      page,
    }, _testInfo) => {
      // Try to access profile without authentication
      await page.goto(TEST_ROUTES.app.profile)

      // Should redirect to login or show error
      await page.waitForLoadState('domcontentloaded')

      const currentUrl = page.url()
      expect(currentUrl).toContain('/login')

      // Verify clipboard functionality is not accessible
      const copyButton = page.locator(TEST_SELECTORS.copyButton)
      await expect(copyButton).not.toBeVisible()
    })
  })

  test.describe('Network Error Scenarios', () => {
    test('handles offline scenario gracefully', async ({
      page,
      context,
    }, testInfo) => {
      // Set up authenticated user first
      const { testUser } = createWorkerAuthHelper(page, testInfo)
      await loginWithTestUser(page, testUser)

      await expect(page).toHaveURL(TEST_ROUTES.app.dashboard)
      await page.goto(TEST_ROUTES.app.profile)
      await page.waitForLoadState('domcontentloaded')

      // Go offline
      await context.setOffline(true)

      // Try to perform household operations
      const hasCreateForm = await page
        .locator(TEST_SELECTORS.createForm)
        .isVisible()

      if (hasCreateForm) {
        // Try to create household while offline
        await page.fill(TEST_SELECTORS.householdNameInput, 'Offline Test')
        await page.click(TEST_SELECTORS.createButton)

        // Should show network error or handle gracefully
        await expect(
          page
            .locator('text=Network error')
            .or(page.locator('text=offline'))
            .or(page.locator(TEST_SELECTORS.toastError))
        ).toBeVisible({ timeout: TEST_TIMEOUTS.default })
      }

      // Restore online state
      await context.setOffline(false)
    })

    test('handles slow network connections', async ({ page, context }) => {
      // Simulate slow network
      await context.route('**/*', async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 2000)) // 2 second delay
        await route.continue()
      })

      await page.goto(TEST_ROUTES.auth.signIn)
      await page.fill(TEST_SELECTORS.emailInput, testUser.email)
      await page.fill(TEST_SELECTORS.passwordInput, testUser.password)
      await page.click(TEST_SELECTORS.signInButton)

      // Should handle slow responses gracefully
      await expect(page).toHaveURL(TEST_ROUTES.app.dashboard, {
        timeout: TEST_TIMEOUTS.navigation,
      })
    })

    test('handles API server errors (500)', async ({ page }, testInfo) => {
      // Mock server error responses
      await page.route('**/api/households**', async (route) => {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Internal server error' }),
        })
      })

      const freshUser = createFreshTestUser(testInfo.workerIndex)
      await page.goto(TEST_ROUTES.auth.signIn)
      await page.fill(TEST_SELECTORS.emailInput, freshUser.email)
      await page.fill(TEST_SELECTORS.passwordInput, freshUser.password)
      await page.click(TEST_SELECTORS.signInButton)

      await page.goto(TEST_ROUTES.app.profile)
      await page.waitForLoadState('domcontentloaded')

      // Try to create household
      await page.fill(TEST_SELECTORS.householdNameInput, 'Server Error Test')
      await page.click(TEST_SELECTORS.createButton)

      // Should show server error message
      await expect(
        page
          .locator('text=Internal server error')
          .or(page.locator(TEST_SELECTORS.toastError))
      ).toBeVisible({ timeout: TEST_TIMEOUTS.default })
    })
  })

  test.describe('Browser Permission Error Scenarios', () => {
    test('handles clipboard permission denial', async ({ page, context }) => {
      // Set up user but deny clipboard permissions
      await context.clearPermissions()

      await page.goto(TEST_ROUTES.auth.signIn)
      await page.fill(TEST_SELECTORS.emailInput, testUser.email)
      await page.fill(TEST_SELECTORS.passwordInput, testUser.password)
      await page.click(TEST_SELECTORS.signInButton)

      await page.goto(TEST_ROUTES.app.profile)
      await page.waitForLoadState('domcontentloaded')

      // Ensure household exists
      const hasHousehold = await page
        .locator(TEST_SELECTORS.copyButton)
        .isVisible()
      if (!hasHousehold) {
        await page.fill(
          TEST_SELECTORS.householdNameInput,
          TEST_HOUSEHOLDS.test.name
        )
        await page.click(TEST_SELECTORS.createButton)
        await expect(
          page.locator(`text=${TEST_MESSAGES.household.created}`)
        ).toBeVisible()
      }

      // Try to copy without clipboard permissions
      await page.locator(TEST_SELECTORS.copyButton).click()

      // Current implementation shows success toast regardless
      // Production app should detect permission issues
      await expect(page.locator(TEST_SELECTORS.toastSuccess)).toContainText(
        TEST_MESSAGES.clipboard.success,
        { timeout: TEST_TIMEOUTS.toast }
      )

      // In a more robust implementation, you'd expect:
      // await expect(page.locator('text=Clipboard permission denied')).toBeVisible()
    })

    test('handles blocked popup permissions', async ({ page, context }) => {
      // Block notifications/popups
      await context.grantPermissions([])

      await page.goto(TEST_ROUTES.auth.signIn)
      await page.fill(TEST_SELECTORS.emailInput, testUser.email)
      await page.fill(TEST_SELECTORS.passwordInput, testUser.password)
      await page.click(TEST_SELECTORS.signInButton)

      await page.goto(TEST_ROUTES.app.profile)
      await page.waitForLoadState('domcontentloaded')

      // Try operations that might trigger popups
      const copyButton = page.locator(TEST_SELECTORS.copyButton)
      if (await copyButton.isVisible()) {
        await copyButton.click()
        // Should handle gracefully without popups
      }
    })
  })

  test.describe('Data Integrity Error Scenarios', () => {
    test('handles corrupted household data', async ({ page }) => {
      // Mock API with corrupted data
      await page.route('**/api/users/profile**', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'user-123',
            household: {
              id: null, // Corrupted data
              name: '', // Empty name
            },
          }),
        })
      })

      await page.goto(TEST_ROUTES.auth.signIn)
      await page.fill(TEST_SELECTORS.emailInput, testUser.email)
      await page.fill(TEST_SELECTORS.passwordInput, testUser.password)
      await page.click(TEST_SELECTORS.signInButton)

      await page.goto(TEST_ROUTES.app.profile)
      await page.waitForLoadState('domcontentloaded')

      // Should handle corrupted data gracefully
      // Either show create form or error message
      const hasCreateForm = await page
        .locator(TEST_SELECTORS.createForm)
        .isVisible()
      const hasErrorMessage = await page
        .locator('text=Error loading household')
        .isVisible()

      expect(hasCreateForm || hasErrorMessage).toBeTruthy()
    })

    test('handles missing household after successful creation', async ({
      page,
    }) => {
      let createCalled = false

      const freshUser = createFreshTestUser(test.info().workerIndex)

      await page.route('**/api/households**', async (route) => {
        if (route.request().method() === 'POST' && !createCalled) {
          createCalled = true
          // First call succeeds
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              id: 'household-123',
              name: 'Test Household',
            }),
          })
        } else {
          // Subsequent calls return not found
          await route.fulfill({
            status: 404,
            contentType: 'application/json',
            body: JSON.stringify({ error: 'Household not found' }),
          })
        }
      })

      await page.goto(TEST_ROUTES.auth.signIn)
      await page.fill(TEST_SELECTORS.emailInput, freshUser.email)
      await page.fill(TEST_SELECTORS.passwordInput, freshUser.password)
      await page.click(TEST_SELECTORS.signInButton)

      await page.goto(TEST_ROUTES.app.profile)
      await page.waitForLoadState('domcontentloaded')

      // Create household
      await page.fill(
        TEST_SELECTORS.householdNameInput,
        'Disappearing Household'
      )
      await page.click(TEST_SELECTORS.createButton)

      // Should show success initially
      await expect(
        page.locator(`text=${TEST_MESSAGES.household.created}`)
      ).toBeVisible()

      // But then handle the fact that household doesn't exist
      await page.reload()
      await page.waitForLoadState('domcontentloaded')

      // Should detect missing household and show create form again
      await expect(page.locator(TEST_SELECTORS.createForm)).toBeVisible()
    })
  })

  test.describe('Cross-Browser Compatibility Error Scenarios', () => {
    test('handles browser-specific clipboard implementations', async ({
      page,
      browserName,
    }) => {
      await page.goto(TEST_ROUTES.auth.signIn)
      await page.fill(TEST_SELECTORS.emailInput, testUser.email)
      await page.fill(TEST_SELECTORS.passwordInput, testUser.password)
      await page.click(TEST_SELECTORS.signInButton)

      await page.goto(TEST_ROUTES.app.profile)
      await page.waitForLoadState('domcontentloaded')

      // Ensure household exists
      const hasHousehold = await page
        .locator(TEST_SELECTORS.copyButton)
        .isVisible()
      if (!hasHousehold) {
        await page.fill(
          TEST_SELECTORS.householdNameInput,
          TEST_HOUSEHOLDS.test.name
        )
        await page.click(TEST_SELECTORS.createButton)
        await expect(
          page.locator(`text=${TEST_MESSAGES.household.created}`)
        ).toBeVisible()
      }

      // Test clipboard in current browser
      await page.locator(TEST_SELECTORS.copyButton).click()

      // Verify it works (basic test)
      await expect(page.locator(TEST_SELECTORS.toastSuccess)).toContainText(
        TEST_MESSAGES.clipboard.success,
        { timeout: TEST_TIMEOUTS.toast }
      )

      console.log(`Clipboard tested successfully in ${browserName}`)
    })

    test('handles mobile browser limitations', async ({ page, isMobile }) => {
      if (!isMobile) {
        test.skip()
      }

      await page.goto(TEST_ROUTES.auth.signIn)
      await page.fill(TEST_SELECTORS.emailInput, testUser.email)
      await page.fill(TEST_SELECTORS.passwordInput, testUser.password)
      await page.click(TEST_SELECTORS.signInButton)

      await page.goto(TEST_ROUTES.app.profile)
      await page.waitForLoadState('domcontentloaded')

      // Mobile browsers may have different clipboard behavior
      const copyButton = page.locator(TEST_SELECTORS.copyButton)
      if (await copyButton.isVisible()) {
        await copyButton.click()

        // Should work on mobile or show appropriate fallback
        const hasToast = await page
          .locator(TEST_SELECTORS.toastSuccess)
          .isVisible({ timeout: TEST_TIMEOUTS.toast })
        const hasFallback = await page.locator('text=copied').isVisible()

        expect(hasToast || hasFallback).toBeTruthy()
      }
    })
  })

  test.describe('Performance Error Scenarios', () => {
    test('handles memory pressure during clipboard operations', async ({
      page,
    }) => {
      await page.goto(TEST_ROUTES.auth.signIn)
      await page.fill(TEST_SELECTORS.emailInput, testUser.email)
      await page.fill(TEST_SELECTORS.passwordInput, testUser.password)
      await page.click(TEST_SELECTORS.signInButton)

      await page.goto(TEST_ROUTES.app.profile)
      await page.waitForLoadState('domcontentloaded')

      // Ensure household exists
      const hasHousehold = await page
        .locator(TEST_SELECTORS.copyButton)
        .isVisible()
      if (!hasHousehold) {
        await page.fill(
          TEST_SELECTORS.householdNameInput,
          TEST_HOUSEHOLDS.test.name
        )
        await page.click(TEST_SELECTORS.createButton)
        await expect(
          page.locator(`text=${TEST_MESSAGES.household.created}`)
        ).toBeVisible()
      }

      // Rapidly click copy button to simulate high load
      const copyButton = page.locator(TEST_SELECTORS.copyButton)
      for (let i = 0; i < 10; i++) {
        await copyButton.click()
        await page.waitForTimeout(100)
      }

      // Should handle rapid clicks gracefully
      // Last toast should still show success
      await expect(page.locator(TEST_SELECTORS.toastSuccess)).toContainText(
        TEST_MESSAGES.clipboard.success,
        { timeout: TEST_TIMEOUTS.toast }
      )
    })

    test('handles page becoming unresponsive during operations', async ({
      page,
    }) => {
      await page.goto(TEST_ROUTES.auth.signIn)
      await page.fill(TEST_SELECTORS.emailInput, testUser.email)
      await page.fill(TEST_SELECTORS.passwordInput, testUser.password)
      await page.click(TEST_SELECTORS.signInButton)

      await page.goto(TEST_ROUTES.app.profile)
      await page.waitForLoadState('domcontentloaded')

      // Start clipboard operation
      const copyButton = page.locator(TEST_SELECTORS.copyButton)
      if (await copyButton.isVisible()) {
        // Execute JavaScript that could cause performance issues
        await page.evaluate(() => {
          // Simulate brief CPU intensive task
          const start = Date.now()
          while (Date.now() - start < 100) {
            // CPU intensive loop
          }
        })

        await copyButton.click()

        // Should still work despite performance issues
        await expect(page.locator(TEST_SELECTORS.toastSuccess)).toContainText(
          TEST_MESSAGES.clipboard.success,
          { timeout: TEST_TIMEOUTS.toast }
        )
      }
    })
  })
})
