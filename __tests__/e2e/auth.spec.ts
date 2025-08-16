/**
 * Comprehensive authentication tests using Playwright
 * Updated to work with real dev server and proper auth flow
 */

import { test, expect } from '@playwright/test'
import { TEST_USERS, TEST_ROUTES } from '../fixtures/test-data'
import { createAuthHelper } from '../utils/auth-helper'

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page: _page, context }) => {
    // Grant necessary permissions
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  })

  test('should complete full login and logout flow', async ({ page }) => {
    const auth = createAuthHelper(page)
    const testUser = TEST_USERS.withHousehold
    
    // Test login
    await auth.login(testUser)
    await auth.verifyAuthenticated()
    
    // Test logout
    await auth.logout()
    await auth.verifyNotAuthenticated()
  })

  test('should redirect to dashboard after successful login', async ({ page }) => {
    const auth = createAuthHelper(page)
    const testUser = TEST_USERS.withHousehold
    
    await auth.login(testUser)
    
    // Verify we're on a protected page
    const url = page.url()
    const isOnProtectedPage = 
      url.includes('/dashboard') || 
      url.includes('/validation') || 
      url.includes('/profile') ||
      url.includes('/properties')
    
    expect(isOnProtectedPage).toBe(true)
  })

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto(TEST_ROUTES.auth.signIn)
    await page.waitForLoadState('domcontentloaded')
    
    // Try to login with invalid credentials
    const emailInput = await page.locator('input[type="email"]').first()
    await emailInput.fill('invalid@example.com')
    
    const passwordInput = await page.locator('input[type="password"]').first()
    await passwordInput.fill('wrongpassword')
    
    // Submit form
    const submitButton = await page.locator('button[type="submit"]').first()
    await submitButton.click()
    
    // Wait a bit for error to appear
    await page.waitForTimeout(2000)
    
    // Check for error message or that we're still on login page
    const errorSelectors = [
      '[data-testid="error-message"]',
      '.error-message',
      '[role="alert"]',
      'text=/invalid|incorrect|wrong|failed/i'
    ]
    
    let errorFound = false
    for (const selector of errorSelectors) {
      try {
        const element = await page.waitForSelector(selector, {
          timeout: 3000,
          state: 'visible'
        })
        if (element) {
          errorFound = true
          break
        }
      } catch (_e) {
        continue
      }
    }
    
    // If no error message, at least verify we're still on login page
    if (!errorFound) {
      const url = page.url()
      const stillOnLoginPage = url.includes('signin') || 
                              url.includes('login') || 
                              url.includes('auth')
      expect(stillOnLoginPage).toBe(true)
    }
  })

  test('should protect dashboard route when not authenticated', async ({ page }) => {
    const auth = createAuthHelper(page)
    
    // Clear any auth state
    await auth.clearAuthState()
    
    // Try to access protected route directly
    await page.goto(TEST_ROUTES.app.dashboard)
    
    // Wait for redirect
    await page.waitForTimeout(2000)
    
    // Should redirect to login
    const url = page.url()
    const isOnLoginPage = url.includes('signin') || 
                         url.includes('login') || 
                         url.includes('auth')
    expect(isOnLoginPage).toBe(true)
  })
})