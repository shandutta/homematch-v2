/**
 * Consistent error handling and recovery patterns for E2E tests
 * Provides standardized error detection, logging, and recovery mechanisms
 */

import { Page } from '@playwright/test'

export interface ErrorPattern {
  selectors: string[]
  messages: string[]
  severity: 'critical' | 'high' | 'medium' | 'low'
  recovery?: () => Promise<void>
}

export interface TestErrorHandler {
  detectError(page: Page): Promise<ErrorDetectionResult>
  handleAuthError(page: Page): Promise<boolean>
  handleNetworkError(page: Page): Promise<boolean>
  handleUIError(page: Page): Promise<boolean>
  waitForStableState(page: Page): Promise<void>
}

export interface ErrorDetectionResult {
  hasError: boolean
  errorType?: 'auth' | 'network' | 'ui' | 'unknown'
  errorMessage?: string
  canRecover: boolean
}

/**
 * Standard error patterns across the application
 */
const ERROR_PATTERNS: Record<'auth' | 'network' | 'ui', ErrorPattern> = {
  auth: {
    selectors: ['[data-testid="auth-error"]', '.auth-error', '[role="alert"]'],
    messages: [
      'not authenticated',
      'please sign in',
      'login required',
      'invalid credentials',
      'session expired',
    ],
    severity: 'high',
  },
  network: {
    selectors: [
      '[data-testid="network-error"]',
      '.network-error',
      '.connection-error',
    ],
    messages: [
      'network error',
      'connection failed',
      'server unavailable',
      'timeout',
      'offline',
    ],
    severity: 'medium',
  },
  ui: {
    selectors: [
      '[data-testid="error-boundary"]',
      '.error-boundary',
      'text=/something went wrong/i',
      'text=/error/i',
    ],
    messages: [
      'something went wrong',
      'unexpected error',
      'component error',
      'render error',
    ],
    severity: 'critical',
  },
}

/**
 * Recovery strategies for different error types
 */
const RECOVERY_STRATEGIES = {
  auth: async (page: Page) => {
    // Try to navigate to login
    await page.goto('/login').catch(() => {})
    await page.waitForTimeout(1000)
    return true
  },
  network: async (page: Page) => {
    // Try page refresh
    await page.reload().catch(() => {})
    await page.waitForTimeout(2000)
    return true
  },
  ui: async (page: Page) => {
    // Look for retry buttons
    const retrySelectors = [
      'button:has-text("Try Again")',
      'button:has-text("Refresh")',
      'button:has-text("Reload")',
    ]

    for (const selector of retrySelectors) {
      try {
        const button = await page.locator(selector).first()
        if (await button.isVisible()) {
          await button.click()
          await page.waitForTimeout(1000)
          return true
        }
      } catch {
        // Intentionally empty - error detection pattern
      }
    }
    return false
  },
}

/**
 * Create error handler instance
 */
export function createTestErrorHandler(): TestErrorHandler {
  const errorTypes: Array<keyof typeof ERROR_PATTERNS> = [
    'auth',
    'network',
    'ui',
  ]
  return {
    /**
     * Detect if any error is present on the page
     */
    async detectError(page: Page): Promise<ErrorDetectionResult> {
      for (const errorType of errorTypes) {
        const pattern = ERROR_PATTERNS[errorType]
        // Check selectors
        for (const selector of pattern.selectors) {
          try {
            const element = await page.locator(selector).first()
            if (await element.isVisible()) {
              const text = (await element.textContent()) || ''
              return {
                hasError: true,
                errorType,
                errorMessage: text,
                canRecover: true,
              }
            }
          } catch {
            // Intentionally empty - error detection pattern
          }
        }

        // Check message patterns
        for (const message of pattern.messages) {
          try {
            const element = await page.locator(`text=/${message}/i`).first()
            if (await element.isVisible()) {
              return {
                hasError: true,
                errorType,
                errorMessage: message,
                canRecover: true,
              }
            }
          } catch {
            // Intentionally empty - error detection pattern
          }
        }
      }

      return { hasError: false, canRecover: false }
    },

    /**
     * Handle authentication errors
     */
    async handleAuthError(page: Page): Promise<boolean> {
      try {
        return await RECOVERY_STRATEGIES.auth(page)
      } catch {
        return false
      }
    },

    /**
     * Handle network errors
     */
    async handleNetworkError(page: Page): Promise<boolean> {
      try {
        return await RECOVERY_STRATEGIES.network(page)
      } catch {
        return false
      }
    },

    /**
     * Handle UI errors
     */
    async handleUIError(page: Page): Promise<boolean> {
      try {
        return await RECOVERY_STRATEGIES.ui(page)
      } catch {
        return false
      }
    },

    /**
     * Wait for page to reach stable state
     */
    async waitForStableState(page: Page): Promise<void> {
      // Wait for network idle
      await page.waitForLoadState('networkidle').catch(() => {})

      // Wait for React hydration
      await page.waitForTimeout(1000)

      // Check for loading indicators
      const loadingSelectors = [
        '[data-testid="loading"]',
        '.loading',
        '.spinner',
        'text=/loading/i',
      ]

      for (const selector of loadingSelectors) {
        try {
          await page.waitForSelector(selector, {
            state: 'hidden',
            timeout: 5000,
          })
        } catch {
          // Intentionally empty - error detection pattern
        }
      }
    },
  }
}

