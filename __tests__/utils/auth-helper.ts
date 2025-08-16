/**
 * Authentication helper for E2E tests
 * Provides reliable authentication utilities for Playwright tests
 */

import { Page, expect } from '@playwright/test'
import { TEST_USERS, TEST_ROUTES, TEST_TIMEOUTS } from '../fixtures/test-data'

export interface TestUser {
  email: string
  password: string
}

export class AuthHelper {
  constructor(private page: Page) {}

  /**
   * Clear all authentication state (cookies, localStorage, sessionStorage)
   */
  async clearAuthState(): Promise<void> {
    await this.page.context().clearCookies()
    
    // Navigate to a valid origin first to access localStorage
    try {
      await this.page.goto('http://localhost:3000/')
      await this.page.evaluate(() => {
        try {
          localStorage.clear()
          sessionStorage.clear()
        } catch (e) {
          // localStorage might not be available in some contexts
          console.log('Could not clear storage:', e)
        }
      })
    } catch (e) {
      // Storage operations failed, continue without clearing
      console.log('Storage operations failed:', e)
    }
  }

  /**
   * Login with the specified user
   */
  async login(user: TestUser = TEST_USERS.withHousehold): Promise<void> {
    // Clear any existing auth state
    await this.clearAuthState()

    // Navigate to login page
    await this.page.goto(TEST_ROUTES.auth.signIn)
    await this.page.waitForLoadState('domcontentloaded')

    // Find email input with multiple strategies
    const emailSelectors = [
      '[data-testid="email-input"]',
      'input[type="email"]',
      'input[name="email"]',
      '#email'
    ]
    
    let emailInput = null
    for (const selector of emailSelectors) {
      try {
        emailInput = await this.page.waitForSelector(selector, { 
          timeout: TEST_TIMEOUTS.element,
          state: 'visible'
        })
        if (emailInput) break
      } catch (_e) {
        continue
      }
    }
    
    if (!emailInput) {
      throw new Error('Could not find email input field')
    }
    
    await emailInput.fill(user.email)

    // Find password input with multiple strategies
    const passwordSelectors = [
      '[data-testid="password-input"]',
      'input[type="password"]',
      'input[name="password"]',
      '#password'
    ]
    
    let passwordInput = null
    for (const selector of passwordSelectors) {
      try {
        passwordInput = await this.page.waitForSelector(selector, {
          timeout: TEST_TIMEOUTS.element,
          state: 'visible'
        })
        if (passwordInput) break
      } catch (_e) {
        continue
      }
    }
    
    if (!passwordInput) {
      throw new Error('Could not find password input field')
    }
    
    await passwordInput.fill(user.password)

    // Find and click submit button
    const submitSelectors = [
      '[data-testid="signin-button"]',
      'button[type="submit"]',
      'button:has-text("Sign In")',
      'button:has-text("Log In")',
      'button:has-text("Login")'
    ]
    
    let submitButton = null
    for (const selector of submitSelectors) {
      try {
        submitButton = await this.page.waitForSelector(selector, {
          timeout: TEST_TIMEOUTS.element,
          state: 'visible'
        })
        if (submitButton) break
      } catch (_e) {
        continue
      }
    }
    
    if (!submitButton) {
      throw new Error('Could not find submit button')
    }

    // Submit form and wait for navigation
    await Promise.all([
      this.page.waitForNavigation({ 
        timeout: TEST_TIMEOUTS.navigation,
        waitUntil: 'domcontentloaded'
      }).catch(() => {}), // Catch timeout in case of no navigation
      submitButton.click()
    ])

    // Wait for React hydration
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
      'button:has-text("Log Out")'
    ]
    
    let logoutButton = null
    for (const selector of logoutSelectors) {
      try {
        logoutButton = await this.page.waitForSelector(selector, {
          timeout: TEST_TIMEOUTS.element,
          state: 'visible'
        })
        if (logoutButton) break
      } catch (_e) {
        continue
      }
    }
    
    if (!logoutButton) {
      throw new Error('Could not find logout button')
    }

    await Promise.all([
      this.page.waitForNavigation({
        timeout: TEST_TIMEOUTS.navigation,
        waitUntil: 'domcontentloaded'
      }).catch(() => {}),
      logoutButton.click()
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
      // Check for authentication indicators
      const authenticatedSelectors = [
        '[data-testid="user-menu"]',
        '[data-testid="logout-button"]',
        'button:has-text("Sign Out")',
        'button:has-text("Logout")',
        '.user-avatar',
        '#user-profile'
      ]
      
      for (const selector of authenticatedSelectors) {
        try {
          const element = await this.page.waitForSelector(selector, {
            timeout: 2000,
            state: 'visible'
          })
          if (element) {
            return true
          }
        } catch (_e) {
          continue
        }
      }

      // Check URL patterns
      const url = this.page.url()
      return url.includes('/dashboard') || 
             url.includes('/validation') || 
             url.includes('/profile') ||
             url.includes('/properties')
    } catch (_e) {
      return false
    }
  }

  /**
   * Verify that the user is authenticated
   */
  async verifyAuthenticated(): Promise<void> {
    const isAuth = await this.isAuthenticated()
    if (!isAuth) {
      throw new Error('User is not authenticated')
    }
  }

  /**
   * Verify that the user is not authenticated
   */
  async verifyNotAuthenticated(): Promise<void> {
    // Check that we're on a login/public page
    const url = this.page.url()
    const isOnPublicPage = url.includes('signin') || 
                          url.includes('login') || 
                          url.includes('auth') ||
                          url === '/' ||
                          url.endsWith('/')
    
    expect(isOnPublicPage).toBe(true)
  }

  /**
   * Login if not already authenticated
   */
  async loginIfNeeded(user: TestUser = TEST_USERS.withHousehold): Promise<void> {
    const isAuth = await this.isAuthenticated()
    if (!isAuth) {
      await this.login(user)
    }
  }
}

/**
 * Create an AuthHelper instance for the given page
 */
export function createAuthHelper(page: Page): AuthHelper {
  return new AuthHelper(page)
}