import { expect, test, type Page, type Response } from '@playwright/test'

const publicPageRoutes = [
  { path: '/', name: 'landing' },
  { path: '/about', name: 'about' },
  { path: '/contact', name: 'contact' },
  { path: '/terms', name: 'terms' },
  { path: '/privacy', name: 'privacy' },
  { path: '/cookies', name: 'cookies' },
  { path: '/login', name: 'login auth support' },
  { path: '/signup', name: 'signup auth support' },
  // /reset-password, /verify-email, /auth/auth-code-error retired in
  // Phase 4 of the Supabase-auth elimination (2026-05-13) — Clerk owns
  // those flows on its hosted pages.
] as const

const anonymousProtectedRoutes = [
  '/dashboard',
  '/dashboard/liked',
  '/profile',
  '/settings',
  '/household/create',
  '/household/join',
  '/couples',
  '/couples/decisions',
  '/properties/synthetic-property-id',
  '/validation',
] as const

async function expectAccessibleDocumentShell(page: Page) {
  await expect(page.locator('html')).toHaveAttribute('lang', /\w+/)
  await expect(page.locator('body')).toBeVisible()
  await expect(page.locator('h1').first()).toBeVisible()
  await expect(page.locator('main, [role="main"]').first()).toBeVisible()

  const unlabeledControls = page.locator(
    'button:not([aria-label]):not([aria-labelledby]):not(:has-text("/\\S/")), input:not([aria-label]):not([aria-labelledby]):not([type="hidden"])'
  )
  await expect(unlabeledControls).toHaveCount(0)
}

async function expectOk(response: Response | null) {
  expect(response, 'route returned a Playwright response').toBeTruthy()
  expect(response!.status()).toBe(200)
}

test.describe('no-credential public accessibility smoke', () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  for (const route of publicPageRoutes) {
    test(`renders accessible public ${route.name} route without credentials`, async ({
      page,
    }) => {
      const consoleErrors: string[] = []
      page.on('console', (message) => {
        if (message.type() === 'error') consoleErrors.push(message.text())
      })

      const response = await page.goto(route.path)
      await expectOk(response)
      await expectAccessibleDocumentShell(page)
      expect(
        consoleErrors.filter((message) => !/hydration|Hydration/.test(message))
      ).toEqual([])
    })
  }

  test('supports cookie preferences keyboard focus, Escape, and return focus', async ({
    page,
  }) => {
    await page.goto('/')

    const manageSettings = page.getByRole('button', {
      name: /manage settings/i,
    })
    await expect(manageSettings).toBeVisible()
    await manageSettings.focus()
    await manageSettings.click()

    const settingsPanel = page.getByRole('group', { name: /cookie settings/i })
    await expect(settingsPanel).toBeVisible()
    await expect(settingsPanel).toBeFocused()

    await page.keyboard.press('Escape')

    await expect(settingsPanel).toBeHidden()
    await expect(manageSettings).toBeFocused()
  })

  test('keeps robots, sitemap, and missing-route surfaces safe for anonymous visitors', async ({
    page,
    request,
  }) => {
    const robots = await request.get('/robots.txt')
    expect(robots.status()).toBe(200)
    expect(await robots.text()).toContain('User-agent')

    const sitemap = await request.get('/sitemap.xml')
    expect(sitemap.status()).toBe(200)
    expect(await sitemap.text()).toContain('<urlset')

    const missing = await page.goto('/synthetic-missing-route-for-a11y-smoke')
    expect(missing?.status()).toBe(404)
    await expect(page.locator('body')).toBeVisible()
  })

  test('redirects anonymous protected pages to login without production sessions', async ({
    page,
  }) => {
    for (const route of anonymousProtectedRoutes) {
      const response = await page.goto(route, { waitUntil: 'domcontentloaded' })
      expect(response?.status()).toBeLessThan(400)
      await expect(page).toHaveURL(/\/login/)
      const redirectedUrl = new URL(page.url())
      expect(redirectedUrl.pathname).toBe('/login')
      if (redirectedUrl.searchParams.has('redirectTo')) {
        expect(redirectedUrl.searchParams.get('redirectTo')).toBe(route)
      }
    }
  })
})
