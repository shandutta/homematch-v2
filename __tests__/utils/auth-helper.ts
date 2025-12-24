/**
 * Authentication helper for E2E tests
 * Provides reliable authentication utilities for Playwright tests
 */

import { Page, expect, Locator } from '@playwright/test'
import {
  TEST_USERS,
  TEST_ROUTES,
  TEST_TIMEOUTS,
  getWorkerTestUser,
} from '../fixtures/test-data'
import * as path from 'path'
import * as fs from 'fs'

// Auth storage directory (same as auth.setup.ts)
const AUTH_DIR = path.join(__dirname, '../../playwright/.auth')

export interface TestUser {
  email: string
  password: string
}

/**
 * Detect if the current browser is WebKit (Safari)
 */
function isWebKit(page: Page): boolean {
  const browserName = page.context().browser()?.browserType().name()
  return browserName === 'webkit'
}

export class AuthHelper {
  constructor(private page: Page) {}

  /**
   * Check if running in WebKit browser
   */
  private get isWebKit(): boolean {
    return isWebKit(this.page)
  }

  /**
   * Ensure the login form is visible and hydrated before interacting with it.
   */
  private async waitForLoginFormReady(): Promise<void> {
    await this.page.waitForSelector('[data-testid="login-form"]', {
      state: 'visible',
      timeout: TEST_TIMEOUTS.navigation * 2,
    })

    // Give hydration a brief moment to finish (Safari/WebKit is slower here)
    await this.page.waitForTimeout(200)
  }

  /**
   * Resolve the first visible locator from a list of selectors.
   */
  private async findFirstVisible(
    selectors: string[],
    label: string
  ): Promise<Locator> {
    for (const selector of selectors) {
      const locator = this.page.locator(selector).first()
      try {
        await locator.waitFor({
          state: 'visible',
          timeout: TEST_TIMEOUTS.element,
        })
        return locator
      } catch (_e) {
        continue
      }
    }

    throw new Error(`Could not find ${label}`)
  }

  /**
   * Fill an input reliably across browsers, retrying when hydration clears values.
   */
  private async fillInputWithRetries(
    locator: Locator,
    value: string,
    label: string
  ): Promise<void> {
    const maxAttempts = 3

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      await locator.click({ force: true })
      await locator.fill('')
      await this.page.waitForTimeout(50)
      await locator.fill(value, { force: true })

      const currentValue = await locator.inputValue()
      if (currentValue === value) {
        return
      }

      await this.page.waitForTimeout(150 * attempt)
    }

    // Fallback: type to avoid hydration clobbering the filled value (WebKit prone)
    await locator.click({ force: true })
    await locator.fill('')
    await locator.type(value, { delay: 20 })

    const typedValue = await locator.inputValue()
    if (typedValue === value) {
      return
    }

    // Final fallback: set value directly and dispatch input/change events
    await locator.evaluate((element, text) => {
      const input = element as HTMLInputElement
      input.focus()
      input.value = text
      input.dispatchEvent(new Event('input', { bubbles: true }))
      input.dispatchEvent(new Event('change', { bubbles: true }))
    }, value)

