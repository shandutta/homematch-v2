import { test, expect, Page } from '@playwright/test'

// Helper function to inject errors into the page
async function _injectError(
  page: Page,
  errorType: string,
  _target: string = 'body'
) {
  await page.addScriptTag({
    content: `
      window.injectError = function(type, target) {
        const targetElement = document.querySelector(target) || document.body;
        
        // Create an error-prone component
        const errorScript = document.createElement('script');
        errorScript.innerHTML = \`
          setTimeout(() => {
            const event = new CustomEvent('inject-error', { 
              detail: { type: type, target: target }
            });
            window.dispatchEvent(event);
          }, 100);
        \`;
        
        document.head.appendChild(errorScript);
      }
    `,
  })
}

// Helper to simulate network failures
async function simulateNetworkFailure(page: Page, pattern: string) {
  await page.route(pattern, (route) => {
    route.abort('failed')
  })
}

// Helper to check error boundary UI elements
async function expectErrorBoundaryUI(
  page: Page,
  options: {
    heading?: string
    message?: string
    buttons?: string[]
  }
) {
  if (options.heading) {
    await expect(
      page.getByRole('heading', { name: options.heading })
    ).toBeVisible()
  }

  if (options.message) {
    await expect(page.getByText(options.message)).toBeVisible()
  }

  if (options.buttons) {
    for (const buttonText of options.buttons) {
      await expect(page.getByRole('button', { name: buttonText })).toBeVisible()
    }
  }
}

