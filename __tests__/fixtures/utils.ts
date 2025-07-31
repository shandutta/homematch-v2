/**
 * Utils fixture for HomeMatch V2 E2E tests
 * Provides page utilities and common wait functions
 */

import { UtilsFixture } from '../types/fixtures'

// Storage keys for auth state
const STORAGE_KEYS = {
  SUPABASE_AUTH_TOKEN: 'supabase.auth.token',
  SUPABASE_AUTH_REFRESH_TOKEN: 'supabase.auth.refresh_token',
}

// Timeouts
const TEST_TIMEOUTS = {
  PAGE_LOAD: 30000,
  NAVIGATION: 15000,
  AUTH_REDIRECT: 10000,
  AUTH_LOGOUT: 5000,
  BUTTON_ENABLED: 5000,
  ELEMENT_VISIBLE: 5000,
  FORM_VALIDATION: 1000,
  NETWORK_IDLE: 5000,
}

// Export just the fixtures object, not a test object
export const utilsFixtures = {
  utils: async ({ page }, use) => {
    const utils: UtilsFixture = {
      async clearAuthState() {
        await page.context().clearCookies()

        // Clear localStorage
        const url = page.url()
        if (url && !url.includes('about:blank')) {
          await page.evaluate((storageKey) => {
            localStorage.removeItem(storageKey)
          }, STORAGE_KEYS.SUPABASE_AUTH_TOKEN)

          await page.evaluate((storageKey) => {
            localStorage.removeItem(storageKey)
          }, STORAGE_KEYS.SUPABASE_AUTH_REFRESH_TOKEN)
        }
      },

      async waitForReactToSettle() {
        // Wait for network to be idle
        await page.waitForLoadState('networkidle')

        // Give React time to render
        await page.waitForTimeout(500)

        // Wait for DOM to be ready
        await page.waitForLoadState('domcontentloaded')
      },

      async waitForFormValidation() {
        await page.waitForTimeout(TEST_TIMEOUTS.FORM_VALIDATION)
        await page.waitForLoadState('domcontentloaded')
      },

      async navigateWithRetry(url: string, options?: { retries?: number }) {
        const maxRetries = options?.retries ?? 3
        let lastError: Error | null = null

        for (let i = 0; i < maxRetries; i++) {
          try {
            await page.goto(url, {
              waitUntil: 'domcontentloaded',
              timeout: TEST_TIMEOUTS.PAGE_LOAD,
            })
            return // Success
          } catch (error) {
            lastError = error as Error

            if (i < maxRetries - 1) {
              // Wait before retry
              await page.waitForTimeout(1000)
            }
          }
        }

        throw lastError
      },

      async isAuthenticated() {
        const hasAuthToken = await page.evaluate((storageKey) => {
          return localStorage.getItem(storageKey) !== null
        }, STORAGE_KEYS.SUPABASE_AUTH_TOKEN)

        return hasAuthToken
      },

      async waitForAuthRedirect(
        expectedUrl: string | RegExp,
        options?: { timeout?: number; errorMessage?: string }
      ) {
        const {
          timeout = TEST_TIMEOUTS.AUTH_REDIRECT,
          errorMessage = 'Failed to redirect after authentication',
        } = options || {}

        try {
          await page.waitForURL(expectedUrl, { timeout })
        } catch {
          // Check for error alerts
          const destructiveAlert = page.locator('.alert-destructive').first()
          const isAlertVisible = await destructiveAlert.isVisible()

          if (isAlertVisible) {
            const alertText = await destructiveAlert.textContent()
            throw new Error(`${errorMessage}: ${alertText}`)
          }

          throw new Error(`${errorMessage}: URL did not match expected pattern`)
        }
      },
    }

    await use(utils)
  },
}

// expect is exported from index.ts
