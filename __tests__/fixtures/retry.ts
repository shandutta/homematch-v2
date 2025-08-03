/**
 * Retry fixture for HomeMatch V2 E2E tests
 * Provides retry logic and error handling utilities
 */

import { RetryFixture } from '../types/fixtures'

// Export just the fixtures object, not a test object
export const retryFixtures = {
  // eslint-disable-next-line no-empty-pattern
  retry: async ({}: any, use: any) => {
    const retryFixture: RetryFixture = {
      async retry<T>(
        operation: () => Promise<T>,
        options: {
          maxAttempts?: number
          delay?: number
          backoff?: 'linear' | 'exponential'
          onRetry?: (error: Error, attempt: number) => void
          shouldRetry?: (error: Error) => boolean
        } = {}
      ): Promise<T> {
        const {
          maxAttempts = 3,
          delay = 1000,
          backoff = 'exponential',
          onRetry = () => {},
          shouldRetry = () => true,
        } = options

        let lastError: Error

        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
          try {
            return await operation()
          } catch (error) {
            lastError = error as Error

            if (attempt === maxAttempts || !shouldRetry(lastError)) {
              throw lastError
            }

            onRetry(lastError, attempt)

            const waitTime =
              backoff === 'exponential'
                ? delay * Math.pow(2, attempt - 1)
                : delay

            await new Promise((resolve) => setTimeout(resolve, waitTime))
          }
        }

        throw lastError!
      },

      async network<T>(operation: () => Promise<T>): Promise<T> {
        return this.retry(operation, {
          maxAttempts: 5,
          delay: 2000,
          shouldRetry: (error) => {
            const message = error.message || error.toString()
            return [
              'ERR_CONNECTION_REFUSED',
              'ECONNREFUSED',
              'ETIMEDOUT',
              'ERR_NETWORK',
              'Failed to fetch',
              'net::ERR_INTERNET_DISCONNECTED',
            ].some((msg) => message.includes(msg))
          },
          onRetry: (error, attempt) => {
            console.log(
              `⚠️  Network error (attempt ${attempt}): ${error.message}`
            )
          },
        })
      },

      async element<T>(operation: () => Promise<T>): Promise<T> {
        return this.retry(operation, {
          maxAttempts: 3,
          delay: 500,
          shouldRetry: (error) => {
            const message = error.message || error.toString()
            return [
              'Element is not visible',
              'Element not found',
              'Timeout',
              'element is not attached',
              'Element is not enabled',
            ].some((msg) => message.includes(msg))
          },
          onRetry: (error, attempt) => {
            console.log(
              `⚠️  Element not ready (attempt ${attempt}): ${error.message}`
            )
          },
        })
      },

      async auth<T>(operation: () => Promise<T>): Promise<T> {
        return this.retry(operation, {
          maxAttempts: 3,
          delay: 1000,
          backoff: 'linear',
          shouldRetry: (error) => {
            const message = error.message || error.toString()
            return [
              'Invalid login credentials',
              'User not found',
              'Session expired',
              'Auth session missing',
              'Authentication failed',
            ].some((msg) => message.includes(msg))
          },
          onRetry: (error, attempt) => {
            console.log(`⚠️  Auth error (attempt ${attempt}): ${error.message}`)
          },
        })
      },
    }

    await use(retryFixture)
  },
}

// expect is exported from index.ts
