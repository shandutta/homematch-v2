/**
 * Properties route auth guard E2E
 *
 * Ensures /properties/:id remains a protected route and reliably redirects
 * unauthenticated users to /login with a safe redirectTo param.
 */

import { test, expect } from '@playwright/test'
import crypto from 'node:crypto'

test.describe('Properties route auth', () => {
  test('redirects unauthenticated users to login', async ({ page }) => {
    await page.context().clearCookies()
    await page.addInitScript(() => {
      try {
        localStorage.clear()
        sessionStorage.clear()
      } catch {
        // ignore
      }
    })

    const propertyId = crypto.randomUUID()
    await page.goto(`/properties/${propertyId}`, {
      waitUntil: 'domcontentloaded',
    })

    await expect(page).toHaveURL(
      new RegExp(`/login\\?redirectTo=%2Fproperties%2F${propertyId}`)
    )
    await expect(page.getByTestId('login-form')).toBeVisible()
  })
})
