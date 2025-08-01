/**
 * Landing Page E2E Tests
 * Tests the HomeMatch landing page navigation flows and interactive components
 */

import { test, expect } from '../fixtures/index'

test.describe('Landing Page Navigation', () => {
  test.beforeEach(async ({ page: _page, utils }) => {
    // Ensure we start with no authentication
    await utils.clearAuthState()
  })

  test('should display landing page elements correctly', async ({
    page,
    utils,
    logger,
  }) => {
    logger.step('Testing landing page elements display')

    await page.goto('/')
    await utils.waitForReactToSettle()

    // Check page title and meta
    await expect(page).toHaveTitle(/HomeMatch - Swipe\. Match\. Move In\./)

    // Check header elements
    await expect(page.locator('header nav')).toBeVisible()
    await expect(page.locator('header').getByText('HomeMatch')).toBeVisible()
    await expect(page.locator('header').getByText('Log In')).toBeVisible()
    await expect(page.locator('header').getByText('Sign Up')).toBeVisible()

    // Check hero section
    await expect(page.locator('h1').getByText('Swipe.')).toBeVisible()
    await expect(page.locator('h1').getByText('Match.')).toBeVisible()
    await expect(page.locator('h1').getByText('Move In.')).toBeVisible()

    // Check hero description
    await expect(
      page.getByText('House hunting just became your favorite couples activity')
    ).toBeVisible()

    // Check main CTAs
    await expect(
      page.getByRole('link', { name: 'Start Swiping Free' })
    ).toBeVisible()
    await expect(
      page.getByRole('link', { name: 'Already a Member?' })
    ).toBeVisible()

    // Check phone mockup
    await expect(
      page.locator('.relative.mx-auto.w-full.max-w-sm')
    ).toBeVisible()

    logger.step('Landing page elements test completed')
  })

  test('should navigate to signup from hero CTA', async ({
    page,
    utils,
    logger,
  }) => {
    logger.step('Testing hero CTA navigation to signup')

    await page.goto('/')
    await utils.waitForReactToSettle()

    // Click the main signup CTA
    await page.getByRole('link', { name: 'Start Swiping Free' }).click()

    // Should navigate to signup page
    await expect(page).toHaveURL('/signup')

    // Verify we're on the signup page
    await expect(page).toHaveTitle(/Sign Up/)
    await expect(page.getByText('Create your account')).toBeVisible()

    logger.step('Hero CTA navigation test completed')
  })

  test('should navigate to login from hero secondary CTA', async ({
    page,
    utils,
    logger,
  }) => {
    logger.step('Testing hero secondary CTA navigation to login')

    await page.goto('/')
    await utils.waitForReactToSettle()

    // Click the secondary login CTA
    await page.getByRole('link', { name: 'Already a Member?' }).click()

    // Should navigate to login page
    await expect(page).toHaveURL('/login')

    // Verify we're on the login page
    await expect(page).toHaveTitle(/Sign In/)
    await expect(page.getByText('Sign in to your account')).toBeVisible()

    logger.step('Hero secondary CTA navigation test completed')
  })

  test('should navigate to signup from header', async ({
    page,
    utils,
    logger,
  }) => {
    logger.step('Testing header signup navigation')

    await page.goto('/')
    await utils.waitForReactToSettle()

    // Click the header signup link
    await page.locator('header').getByText('Sign Up').click()

    // Should navigate to signup page
    await expect(page).toHaveURL('/signup')
    await expect(page.getByText('Create your account')).toBeVisible()

    logger.step('Header signup navigation test completed')
  })

  test('should navigate to login from header', async ({
    page,
    utils,
    logger,
  }) => {
    logger.step('Testing header login navigation')

    await page.goto('/')
    await utils.waitForReactToSettle()

    // Click the header login link
    await page.locator('header').getByText('Log In').click()

    // Should navigate to login page
    await expect(page).toHaveURL('/login')
    await expect(page.getByText('Sign in to your account')).toBeVisible()

    logger.step('Header login navigation test completed')
  })

  test('should navigate to signup from footer', async ({
    page,
    utils,
    logger,
  }) => {
    logger.step('Testing footer signup navigation')

    await page.goto('/')
    await utils.waitForReactToSettle()

    // Scroll to footer
    await page.locator('footer').scrollIntoViewIfNeeded()

    // Click the footer signup link
    await page.locator('footer').getByText('Get Started').click()

    // Should navigate to signup page
    await expect(page).toHaveURL('/signup')
    await expect(page.getByText('Create your account')).toBeVisible()

    logger.step('Footer signup navigation test completed')
  })

  test('should redirect authenticated users to validation page', async ({
    page,
    utils,
    auth,
    config,
    logger,
  }) => {
    logger.step('Testing authenticated user redirect')

    // First authenticate a user
    await page.goto('/login')
    await utils.waitForReactToSettle()
    await auth.login(config.testUser.email, config.testUser.password)

    // Now try to visit the landing page
    await page.goto('/')

    // Should be redirected to validation page
    await expect(page).toHaveURL('/validation')
    await expect(page.getByText('HomeMatch')).toBeVisible()

    logger.step('Authenticated user redirect test completed')
  })
})

