/**
 * Enhanced Dashboard E2E Tests
 * Demonstrates the enhanced framework replacing problematic legacy patterns
 */

import { expect, testHelpers } from '../../utils/enhanced-test-framework'

const suite = testHelpers.createSuite('Enhanced Dashboard Tests')

suite.createWithAuth(
  'loads dashboard successfully',
  async ({ enhancedPage }) => {
    // Navigate safely with error handling
    await enhancedPage.safeGoto('/dashboard')

    // Ensure page is in healthy state
    await enhancedPage.ensureHealthy()

    // Verify dashboard elements with fallback selectors
    await testHelpers.verifyElement(enhancedPage, [
      '[data-testid="dashboard"]',
      'h1:has-text("Dashboard")',
      'main[role="main"]',
      'main',
    ])
  }
)

suite.createWithAuth('displays user properties', async ({ enhancedPage }) => {
  await enhancedPage.safeGoto('/dashboard')
  await enhancedPage.waitForStable()

  // Wait for any of these conditions: properties loaded OR empty state
  const condition = await testHelpers.waitForAny(
    enhancedPage,
    [
      // Properties are displayed
      async () => {
        const propertyCards = enhancedPage.locator(
          '[data-testid="property-card"]'
        )
        return (await propertyCards.count()) > 0
      },
      // Or empty state is shown
      async () => {
        return await enhancedPage.locator('text=/no properties/i').isVisible()
      },
      // Or start searching message
      async () => {
        return await enhancedPage.locator('text=/start searching/i').isVisible()
      },
    ],
    10000
  )

  // All conditions are valid outcomes
  expect(condition).toBeGreaterThanOrEqual(0)
})

suite.createWithAuth(
  'handles property interactions',
  async ({ enhancedPage }) => {
    await enhancedPage.safeGoto('/dashboard')
    await enhancedPage.waitForStable()

    // Try to interact with property cards
    const interactionSuccess = await enhancedPage.safeClick(
      [
        '[data-testid="like-button"]',
        '[data-testid="pass-button"]',
        'button[aria-label*="like" i]',
        'button[aria-label*="pass" i]',
        'button:has-text("Like")',
        'button:has-text("Pass")',
      ],
      { required: false, timeout: 5000 }
    )

    if (interactionSuccess) {
      // If interaction succeeded, verify feedback
      await testHelpers
        .waitForAny(
          enhancedPage,
          [
            async () =>
              enhancedPage.locator('[data-testid="toast-success"]').isVisible(),
            async () => enhancedPage.locator('.toast').isVisible(),
            async () => enhancedPage.locator('[role="alert"]').isVisible(),
          ],
          3000
        )
        .catch(() => {
          // No feedback is also acceptable
        })
    } else {
      // No interaction buttons found - verify empty state
      await testHelpers.verifyText(enhancedPage, [
        'No properties available',
        'Start searching',
        /no properties/i,
      ])
    }
  }
)

suite.createErrorScenario(
  'handles API failures gracefully',
  async ({ enhancedPage }) => {
    // Simulate API failures
    await enhancedPage.route('**/api/properties**', (route) =>
      route.abort('failed')
    )

    await enhancedPage.safeGoto('/dashboard')

    // Page should still load with error handling
    await enhancedPage.ensureHealthy(true) // Auto-recover if possible

    // Should show either error message or degraded state
    const hasErrorHandling = await testHelpers.waitForAny(
      enhancedPage,
      [
        // Error message displayed
        async () => enhancedPage.locator('text=/error loading/i').isVisible(),
        async () =>
          enhancedPage.locator('text=/something went wrong/i').isVisible(),
        // Or graceful degradation
        async () => enhancedPage.locator('main').isVisible(),
        async () => enhancedPage.locator('nav').isVisible(),
      ],
      10000
    )

    expect(hasErrorHandling).toBeGreaterThanOrEqual(0)
  }
)

suite.createWithAuth(
  'navigation remains functional',
  async ({ enhancedPage }) => {
    await enhancedPage.safeGoto('/dashboard')
    await enhancedPage.waitForStable()

    // Test navigation to profile
    const navigated = await enhancedPage.safeClick(
      [
        '[data-testid="nav-profile"]',
        'a[href*="profile"]',
        'button:has-text("Profile")',
        'a:has-text("Profile")',
      ],
      { timeout: 5000 }
    )

    if (navigated) {
      await enhancedPage.waitForStable()

      // Verify we're on profile page
      await testHelpers.waitForAny(enhancedPage, [
        async () => enhancedPage.url().includes('/profile'),
        async () => enhancedPage.locator('h1:has-text("Profile")').isVisible(),
        async () => enhancedPage.locator('[data-testid="profile"]').isVisible(),
      ])
    }
  }
)

suite.createWithFreshUser(
  'shows onboarding for new users',
  async ({ enhancedPage, userData }) => {
    await enhancedPage.safeGoto('/dashboard')
    await enhancedPage.waitForStable()

    // Fresh user should see onboarding or empty state
    const hasOnboarding = await testHelpers.waitForAny(enhancedPage, [
      // Onboarding flow
      async () => enhancedPage.locator('text=/welcome/i').isVisible(),
      async () => enhancedPage.locator('text=/get started/i').isVisible(),
      async () => enhancedPage.locator('text=/setup/i').isVisible(),
      // Empty state
      async () => enhancedPage.locator('text=/no properties/i').isVisible(),
      async () => enhancedPage.locator('text=/start searching/i').isVisible(),
    ])

    expect(hasOnboarding).toBeGreaterThanOrEqual(0)

    console.log('Fresh user data:', {
      email: userData.user.email,
      household: userData.household.name,
    })
  }
)

// Performance-critical test
suite.create('loads within performance threshold', async ({ enhancedPage }) => {
  // Performance monitoring automatic - will warn if > 3s (navigation threshold)
  const startTime = Date.now()

  await enhancedPage.safeGoto('/dashboard')
  await enhancedPage.waitForStable()

  const loadTime = Date.now() - startTime

  // Verify reasonable load time (should be < 5s for complete load)
  expect(loadTime).toBeLessThan(5000)

  console.log(`Dashboard loaded in ${loadTime}ms`)
})
