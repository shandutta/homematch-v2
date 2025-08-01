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

        // Wait for authentication to complete - check for redirection
        await utils.waitForAuthRedirect(/.*\/validation/, {
          timeout: config.timeouts.AUTH_REDIRECT,
          errorMessage: `Failed to authenticate user ${user.email}`,
        })

        // Wait for the page to settle after redirect
        await utils.waitForReactToSettle()

        const browserName = page.context().browser()?.browserType().name()
        if (browserName === 'webkit' || browserName === 'firefox') {
          console.log(
            `🔍 ${browserName} detected - applying extra wait for auth propagation`
          )
          // Extra time for cookies to propagate before verification
          await page.waitForTimeout(3000)
          await page.reload({ waitUntil: 'networkidle' })
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
              timeout: config.timeouts.AUTH_LOGOUT,
            }),
            signOutButton.click(),
          ])
        } else {
          await signOutButton.click()
        }

        // Wait for logout to complete and redirect
        // Check multiple possible redirect locations
        const currentUrl = page.url()
        if (!currentUrl.includes('/') && !currentUrl.includes('/login')) {
          try {
            await page.waitForURL(
              (url) => {
                const urlStr = url.toString()
                return urlStr.endsWith('/') || urlStr.includes('/login')
              },
              { timeout: config.timeouts.AUTH_LOGOUT }
            )
          } catch {
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
        const browserName = page.context().browser()?.browserType().name()
        const isWebKit = browserName === 'webkit'
        const isFirefox = browserName === 'firefox'

        // Should be on validation dashboard
        await page.waitForURL(/.*\/validation/, {
          timeout: config.timeouts.NAVIGATION,
        })

        // Verify validation dashboard content
        const h1Locator = page.locator('h1')
        await h1Locator.waitFor({
          state: 'visible',
          timeout: config.timeouts.ELEMENT_VISIBLE,
        })
        const h1Text = await h1Locator.textContent()
        if (!h1Text?.includes('HomeMatch V2 - Database Migration Validation')) {
          throw new Error(
            `Expected h1 to contain validation text, got: ${h1Text}`
          )
        }

        // Retry loop for authentication verification, especially for WebKit/Firefox
        const maxAttempts = isWebKit || isFirefox ? 5 : 3
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
          try {
            if (isWebKit || isFirefox) {
              console.log(
                `🔍 ${browserName} - auth verification attempt ${attempt}/${maxAttempts}`
              )
              // On retries, force a reload to get fresh server state
              if (attempt > 1) {
                await page.reload({ waitUntil: 'networkidle' })
                await page.waitForTimeout(1000 * attempt) // increasing backoff
              }
            }

            // Wait for user data to load - check for either the email or the "No Authenticated User" message
            const userEmailLocator = page
              .locator('header')
              .locator(`text=${user.email}`)
            const noUserMessageLocator = page.locator(
              'text=No Authenticated User'
            )

            // Wait for either locator to be visible
            await Promise.race([
              userEmailLocator.waitFor({
                state: 'visible',
                timeout: config.timeouts.ELEMENT_VISIBLE,
              }),
              noUserMessageLocator.waitFor({
                state: 'visible',
                timeout: config.timeouts.ELEMENT_VISIBLE,
              }),
            ])

            // Now, check which one is actually visible
            const emailVisible = await userEmailLocator.isVisible()
            if (emailVisible) {
              console.log(
                `✅ ${browserName} - auth state verified on attempt ${attempt}`
              )
              return // Success!
            }

            const noUserMessageVisible = await noUserMessageLocator.isVisible()
            if (noUserMessageVisible) {
              // This is a failure condition for this attempt, but we might retry
              console.warn(
                `⚠️ ${browserName} - attempt ${attempt}: auth state not preserved. Retrying...`
              )
              if (attempt === maxAttempts) {
                throw new Error(
                  `Authentication state not preserved after ${maxAttempts} attempts: User ${user.email} logged in but validation page shows "No Authenticated User"`
                )
              }
              // Continue to next attempt in the loop
            } else {
              // Should not happen if Promise.race resolved
              throw new Error('Auth verification in indeterminate state.')
            }
          } catch (error) {
            if (attempt === maxAttempts) {
              console.error(
                `❌ ${browserName} - auth verification failed after ${maxAttempts} attempts.`
              )
              // Re-throw the last error
              throw error
            }
          }
        }
      },

      async verifyNotAuthenticated() {
        // Browser-specific wait for logout to complete
        const browserName = page.context().browser()?.browserType().name()
        if (browserName === 'webkit' || browserName === 'firefox') {
          console.log(`🔍 ${browserName} - waiting for logout to complete`)
          await page.waitForTimeout(1000)
        }

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
