/**
 * Authentication tests using Playwright fixtures
 * Migrated from auth-simple.spec.ts to use fixture-based architecture
 */

import { test, expect } from '../fixtures'

// =============================================================================
// Authentication Tests - Using Fixtures
// =============================================================================

test('Auth Fixtures - should show login page elements', async ({
  page,
  utils,
  config,
  logger,
}) => {
  logger.step('Testing login page elements display')

  await page.goto('/login')
  await utils.waitForReactToSettle()
  await utils.clearAuthState()

  // Check page title
  await expect(page).toHaveTitle(/HomeMatch/)

  // Check login form elements
  await expect(page.locator('h1')).toContainText('HomeMatch')
  await expect(page.locator('p').first()).toContainText(
    'Sign in to your account'
  )
  await expect(page.locator('input[name="email"]')).toBeVisible()
  await expect(page.locator('input[name="password"]')).toBeVisible()
  await expect(page.locator('button[type="submit"]')).toBeVisible()
  await expect(page.locator('button[type="submit"]')).toContainText('Sign In')

  // Check that button is initially disabled (no input)
  await expect(page.locator('button[type="submit"]')).toBeDisabled()

  logger.step('Login page elements test completed')
})

test('Auth Fixtures - should enable button when form is filled', async ({
  page,
  utils,
  config,
  logger,
}) => {
  logger.step('Testing form validation and button enablement')

  await page.goto('/login')
  await utils.waitForReactToSettle()
  await utils.clearAuthState()

  // Get form elements
  const emailInput = page.locator('input[name="email"]')
  const passwordInput = page.locator('input[name="password"]')
  const submitButton = page.locator('button[type="submit"]')

  // Verify button starts disabled
  await expect(submitButton).toBeDisabled()

  // Focus and type email with realistic typing
  await emailInput.focus()
  await page.keyboard.type('test@example.com', { delay: 50 })

  // Focus and type password
  await passwordInput.focus()
  await page.keyboard.type('password123', { delay: 50 })

  // Trigger blur event to ensure validation completes
  await page.keyboard.press('Tab')

  // Wait for form validation to complete
  await utils.waitForFormValidation()

  // Check that button is now enabled
  await expect(submitButton).toBeEnabled({
    timeout: config.timeouts.BUTTON_ENABLED,
  })

  logger.step('Form validation test completed')
})

test('Auth Fixtures - should handle protected route access without authentication', async ({
  page,
  utils,
  config,
  logger,
}) => {
  logger.step('Testing protected route access without authentication')

  // Try to access validation page without auth
  await page.goto('/validation', { waitUntil: 'networkidle' })
  await utils.waitForReactToSettle()
  await utils.clearAuthState()

  // Check the current URL - either we're redirected to login or we see an auth-related message
  const finalUrl = page.url()

  if (finalUrl.includes('/login')) {
    // If redirected to login, verify login page elements
    await expect(page.locator('h1')).toContainText('HomeMatch')
    await expect(page.locator('input[name="email"]')).toBeVisible()
    await expect(page.locator('input[name="password"]')).toBeVisible()
  } else {
    // If not redirected, the page should show we're not authenticated
    // The validation page shows "No Authenticated User" when not logged in
    const pageContent = await page.locator('body').textContent()
    expect(pageContent).toContain('No Authenticated User')
  }

  logger.step('Protected route access test completed')
})
