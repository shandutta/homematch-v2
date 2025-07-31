/**
 * Comprehensive test for all Playwright fixtures
 * Validates the complete fixtures implementation works without circular dependencies
 */

import { test, expect } from '../fixtures'

test('Complete Fixtures - should authenticate user with all fixtures', async ({
  page,
  auth,
  utils,
  config,
  logger,
  retry,
}) => {
  logger.step('Starting comprehensive fixture test')

  // Test navigation with retry
  await retry.network(async () => {
    await page.goto('/')
    await utils.waitForReactToSettle()
  })

  // Test auth fixture
  logger.step('Testing authentication flow')
  await auth.login(config.users.user1)

  // Verify authentication
  await auth.verifyAuthenticated(config.users.user1)

  // Test logout
  logger.step('Testing logout flow')
  await auth.logout()

  // Verify not authenticated
  await auth.verifyNotAuthenticated()

  logger.step('All fixture tests completed successfully')
})

test('Complete Fixtures - should handle errors gracefully', async ({
  page,
  auth,
  utils,
  config,
  logger,
  retry,
}) => {
  logger.step('Testing error handling with retry')

  // Test element retry logic
  await utils.navigateWithRetry('/')

  // Test retry with auth
  await retry.auth(async () => {
    await page.goto('/login')
    await utils.waitForReactToSettle()
    await auth.fillLoginForm(config.users.user1)

    // Submit form
    const submitButton = page.locator('button[type="submit"]')
    await retry.element(async () => {
      await expect(submitButton).toBeEnabled({
        timeout: config.timeouts.BUTTON_ENABLED,
      })
    })

    await submitButton.click()

    // Wait for auth redirect
    await utils.waitForAuthRedirect(/.*\/validation/, {
      timeout: config.timeouts.AUTH_REDIRECT,
    })
  })

  logger.step('Error handling test completed')
})

test('Complete Fixtures - should work with form validation', async ({
  page,
  auth,
  utils,
  config,
  logger,
}) => {
  logger.step('Testing form validation flow')

  await page.goto('/login')
  await utils.waitForReactToSettle()

  // Get form elements
  const emailInput = page.locator('input[name="email"]')
  const passwordInput = page.locator('input[name="password"]')
  const submitButton = page.locator('button[type="submit"]')

  // Verify button starts disabled
  await expect(submitButton).toBeDisabled()

  // Fill form and wait for validation
  await emailInput.fill(config.users.user1.email)
  await passwordInput.fill(config.users.user1.password)
  await utils.waitForFormValidation()

  // Verify button becomes enabled
  await expect(submitButton).toBeEnabled({
    timeout: config.timeouts.BUTTON_ENABLED,
  })

  logger.step('Form validation test completed')
})
