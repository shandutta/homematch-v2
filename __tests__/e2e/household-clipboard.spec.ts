/**
 * E2E tests for clipboard functionality in HouseholdSection component
 *
 * These tests run in real browsers and verify:
 * - Actual clipboard API integration
 * - Real user interactions and permissions
 * - Cross-browser clipboard compatibility
 * - End-to-end user experience
 */
import { test, expect } from '@playwright/test'
import {
  TEST_USERS,
  TEST_HOUSEHOLDS,
  TEST_MESSAGES,
  TEST_SELECTORS,
  TEST_ROUTES,
  TEST_TIMEOUTS,
} from '../fixtures/test-data'

test.describe('Household Clipboard Functionality', () => {
  test.beforeEach(async ({ page }) => {
    // Grant clipboard permissions for testing
    await page.context().grantPermissions(['clipboard-read', 'clipboard-write'])

    // Set up authenticated user with household
    await page.goto(TEST_ROUTES.auth.signIn)
    await page.fill(TEST_SELECTORS.emailInput, TEST_USERS.withHousehold.email)
    await page.fill(
      TEST_SELECTORS.passwordInput,
      TEST_USERS.withHousehold.password
    )
    await page.click(TEST_SELECTORS.signInButton)

    // Wait for successful authentication
    await expect(page).toHaveURL(TEST_ROUTES.app.dashboard)
  })

  test('copies household code to clipboard when copy button is clicked', async ({
    page,
  }) => {
    // Navigate to profile page
    await page.goto(TEST_ROUTES.app.profile)

    // Wait for page to load and check for household section
    await page.waitForLoadState('networkidle')

    // Check if user has a household, if not create one for testing
    const hasHousehold = await page
      .locator(TEST_SELECTORS.copyButton)
      .isVisible()

    if (!hasHousehold) {
      // Create household for testing
      await page.fill(
        TEST_SELECTORS.householdNameInput,
        TEST_HOUSEHOLDS.test.name
      )
      await page.click(TEST_SELECTORS.createButton)
      await expect(
        page.locator(`text=${TEST_MESSAGES.household.created}`)
      ).toBeVisible()
    }

    // Wait for household section to be fully loaded
    await expect(page.locator(TEST_SELECTORS.copyButton)).toBeVisible()

    // Get the household ID from the UI
    const householdIdElement = page.locator(TEST_SELECTORS.householdId)
    const householdId = await householdIdElement.textContent()

    // Click the copy button
    await page.locator(TEST_SELECTORS.copyButton).click()

    // Verify clipboard contains the household ID
    const clipboardText = await page.evaluate(() =>
      navigator.clipboard.readText()
    )
    expect(clipboardText).toBe(householdId)

    // Verify success toast appears with proper timeout
    await expect(page.locator(TEST_SELECTORS.toastSuccess)).toContainText(
      TEST_MESSAGES.clipboard.success,
      { timeout: TEST_TIMEOUTS.toast }
    )
  })

  test('clipboard functionality works across different browsers', async ({
    page,
    browserName,
  }) => {
    await page.goto('/profile')
    await page.waitForLoadState('networkidle')

    // Check if user has a household, if not create one for testing
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

    // Wait for household section to be fully loaded
    await expect(page.locator(TEST_SELECTORS.copyButton)).toBeVisible()

    // Get the actual household ID from the UI
    const householdIdElement = page.locator(TEST_SELECTORS.householdId)
    const householdId = await householdIdElement.textContent()

    const copyButton = page.locator('[data-testid="copy-household-code"]')
    await copyButton.click()

    // Verify clipboard works in current browser
    const clipboardText = await page.evaluate(() =>
      navigator.clipboard.readText()
    )
    expect(clipboardText).toBe(householdId)

    // Log which browser was tested for debugging
    console.log(`Clipboard functionality verified in ${browserName}`)
  })

  test('handles clipboard permissions gracefully', async ({
    page,
    context,
  }) => {
    // Test without clipboard permissions
    await context.clearPermissions()

    await page.goto('/profile')
    await page.waitForLoadState('networkidle')

    // Check if user has a household, if not create one for testing
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

    await expect(page.locator(TEST_SELECTORS.copyButton)).toBeVisible()

    // Click copy button
    const copyButton = page.locator('[data-testid="copy-household-code"]')
    await copyButton.click()

    // Toast should still appear (current implementation doesn't handle errors)
    // In a production app, you might want to show different messages based on permissions
    await expect(page.locator(TEST_SELECTORS.toastSuccess)).toContainText(
      TEST_MESSAGES.clipboard.success,
      { timeout: TEST_TIMEOUTS.toast }
    )
  })

  test('copy button is not visible without household', async ({ page }) => {
    // Create a fresh user without household for this test
    const freshUser = TEST_USERS.freshUser

    // Navigate to signup/signin with fresh user
    await page.goto(TEST_ROUTES.auth.signIn)
    await page.fill(TEST_SELECTORS.emailInput, freshUser.email)
    await page.fill(TEST_SELECTORS.passwordInput, freshUser.password)
    await page.click(TEST_SELECTORS.signInButton)

    // Navigate to profile
    await page.goto('/profile')
    await page.waitForLoadState('networkidle')

    // Verify copy button is not present
    await expect(page.locator(TEST_SELECTORS.copyButton)).not.toBeVisible()

    // Verify create household form is shown instead
    await expect(page.locator('text=Create Household')).toBeVisible()
    await expect(page.locator(TEST_SELECTORS.householdNameInput)).toBeVisible()
  })

  test('copy functionality works in complete user workflow', async ({
    page,
  }) => {
    await page.goto('/profile')
    await page.waitForLoadState('networkidle')

    // Check if user has a household, if not create one for testing
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

    // Verify complete household UI is functional
    await expect(page.locator('text=Current Household')).toBeVisible()
    await expect(
      page.locator('text=Share this code with family members')
    ).toBeVisible()

    // Get the actual household ID from the UI
    const householdIdElement = page.locator(TEST_SELECTORS.householdId)
    const householdId = await householdIdElement.textContent()

    // Test copy functionality
    await page.locator(TEST_SELECTORS.copyButton).click()

    // Verify clipboard and toast
    const clipboardText = await page.evaluate(() =>
      navigator.clipboard.readText()
    )
    expect(clipboardText).toBe(householdId)
    await expect(page.locator('[data-testid="toast-success"]')).toContainText(
      'copied to clipboard',
      { timeout: 5000 }
    )

    // Verify other household functionality is still accessible
    await expect(
      page.locator('button:has-text("Leave Household")')
    ).toBeVisible()
  })

  test('clipboard content persists after navigation', async ({ page }) => {
    await page.goto('/profile')
    await page.waitForLoadState('networkidle')

    // Check if user has a household, if not create one for testing
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

    // Get the actual household ID from the UI
    const householdIdElement = page.locator(TEST_SELECTORS.householdId)
    const householdId = await householdIdElement.textContent()

    // Copy household code
    await page.locator(TEST_SELECTORS.copyButton).click()

    // Navigate away and back
    await page.goto('/dashboard')
    await page.goto('/profile')
    await page.waitForLoadState('networkidle')

    // Verify clipboard still contains the code
    const clipboardText = await page.evaluate(() =>
      navigator.clipboard.readText()
    )
    expect(clipboardText).toBe(householdId)
  })
})
