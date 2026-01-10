/**
 * Test helpers for Supabase mocking used across unit tests.
 * This file intentionally lives outside of __mocks__ to satisfy eslint jest/no-mocks-import.
 * It provides factory functions compatible with the expectations in unit tests.
 */

import type { ConfigFixture, UtilsFixture } from '../types/fixtures'
import type {
  PlaywrightPage,
  PlaywrightRoute,
} from '../types/playwright-interfaces'
type MockThenCallback = (value: {
  data: unknown[]
  error: null
  count: number | null
}) => unknown

export interface MockQueryBuilder {
  select: jest.Mock
  insert: jest.Mock
  update: jest.Mock
  delete: jest.Mock
  eq: jest.Mock
  neq: jest.Mock
  gt: jest.Mock
  gte: jest.Mock
  lt: jest.Mock
  lte: jest.Mock
  like: jest.Mock
  ilike: jest.Mock
  in: jest.Mock
  contains: jest.Mock
  order: jest.Mock
  limit: jest.Mock
  range: jest.Mock
  single: jest.Mock
  maybeSingle: jest.Mock
  then: jest.Mock
}

export interface MockSupabaseClient {
  from: jest.MockedFunction<(table: string) => MockQueryBuilder>
  rpc: jest.Mock
  auth: {
    getUser: jest.Mock
    getSession: jest.Mock
    signInWithPassword: jest.Mock
  }
  storage: {
    from: jest.Mock
  }
  realtime: {
    channel: jest.Mock
  }
}

const createChainableBuilderInternal = (response: {
  data: unknown
  error: null
  count?: number | null
}): MockQueryBuilder => {
  const builder: MockQueryBuilder = {
    select: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    eq: jest.fn(),
    neq: jest.fn(),
    gt: jest.fn(),
    gte: jest.fn(),
    lt: jest.fn(),
    lte: jest.fn(),
    like: jest.fn(),
    ilike: jest.fn(),
    in: jest.fn(),
    contains: jest.fn(),
    order: jest.fn(),
    limit: jest.fn(),
    range: jest.fn(),
    single: jest.fn(async () => {
      // For default builders (array context), single() should return { data: null, error: null }
      if (Array.isArray(response.data)) {
        return { data: null, error: null }
      }
      // If response.data is non-array and provided, pass it through; otherwise default
      if (response.data !== undefined) {
        return { data: response.data ?? null, error: null }
      }
      return { data: null, error: null }
    }),
    maybeSingle: jest.fn(async () => {
      if (Array.isArray(response.data)) {
        return { data: null, error: null }
      }
      if (response.data !== undefined) {
        return { data: response.data ?? null, error: null }
      }
      return { data: null, error: null }
    }),
    then: jest.fn(async (onFulfilled: MockThenCallback) =>
      onFulfilled({
        data: Array.isArray(response.data) ? response.data : [],
        error: null,
        // Default promise resolution should mirror test expectation (count: null)
        count: response.count ?? null,
      })
    ),
  }

  const chain = () => builder
  const chainMethods: Array<
    keyof Omit<MockQueryBuilder, 'single' | 'maybeSingle' | 'then'>
  > = [
    'select',
    'insert',
    'update',
    'delete',
    'eq',
    'neq',
    'gt',
    'gte',
    'lt',
    'lte',
    'like',
    'ilike',
    'in',
    'contains',
    'order',
    'limit',
    'range',
  ]

  for (const method of chainMethods) {
    builder[method].mockImplementation(chain)
  }

  return builder
}

/**
 * Create a new typed mock Supabase client
 */
export const makeMockClient = (): MockSupabaseClient => {
  const defaultResponse: {
    data: unknown[]
    error: null
    count: number | null
  } = {
    data: [],
    error: null,
    count: null,
  }
  const defaultBuilder = createChainableBuilderInternal(defaultResponse)

  const client: MockSupabaseClient = {
    from: jest.fn<(table: string) => MockQueryBuilder>(
      (_table: string) => defaultBuilder
    ),
    rpc: jest.fn(async () => ({ data: null, error: null })),
    auth: {
      getUser: jest.fn(async () => ({ data: { user: null }, error: null })),
      getSession: jest.fn(async () => ({
        data: { session: null },
        error: null,
      })),
      signInWithPassword: jest.fn(async () => ({
        data: { user: null, session: null },
        error: null,
      })),
    },
    storage: {
      from: jest.fn(() => ({
        upload: jest.fn(async () => ({ data: null, error: null })),
        download: jest.fn(async () => ({ data: null, error: null })),
        getPublicUrl: jest.fn((path: string) => ({
          data: { publicUrl: `mock-url/${path}` },
        })),
      })),
    },
    realtime: {
      channel: jest.fn(() => ({
        subscribe: jest.fn(),
        unsubscribe: jest.fn(),
      })),
    },
  }

  return client
}

