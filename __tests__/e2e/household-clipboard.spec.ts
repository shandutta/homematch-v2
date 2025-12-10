/**
 * E2E tests for clipboard functionality in HouseholdSection component
 */
import { test, expect } from '@playwright/test'
import {
  TEST_HOUSEHOLDS,
  TEST_SELECTORS,
  TEST_ROUTES,
  TEST_USERS,
  TEST_TIMEOUTS,
} from '../fixtures/test-data'
import { createWorkerAuthHelper } from '../utils/auth-helper'

// Browser-specific clipboard helpers
async function grantClipboardPermissions(context: any, browserName: string) {
  if (browserName === 'webkit') {
    // WebKit doesn't support clipboard-write permission via automation
    return
  }
  try {
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  } catch (error) {
    console.log(`Warning: Could not grant clipboard permissions: ${error}`)
  }
}

async function readClipboard(
  page: any,
  browserName: string
): Promise<string | null> {
  if (browserName === 'webkit') {
    return null
  }
  try {
    return await page.evaluate(() => navigator.clipboard.readText())
  } catch (_error) {
    return null
  }
}

test.describe('Household Clipboard Functionality', () => {
  // Shared auth helper for the suite
  let auth: any
  let testUser: any

  test.describe('User with Household', () => {
    test.beforeEach(async ({ page, context, browserName }, testInfo) => {
      await grantClipboardPermissions(context, browserName)

      const helper = createWorkerAuthHelper(page, testInfo)
      auth = helper.auth
      testUser = helper.testUser

      await auth.authenticateWithStorageState(testInfo.workerIndex, testUser)
      await auth.verifyAuthenticated()

      // Ensure user is on profile page
      await page.goto(TEST_ROUTES.app.profile)
      await page.waitForLoadState('domcontentloaded')

      // Switch to the Household tab so the controls are visible
      const householdTab = page.getByRole('tab', { name: /household/i })
      if (await householdTab.isVisible()) {
        await householdTab.click()
        await page.waitForTimeout(200)
      }

      // Ensure household exists
      const copyButton = page.locator(TEST_SELECTORS.copyButton)
      if (!(await copyButton.isVisible())) {
        const createInput = page.locator(TEST_SELECTORS.householdNameInput)
        if (await createInput.isVisible()) {
          await createInput.fill(TEST_HOUSEHOLDS.test.name)
          await page.locator(TEST_SELECTORS.createButton).click()
          await expect(page.locator(TEST_SELECTORS.copyButton)).toBeVisible({
            timeout: TEST_TIMEOUTS.api,
          })
        }
      }
    })

    test('can copy household code to clipboard', async ({
      page,
      browserName,
    }) => {
      // 1. Get the displayed household ID
      const householdIdElement = page.locator(TEST_SELECTORS.householdId)
      await expect(householdIdElement).toBeVisible()
      const householdIdText = await householdIdElement.textContent()
      const cleanId = householdIdText?.trim() || ''
      expect(cleanId.length).toBeGreaterThan(0)

      // 2. Click copy
      const copyButton = page.locator(TEST_SELECTORS.copyButton)
      await copyButton.click()

      // 3. Verify Success Toast
      // Note: The selector might need adjustment if toast implementation varies
      const toast = page.locator(TEST_SELECTORS.toastSuccess).first()
      // Or fallback to text search if test-id is missing in some toast variants
      const successIndicator = toast.or(page.locator('text=/copied/i').first())
      await expect(successIndicator).toBeVisible()

      // 4. Verify Clipboard Content (Skip on WebKit)
      if (browserName !== 'webkit') {
        const clipboardContent = await readClipboard(page, browserName)
        expect(clipboardContent).toBe(cleanId)
      }
    })

    test('handles clipboard permissions gracefully', async ({
      page,
      context,
      browserName,
    }) => {
      if (browserName === 'webkit') return // Skip WebKit for permissions

      // Clear permissions to simulate "prompt" or "denied" state if possible
      // But typically we just want to ensure it doesn't crash
      await context.clearPermissions()

      await page.reload()
      const copyButton = page.locator(TEST_SELECTORS.copyButton)
      await expect(copyButton).toBeVisible()
      await copyButton.click()

      // We mainly verify the app doesn't crash.
      // Depending on browser behavior, it might show a prompt or fail silently.
      // If the app handles it well, the button remains visible.
      await expect(copyButton).toBeVisible()
    })

    test('clipboard content persists after navigation', async ({
      page,
      browserName,
    }) => {
      if (browserName === 'webkit') return

      const householdIdElement = page.locator(TEST_SELECTORS.householdId)
      const cleanId = (await householdIdElement.textContent())?.trim()

      await page.locator(TEST_SELECTORS.copyButton).click()

      // Navigate away
      await page.goto(TEST_ROUTES.app.dashboard)
      await page.waitForLoadState('domcontentloaded')

      // Navigate back
      await page.goto(TEST_ROUTES.app.profile)
      await page.waitForLoadState('domcontentloaded')

      const clipboardContent = await readClipboard(page, browserName)
      expect(clipboardContent).toBe(cleanId)
    })
  })

  test.describe('User without Household', () => {
    test('copy button is hidden', async ({ page }, testInfo) => {
      // Use a fresh user specifically for this test
      // We manually log in to ensure we have the "fresh" user state
      const freshUser = TEST_USERS.freshUser
      const helper = createWorkerAuthHelper(page, testInfo)

      // Login with fresh user (who has no household)
      // We don't use the shared worker auth here because we need a specific user state
      await helper.auth.login(freshUser)

      await page.goto(TEST_ROUTES.app.profile)
      await page.waitForLoadState('domcontentloaded')

      const householdTab = page.getByRole('tab', { name: /household/i })
      if (await householdTab.isVisible()) {
        await householdTab.click()
        await page.waitForTimeout(200)
      }

      // Verify create form exists
      await expect(
        page.locator(TEST_SELECTORS.householdNameInput)
      ).toBeVisible()

      // Verify copy button does NOT exist
      await expect(page.locator(TEST_SELECTORS.copyButton)).not.toBeVisible()
    })
  })
})
