/**
 * TP0 — public-page smoke & redirect guard
 *
 * Public pages must return 200 and produce no console errors.
 * Protected pages must redirect unauthenticated visitors to /login.
 *
 * Runs against the local dev server (port 3000) without any auth setup.
 */

import { expect, test, type Page } from '@playwright/test'

const PUBLIC_ROUTES = [
  { path: '/', label: 'landing' },
  { path: '/login', label: 'login' },
  { path: '/signup', label: 'signup' },
  { path: '/cookies', label: 'cookies' },
  { path: '/privacy', label: 'privacy' },
  { path: '/terms', label: 'terms' },
] as const

const PROTECTED_ROUTES = [
  '/dashboard',
  '/profile',
  '/settings',
  '/household/create',
  '/couples',
] as const

test.use({ storageState: { cookies: [], origins: [] } })

function collectErrors(page: Page): string[] {
  const errors: string[] = []
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text())
  })
  return errors
}

test.describe('tp0: public pages', () => {
  for (const route of PUBLIC_ROUTES) {
    test(`${route.label} renders without errors`, async ({ page }) => {
      const errors = collectErrors(page)

      const response = await page.goto(route.path, {
        waitUntil: 'domcontentloaded',
      })

      expect(response?.status()).toBe(200)
      await expect(page.locator('body')).toBeVisible()

      // Ignore known-benign hydration mismatches from SSR
      const realErrors = errors.filter((e) => !/hydration|Hydration/.test(e))
      expect(realErrors, `console errors on ${route.path}`).toEqual([])
    })
  }
})

test.describe('tp0: protected-page redirects', () => {
  for (const route of PROTECTED_ROUTES) {
    test(`${route} redirects to /login`, async ({ page }) => {
      await page.goto(route, { waitUntil: 'domcontentloaded' })

      await expect(page).toHaveURL(/\/login/, { timeout: 10_000 })
      const url = new URL(page.url())
      expect(url.pathname).toBe('/login')
    })
  }
})
