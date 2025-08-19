/**
 * Enhanced E2E Test Framework Integration
 * Combines all Phase 2 improvements into a cohesive testing framework
 */

/* eslint-disable react-hooks/rules-of-hooks */
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
import { test as baseTest, expect, Page } from '@playwright/test'
import { createWorkerAuthHelper } from './auth-helper'
import {
  testDataManager,
  getWorkerTestUser,
  getFreshTestUser,
} from './test-data-manager'
import {
  createTestErrorHandler,
  withErrorHandling,
  ensurePageHealth,
  safeElementInteraction,
} from './test-error-handler'
import {
  performanceMonitor,
  withPerformanceMonitoring,
} from './test-performance-monitor'

/**
 * Enhanced test fixtures with integrated error handling and performance monitoring
 */
export const test = baseTest.extend<{ enhancedPage: any; workerAuth: any }>({
  // Enhanced page with error handling and performance monitoring
  enhancedPage: async ({ page }, use, testInfo) => {
    const errorHandler = createTestErrorHandler()

    // Start performance monitoring
    performanceMonitor.startMonitoring(testInfo.title, testInfo)

    // Enhanced page wrapper
    const enhancedPage = {
      ...page,

      // Safe navigation with error handling
      safeGoto: async (url: string, options?: any) => {
        return withErrorHandling(
          page,
          async () => {
            await page.goto(url, options)
            await errorHandler.waitForStableState(page)
            await performanceMonitor.recordBrowserMetrics(page)
            await performanceMonitor.recordNetworkMetrics(page)
          },
          { errorHandler }
        )
      },

      // Safe element interaction
      safeClick: async (selectors: string[], options?: any) => {
        return safeElementInteraction(
          page,
          selectors,
          'click',
          undefined,
          options
        )
      },

      safeFill: async (selectors: string[], value: string, options?: any) => {
        return safeElementInteraction(page, selectors, 'fill', value, options)
      },

      // Wait for stable state
      waitForStable: async () => {
        await errorHandler.waitForStableState(page)
      },

      // Check page health
      ensureHealthy: async (autoRecover = true) => {
        return ensurePageHealth(page, { autoRecover })
      },

      // Get test data for current worker
      getWorkerData: () => ({
        user: getWorkerTestUser(testInfo),
        freshUser: getFreshTestUser(testInfo),
        household: testDataManager.getHouseholdData(testInfo.workerIndex || 0),
        property: testDataManager.getPropertyData(testInfo.workerIndex || 0),
      }),
    }

    await use(enhancedPage as any)

    // Save performance metrics
    try {
      const metrics = performanceMonitor.stopMonitoring()
      performanceMonitor.saveMetrics(metrics)
    } catch (_error) {
      console.warn('Failed to save performance metrics:', _error)
    }
  },

  // Worker-specific authentication
  workerAuth: async ({ page }, use, testInfo) => {
    const authHelper = createWorkerAuthHelper(page, testInfo)
    await use(authHelper)
  },
})

/**
 * Enhanced test suite with automatic error handling and performance monitoring
 */
export class EnhancedTestSuite {
  constructor(private suiteName: string) {}

  /**
   * Create a test with enhanced features
   */
  create(testName: string, testFn: (args: any) => Promise<void>) {
    return test(
      testName,
      withPerformanceMonitoring(`${this.suiteName}: ${testName}`, testFn)
    )
  }

  /**
   * Create a test with authentication setup
   */
  createWithAuth(testName: string, testFn: (args: any) => Promise<void>) {
    return this.create(testName, async ({ enhancedPage, workerAuth }) => {
      // Automatic authentication setup
      await workerAuth.auth.login(workerAuth.testUser)
      await workerAuth.auth.verifyAuthenticated()

      // Ensure page is healthy before starting test
      await enhancedPage.ensureHealthy()

      await testFn({ enhancedPage, workerAuth })
    })
  }

  /**
   * Create a test with fresh user (no existing data)
   */
  createWithFreshUser(testName: string, testFn: (args: any) => Promise<void>) {
    return this.create(testName, async ({ enhancedPage }) => {
      const userData = enhancedPage.getWorkerData()

      // Manual login with fresh user
      await enhancedPage.safeGoto('/login')
      await enhancedPage.safeFill(
        ['input[type="email"]'],
        userData.freshUser.email
      )
      await enhancedPage.safeFill(
        ['input[type="password"]'],
        userData.freshUser.password
      )
      await enhancedPage.safeClick(['button[type="submit"]'])
      await enhancedPage.waitForStable()

      await testFn({ enhancedPage, userData })
    })
  }