/**
 * Utility functions for common error handling patterns
 */

/**
 * Safely attempt an operation with error detection and recovery
 */
export async function withErrorHandling<T>(
  page: Page,
  operation: () => Promise<T>,
  options: { maxRetries?: number; errorHandler?: TestErrorHandler } = {}
): Promise<T> {
  const { maxRetries = 2, errorHandler = createTestErrorHandler() } = options
  let lastError: Error | null = null

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await operation()
      return result
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))

      if (attempt < maxRetries) {
        // Detect error type
        const errorResult = await errorHandler.detectError(page)

        if (errorResult.hasError && errorResult.canRecover) {
          // Attempt recovery
          let recovered = false
          switch (errorResult.errorType) {
            case 'auth':
              recovered = await errorHandler.handleAuthError(page)
              break
            case 'network':
              recovered = await errorHandler.handleNetworkError(page)
              break
            case 'ui':
              recovered = await errorHandler.handleUIError(page)
              break
          }

          if (recovered) {
            await errorHandler.waitForStableState(page)
            continue // Retry operation
          }
        }
      }
    }
  }

  throw lastError || new Error('Operation failed after retries')
}

/**
 * Check if page is in error state and optionally recover
 */
export async function ensurePageHealth(
  page: Page,
  options: { autoRecover?: boolean } = {}
): Promise<boolean> {
  const { autoRecover = true } = options
  const errorHandler = createTestErrorHandler()

  const errorResult = await errorHandler.detectError(page)

  if (!errorResult.hasError) {
    return true
  }

  if (!autoRecover || !errorResult.canRecover) {
    return false
  }

  // Attempt recovery
  let recovered = false
  switch (errorResult.errorType) {
    case 'auth':
      recovered = await errorHandler.handleAuthError(page)
      break
    case 'network':
      recovered = await errorHandler.handleNetworkError(page)
      break
    case 'ui':
      recovered = await errorHandler.handleUIError(page)
      break
  }

  if (recovered) {
    await errorHandler.waitForStableState(page)

    // Verify recovery
    const postRecoveryError = await errorHandler.detectError(page)
    return !postRecoveryError.hasError
  }

  return false
}

/**
 * Flexible element interaction with error tolerance
 */
export async function safeElementInteraction(
  page: Page,
  selectors: string[],
  action: 'click' | 'fill' | 'check',
  value?: string,
  options: { timeout?: number; required?: boolean } = {}
): Promise<boolean> {
  const { timeout = 5000, required = false } = options

  for (const selector of selectors) {
    try {
      const element = await page.waitForSelector(selector, {
        timeout,
        state: 'visible',
      })

      if (element) {
        switch (action) {
          case 'click':
            await element.click()
            break
          case 'fill':
            if (value !== undefined) {
              await element.fill(value)
            }
            break
          case 'check':
            await element.check()
            break
        }
        return true
      }
    } catch (error) {
      if (required && selectors.indexOf(selector) === selectors.length - 1) {
        throw error
      }
      continue
    }
  }

  return false
}
