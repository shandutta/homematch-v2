/**
 * Auth fixture for HomeMatch E2E tests
 * Provides authentication utilities and user management
 */

import type {
  AuthFixture,
  ConfigFixture,
  TestUser,
  UtilsFixture,
} from '../types/fixtures'
import type { PlaywrightPage } from '../types/playwright-interfaces'

// Export just the fixtures object, not a test object
export const authFixtures = {
  auth: async (
    {
      page,
      config,
      utils,
    }: { page: PlaywrightPage; config: ConfigFixture; utils: UtilsFixture },
    use: (fixture: AuthFixture) => Promise<void>
  ) => {
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

        // Wait for authentication to complete - use element-based wait instead of URL
        try {
          // Wait for dashboard to be fully loaded with all elements
          await utils.waitForDashboard()
        } catch (error) {
          // Fallback: if dashboard wait fails, try alternative auth destinations
          try {
            await utils.waitForAuthRedirect(/profile|validation/, {
              timeout: config.timeouts.AUTH_REDIRECT,
              errorMessage: `Failed to authenticate user ${user.email}`,
            })
            await utils.waitForReactToSettle()
          } catch (redirectError) {
            throw new Error(
              `Authentication failed: ${error}. Redirect also failed: ${redirectError}`
            )
          }
        }
      },

      async loginIfNeeded(user: TestUser = config.users.user1) {
        // Check if already authenticated
        const isAuth = await utils.isAuthenticated()
        if (!isAuth) {
          await this.login(user)
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
            page.waitForURL(/signin|login|auth/, {
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
              (url: URL) => {
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

        // Use element-based detection instead of URL waiting
        try {
          // First try to detect dashboard elements
          await utils.waitForDashboard()
        } catch (error) {
          // Fallback: check for validation page elements
          try {
            await page.waitForSelector(
              'h1:has-text("HomeMatch - Database Migration Validation"), h1:has-text("Dashboard"), [data-testid="dashboard-header"]',
              {
                timeout: config.timeouts.NAVIGATION,
                state: 'visible',
              }
            )
          } catch (elementError) {
            throw new Error(
              `Could not verify authentication - neither dashboard nor validation page detected: ${error}. Element detection also failed: ${elementError}`
            )
          }
        }

        // Verify validation dashboard content
        const h1Locator = page.locator('h1')
        await h1Locator.waitFor({
          state: 'visible',
          timeout: config.timeouts.ELEMENT_VISIBLE,
        })
        const h1Text = await h1Locator.textContent()
        if (!h1Text?.includes('HomeMatch - Database Migration Validation')) {
          throw new Error(
            `Expected h1 to contain validation text, got: ${h1Text}`
          )
        }

        // Retry loop for authentication verification, especially for WebKit/Firefox
        // Reduce retries and avoid long backoffs to prevent 30s timeouts
        const maxAttempts = isFirefox ? 3 : isWebKit ? 4 : 3
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
          try {
            if (isWebKit || isFirefox) {
              console.log(
                `🔍 ${browserName} - auth verification attempt ${attempt}/${maxAttempts}`
              )
              // On retries for Firefox, avoid navigation to prevent page/context closure races
              if (isFirefox && attempt > 1) {
                await page.waitForLoadState('networkidle')
                await page.waitForTimeout(400 * attempt) // shorter backoff without navigation
              } else if (isWebKit && attempt > 1) {
                await page.waitForLoadState('networkidle')
                await page.waitForTimeout(400 * attempt)
              }
            }

            // Wait for user data to load - check for either the email or the "No Authenticated User" message
            const userEmailLocator = page
              .locator('header')
              .locator(`text=${user.email}`)
            const noUserMessageLocator = page.locator(
              'text=No Authenticated User'
            )

            // First, poll Supabase session in the client to ensure auth state is propagated
            await page.waitForFunction(
              () =>
                window.__supabaseReady === true ||
                // lazily query supabase session if helper not available
                (async () => {
                  try {
                    const supabase = window.supabase
                    const getSession = supabase?.auth?.getSession
                    if (typeof getSession !== 'function') return false
                    const { data } = await getSession()
                    return !!(data && data.session)
                  } catch {
                    return false
                  }
                })(),
              { timeout: 5000 }
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
        // Give browsers a moment to settle logout
        const browserName = page.context().browser()?.browserType().name()
        if (browserName === 'webkit' || browserName === 'firefox') {
          console.log(`🔍 ${browserName} - waiting for logout to complete`)
          await page.waitForTimeout(1000)
        }

        // Prefer checking Supabase session state via client to avoid DOM-only race
        try {
          const sessionCleared = await page.evaluate(async () => {
            try {
              const supabase = window.supabase
              const getSession = supabase?.auth?.getSession
              if (typeof getSession !== 'function') return true
              const { data } = await getSession()
              return !(data && data.session)
            } catch {
              return true
            }
          })
          if (!sessionCleared) {
            // Poll up to 5s for session to clear
            let cleared = false
            for (let i = 0; i < 10; i++) {
              await page.waitForTimeout(500)
              const ok = await page.evaluate(async () => {
                try {
                  const supabase = window.supabase
                  const getSession = supabase?.auth?.getSession
                  if (typeof getSession !== 'function') return true
                  const { data } = await getSession()
                  return !(data && data.session)
                } catch {
                  return true
                }
              })
              if (ok) {
                cleared = true
                break
              }
            }
            if (!cleared) {
              throw new Error(
                'Session did not clear after logout polling window'
              )
            }
          }
        } catch {
          // ignore and fall back to URL/DOM checks
        }

        // Brief grace for hydration, then force a public route to stabilize DOM before checks
        await page.waitForLoadState('networkidle')
        await page.waitForTimeout(250)
        await page.goto('/', { waitUntil: 'load' })
        await page.waitForTimeout(250)

        // Ensure we are on a public route and the app had time to render
        await page.waitForLoadState('load')
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
          // Accept any clear unauthenticated indicator (avoid strict mode violations)
          const loginLinks = page.locator('a[href="/login"]')
          const loginLinkCount = await loginLinks.count()
          const loginLinkVisible =
            loginLinkCount > 0 ? await loginLinks.first().isVisible() : false

          const noAuthMessage = await page
            .locator('text=No Authenticated User')
            .isVisible()
          const signInButtons = page.getByRole('button', {
            name: /log in|sign in/i,
          })
          const signInBtnCount = await signInButtons.count()
          const signInFormVisible =
            signInBtnCount > 0 ? await signInButtons.first().isVisible() : false

          if (!loginLinkVisible && !noAuthMessage && !signInFormVisible) {
            throw new Error(
              'Expected login link, auth form, or no auth message to be visible'
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
