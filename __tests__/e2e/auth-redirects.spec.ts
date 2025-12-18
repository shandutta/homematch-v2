/**
 * Auth redirect behavior E2E
 *
 * Ensures deep links behave like a polished consumer app:
 * - Unauthed users hitting protected routes are redirected to login with `redirectTo`
 * - After login, users are returned to the original destination
 * - Open-redirect attempts are ignored and fall back to /dashboard
 */

import { test, expect } from '@playwright/test'
import { createAuthHelper } from '../utils/auth-helper'
import { getWorkerTestUser } from '../fixtures/test-data'

test.describe('Auth redirects', () => {
  test.beforeEach(async ({ page }) => {
    await page.context().clearCookies()
    await page.addInitScript(() => {
      try {
        localStorage.clear()
        sessionStorage.clear()
      } catch {
        // ignore
      }
    })
  })

  test('preserves destination when redirecting to login', async ({
    page,
  }, testInfo) => {
    const testUser = getWorkerTestUser(testInfo.workerIndex)
    const auth = createAuthHelper(page)

    // Hit a protected route while logged out
    await page.goto('/couples', { waitUntil: 'domcontentloaded' })

    // Middleware should redirect to login and include the original destination
    await expect(page).toHaveURL(/\/login/)
    const redirectedUrl = new URL(page.url())
    expect(redirectedUrl.pathname).toBe('/login')
    expect(redirectedUrl.searchParams.get('redirectTo')).toBe('/couples')

    const { submitButton } = await auth.fillCredentials(
      testUser.email,
      testUser.password
    )

    await Promise.all([page.waitForURL('**/couples'), submitButton.click()])

    // Returned to original destination after login
    await expect(page).toHaveURL(/\/couples/)
    const couplesLoaded = page
      .getByRole('link', { name: /create household/i })
      .or(page.getByText(/your love story/i))
      .first()
    await expect(couplesLoaded).toBeVisible()
  })

  test('blocks open redirect attempts via redirectTo', async ({
    page,
  }, testInfo) => {
    const testUser = getWorkerTestUser(testInfo.workerIndex)
    const auth = createAuthHelper(page)

    await page.goto('/login?redirectTo=https://example.com', {
      waitUntil: 'domcontentloaded',
    })

    const { submitButton } = await auth.fillCredentials(
      testUser.email,
      testUser.password
    )

    await Promise.all([page.waitForURL('**/dashboard'), submitButton.click()])

    await expect(page).toHaveURL(/\/dashboard/)
    const finalUrl = new URL(page.url())
    const configuredBaseUrl =
      testInfo.project.use.baseURL || process.env.BASE_URL || page.url()
    expect(finalUrl.origin).toBe(new URL(configuredBaseUrl).origin)
    expect(finalUrl.pathname).toBe('/dashboard')
  })

  test('honors legacy `redirect` param for compatibility', async ({
    page,
  }, testInfo) => {
    const testUser = getWorkerTestUser(testInfo.workerIndex)
    const auth = createAuthHelper(page)

    await page.goto('/login?redirect=/couples', {
      waitUntil: 'domcontentloaded',
    })
    const { submitButton } = await auth.fillCredentials(
      testUser.email,
      testUser.password
    )
    await Promise.all([page.waitForURL('**/couples'), submitButton.click()])

    await expect(page).toHaveURL(/\/couples/)
  })
})
