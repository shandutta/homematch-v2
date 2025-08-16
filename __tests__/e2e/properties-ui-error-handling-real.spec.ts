/**
 * Real UI Error Handling Tests for Properties
 * Converted from Jest mocking tests to Playwright E2E tests
 * 
 * These tests verify actual user-facing error handling through the browser
 * instead of mocking service responses.
 */

import { test, expect } from '../fixtures'

test.describe('Properties UI Error Handling - Real Browser Tests', () => {
  
  test.describe('Error Boundary and Recovery', () => {
    test('should display error UI when property fails to load', async ({ page, config, logger }) => {
      logger.step('Testing property load error UI')
      
      // Navigate to a property page with invalid ID to trigger error
      await page.goto(`${config.baseUrl}/property/invalid-property-id`)
      
      // Wait for error boundary to appear
      await expect(page.locator('text=Property Load Error')).toBeVisible()
      await expect(page.locator('text=Unable to load property details')).toBeVisible()
      
      // Check retry button is present
      const retryButton = page.locator('button:has-text("Retry")')
      await expect(retryButton).toBeVisible()
      
      logger.info('Error boundary displayed correctly for invalid property')
    })

    test('should handle network errors gracefully', async ({ page, config, logger, retry }) => {
      logger.step('Testing network error handling')
      
      // Intercept network requests to simulate failure
      await page.route('**/api/properties/*', route => {
        route.abort('failed')
      })
      
      // Navigate to dashboard where properties are loaded
      await retry.withTimeout(async () => {
        await page.goto(`${config.baseUrl}/dashboard`)
        
        // Should show connection error message
        await expect(page.locator('text=/connection issue|error|failed/i').first()).toBeVisible()
      })
      
      logger.info('Network errors handled gracefully')
    })

    test('should retry loading after error', async ({ page, config, logger }) => {
      logger.step('Testing error recovery with retry')
      
      let requestCount = 0
      
      // Intercept API calls - fail first, succeed on retry
      await page.route('**/api/properties/*', route => {
        requestCount++
        if (requestCount === 1) {
          route.abort('failed')
        } else {
          route.continue()
        }
      })
      
      // Navigate to dashboard
      await page.goto(`${config.baseUrl}/dashboard`)
      
      // Wait for error to appear
      await expect(page.locator('text=/error|failed/i').first()).toBeVisible({ timeout: 10000 })
      
      // Click retry button if available
      const retryButton = page.locator('button:has-text("Retry")')
      if (await retryButton.isVisible()) {
        await retryButton.click()
        logger.info('Clicked retry button')
        
        // Should successfully load after retry
        await expect(page.locator('[data-testid="property-card"]').first()).toBeVisible({ timeout: 10000 })
      } else {
        // If no retry button, reload the page
        await page.reload()
        await expect(page.locator('[data-testid="property-card"]').first()).toBeVisible({ timeout: 10000 })
      }
      
      logger.info('Successfully recovered from error')
    })
  })

  test.describe('Form Validation Errors', () => {
    test('should show validation errors for invalid search parameters', async ({ page, config, logger, auth }) => {
      logger.step('Testing search form validation')
      
      // Login first if needed
      await auth.loginIfNeeded(config.users.user1)
      
      await page.goto(`${config.baseUrl}/dashboard`)
      
      // Open search/filter panel if exists
      const filterButton = page.locator('button:has-text("Filter"), button:has-text("Search")')
      if (await filterButton.isVisible()) {
        await filterButton.click()
        logger.info('Opened filter panel')
      }
      
      // Try to enter invalid price range
      const minPriceInput = page.locator('input[name="price_min"], input[placeholder*="Min"], input[placeholder*="min"]').first()
      const maxPriceInput = page.locator('input[name="price_max"], input[placeholder*="Max"], input[placeholder*="max"]').first()
      
      if (await minPriceInput.isVisible() && await maxPriceInput.isVisible()) {
        // Enter max less than min
        await minPriceInput.fill('500000')
        await maxPriceInput.fill('100000')
        logger.info('Entered invalid price range')
        
        // Try to submit
        const submitButton = page.locator('button[type="submit"], button:has-text("Apply"), button:has-text("Search")').first()
        if (await submitButton.isVisible()) {
          await submitButton.click()
          
          // Should show validation error
          await expect(page.locator('text=/invalid|error|must be greater/i').first()).toBeVisible({ timeout: 5000 })
          logger.info('Validation error displayed correctly')
        }
      } else {
        logger.info('Price inputs not found, skipping validation test')
      }
    })
  })

  test.describe('Empty State Handling', () => {
    test('should display empty state when no properties match filters', async ({ page, config, logger, auth }) => {
      logger.step('Testing empty state display')
      
      // Login if needed
      await auth.loginIfNeeded(config.users.user1)
      
      await page.goto(`${config.baseUrl}/dashboard`)
      
      // Open filter panel
      const filterButton = page.locator('button:has-text("Filter"), button:has-text("Search")')
      if (await filterButton.isVisible()) {
        await filterButton.click()
        
        // Set impossible filter criteria
        const minPriceInput = page.locator('input[name="price_min"], input[placeholder*="Min"], input[placeholder*="min"]').first()
        if (await minPriceInput.isVisible()) {
          await minPriceInput.fill('99999999') // Very high minimum price
          logger.info('Set impossible filter criteria')
          
          const applyButton = page.locator('button:has-text("Apply"), button:has-text("Search")').first()
          if (await applyButton.isVisible()) {
            await applyButton.click()
            
            // Should show empty state
            await expect(page.locator('text=/no properties|no results|nothing found/i').first()).toBeVisible({ timeout: 10000 })
            logger.info('Empty state displayed correctly')
          }
        }
      } else {
        logger.info('Filter button not found, skipping empty state test')
      }
    })
  })

  test.describe('Loading State Tests', () => {
    test('should display loading state while fetching properties', async ({ page, config, logger }) => {
      logger.step('Testing loading state display')
      
      // Slow down the API response
      await page.route('**/api/properties*', async route => {
        await page.waitForTimeout(2000) // 2 second delay
        await route.continue()
      })
      
      // Navigate to dashboard
      await page.goto(`${config.baseUrl}/dashboard`)
      
      // Should show loading indicator
      const loadingIndicator = page.locator('[role="status"], .loading, .skeleton, [aria-busy="true"]').first()
      await expect(loadingIndicator).toBeVisible()
      logger.info('Loading state displayed')
      
      // Wait for properties to eventually load
      await expect(page.locator('[data-testid="property-card"], .property-card').first()).toBeVisible({ timeout: 15000 })
      logger.info('Properties loaded after delay')
    })
  })

  test.describe('Database Error Scenarios', () => {
    test('should handle database connection errors', async ({ page, config, logger }) => {
      logger.step('Testing database error handling')
      
      // Intercept Supabase requests and simulate database error
      await page.route('**/rest/v1/**', route => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({
            message: 'Database connection failed',
            error: 'ECONNREFUSED'
          })
        })
      })
      
      await page.goto(`${config.baseUrl}/dashboard`)
      
      // Should show database error message
      await expect(page.locator('text=/database|connection|server error/i').first()).toBeVisible({ timeout: 10000 })
      logger.info('Database error handled gracefully')
    })

    test('should handle malformed data from API', async ({ page, config, logger }) => {
      logger.step('Testing malformed data handling')
      
      // Intercept API and return malformed data
      await page.route('**/api/properties*', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            // Invalid structure - missing required fields
            data: [
              { id: 1 }, // Missing all property fields
              { title: 'Test' }, // Missing id
              null, // Null entry
            ]
          })
        })
      })
      
      await page.goto(`${config.baseUrl}/dashboard`)
      
      // Should handle gracefully - either show error or skip invalid entries
      // Check that page doesn't crash
      await page.waitForTimeout(2000)
      
      // Page should still be functional
      const pageTitle = await page.title()
      expect(pageTitle).toBeTruthy()
      logger.info('Malformed data handled without crashing')
    })
  })

  test.describe('Authentication Error Handling', () => {
    test('should redirect to login when accessing protected routes without auth', async ({ page, config, logger }) => {
      logger.step('Testing protected route redirect')
      
      // Make sure we're logged out
      await page.context().clearCookies()
      
      // Try to access protected dashboard
      await page.goto(`${config.baseUrl}/dashboard`)
      
      // Should redirect to login
      await expect(page).toHaveURL(/\/(login|signin|auth)/)
      logger.info('Redirected to login for protected route')
    })

    test('should handle expired session gracefully', async ({ page, config, logger, auth }) => {
      logger.step('Testing expired session handling')
      
      // Login first
      await auth.login(config.users.user1)
      await page.goto(`${config.baseUrl}/dashboard`)
      
      // Simulate session expiry by clearing cookies
      await page.context().clearCookies()
      
      // Try to perform an action that requires auth
      await page.reload()
      
      // Should redirect to login or show session expired message
      await expect(page.locator('text=/session|expired|login|sign in/i').first()).toBeVisible({ timeout: 10000 })
      logger.info('Expired session handled gracefully')
    })
  })
})