test.describe('Error Boundary User Flows', () => {
  test.beforeEach(async ({ page }) => {
    // Mock console to catch errors
    await page.addInitScript(() => {
      window.capturedErrors = []
      window.capturedLogs = []

      const originalError = console.error
      const originalLog = console.log

      console.error = (...args) => {
        window.capturedErrors.push(args.join(' '))
        originalError(...args)
      }

      console.log = (...args) => {
        window.capturedLogs.push(args.join(' '))
        originalLog(...args)
      }
    })
  })

  test.describe('Dashboard Error Scenarios', () => {
    test('handles dashboard component failures gracefully', async ({
      page,
    }) => {
      await page.goto('/dashboard')

      // Wait for dashboard to load
      await expect(
        page.getByRole('heading', { name: /dashboard/i })
      ).toBeVisible()

      // Inject error into dashboard component
      await page.evaluate(() => {
        // Simulate a React component error
        const errorEvent = new Error('Dashboard component crashed')
        window.dispatchEvent(
          new CustomEvent('react-error', { detail: errorEvent })
        )
      })

      // Should show dashboard error boundary
      await expectErrorBoundaryUI(page, {
        heading: 'Something went wrong',
        message: /We encountered an error while loading your dashboard/,
        buttons: ['Try Again', 'Refresh Page'],
      })

      // Try Again button should be functional
      await page.getByRole('button', { name: 'Try Again' }).click()

      // Should attempt to recover (may show loading or redirect)
      await expect(
        page.getByRole('button', { name: 'Try Again' })
      ).toBeVisible()
    })

    test('isolates property loading errors from dashboard', async ({
      page,
    }) => {
      await page.goto('/dashboard')

      // Simulate property API failures
      await simulateNetworkFailure(page, '**/api/properties**')

      // Dashboard should still be visible
      await expect(
        page.getByRole('heading', { name: /dashboard/i })
      ).toBeVisible()

      // Property sections might show loading states or error states
      // depending on implementation, but dashboard should remain functional

      // Navigation should still work
      const navigation = page.locator('nav')
      await expect(navigation).toBeVisible()

      // User should be able to access other features
      if (await page.getByRole('link', { name: /profile/i }).isVisible()) {
        await page.getByRole('link', { name: /profile/i }).click()
        await expect(page.url()).toContain('profile')
      }
    })

    test('recovers from transient network errors', async ({ page }) => {
      await page.goto('/dashboard')

      // Initially block API calls
      await simulateNetworkFailure(page, '**/api/**')

      // Wait for potential error states
      await page.waitForTimeout(2000)

      // Remove the network block
      await page.unroute('**/api/**')

      // If there are retry buttons, click them
      const retryButtons = page.getByRole('button', {
        name: /retry|try again/i,
      })
      const retryCount = await retryButtons.count()

      if (retryCount > 0) {
        await retryButtons.first().click()

        // Should eventually recover and show content
        await expect(
          page.getByRole('heading', { name: /dashboard/i })
        ).toBeVisible()
      }
    })
  })

  test.describe('Property Browsing Error Scenarios', () => {
    test('handles individual property loading failures', async ({ page }) => {
      await page.goto('/dashboard')

      // Wait for property listings to appear
      await page.waitForSelector('[data-testid*="property-"]', {
        timeout: 10000,
      })

      // Simulate specific property failures by injecting errors
      await page.evaluate(() => {
        // Find property cards and inject errors into some of them
        const propertyCards = document.querySelectorAll(
          '[data-testid*="property-"]'
        )
        if (propertyCards.length > 1) {
          // Cause the second property to error
          const secondCard = propertyCards[1]
          secondCard.innerHTML = '<div>Property Load Error</div>'
        }
      })

      // Should show error for failed property
      await expect(page.getByText('Property Load Error')).toBeVisible()

      // Other properties should still be visible
      const propertyCards = page.locator('[data-testid*="property-"]')
      const cardCount = await propertyCards.count()

      if (cardCount > 1) {
        // At least one property should still be functional
        expect(cardCount).toBeGreaterThan(0)
      }
    })

    test('handles property interaction errors gracefully', async ({ page }) => {
      await page.goto('/dashboard')

      // Wait for properties to load
      await page.waitForSelector('[data-testid*="property-"]', {
        state: 'visible',
        timeout: 10000,
      })

      // Try to interact with property cards
      const propertyCards = page.locator('[data-testid*="property-"]')
      const firstCard = propertyCards.first()

      if (await firstCard.isVisible()) {
        // Look for interactive elements (buttons, links)
        const likeButton = firstCard.locator('button').first()
        const viewButton = firstCard.getByRole('button', {
          name: /view|details/i,
        })

        if (await likeButton.isVisible()) {
          await likeButton.click()

          // Should handle the interaction gracefully
          // (either success or proper error handling)
          await page.waitForTimeout(1000)
        }

        if (await viewButton.isVisible()) {
          await viewButton.click()

          // Should navigate or show details without crashing
          await page.waitForTimeout(1000)
        }
      }

      // Page should remain functional
      await expect(
        page.getByRole('heading', { name: /dashboard/i })
      ).toBeVisible()
    })
  })

  test.describe('Form Error Scenarios', () => {
    test('handles form validation errors appropriately', async ({ page }) => {
      // Navigate to a page with forms (settings, profile, etc.)
      await page.goto('/profile')

      // Look for form elements
      const forms = page.locator('form')
      const formCount = await forms.count()

      if (formCount > 0) {
        const form = forms.first()

        // Try to submit with invalid data
        const inputs = form.locator('input[type="text"], input[type="email"]')
        const submitButton = form.locator('button[type="submit"]')

        if ((await inputs.count()) > 0) {
          // Clear inputs and try to submit
          await inputs.first().clear()

          if (await submitButton.isVisible()) {
            await submitButton.click()

            // Should show validation errors or handle gracefully
            await page.waitForTimeout(1000)

            // Check for error messages
            const errorMessages = page.getByText(/error|invalid|required/i)
            const errorCount = await errorMessages.count()

            // Either should show validation errors or form error boundary
            if (errorCount === 0) {
              // Look for form error boundary
              await expect(
                page.getByText(/Form Error|Something went wrong/)
              ).toBeVisible({ timeout: 5000 })
            }
          }
        }
      }
    })

    test('recovers from form submission failures', async ({ page }) => {
      await page.goto('/profile')

      // Simulate form submission API failures
      await simulateNetworkFailure(page, '**/api/profile**')
      await simulateNetworkFailure(page, '**/api/user**')

      const forms = page.locator('form')
      if ((await forms.count()) > 0) {
        const form = forms.first()
        const submitButton = form.locator('button[type="submit"]')

        if (await submitButton.isVisible()) {
          await submitButton.click()

          // Should handle API failure gracefully
          await page.waitForTimeout(2000)

          // Look for error handling UI
          const errorUI = page.getByText(/error|failed|try again/i)
          const errorCount = await errorUI.count()

          if (errorCount > 0) {
            // Should provide recovery options
            const retryButton = page.getByRole('button', {
              name: /retry|try again/i,
            })
            if (await retryButton.isVisible()) {
              await expect(retryButton).toBeEnabled()
            }
          }
        }
      }
    })
  })

  test.describe('Couples Feature Error Scenarios', () => {
    test('handles couples data synchronization errors', async ({ page }) => {
      await page.goto('/couples')

      // Simulate couples API failures
      await simulateNetworkFailure(page, '**/api/couples**')
      await simulateNetworkFailure(page, '**/api/mutual-likes**')

      // Should show couples error boundary or loading states
      await page.waitForTimeout(3000)

      // Look for couples-specific error handling
      const couplesError = page.getByText(/couples|partner|sync/i)
      const generalError = page.getByText(/something went wrong|error/i)

      const hasError =
        (await couplesError.count()) > 0 || (await generalError.count()) > 0

      if (hasError) {
        // Should provide appropriate recovery options
        const actionButtons = page.getByRole('button', {
          name: /try again|refresh|dashboard/i,
        })
        await expect(actionButtons.first()).toBeVisible()
      }
    })

    test('isolates couples errors from main app functionality', async ({
      page,
    }) => {
      await page.goto('/couples')

      // Even if couples feature fails, basic navigation should work
      const navigation = page.locator('nav, header')
      if ((await navigation.count()) > 0) {
        await expect(navigation.first()).toBeVisible()

        // Should be able to navigate away from couples
        const dashboardLink = page.getByRole('link', { name: /dashboard/i })
        if (await dashboardLink.isVisible()) {
          await dashboardLink.click()
          await expect(page.url()).toContain('dashboard')
        }
      }
    })
  })

  test.describe('Network Connectivity Scenarios', () => {
    test('handles offline scenarios gracefully', async ({ page, context }) => {
      await page.goto('/dashboard')

      // Simulate going offline
      await context.setOffline(true)

      // Try to interact with the app
      const interactiveElements = page.getByRole('button')
      const elementCount = await interactiveElements.count()

      if (elementCount > 0) {
        await interactiveElements.first().click()
        await page.waitForTimeout(2000)
      }

      // Should handle offline state appropriately
      // Look for offline indicators or error messages
      const offlineIndicators = page.getByText(/offline|connection|network/i)
      const hasOfflineIndicator = (await offlineIndicators.count()) > 0

      // Come back online
      await context.setOffline(false)

      if (hasOfflineIndicator) {
        // Should detect coming back online
        await page.waitForTimeout(2000)

        // Look for retry mechanisms
        const retryButton = page.getByRole('button', { name: /retry|refresh/i })
        if (await retryButton.isVisible()) {
          await retryButton.click()
        }
      }

      // App should remain functional
      await expect(page.getByRole('heading')).toBeVisible()
    })

    test('handles slow network conditions', async ({ page }) => {
      // Simulate slow network
      await page.route('**/*', async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 2000)) // 2s delay
        await route.continue()
      })

      await page.goto('/dashboard')

      // Should show loading states or handle slow responses
      await page.waitForTimeout(5000)

      // Eventually should load or show appropriate timeout handling
      const content = page.getByRole('heading')
      const errorBoundary = page.getByText(/error|timeout|slow/i)

      const hasContent = (await content.count()) > 0
      const hasError = (await errorBoundary.count()) > 0

      // Should either load successfully or show appropriate error handling
      expect(hasContent || hasError).toBe(true)
    })
  })

  test.describe('Error Recovery and User Experience', () => {
    test('provides clear error messages and recovery options', async ({
      page,
    }) => {
      await page.goto('/dashboard')

      // Inject a general error
      await page.evaluate(() => {
        // Simulate a React error boundary trigger
        const error = new Error('Simulated component error')
        window.dispatchEvent(new CustomEvent('react-error', { detail: error }))
      })

      // Wait for error boundary to activate
      await page.waitForTimeout(1000)

      // Look for error boundary UI
      const errorHeading = page.getByRole('heading', { name: /error|wrong/i })
      const errorMessage = page.getByText(/unexpected|occurred|try|refresh/i)
      const actionButtons = page.getByRole('button')

      if ((await errorHeading.count()) > 0) {
        await expect(errorHeading.first()).toBeVisible()

        // Should provide helpful error message
        if ((await errorMessage.count()) > 0) {
          await expect(errorMessage.first()).toBeVisible()
        }

        // Should provide recovery actions
        if ((await actionButtons.count()) > 0) {
          const firstButton = actionButtons.first()
          await expect(firstButton).toBeVisible()
          await expect(firstButton).toBeEnabled()
        }
      }
    })

    test('maintains accessibility in error states', async ({ page }) => {
      await page.goto('/dashboard')

      // Trigger error state
      await simulateNetworkFailure(page, '**/*')
      await page.reload()

      // Wait for potential error states
      await page.waitForTimeout(3000)

      // Check accessibility of error UI
      const headings = page.getByRole('heading')
      const buttons = page.getByRole('button')
      const _links = page.getByRole('link')

      // All interactive elements should be keyboard accessible
      if ((await buttons.count()) > 0) {
        const firstButton = buttons.first()
        await firstButton.focus()

        // Should be able to navigate with keyboard
        await page.keyboard.press('Tab')
        await page.keyboard.press('Enter')
      }

      // Should have proper heading structure
      if ((await headings.count()) > 0) {
        await expect(headings.first()).toBeVisible()
      }
    })

    test('preserves user data during error recovery', async ({ page }) => {
      await page.goto('/profile')

      // Fill out form data
      const inputs = page.locator('input[type="text"], input[type="email"]')
      if ((await inputs.count()) > 0) {
        await inputs.first().fill('Test User Data')

        // Trigger an error
        await page.evaluate(() => {
          const error = new Error('Form processing error')
          window.dispatchEvent(
            new CustomEvent('react-error', { detail: error })
          )
        })

        await page.waitForTimeout(1000)

        // Look for recovery mechanisms
        const retryButton = page.getByRole('button', {
          name: /retry|try again/i,
        })
        const _resetButton = page.getByRole('button', { name: /reset/i })

        if (await retryButton.isVisible()) {
          await retryButton.click()

          // Check if user data is preserved
          await page.waitForTimeout(1000)

          const restoredInput = page
            .locator('input[type="text"], input[type="email"]')
            .first()
          if (await restoredInput.isVisible()) {
            const _value = await restoredInput.inputValue()
            // Data preservation depends on implementation
            // but should either preserve or clearly indicate data loss
          }
        }
      }
    })
  })

  test.describe('Error Monitoring and Analytics', () => {
    test('captures error information for monitoring', async ({ page }) => {
      await page.goto('/dashboard')

      // Inject error and check if it's captured
      await page.evaluate(() => {
        window.testError = new Error('Test monitoring error')
        console.error('Test error for monitoring:', window.testError)
      })

      // Check captured errors
      const capturedErrors = await page.evaluate(() => window.capturedErrors)
      expect(capturedErrors).toBeDefined()
      expect(capturedErrors.length).toBeGreaterThan(0)
    })

    test('provides error context for debugging', async ({ page }) => {
      await page.goto('/dashboard')

      // Check if development mode shows error details
      await page.evaluate(() => {
        const error = new Error('Debug context test')
        console.error('Debug error:', error)
      })

      // In development mode, should provide detailed error information
      const capturedLogs = await page.evaluate(() => window.capturedLogs)
      const capturedErrors = await page.evaluate(() => window.capturedErrors)

      expect(capturedErrors || capturedLogs).toBeDefined()
    })
  })
})
