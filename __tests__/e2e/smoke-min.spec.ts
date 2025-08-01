import { test, expect } from '@playwright/test'

test.describe('Smoke - Core Flows', () => {
  test('Landing page renders without major errors', async ({ page }) => {
    const consoleErrors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text())
    })

    await page.goto('/')

    // Be tolerant of title differences but ensure brand exists
    await expect(page.locator('header')).toBeVisible()
    // main may be role-based or omitted; check either role="main" or hero content
    const mainRegion = page.locator('main, [role="main"]')
    if (await mainRegion.count()) {
      await expect(mainRegion.first()).toBeVisible()
    } else {
      // fallback: assert hero headline exists
      await expect(page.locator('h1')).toContainText(/Swipe|Match|Move In/i)
    }
    await expect(page.locator('footer')).toBeVisible()

    // Tolerate hydration warnings, assert no hard console errors
    expect(consoleErrors.filter((e) => !/hydration|Hydration/.test(e))).toEqual(
      []
    )
  })

  test('Nav: hero CTA → signup, secondary CTA → login', async ({ page }) => {
    await page.goto('/')

    // Primary CTA (Get started / Sign up)
    const signupCta = page
      .getByRole('link', { name: /get started|sign ?up/i })
      .first()
    await expect(signupCta).toBeVisible()
    await signupCta.click()
    await expect(page).toHaveURL(/\/signup/)

    // Back then go to login via secondary CTA
    await page.goBack()
    const loginCta = page
      .getByRole('link', { name: /log ?in|sign ?in/i })
      .first()
    await expect(loginCta).toBeVisible()
    await loginCta.click()
    await expect(page).toHaveURL(/\/login/)
  })

  test('Basic auth page elements exist (no full auth flow)', async ({
    page,
  }) => {
    await page.goto('/login')

    // Be resilient to markup: check heading text or page title
    const heading = page.getByRole('heading', { name: /sign in|log in/i })
    if (await heading.count()) {
      await expect(heading.first()).toBeVisible()
    } else {
      // fallback to common login copy on the page or title
      await expect(page).toHaveTitle(/HomeMatch|Sign In|Login/i)
      await expect(page.locator('body')).toContainText(
        /sign in to your account|email|password/i
      )
    }

    // Email/password labels may vary; match common patterns
    await expect(
      page.locator('input[name="email"], input[type="email"]')
    ).toBeVisible()
    await expect(
      page.locator('input[name="password"], input[type="password"]')
    ).toBeVisible()
    await expect(
      page.getByRole('button', { name: /sign in|log in|continue/i }).first()
    ).toBeVisible()
  })

  test('Footer brand heading is visible (robust selector)', async ({
    page,
  }) => {
    await page.goto('/')
    const footer = page.locator('footer')
    await expect(footer).toBeVisible()

    // Avoid strict mode ambiguity from getByText by scoping to role=heading
    const brandHeading = footer
      .getByRole('heading', { name: /HomeMatch/i })
      .first()
    await expect(brandHeading).toBeVisible()
  })
})
