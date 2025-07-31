/**
 * Auth fixture for HomeMatch V2 E2E tests
 * Provides authentication utilities and user management
 */

import { AuthFixture, TestUser } from '../types/fixtures'

// Export just the fixtures object, not a test object
export const authFixtures = {
  auth: async ({ page, config, utils }, use) => {
    const auth: AuthFixture = {
      async login(user: TestUser = config.users.user1) {
        // Ensure clean state before authentication
        await this.clearAuthState()

        // Navigate to login page
        await page.goto('/login')
        await utils.waitForReactToSettle()

        // Get form elements
        const emailInput = page.locator('input[name="email"]')
        const passwordInput = page.locator('input[name="password"]')
        const submitButton = page.locator('button[type="submit"]')

        // Verify we're on login page
        const h1Text = await page.locator('h1').textContent()
        const pText = await page.locator('p').first().textContent()
        if (!h1Text?.includes('HomeMatch')) {
          throw new Error(`Expected h1 to contain 'HomeMatch', got: ${h1Text}`)
        }
        if (!pText?.includes('Sign in to your account')) {
          throw new Error(
            `Expected p to contain 'Sign in to your account', got: ${pText}`
          )
        }

        // Fill form fields
        await emailInput.fill(user.email)
        await passwordInput.fill(user.password)

        // Wait for form validation
        await utils.waitForFormValidation()

        // Verify button is enabled before clicking
        let attempts = 0
        const maxAttempts = config.timeouts.BUTTON_ENABLED / 100
        while (attempts < maxAttempts) {
          const isEnabled = await submitButton.isEnabled()
          if (isEnabled) break
          await page.waitForTimeout(100)
          attempts++
        }
        const isEnabled = await submitButton.isEnabled()
        if (!isEnabled) {
          throw new Error('Submit button is not enabled after form validation')
        }

        // Submit the form
        await submitButton.click()

        // Wait for authentication to complete - check for both success and failure
        try {
          // First check if we're redirected to validation (success)
          await utils.waitForAuthRedirect(/.*\/validation/, {
            timeout: 5000, // Shorter timeout to fail faster
            errorMessage: `Failed to authenticate user ${user.email}`,
          })

          // Wait for authentication session to be fully established
          // This is crucial because the login is handled client-side
          // but the validation page checks auth server-side
          await page.waitForTimeout(2000)

          // Wait for Supabase to set auth cookies
          await page.waitForTimeout(1000)

          // WebKit/Safari specific: Ensure cookies are properly set
          // WebKit requires additional time for cookie propagation
          const browserName = page.context().browser()?.browserType().name()
          if (browserName === 'webkit') {
            // WebKit needs extra time for cookies to propagate
            await page.waitForTimeout(2000)
            
            // Navigate to a neutral page and back to ensure cookies are loaded
            await page.goto('/login')
            await page.waitForLoadState('networkidle')
            await page.goto('/validation')
            await page.waitForLoadState('networkidle')
          } else {
            // For other browsers, a simple reload suffices
            await page.reload({ waitUntil: 'networkidle' })
          }
          
          await utils.waitForReactToSettle()
        } catch (error) {
          // If redirect fails, check current URL and page state
          const currentUrl = page.url()
          console.log(`🔍 Current URL after login attempt: ${currentUrl}`)

          // Check for error alerts on the page
          const alertSelector =
            '.alert-destructive, [role="alert"], .error-message'
          const errorAlert = page.locator(alertSelector).first()
          const isErrorVisible = await errorAlert
            .isVisible({ timeout: 1000 })
            .catch(() => false)

          if (isErrorVisible) {
            const errorText = await errorAlert.textContent()
            throw new Error(`Authentication failed: ${errorText}`)
          }

          // If still on login page, authentication failed
          if (currentUrl.includes('/login')) {
            throw new Error(
              `Authentication failed: Still on login page. Check test user credentials.`
            )
          }

          // Re-throw original error if we can't determine the cause
          throw error
        }
      },

      async logout() {
        const signOutButton = page.locator(
          'button[type="submit"]:has-text("Sign out")'
        )
        const isVisible = await signOutButton.isVisible()
        if (!isVisible) {
          throw new Error('Sign out button is not visible')
        }
        
        // Firefox specific: Handle form submission differently
        const browserName = page.context().browser()?.browserType().name()
        if (browserName === 'firefox') {
          // Firefox needs explicit wait for form submission
          await Promise.all([
            page.waitForNavigation({ 
              waitUntil: 'networkidle',
              timeout: config.timeouts.AUTH_LOGOUT 
            }),
            signOutButton.click()
          ])
        } else {
          await signOutButton.click()
        }

        // Wait for logout to complete and redirect
        // Check multiple possible redirect locations
        const currentUrl = page.url()
        if (!currentUrl.includes('/') && !currentUrl.includes('/login')) {
          try {
            await page.waitForURL((url) => {
              const urlStr = url.toString()
              return urlStr.endsWith('/') || urlStr.includes('/login')
            }, { timeout: config.timeouts.AUTH_LOGOUT })
          } catch (error) {
            // If we're still not on expected page, force navigation
            await page.goto('/login')
          }
        }

        // Clear auth state to ensure clean logout
        await this.clearAuthState()

        // Wait for page to settle
        await utils.waitForReactToSettle()
      },

      async fillLoginForm(user: TestUser = config.users.user1) {
        const emailInput = page.locator('input[name="email"]')
        const passwordInput = page.locator('input[name="password"]')

        // Use fill for more reliable input
        await emailInput.fill(user.email)
        await passwordInput.fill(user.password)

        // Wait for validation
        await utils.waitForFormValidation()
      },

      async verifyAuthenticated(user: TestUser = config.users.user1) {
        // Should be on validation dashboard
        await page.waitForURL(/.*\/validation/, {
          timeout: config.timeouts.NAVIGATION,
        })

        // Verify validation dashboard content
        let attempts = 0
        const maxAttempts = config.timeouts.ELEMENT_VISIBLE / 100
        while (attempts < maxAttempts) {
          const h1Text = await page.locator('h1').textContent()
          if (h1Text?.includes('HomeMatch V2 - Database Migration Validation'))
            break
          await page.waitForTimeout(100)
          attempts++
        }
        const h1Text = await page.locator('h1').textContent()
        if (!h1Text?.includes('HomeMatch V2 - Database Migration Validation')) {
          throw new Error(
            `Expected h1 to contain validation text, got: ${h1Text}`
          )
        }

        // Wait for user data to load - check for either the email or the "No Authenticated User" message
        attempts = 0
        let userDataLoaded = false
        while (attempts < maxAttempts) {
          // Check if email is visible in the header
          const emailVisible = await page
            .locator('header')
            .locator(`text=${user.email}`)
            .isVisible()
            .catch(() => false)

          // Also check if "No Authenticated User" message is visible
          const noUserMessage = await page
            .locator('text=No Authenticated User')
            .isVisible()
            .catch(() => false)

          if (emailVisible || noUserMessage) {
            userDataLoaded = true
            break
          }

          await page.waitForTimeout(100)
          attempts++
        }

        if (!userDataLoaded) {
          throw new Error(
            'User data section did not load on validation dashboard'
          )
        }

        // Now verify that the email is actually displayed (not the no user message)
        const emailVisible = await page
          .locator('header')
          .locator(`text=${user.email}`)
          .isVisible()
          .catch(() => false)

        if (!emailVisible) {
          // Get page content for debugging
          const pageContent = await page.content()
          const hasNoUserMessage = pageContent.includes('No Authenticated User')

          if (hasNoUserMessage) {
            throw new Error(
              `Authentication state not preserved: User ${user.email} logged in but validation page shows "No Authenticated User"`
            )
          } else {
            throw new Error(
              `User email ${user.email} is not visible on validation dashboard`
            )
          }
        }
      },

      async verifyNotAuthenticated() {
        const finalUrl = page.url()

        if (finalUrl.includes('/login')) {
          // Redirected to login page
          const h1Text = await page.locator('h1').textContent()
          const pText = await page.locator('p').first().textContent()
          if (!h1Text?.includes('HomeMatch')) {
            throw new Error(
              `Expected h1 to contain 'HomeMatch', got: ${h1Text}`
            )
          }
          if (!pText?.includes('Sign in to your account')) {
            throw new Error(
              `Expected p to contain 'Sign in to your account', got: ${pText}`
            )
          }
        } else {
          // Should see login link or no auth message
          const loginLinkVisible = await page
            .locator('a[href="/login"]')
            .isVisible()
          const noAuthMessage = await page
            .locator('text=No Authenticated User')
            .isVisible()

          if (!loginLinkVisible && !noAuthMessage) {
            throw new Error(
              'Expected either login link or no auth message to be visible'
            )
          }
        }
      },

      async clearAuthState() {
        await utils.clearAuthState()
      },
    }

    await use(auth)
  },
}

// expect is exported from index.ts
