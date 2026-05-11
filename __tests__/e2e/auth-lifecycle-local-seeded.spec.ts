/**
 * Local seeded auth lifecycle smoke.
 *
 * This is intentionally narrow and local-only. It assumes test users have been
 * seeded by scripts/setup-test-users-admin.js and must be run with
 * PLAYWRIGHT_WORKERS=1 to avoid browser/Supabase swarms while closing the
 * Phase 0/1 auth lifecycle gate.
 */

import { expect, test, type Page } from '@playwright/test'
import { createWorkerAuthHelper } from '../utils/auth-helper'
import { TEST_TIMEOUTS } from '../fixtures/test-data'

const LOCAL_ONLY_SUPABASE_URL =
  process.env.SUPABASE_LOCAL_PROXY_TARGET ||
  process.env.SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  'http://127.0.0.1:54200'

const PROTECTED_SMOKE_PATHS = [
  '/dashboard',
  '/couples',
  '/settings',
  '/profile',
]
const OPTIONAL_SEEDED_PROPERTY_ID = process.env.E2E_SEEDED_PROPERTY_ID

const isLocalUrl = (rawUrl: string) => {
  try {
    const hostname = new URL(rawUrl).hostname
    return (
      hostname === '127.0.0.1' ||
      hostname === 'localhost' ||
      hostname === 'supabase.local' ||
      hostname.startsWith('local-')
    )
  } catch {
    return false
  }
}

const clearAuthState = async (page: Page) => {
  await page.context().clearCookies()
  await page.goto('/', { waitUntil: 'domcontentloaded' }).catch(() => {})
  await page.evaluate(() => {
    try {
      localStorage.clear()
      sessionStorage.clear()
    } catch {
      // ignore storage access failures
    }
  })
  await page.context().clearCookies()
}

const expectLoginRedirect = async (page: Page, redirectTo: string) => {
  await expect(page).toHaveURL(/\/login/)
  const redirectedUrl = new URL(page.url())
  expect(redirectedUrl.pathname).toBe('/login')
  expect(redirectedUrl.searchParams.get('redirectTo')).toBe(redirectTo)
  await expect(page.getByTestId('login-form')).toBeVisible()
}

const expectAuthenticatedPage = async (page: Page, path: string) => {
  await expect(page, `${path} should not redirect back to login`).not.toHaveURL(
    /\/login/,
    { timeout: TEST_TIMEOUTS.navigation }
  )
  await expect(page.locator('main').first()).toBeVisible({
    timeout: TEST_TIMEOUTS.navigation,
  })
}

test.describe('local seeded auth lifecycle smoke', () => {
  test.describe.configure({ mode: 'serial' })

  test('login -> dashboard -> deep-link preservation -> protected smoke pages -> logout -> protected redirect', async ({
    page,
  }, testInfo) => {
    test.skip(
      process.env.E2E_RUN !== '1',
      'E2E_RUN=1 required — Tier 3 E2E specs skip by default. See p4-tdd-harness-design.md §2.2'
    )
    test.skip(
      !isLocalUrl(LOCAL_ONLY_SUPABASE_URL),
      `local seeded auth lifecycle smoke refuses non-local Supabase URL: ${LOCAL_ONLY_SUPABASE_URL}`
    )

    expect(process.env.PLAYWRIGHT_WORKERS).toBe('1')

    const { auth, testUser } = createWorkerAuthHelper(page, { workerIndex: 0 })

    await test.step('login lands on dashboard for seeded local worker user', async () => {
      await auth.login(testUser)
      await expect(page).toHaveURL(/\/dashboard/)
      await expectAuthenticatedPage(page, '/dashboard')
    })

    await test.step('anonymous protected deep-link preserves redirectTo and returns after login', async () => {
      await clearAuthState(page)

      await page.goto('/couples', { waitUntil: 'domcontentloaded' })
      await expectLoginRedirect(page, '/couples')

      const { submitButton } = await auth.fillCredentials(
        testUser.email,
        testUser.password
      )
      await Promise.all([
        page.waitForURL('**/couples', {
          timeout: TEST_TIMEOUTS.authentication,
        }),
        submitButton.click(),
      ])

      await expect(page).toHaveURL(/\/couples/)
      await expectAuthenticatedPage(page, '/couples')
    })

    await test.step('authenticated protected smoke pages render without login redirects', async () => {
      for (const path of PROTECTED_SMOKE_PATHS) {
        await page.goto(path, { waitUntil: 'domcontentloaded' })
        await expectAuthenticatedPage(page, path)
      }

      if (OPTIONAL_SEEDED_PROPERTY_ID) {
        const path = `/properties/${OPTIONAL_SEEDED_PROPERTY_ID}`
        await page.goto(path, { waitUntil: 'domcontentloaded' })
        await expectAuthenticatedPage(page, path)
      } else {
        testInfo.annotations.push({
          type: 'seeded-property-detail-skipped',
          description:
            'Set E2E_SEEDED_PROPERTY_ID to include /properties/:id in this smoke; setup-test-users-admin.js seeds dev-100014 but does not expose its UUID to Playwright.',
        })
      }
    })

    await test.step('logout clears session and protected page redirects again', async () => {
      await auth.logout()

      await page.goto('/dashboard', { waitUntil: 'domcontentloaded' })
      await expectLoginRedirect(page, '/dashboard')
    })
  })
})