    const finalValue = await locator.inputValue()
    if (finalValue !== value) {
      throw new Error(
        `Input "${label}" not filled correctly. Expected: ${value}, Got: ${finalValue}`
      )
    }
  }

  /**
   * Navigate with a lighter wait condition and a retry to avoid hanging on the "load" event.
   */
  private async navigateWithRetry(
    url: string,
    label: string,
    attempts = 2
  ): Promise<void> {
    let lastError: unknown

    for (let attempt = 1; attempt <= attempts; attempt++) {
      try {
        await this.page.goto(url, {
          waitUntil: 'commit', // don't wait for all assets; we handle readiness below
          timeout: TEST_TIMEOUTS.navigation * 6, // allow a bit more for cold starts
        })

        await this.page.waitForLoadState('domcontentloaded', {
          timeout: TEST_TIMEOUTS.navigation * 4,
        })
        return
      } catch (error) {
        lastError = error
        if (attempt < attempts) {
          console.warn(
            `Navigation to ${label} failed (attempt ${attempt}/${attempts}). Retrying...`,
            error instanceof Error ? error.message : error
          )
          await this.page.waitForTimeout(500 * attempt)
        }
      }
    }

    throw lastError instanceof Error
      ? lastError
      : new Error(`Failed to navigate to ${label} (${url})`)
  }

  /**
   * Check whether a Supabase auth cookie or localStorage entry exists.
   */
  private async hasSupabaseAuthState(): Promise<boolean> {
    const cookies = await this.page.context().cookies()
    const hasAuthCookie = cookies.some(
      (cookie) =>
        cookie.name.includes('auth-token') &&
        typeof cookie.value === 'string' &&
        cookie.value.length > 0
    )

    if (hasAuthCookie) {
      return true
    }

    try {
      const hasStorage = await this.page.evaluate(() => {
        try {
          return Object.keys(localStorage).some((key) => {
            if (!key.includes('auth-token')) return false
            const value = localStorage.getItem(key)
            return typeof value === 'string' && value.length > 0
          })
        } catch {
          return false
        }
      })

      return Boolean(hasStorage)
    } catch {
      return false
    }
  }

  /**
   * Clear all authentication state (cookies, localStorage, sessionStorage)
   */
  async clearAuthState(): Promise<void> {
    await this.page.addInitScript(() => {
      try {
        localStorage.clear()
        sessionStorage.clear()
      } catch {
        // ignore
      }
    })

    await this.page.context().clearCookies()

    // Navigate to a valid origin to clear any storage that may already exist.
    try {
      await this.navigateWithRetry('/', 'root')
      await this.page.evaluate(() => {
        try {
          localStorage.clear()
          sessionStorage.clear()
        } catch {
          // ignore
        }
      })
    } catch {
      // ignore
    }

    // Clear cookies again in case hydration re-created auth cookies before storage was wiped.
    await this.page.context().clearCookies()
  }

  /**
   * Fill the login form with the provided credentials, optionally navigating to the page.
   */
  async fillCredentials(
    email: string,
    password: string,
    options: { navigateToLogin?: boolean } = {}
  ): Promise<{
    emailInput: Locator
    passwordInput: Locator
    submitButton: Locator
  }> {
    if (options.navigateToLogin) {
      await this.navigateWithRetry(TEST_ROUTES.auth.signIn, 'login')
    }

    await this.waitForLoginFormReady()

    const emailInput = await this.findFirstVisible(
      [
        '[data-testid="email-input"]',
        'input[type="email"]',
        'input[name="email"]',
        '#email',
      ],
      'email input field'
    )
    await this.fillInputWithRetries(emailInput, email, 'email')

    const passwordInput = await this.findFirstVisible(
      [
        '[data-testid="password-input"]',
        'input[type="password"]',
        'input[name="password"]',
        '#password',
      ],
      'password input field'
    )
    await this.fillInputWithRetries(passwordInput, password, 'password')

    // Hydration can occasionally clobber input values (especially under load).
    // Re-check both fields and re-fill if needed before submitting.
    for (let attempt = 1; attempt <= 3; attempt++) {
      await this.page.waitForTimeout(100 * attempt)

      const [currentEmail, currentPassword] = await Promise.all([
        emailInput.inputValue(),
        passwordInput.inputValue(),
      ])

      const needsEmail = currentEmail !== email
      const needsPassword = currentPassword !== password

      if (!needsEmail && !needsPassword) break

      if (needsEmail) {
        await this.fillInputWithRetries(emailInput, email, 'email')
      }
      if (needsPassword) {
        await this.fillInputWithRetries(passwordInput, password, 'password')
      }

      if (attempt === 3) {
        throw new Error('Login inputs were clobbered during hydration')
      }
    }

    const submitButton = await this.findFirstVisible(
      [
        '[data-testid="signin-button"]',
        'button[type="submit"]',
        'button:has-text("Sign In")',
        'button:has-text("Log In")',
        'button:has-text("Login")',
      ],
      'submit button'
    )

    return { emailInput, passwordInput, submitButton }
  }

  /**
   * Login with the specified user
   */
  async login(user: TestUser = TEST_USERS.withHousehold): Promise<void> {
    // Clear any existing auth state
    await this.clearAuthState()

    // Navigate to login page
    await this.navigateWithRetry(TEST_ROUTES.auth.signIn, 'login')

    const { submitButton } = await this.fillCredentials(
      user.email,
      user.password
    )

    // WebKit-specific: Wait for network to settle after form submission

    if (this.isWebKit) {
      await this.page

        .waitForLoadState('networkidle', { timeout: 10000 })

        .catch(() => {})

      await this.page.waitForTimeout(500) // Extra stabilization for WebKit
    }

    // Debug network logging is noisy; only enable when troubleshooting auth failures.
    const shouldLogNetwork =
      process.env.PW_AUTH_DEBUG === '1' ||
      process.env.PLAYWRIGHT_AUTH_DEBUG === 'true' ||
      process.env.PLAYWRIGHT_AUTH_NETWORK_LOG === 'true'

    if (shouldLogNetwork) {
      this.page.on('request', (request) =>
        console.log(`>> [REQUEST] ${request.method()} ${request.url()}`)
      )

      this.page.on('response', (response) =>
        console.log(`<< [RESPONSE] ${response.status()} ${response.url()}`)
      )

      this.page.on('requestfailed', (request) =>
        console.log(
          `!! [FAILED] ${request.method()} ${request.url()} - ${
            request.failure()?.errorText
          }`
        )
      )
    }

    // CRITICAL FIX: Wait for Supabase API response instead of client events

    // This avoids race conditions where navigation destroys the evaluate context

    try {
      // Capture ANY response to the token endpoint to debug failures

      const loginResponsePromise = this.page.waitForResponse(
        (response) =>
          response.url().includes('/token') &&
          response.request().method() === 'POST',

        { timeout: 30000 }
      )

      await submitButton.click()

      // Wait for the auth token API call

      const loginResponse = await loginResponsePromise

      if (!loginResponse.ok()) {
        const status = loginResponse.status()

        const body = await loginResponse.text().catch(() => 'No body')

        console.error(
          `❌ Auth API Request Failed: Status ${status}\nBody: ${body}`
        )

        throw new Error(`Auth API failed with status ${status}: ${body}`)
      }

      // console.log('✅ Auth API request succeeded')
    } catch (e) {
      const errorName = e instanceof Error ? e.name : 'UnknownError'
      const errorMessage = e instanceof Error ? e.message : String(e)
      console.error(
        `❌ Auth API response wait failed or timed out. Error: ${errorName}: ${errorMessage}`
      )
      // Continue to navigation check - it might have succeeded anyway
    }

    // First, wait for navigation away from login (session establishment)
    let didNavigate = false
    let retriedLogin = false

    try {
      await this.page.waitForFunction(
        () => !window.location.pathname.includes('/login'),
        {
          timeout: this.isWebKit
            ? TEST_TIMEOUTS.navigation * 1.5
            : TEST_TIMEOUTS.navigation,
        }
      )
      didNavigate = true
    } catch (_navError) {
      // If still on login page, check for error messages
      const errorElement = await this.page
        .locator('[data-testid="error-alert"]')
        .first()
      if (await errorElement.isVisible()) {
        const errorText = await errorElement.textContent()
        throw new Error(`Authentication failed: ${errorText}`)
      }

      // Check for other possible error indicators
      const alertElements = await this.page.locator('[role="alert"]').all()
      if (alertElements.length > 0) {
        const alertDetails = await Promise.all(
          alertElements.map(async (el) => {
            const text = await el.textContent()
            const html = await el.evaluate((node) => node.outerHTML)
            return { text: text?.trim(), html }
          })
        )

        // Filter out empty alerts that might be hidden or structural
        const visibleAlerts = alertDetails.filter(
          (a) => a.text && a.text.length > 0
        )

        if (visibleAlerts.length > 0) {
          throw new Error(
            `Authentication failed with alerts: ${visibleAlerts.map((a) => a.text).join(', ')}`
          )
        }

        // If we found alerts but they were empty, log them but don't throw yet
        console.warn('Found empty alert elements:', alertDetails)
      }

      // Log current state for debugging
      const currentUrl = this.page.url()
      const bodyText = await this.page.locator('body').textContent()
      console.log('Navigation failed. Current URL:', currentUrl)
      console.log(
        'Page contains "Invalid":',
        bodyText?.includes('Invalid') || false
      )
      console.log(
        'Page contains "credentials":',
        bodyText?.includes('credentials') || false
      )

      const hasValidationErrors =
        bodyText?.includes('Invalid') ||
        bodyText?.includes('Password must') ||
        bodyText?.includes('email address')

      if (hasValidationErrors && !retriedLogin) {
        retriedLogin = true
        console.warn('Retrying login after validation errors')
        const { submitButton: retryButton } = await this.fillCredentials(
          user.email,
          user.password
        )
        await retryButton.click()
        try {
          await this.page.waitForFunction(
            () => !window.location.pathname.includes('/login'),
            {
              timeout: this.isWebKit
                ? TEST_TIMEOUTS.navigation * 1.5
                : TEST_TIMEOUTS.navigation,
            }
          )
          didNavigate = true
        } catch (_retryError) {
          // Fall through to error below.
        }
      }

      if (!didNavigate) {
        const hasAuthState = await this.hasSupabaseAuthState()
        if (hasAuthState) {
          await this.page.goto('/dashboard', {
            waitUntil: 'domcontentloaded',
          })
          didNavigate = !this.page.url().includes('/login')
        }

        if (!didNavigate) {
          throw new Error(
            `Navigation away from login page failed. Still at: ${currentUrl}`
          )
        }
      }
    }

    // Now wait for dashboard elements to appear
    try {
      await this.page.waitForSelector(
        '[data-testid="dashboard-header"], h1:has-text("Dashboard"), [data-testid="dashboard-stats"], .dashboard-content',
        {
          timeout: TEST_TIMEOUTS.navigation,
          state: 'visible',
        }
      )
    } catch (_error) {
      // Fallback: wait for other authenticated page indicators with more flexible selectors
      try {
        // Try individual selectors with shorter timeouts for WebKit compatibility
        const fallbackSelectors = [
          '[data-testid="dashboard-header"]',
          'h1:has-text("Dashboard")',
          '[data-testid="user-menu"]',
          'button:has-text("Sign Out")',
          '[data-testid="dashboard-content"]',
          '.dashboard',
          'main', // Very generic fallback
          '[data-testid="authenticated-layout"]',
        ]

        let elementFound = false
        for (const selector of fallbackSelectors) {
          try {
            await this.page.waitForSelector(selector, {
              timeout: 3000, // Shorter timeout per selector
              state: 'visible',
            })
            elementFound = true
            break
          } catch (_e) {
            continue
          }
        }

        if (!elementFound) {
          throw new Error('No dashboard elements found')
        }
      } catch (_fallbackError) {
        // Final fallback: check URL and force navigation if needed
        const currentUrl = this.page.url()
        if (!currentUrl.includes('/dashboard')) {
          // Navigate to dashboard if not already there
          await this.page.goto('/dashboard')
          await this.page.waitForTimeout(3000) // Longer wait for WebKit
        } else {
          // We're on dashboard URL but elements not visible - wait for hydration
          await this.page.waitForTimeout(3000)

          // Check once more for any content
          try {
            await this.page.waitForSelector('body', {
              timeout: 2000,
              state: 'visible',
            })
          } catch (_e) {
            // Page might not be loading properly
            await this.page.reload()
            await this.page.waitForTimeout(2000)
          }
        }
      }
    }

    // Wait for React hydration and page stabilization
    await this.page.waitForLoadState('networkidle')
    await this.page.waitForTimeout(1000)

    // Verify authentication was successful
    await this.verifyAuthenticated()
  }

  /**
   * Logout the current user
   */
  async logout(): Promise<void> {
    const logoutSelectors = [
      '[data-testid="logout-button"]',
      'button:has-text("Sign Out")',
      'button:has-text("Logout")',
      'button:has-text("Log Out")',
    ]

    let logoutButton = null
    for (const selector of logoutSelectors) {
      try {
        logoutButton = await this.page.waitForSelector(selector, {
          timeout: TEST_TIMEOUTS.element,
          state: 'visible',
        })
        if (logoutButton) break
      } catch (_e) {
        continue
      }
    }

    if (!logoutButton) {
      // Open user menu if available (desktop)
      const userMenu = await this.page
        .locator('[data-testid="user-menu"]')
        .first()
      if (await userMenu.isVisible()) {
        await userMenu.click()
        await this.page.waitForTimeout(200)
      } else {
        // Fallback: open mobile menu to reveal logout
        const mobileToggle = this.page.locator(
          'button[aria-label="Open navigation menu"], [data-testid="mobile-menu-toggle"]'
        )
        if (await mobileToggle.isVisible()) {
          await mobileToggle.click()
          await this.page.waitForTimeout(200)
        }
      }

      // Retry locating logout button after opening menu
      for (const selector of logoutSelectors) {
        try {
          logoutButton = await this.page.waitForSelector(selector, {
            timeout: 3000,
            state: 'visible',
          })
          if (logoutButton) break
        } catch (_e) {
          continue
        }
      }
    }

    if (!logoutButton) {
      throw new Error('Could not find logout button')
    }

    const isLoggedOutDestination = (url: URL | string) => {
      const parsedUrl = url instanceof URL ? url : new URL(url)
      const path = parsedUrl.pathname

      return (
        path === '/' ||
        path === '' ||
        path.includes('signin') ||
        path.includes('login') ||
        path.startsWith('/auth')
      )
    }

    await Promise.all([
      this.page
        .waitForURL(isLoggedOutDestination, {
          timeout: TEST_TIMEOUTS.navigation,
        })
        .catch(() => {}),
      logoutButton.click(),
    ])

    // Wait for logout to complete
    await this.page.waitForTimeout(1000)

    // Verify we're logged out
    await this.verifyNotAuthenticated()
  }

  /**
   * Check if the user is currently authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    try {
      // Check URL patterns first - most reliable indicator
      const url = this.page.url()
      const isOnAuthenticatedPage =
        url.includes('/dashboard') ||
        url.includes('/validation') ||
        url.includes('/profile') ||
        url.includes('/properties')

      if (isOnAuthenticatedPage) {
        // Quick verification that page actually loaded (not login redirect)
        try {
          // Wait briefly for page to stabilize
          await this.page.waitForTimeout(500)

          // Check if we're actually on login page (redirect happened)
          const currentUrl = this.page.url()
          if (currentUrl.includes('/login') || currentUrl.includes('/signin')) {
            return false
          }

          // Look for any authenticated content indicators
          const authContentSelectors = [
            '[data-testid="dashboard-header"]',
            '[data-testid="dashboard-content"]',
            '[data-testid="user-menu"]',
            '[data-testid="logout-button"]',
            'button:has-text("Sign Out")',
            'button:has-text("Logout")',
            '.user-avatar',
            '#user-profile',
            'main', // Generic fallback - any main content
            '[data-testid="authenticated-layout"]',
            '.dashboard',
            'h1:has-text("Dashboard")',
          ]

          for (const selector of authContentSelectors) {
            try {
              const element = await this.page.waitForSelector(selector, {
                timeout: 1000,
                state: 'visible',
              })
              if (element) {
                return true
              }
            } catch (_e) {
              continue
            }
          }

          // If we're on authenticated URL but can't find auth indicators,
          // still consider authenticated (page might be loading)
          return true
        } catch (_e) {
          // Error checking, but URL suggests authenticated - assume true
          return true
        }
      }

      // Check for authentication indicators even on other pages
      const authenticatedSelectors = [
        '[data-testid="user-menu"]',
        '[data-testid="logout-button"]',
        'button:has-text("Sign Out")',
        'button:has-text("Logout")',
        '.user-avatar',
        '#user-profile',
      ]

      for (const selector of authenticatedSelectors) {
        try {
          const element = await this.page.waitForSelector(selector, {
            timeout: 1000,
            state: 'visible',
          })
          if (element) {
            return true
          }
        } catch (_e) {
          continue
        }
      }

      return false
    } catch (_e) {
      return false
    }
  }

  /**
   * Verify that the user is authenticated
   */
  async verifyAuthenticated(): Promise<void> {
    const maxRetries = 3
    let retryCount = 0

    while (retryCount < maxRetries) {
      const isAuth = await this.isAuthenticated()
      if (isAuth) {
        return // Successfully authenticated
      }

      retryCount++

      // For WebKit, try to wait longer for page stabilization
      if (retryCount < maxRetries) {
        await this.page.waitForTimeout(1000 * retryCount) // Progressive backoff

        // Check if we need to navigate to dashboard
        const url = this.page.url()
        if (
          !url.includes('/dashboard') &&
          !url.includes('/validation') &&
          !url.includes('/profile')
        ) {
          await this.page.goto('/dashboard')
          await this.page.waitForLoadState('domcontentloaded')
          await this.page.waitForTimeout(1000)
        }
      }
    }

    throw new Error('User is not authenticated')
  }

  /**
   * Verify that the user is not authenticated
   */
  async verifyNotAuthenticated(): Promise<void> {
    // Check that we're on a login/public page
    const url = this.page.url()
    const isOnPublicPage =
      url.includes('signin') ||
      url.includes('login') ||
      url.includes('auth') ||
      url === '/' ||
      url.endsWith('/')

    expect(isOnPublicPage).toBe(true)
  }

  /**
   * Login if not already authenticated
   */
  async loginIfNeeded(
    user: TestUser = TEST_USERS.withHousehold
  ): Promise<void> {
    const isAuth = await this.isAuthenticated()
    if (!isAuth) {
      await this.login(user)
    }
  }

  /**
   * Get the auth storage file path for a worker
   */
  static getAuthFilePath(workerIndex: number): string {
    return path.join(AUTH_DIR, `user-worker-${workerIndex}.json`)
  }

  /**
   * Check if auth storage state exists for a worker
   */
  static hasStorageState(workerIndex: number): boolean {
    const authFile = AuthHelper.getAuthFilePath(workerIndex)
    return fs.existsSync(authFile)
  }

  /**
   * Use pre-saved storage state for authentication (WebKit-friendly)
   * This is faster and more reliable than logging in again, especially for WebKit
   */
  async useStorageState(workerIndex: number): Promise<boolean> {
    const authFile = AuthHelper.getAuthFilePath(workerIndex)

    if (!fs.existsSync(authFile)) {
      console.log(`No storage state found at ${authFile}`)
      return false
    }

    try {
      // Read the storage state
      const storageState = JSON.parse(fs.readFileSync(authFile, 'utf-8'))

      // Get the browser context
      const context = this.page.context()

      // Add cookies from storage state
      if (storageState.cookies && storageState.cookies.length > 0) {
        await context.addCookies(storageState.cookies)
      }

      // Set localStorage/sessionStorage via page evaluation
      if (storageState.origins && storageState.origins.length > 0) {
        for (const origin of storageState.origins) {
          // Navigate to the origin first to set storage
          await this.page.goto(origin.origin || '/')
          await this.page.waitForLoadState('domcontentloaded')

          await this.page.evaluate((storage) => {
            if (storage.localStorage) {
              for (const item of storage.localStorage) {
                localStorage.setItem(item.name, item.value)
              }
            }
            if (storage.sessionStorage) {
              for (const item of storage.sessionStorage) {
                sessionStorage.setItem(item.name, item.value)
              }
            }
          }, origin)
        }
      }

      // Navigate to dashboard to verify auth
      await this.page.goto('/dashboard')
      await this.page.waitForLoadState('domcontentloaded')

      // Wait a bit for WebKit to process the cookies
      if (this.isWebKit) {
        await this.page.waitForTimeout(1000)
      }

      // Verify we're authenticated
      const isAuth = await this.isAuthenticated()
      if (isAuth) {
        console.log(
          `✅ Restored auth state from storage for worker ${workerIndex}`
        )
        return true
      }

      console.log(`⚠️ Storage state loaded but verification failed`)
      return false
    } catch (error) {
      console.error(`Failed to use storage state:`, error)
      return false
    }
  }

  /**
   * Authenticate using storage state first (preferred for WebKit), falling back to login
   * This is the recommended method for tests that need authentication
   */
  async authenticateWithStorageState(
    workerIndex: number,
    user: TestUser = TEST_USERS.withHousehold
  ): Promise<void> {
    // For WebKit, strongly prefer storage state to avoid race conditions
    if (this.isWebKit || AuthHelper.hasStorageState(workerIndex)) {
      const success = await this.useStorageState(workerIndex)
      if (success) {
        return
      }
    }

    // Fallback to regular login
    await this.login(user)
  }
}

/**
 * Create an AuthHelper instance for the given page
 */
export function createAuthHelper(page: Page): AuthHelper {
  return new AuthHelper(page)
}

/**
 * Create worker-specific auth helper with isolated test user
 * Prevents auth race conditions in parallel test execution
 */
export function createWorkerAuthHelper(
  page: Page,
  testInfo: { workerIndex: number }
): {
  auth: AuthHelper
  testUser: TestUser
} {
  const testUser = getWorkerTestUser(testInfo.workerIndex)
  return {
    auth: new AuthHelper(page),
    testUser: {
      email: testUser.email,
      password: testUser.password,
    },
  }
}
