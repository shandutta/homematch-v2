/**
 * Final validation test for Playwright fixtures implementation
 * This test validates that all fixtures work correctly without circular dependencies
 */

import { test, expect } from '../fixtures'

// =============================================================================
// Fixtures Validation - Final Integration Test
// =============================================================================

test('Fixtures Validation - complete E2E flow with all fixtures', async ({
  page,
  auth,
  utils,
  config,
  logger,
  retry,
}) => {
  logger.step('🚀 Starting complete fixtures validation test')

  // Phase 1: Basic page operations
  logger.step('Phase 1: Testing basic page operations')
  await retry.network(async () => {
    await page.goto('/')
    await utils.waitForReactToSettle()
  })

  // Verify home page loads
  await expect(page).toHaveTitle(/HomeMatch/)
  await expect(page.locator('h1')).toContainText('HomeMatch')
  logger.info('PAGE', 'Home page loaded successfully')

  // Phase 2: Authentication flow
  logger.step('Phase 2: Testing complete authentication flow')

  // Clear any existing auth state
  await auth.clearAuthState()

  // Verify not authenticated
  const isAuthBefore = await utils.isAuthenticated()
  expect(isAuthBefore).toBe(false)
  logger.auth('initial_check', 'success', { authenticated: false })

  // Test login flow with retry protection
  await retry.auth(async () => {
    logger.step('Attempting login with test user')
    await auth.login(config.users.user1)
  })

  // Verify authentication succeeded
  await auth.verifyAuthenticated(config.users.user1)
  const isAuthAfter = await utils.isAuthenticated()
  expect(isAuthAfter).toBe(true)
  logger.auth('login', 'success', { user: config.users.user1.email })

  // Phase 3: Authenticated operations
  logger.step('Phase 3: Testing authenticated operations')

  // Navigate within authenticated context
  await retry.network(async () => {
    await utils.navigateWithRetry('/validation')
    await utils.waitForReactToSettle()
  })

  // Verify we're on the validation dashboard
  await expect(page.locator('h1')).toContainText(
    'HomeMatch V2 - Database Migration Validation'
  )
  await expect(
    page.locator(`text=${config.users.user1.email}`).first()
  ).toBeVisible()
  logger.info('NAVIGATION', 'Successfully navigated to validation dashboard')

  // Phase 4: Logout flow
  logger.step('Phase 4: Testing logout flow')

  await auth.logout()
  await auth.verifyNotAuthenticated()
  const isAuthLogout = await utils.isAuthenticated()
  expect(isAuthLogout).toBe(false)
  logger.auth('logout', 'success')

  // Phase 5: Protected route access without auth
  logger.step('Phase 5: Testing protected route access without authentication')

  await page.goto('/validation', { waitUntil: 'networkidle' })
  await utils.waitForReactToSettle()

  const finalUrl = page.url()
  if (finalUrl.includes('/login')) {
    logger.info('SECURITY', 'Protected route correctly redirected to login')
    await expect(page.locator('h1')).toContainText('HomeMatch')
  } else {
    logger.info('SECURITY', 'Protected route shows unauthenticated message')
    const pageContent = await page.locator('body').textContent()
    expect(pageContent).toContain('No Authenticated User')
  }

  // Final validation
  logger.step('✅ All fixture validation tests completed successfully')
  logger.info(
    'VALIDATION',
    'Complete E2E flow with fixtures working perfectly',
    {
      fixtures_used: ['auth', 'utils', 'config', 'logger', 'retry'],
      phases_completed: 5,
      circular_dependencies: 0,
    }
  )
})

test('Fixtures Validation - error handling and retry mechanisms', async ({
  page,
  retry,
  logger,
}) => {
  logger.step('🔧 Testing error handling and retry mechanisms')

  // Test network retry with intentional failure recovery
  let attemptCount = 0
  await retry.retry(
    async () => {
      attemptCount++
      if (attemptCount < 3) {
        throw new Error('Simulated network failure')
      }
      await page.goto('/')
      return 'success'
    },
    {
      maxAttempts: 3,
      delay: 100,
      onRetry: (error, attempt) => {
        logger.warn('RETRY', `Attempt ${attempt} failed: ${error.message}`)
      },
    }
  )

  expect(attemptCount).toBe(3)
  logger.info('RETRY', 'Retry mechanism working correctly', {
    attempts: attemptCount,
  })

  // Test element retry
  await retry.element(async () => {
    const h1 = page.locator('h1')
    await expect(h1).toBeVisible({ timeout: 1000 })
  })

  logger.step('✅ Error handling validation completed')
})

test('Fixtures Validation - TypeScript integration and type safety', async ({
  page,
  auth,
  utils,
  config,
  logger,
}) => {
  logger.step('🔍 Testing TypeScript integration and type safety')

  // Test config types
  expect(typeof config.timeouts.PAGE_LOAD).toBe('number')
  expect(typeof config.users.user1.email).toBe('string')
  expect(typeof config.users.user1.password).toBe('string')

  // Test method signatures work correctly
  await page.goto('/login')
  await utils.waitForReactToSettle()

  // This should compile without TypeScript errors
  await auth.fillLoginForm(config.users.user1)

  const isAuth: boolean = await utils.isAuthenticated()
  expect(typeof isAuth).toBe('boolean')

  // Test logger method types
  logger.step('Testing logger method signatures')
  logger.info('TEST', 'This is a test message', { data: 'test' })
  logger.warn('TEST', 'This is a warning', { level: 'warn' })

  const summary: string = logger.getSummary()
  expect(typeof summary).toBe('string')

  logger.step('✅ TypeScript integration validation completed')
})
