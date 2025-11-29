/**
 * Landing Page E2E Tests - Authenticated Redirect Flow
 *
 * Note: Basic landing page tests (hero, footer, CTAs) are covered in smoke-min.spec.ts
 * This file focuses on authenticated user redirect behavior only.
 */

import { test, expect } from '../fixtures/index'

test.describe('Landing Page - Authenticated User Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Ensure we start with no authentication
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

  test('should redirect authenticated users to dashboard or validation page', async ({
    page,
  }) => {
    // Authenticate via login UI
    await page.goto('/login')

    const emailInput = page.getByLabel(/email/i)
    const passwordInput = page.getByLabel(/password/i)

    if ((await emailInput.count()) > 0) {
      await emailInput.first().fill('test1@example.com')
    }
    if ((await passwordInput.count()) > 0) {
      await passwordInput.first().fill('testpassword123')
    }

    // Submit login form
    const submitBtn = page.getByRole('button', { name: /log in|sign in/i })
    if ((await submitBtn.count()) > 0) {
      const btn = submitBtn.first()
      const enabled = await btn.isEnabled().catch(() => false)
      if (enabled) {
        await btn.click()
      } else {
        await page.evaluate(() => {
          const form = document.querySelector('form') as HTMLFormElement | null
          form?.requestSubmit?.()
        })
      }
    } else {
      await page.evaluate(() => {
        const form = document.querySelector('form') as HTMLFormElement | null
        form?.requestSubmit?.()
      })
    }

    await page.waitForLoadState('domcontentloaded')

    // Handle potential WebKit redirect bounce
    if (/\/login$/.test(page.url())) {
      const btn = page.getByRole('button', { name: /log in|sign in/i }).first()
      const enabled =
        (await btn.count()) > 0
          ? await btn.isEnabled().catch(() => false)
          : false
      if (enabled) {
        await btn.click()
      } else {
        await page.evaluate(() => {
          const form = document.querySelector('form') as HTMLFormElement | null
          form?.requestSubmit?.()
        })
      }
      await page.waitForLoadState('domcontentloaded')
    }

    // Authenticated users should be redirected to validation or dashboard
    await expect(page).toHaveURL(/\/(validation|dashboard)/, { timeout: 45000 })

    // Verify we're on a valid authenticated page
    await expect(page.getByText('HomeMatch')).toBeVisible()
  })
})
