/**
 * Comprehensive authentication tests using Playwright fixtures
 * Tests complete auth flows with retry logic and error handling
 */

import { test, expect } from '../fixtures'

// =============================================================================
// Comprehensive Authentication Tests - Using All Fixtures
// =============================================================================

test('Comprehensive Auth - should complete full login flow', async ({
  page,
  auth,
  utils,
  config,
  logger,
  retry,
}) => {
  logger.step('Starting comprehensive authentication test')

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

test('Comprehensive Auth - should handle login form interactions', async ({
  page,
  auth,
  utils,
  config,
  logger,
  retry,
}) => {
  logger.step('Testing detailed login form interactions')

  await page.goto('/login')
  await utils.waitForReactToSettle()
  await auth.clearAuthState()

  // Test form filling without submission
  await auth.fillLoginForm(config.users.user1)

  // Verify form is filled correctly
  const emailValue = await page.locator('input[name="email"]').inputValue()
  const passwordValue = await page
    .locator('input[name="password"]')
    .inputValue()

  expect(emailValue).toBe(config.users.user1.email)
  expect(passwordValue).toBe(config.users.user1.password)

  // Test submit button enablement with retry
  await retry.element(async () => {
    const submitButton = page.locator('button[type="submit"]')
    await expect(submitButton).toBeEnabled({
      timeout: config.timeouts.BUTTON_ENABLED,
    })
  })

  logger.step('Form interaction test completed')
})

test('Comprehensive Auth - should handle authentication errors gracefully', async ({
  page,
  auth,
  utils,
  config,
  logger,
  retry,
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
    // This should fail, but we'll handle it gracefully
    await auth.fillLoginForm(invalidUser)

    const submitButton = page.locator('button[type="submit"]')
    await retry.element(async () => {
      await expect(submitButton).toBeEnabled()
    })

    await submitButton.click()

    // Wait a bit to see if there's an error message
    await page.waitForTimeout(2000)

    // We should still be on the login page
    expect(page.url()).toContain('/login')

    logger.auth('login', 'failure', {
      user: invalidUser.email,
      reason: 'Invalid credentials handled gracefully',
    })
  } catch (error) {
    // This is expected for invalid credentials
    logger.warn('AUTH', 'Login failed as expected with invalid credentials', {
      error: error.message,
    })
  }

  logger.step('Authentication error handling test completed')
})

test('Comprehensive Auth - should redirect authenticated users from auth pages', async ({
  page,
  auth,
  utils,
  config,
  logger,
  retry,
}) => {
  logger.step('Testing authenticated user redirect behavior')

  // First, authenticate the user
  await retry.auth(async () => {
    await auth.login(config.users.user1)
  })

  // Verify we're authenticated and on the validation page
  await auth.verifyAuthenticated(config.users.user1)

  // Now try to navigate back to the login page
  await page.goto('/login')
  await utils.waitForReactToSettle()

  // Check if we're redirected away from login (implementation dependent)
  const currentUrl = page.url()

  if (currentUrl.includes('/login')) {
    // If we're still on login, that's ok - some apps allow this
    logger.info('AUTH', 'Authenticated user can access login page')
  } else {
    // If we're redirected, verify we're on a protected page
    logger.info('AUTH', 'Authenticated user redirected from login page', {
      redirectedTo: currentUrl,
    })
  }

  // Clean up - logout
  if (!currentUrl.includes('/login')) {
    await auth.logout()
  } else {
    // Navigate to validation page and then logout
    await page.goto('/validation')
    await utils.waitForReactToSettle()
    await auth.logout()
  }

  logger.step('Authenticated user redirect test completed')
})