// Export for e2e tests - proper Playwright fixture implementing UtilsFixture interface
export const utilsFixtures = {
  utils: async (
    { page, config }: { page: PlaywrightPage; config: ConfigFixture },
    use: (fixture: UtilsFixture) => Promise<void>
  ) => {
    const utils = {
      async clearAuthState() {
        // Check if we're on a valid page first
        const url = page.url()
        if (url && url !== 'about:blank') {
          try {
            // Clear all storage types that might contain auth data
            await page.evaluate(() => {
              localStorage.clear()
              sessionStorage.clear()
            })
          } catch (_error) {
            // Ignore errors if page doesn't support storage yet
            console.log(
              'Note: Could not clear storage - page may not be loaded yet'
            )
          }
        }

        // Clear cookies (this always works)
        const context = page.context()
        await context.clearCookies()

        // Clear any indexed DB data if on valid page
        if (url && url !== 'about:blank') {
          try {
            await page.evaluate(() => {
              if ('indexedDB' in window) {
                const dbNames = ['supabase.auth.token']
                dbNames.forEach((name) => {
                  try {
                    indexedDB.deleteDatabase(name)
                  } catch {
                    // Ignore errors
                  }
                })
              }
            })
          } catch {
            // Ignore errors
          }
        }
      },

      async waitForReactToSettle() {
        // Wait for React to finish rendering
        await page.waitForLoadState('networkidle')

        // Additional wait for React hydration
        await page.waitForTimeout(500)

        // Wait for any pending React updates
        await page.evaluate(() => {
          return new Promise((resolve) => {
            if (typeof window !== 'undefined' && window.React) {
              // If React is available, wait a tick for updates
              setTimeout(resolve, 100)
            } else {
              resolve(undefined)
            }
          })
        })
      },

      async waitForFormValidation() {
        // Wait for form validation to complete
        await page.waitForTimeout(config.timeouts.FORM_VALIDATION)

        // Check for any validation errors
        const errorElements = await page
          .locator('.error, .invalid, [aria-invalid="true"]')
          .count()
        if (errorElements > 0) {
          // Give extra time for error messages to render
          await page.waitForTimeout(200)
        }
      },

      async navigateWithRetry(url: string, options: { retries?: number } = {}) {
        const maxRetries = options.retries ?? 3
        let lastError: Error | null = null

        for (let i = 0; i < maxRetries; i++) {
          try {
            await page.goto(url, {
              waitUntil: 'networkidle',
              timeout: config.timeouts.PAGE_LOAD,
            })
            await this.waitForReactToSettle()
            return
          } catch (error) {
            lastError =
              error instanceof Error ? error : new Error(String(error))
            console.warn(`Navigation attempt ${i + 1} failed:`, error)

            if (i < maxRetries - 1) {
              await page.waitForTimeout(1000 * (i + 1)) // Exponential backoff
            }
          }
        }

        throw lastError || new Error('Navigation failed after retries')
      },

      async isAuthenticated(): Promise<boolean> {
        try {
          // Check if Supabase session exists
          const hasSession = await page.evaluate(async () => {
            try {
              const supabase = window.supabase
              if (!supabase?.auth?.getSession) return false

              const { data } = await supabase.auth.getSession()
              return !!data?.session
            } catch {
              return false
            }
          })

          return hasSession
        } catch {
          return false
        }
      },

      async waitForAuthRedirect(
        expectedUrl: string | RegExp,
        options: { timeout?: number; errorMessage?: string } = {}
      ) {
        const timeout = options.timeout ?? config.timeouts.AUTH_REDIRECT
        const errorMessage = options.errorMessage ?? 'Auth redirect failed'

        try {
          await page.waitForURL(expectedUrl, { timeout })
        } catch (error) {
          throw new Error(`${errorMessage}: ${error}`)
        }
      },

      async waitForDashboard(options: { timeout?: number } = {}) {
        const timeout = options.timeout ?? config.timeouts.PAGE_LOAD

        try {
          // Wait for navigation to complete first
          await page.waitForLoadState('networkidle', { timeout })

          // Then wait for dashboard-specific elements to be visible
          await page.waitForSelector(
            '[data-testid="dashboard-header"], h1:has-text("Dashboard"), [data-testid="dashboard-stats"], .dashboard-content',
            {
              timeout,
              state: 'visible',
            }
          )

          // Wait for React to settle after navigation
          await this.waitForReactToSettle()

          // Ensure we're actually on a dashboard page
          const isDashboard = await page.evaluate(() => {
            return (
              window.location.pathname.includes('/dashboard') ||
              document.querySelector(
                '[data-testid="dashboard-header"], h1:has-text("Dashboard"), [data-testid="dashboard-stats"]'
              ) !== null
            )
          })

          if (!isDashboard) {
            throw new Error('Not on dashboard page after waiting')
          }
        } catch (error) {
          throw new Error(`Failed to load dashboard: ${error}`)
        }
      },

      async simulateSlowNetwork(delayMs: number = 1000) {
        // Intercept API calls and add artificial delay
        await page.route('**/api/**', async (route: PlaywrightRoute) => {
          await new Promise((resolve) => setTimeout(resolve, delayMs))
          route.continue()
        })
      },

      async simulateApiError(
        endpoint: string,
        errorCode: number = 500,
        errorMessage?: string
      ) {
        const responseBody =
          errorMessage ||
          (errorCode >= 500
            ? 'DATABASE_CONNECTION_ERROR: Server error'
            : 'API Error')

        await page.route(`**${endpoint}**`, async (route: PlaywrightRoute) => {
          await route.fulfill({
            status: errorCode,
            contentType: 'application/json',
            body: JSON.stringify({
              error: responseBody,
              message: responseBody,
            }),
          })
        })
      },

      async simulateDatabaseError() {
        // Simulate database connection errors for various endpoints
        const databaseErrorResponse = {
          error: 'DATABASE_CONNECTION_ERROR: Connection to database failed',
          message: 'DATABASE_CONNECTION_ERROR: Connection to database failed',
        }

        // Intercept all API routes that might hit the database
        await page.route(
          '**/api/dashboard/**',
          async (route: PlaywrightRoute) => {
            await route.fulfill({
              status: 500,
              contentType: 'application/json',
              body: JSON.stringify(databaseErrorResponse),
            })
          }
        )

        await page.route(
          '**/api/properties/**',
          async (route: PlaywrightRoute) => {
            await route.fulfill({
              status: 500,
              contentType: 'application/json',
              body: JSON.stringify(databaseErrorResponse),
            })
          }
        )

        await page.route(
          '**/api/interactions/**',
          async (route: PlaywrightRoute) => {
            await route.fulfill({
              status: 500,
              contentType: 'application/json',
              body: JSON.stringify(databaseErrorResponse),
            })
          }
        )
      },

      async clearNetworkInterception() {
        // Clear all network route handlers
        await page.unroute('**/*')
      },

      async waitForLoadingState(options: { timeout?: number } = {}) {
        const timeout = options.timeout ?? 5000

        try {
          // Wait for any loading indicator to appear
          await page.waitForSelector(
            '[role="status"], .skeleton, [aria-busy="true"], .loading',
            {
              timeout,
              state: 'visible',
            }
          )
        } catch (_error) {
          // Loading state might be too brief or not present
          console.log('Loading state not detected - data may load immediately')
        }
      },
    }

    await use(utils)
  },
}

