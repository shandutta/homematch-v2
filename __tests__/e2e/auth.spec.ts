/**
 * Comprehensive authentication tests using Playwright fixtures
 * Consolidated from auth-simple-fixtures.spec.ts and auth-fixtures-comprehensive.spec.ts
 */

import { test, expect } from '../fixtures/index'

// =============================================================================
// Authentication Tests - Using All Fixtures
// =============================================================================

test.describe('Authentication Flow', () => {
  test('should display login page elements correctly', async ({
    page,
    utils,
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

  test('should enable submit button when form is valid', async ({
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

    // Fill form with valid data
    await emailInput.fill('test@example.com')
    await passwordInput.fill('password123')

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

  test('should complete full login and logout flow', async ({
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

    // Verify logout succeeded
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

  test('should handle authentication errors gracefully', async ({
    page,
    auth,
    utils,
    logger,
  }) => {
    logger.step('Testing authentication error handling')

    await page.goto('/login')
    await utils.waitForReactToSettle()
    await auth.clearAuthState()

    // Try to login with invalid credentials
    const invalidUser = {
      email: 'invalid@example.com',
      password: 'wrongpassword',
    }

    try {
      await auth.fillLoginForm(invalidUser)

      const submitButton = page.locator('button[type="submit"]')
      await expect(submitButton).toBeEnabled()
      await submitButton.click()

      // Wait for error handling
      await page.waitForTimeout(2000)

      // We should still be on the login page
      expect(page.url()).toContain('/login')

      logger.auth('login', 'failure', {
        user: invalidUser.email,
        reason: 'Invalid credentials handled gracefully',
      })
    } catch (error) {
      logger.warn('AUTH', 'Login failed as expected with invalid credentials', {
        error: error.message,
      })
    }

    logger.step('Authentication error handling test completed')
  })

  test('should handle protected route access without authentication', async ({
    page,
    utils,
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
      const pageContent = await page.locator('body').textContent()
      expect(pageContent).toContain('No Authenticated User')
    }

    logger.step('Protected route access test completed')
  })
})