  /**
   * Create an error scenario test
   */
  createErrorScenario(testName: string, testFn: (args: any) => Promise<void>) {
    return this.create(testName, async (args) => {
      try {
        await testFn(args)
      } catch (_error) {
        // Enhanced error logging for error scenarios
        const { enhancedPage } = args
        const errorHandler = createTestErrorHandler()
        const errorResult = await errorHandler.detectError(enhancedPage)

        console.log(`Error scenario "${testName}" completed:`, {
          expectedError: true,
          errorDetected: errorResult.hasError,
          errorType: errorResult.errorType,
          errorMessage: errorResult.errorMessage,
        })

        // Don't re-throw error for error scenario tests unless it's unexpected
        if (!errorResult.hasError) {
          throw new Error(
            `Expected error in scenario "${testName}" but none was detected`
          )
        }
      }
    })
  }
}

/**
 * Enhanced test helpers for common patterns
 */
export const testHelpers = {
  /**
   * Create test suite with enhanced features
   */
  createSuite(suiteName: string): EnhancedTestSuite {
    return new EnhancedTestSuite(suiteName)
  },

  /**
   * Verify element with multiple fallback selectors
   */
  async verifyElement(
    page: Page,
    selectors: string[],
    options?: { timeout?: number }
  ) {
    const { timeout = 5000 } = options || {}

    for (const selector of selectors) {
      try {
        await expect(page.locator(selector)).toBeVisible({ timeout })
        return true
      } catch {
        continue
      }
    }

    throw new Error(`None of the selectors were found: ${selectors.join(', ')}`)
  },

  /**
   * Verify text content with flexible matching
   */
  async verifyText(
    page: Page,
    patterns: (string | RegExp)[],
    options?: { timeout?: number }
  ) {
    const { timeout = 5000 } = options || {}

    for (const pattern of patterns) {
      try {
        if (typeof pattern === 'string') {
          await expect(page.locator(`text=${pattern}`)).toBeVisible({ timeout })
        } else {
          await expect(page.locator(`text=${pattern}`)).toBeVisible({ timeout })
        }
        return true
      } catch {
        continue
      }
    }

    throw new Error(
      `None of the text patterns were found: ${patterns.join(', ')}`
    )
  },

  /**
   * Wait for any of multiple conditions
   */
  async waitForAny(
    page: Page,
    conditions: (() => Promise<boolean>)[],
    timeout = 10000
  ): Promise<number> {
    const startTime = Date.now()

    while (Date.now() - startTime < timeout) {
      for (let i = 0; i < conditions.length; i++) {
        try {
          const result = await conditions[i]()
          if (result) {
            return i
          }
        } catch {
          // Continue to next condition
        }
      }

      await page.waitForTimeout(100)
    }

    throw new Error(`None of the conditions were met within ${timeout}ms`)
  },
}

/**
 * Export enhanced test and expect
 */
export { expect }

import { generatePerformanceReport } from './test-performance-monitor'

/**
 * Performance reporting utility
 */
export function generateTestReport() {
  generatePerformanceReport()
}

/**
 * Example usage patterns
 */
export const exampleUsage = {
  // Basic enhanced test
  basicTest: () => {
    const suite = testHelpers.createSuite('Example Suite')

    suite.create('basic navigation', async ({ enhancedPage }) => {
      await enhancedPage.safeGoto('/dashboard')
      await enhancedPage.ensureHealthy()

      const userData = enhancedPage.getWorkerData()
      console.log('Using worker data:', userData)
    })
  },

  // Authenticated test
  authTest: () => {
    const suite = testHelpers.createSuite('Auth Suite')

    suite.createWithAuth('dashboard access', async ({ enhancedPage }) => {
      await enhancedPage.safeGoto('/dashboard')
      await testHelpers.verifyElement(enhancedPage, [
        '[data-testid="dashboard"]',
        'h1:has-text("Dashboard")',
        'main',
      ])
    })
  },

  // Error scenario test
  errorTest: () => {
    const suite = testHelpers.createSuite('Error Suite')

    suite.createErrorScenario('network failure', async ({ enhancedPage }) => {
      await enhancedPage.route('**/api/**', (route: any) => route.abort())
      await enhancedPage.safeGoto('/dashboard')
      // Test should handle the error gracefully
    })
  },
}