/**
 * Configure a specific table response for a given mock client
 */
export const configureMockResponse = (
  client: MockSupabaseClient,
  table: string,
  response:
    | { data: unknown; error: null } // simple shape
    | {
        single?: { data: unknown; error: null }
        maybeSingle?: { data: unknown; error: null }
        array?: { data: unknown[]; error: null; count: number | null }
      }
): void => {
  client.from.mockImplementation((t: string) => {
    if (t === table) {
      // Normalize provided response to the internal format used by createChainableBuilderInternal
      if ('data' in response) {
        const simple = response
        return createChainableBuilderInternal({
          data: Array.isArray(simple.data) ? simple.data : (simple.data ?? []),
          error: simple.error,
          count: Array.isArray(simple.data) ? simple.data.length : null,
        })
      }

      const complex = response
      // Prefer array config for promise resolve
      const arrayData = complex.array?.data ?? []
      const count =
        complex.array?.count ??
        (Array.isArray(arrayData) ? arrayData.length : null)
      // Prefer single config for single/maybeSingle when provided; else default to null
      const chosenSingle = complex.single ?? { data: null, error: null }
      const builder = createChainableBuilderInternal({
        data: arrayData,
        error: null,
        count,
      })
      // Override terminal methods directly on this specific builder to honor complex config
      builder.single = jest.fn(async () => chosenSingle)
      builder.maybeSingle = jest.fn(
        async () => complex.maybeSingle ?? chosenSingle
      )
      return builder
    }
    // default builder for other tables
    return createChainableBuilderInternal({ data: [], error: null, count: 0 })
  })
}