test.describe('Landing Page Interactive Elements', () => {
  test.beforeEach(async ({ page, utils }) => {
    await utils.clearAuthState()
    await page.goto('/')
    await utils.waitForReactToSettle()
  })

  test('should display feature grid correctly', async ({ page, logger }) => {
    logger.step('Testing feature grid display')

    // Check feature grid section
    await expect(page.getByText('House Hunting, But Make It')).toBeVisible()
    await expect(page.getByText('Actually Fun')).toBeVisible()

    // Check all 4 features
    await expect(page.getByText('AI That Gets You Both')).toBeVisible()
    await expect(
      page.getByText('Swipe Together, Decide Together')
    ).toBeVisible()
    await expect(page.getByText('Match on What Matters')).toBeVisible()
    await expect(
      page.getByText('Talk Like Humans, Search Like Pros')
    ).toBeVisible()

    logger.step('Feature grid test completed')
  })

  test('should display swipe demo correctly', async ({ page, logger }) => {
    logger.step('Testing swipe demo display')

    // Scroll to swipe demo section
    await page
      .getByText('Try It Out—Swipe Through Homes')
      .scrollIntoViewIfNeeded()

    // Check swipe demo section
    await expect(page.getByText('Try It Out—Swipe Through Homes')).toBeVisible()
    await expect(page.getByText('Go ahead, give it a swipe')).toBeVisible()

    // Check swipe instructions
    await expect(page.getByText('Nah')).toBeVisible()
    await expect(page.getByText('Love it')).toBeVisible()

    // Check property card elements
    await expect(page.getByText('742 Evergreen Terrace')).toBeVisible()
    await expect(page.getByText('$1,250,000')).toBeVisible()
    await expect(page.getByText('4 beds')).toBeVisible()

    // Check action buttons
    await expect(page.getByRole('button', { name: 'Pass' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Love' })).toBeVisible()

    logger.step('Swipe demo test completed')
  })

  test('should handle swipe demo interactions', async ({ page, logger }) => {
    logger.step('Testing swipe demo interactions')

    // Scroll to swipe demo section
    await page
      .getByText('Try It Out—Swipe Through Homes')
      .scrollIntoViewIfNeeded()

    // Get initial property address (not used, kept for future assertions)
    const _initialProperty = await page
      .getByText('742 Evergreen Terrace')
      .textContent()

    // Click the "Love" button
    await page.getByRole('button', { name: 'Love' }).click()

    // Wait for animation and check if property changed
    await page.waitForTimeout(500)

    // Should show next property
    await expect(page.getByText('1428 Elm Street')).toBeVisible()

    // Click "Pass" button
    await page.getByRole('button', { name: 'Pass' }).click()
    await page.waitForTimeout(500)

    // Should show third property
    await expect(page.getByText('90210 Beverly Hills')).toBeVisible()

    logger.step('Swipe demo interactions test completed')
  })

  test('should display footer correctly', async ({ page, logger }) => {
    logger.step('Testing footer display')

    // Scroll to footer
    await page.locator('footer').scrollIntoViewIfNeeded()

    // Check footer branding
    await expect(page.locator('footer').getByText('HomeMatch')).toBeVisible()
    await expect(
      page.locator('footer').getByText('Swipe. Match. Move In.')
    ).toBeVisible()

    // Check footer links
    await expect(page.locator('footer').getByText('Get Started')).toBeVisible()
    await expect(page.locator('footer').getByText('Sign In')).toBeVisible()
    await expect(
      page.locator('footer').getByText('Privacy Policy')
    ).toBeVisible()
    await expect(
      page.locator('footer').getByText('Terms of Service')
    ).toBeVisible()

    // Check footer tagline
    await expect(page.locator('footer').getByText('Built with')).toBeVisible()
    await expect(
      page.locator('footer').getByText('in the Bay Area')
    ).toBeVisible()

    logger.step('Footer test completed')
  })

  test('should be responsive on mobile viewport', async ({ page, logger }) => {
    logger.step('Testing mobile responsiveness')

    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })
    await page.reload()

    // Check that main elements are still visible and properly sized
    await expect(page.locator('h1').getByText('Swipe.')).toBeVisible()
    await expect(
      page.getByRole('link', { name: 'Start Swiping Free' })
    ).toBeVisible()

    // Check that phone mockup is visible on mobile
    await expect(
      page.locator('.relative.mx-auto.w-full.max-w-sm')
    ).toBeVisible()

    // Check that feature grid stacks properly
    await page.getByText('AI That Gets You Both').scrollIntoViewIfNeeded()
    await expect(page.getByText('AI That Gets You Both')).toBeVisible()

    // Check footer stacks properly
    await page.locator('footer').scrollIntoViewIfNeeded()
    await expect(page.locator('footer').getByText('HomeMatch')).toBeVisible()

    logger.step('Mobile responsiveness test completed')
  })
})
