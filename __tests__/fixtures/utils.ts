/**
 * Test helpers for Supabase mocking used across unit tests.
 * This file intentionally lives outside of __mocks__ to satisfy eslint jest/no-mocks-import.
 * It provides factory functions compatible with the expectations in unit tests.
 */

type AnyFn = (...args: any[]) => any

export interface MockQueryBuilder {
  select: AnyFn
  insert: AnyFn
  update: AnyFn
  delete: AnyFn
  eq: AnyFn
  neq: AnyFn
  gt: AnyFn
  gte: AnyFn
  lt: AnyFn
  lte: AnyFn
  like: AnyFn
  ilike: AnyFn
  in: AnyFn
  contains: AnyFn
  order: AnyFn
  limit: AnyFn
  range: AnyFn
  single: () => Promise<{ data: unknown; error: null }>
  maybeSingle: () => Promise<{ data: unknown; error: null }>
  then: (onFulfilled: AnyFn) => Promise<unknown>
}

export interface MockSupabaseClient {
  from: (table: string) => MockQueryBuilder
  rpc: AnyFn
  auth: {
    getUser: AnyFn
    getSession: AnyFn
    signInWithPassword: AnyFn
  }
  storage: {
    from: AnyFn
  }
  realtime: {
    channel: AnyFn
  }
}

const createChainableBuilderInternal = (response: {
  data: unknown
  error: null
  count?: number | null
}): MockQueryBuilder => {
  const builder: any = {}
  const chain = () => builder

  Object.assign(builder, {
    select: jest.fn(chain),
    insert: jest.fn(chain),
    update: jest.fn(chain),
    delete: jest.fn(chain),
    eq: jest.fn(chain),
    neq: jest.fn(chain),
    gt: jest.fn(chain),
    gte: jest.fn(chain),
    lt: jest.fn(chain),
    lte: jest.fn(chain),
    like: jest.fn(chain),
    ilike: jest.fn(chain),
    in: jest.fn(chain),
    contains: jest.fn(chain),
    order: jest.fn(chain),
    limit: jest.fn(chain),
    range: jest.fn(chain),
    // Return configured terminal responses when provided
    single: jest.fn(async () => {
      // For default builders (array context), single() should return { data: null, error: null }
      if (Array.isArray(response.data)) {
        return { data: null, error: null }
      }
      // If response.data is non-array and provided, pass it through; otherwise default
      if (response && 'data' in response && response.data !== undefined) {
        return { data: response.data ?? null, error: null }
      }
      return { data: null, error: null }
    }),
    maybeSingle: jest.fn(async () => {
      if (Array.isArray(response.data)) {
        return { data: null, error: null }
      }
      if (response && 'data' in response && response.data !== undefined) {
        return { data: response.data ?? null, error: null }
      }
      return { data: null, error: null }
    }),
    then: jest.fn(async (onFulfilled: AnyFn) =>
      onFulfilled({
        data: Array.isArray(response.data) ? response.data : [],
        error: null,
        // Default promise resolution should mirror test expectation (count: null)
        count: response.count ?? null,
      })
    ),
  })

  return builder as MockQueryBuilder
}

/**
 * Create a new typed mock Supabase client
 */
export const makeMockClient = (): MockSupabaseClient => {
  const defaultResponse = {
    data: [],
    error: null as null,
    count: null as number | null,
  }
  const defaultBuilder = createChainableBuilderInternal(defaultResponse)

  const client: MockSupabaseClient = {
    from: jest.fn(() => defaultBuilder),
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
  utils: async ({ page, config }: { page: any; config: any }, use: any) => {
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
            console.log('Note: Could not clear storage - page may not be loaded yet')
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
            if (typeof window !== 'undefined' && (window as any).React) {
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
        const errorElements = await page.locator('.error, .invalid, [aria-invalid="true"]').count()
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
            lastError = error as Error
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
              const supabase = (window as any)?.supabase
              if (!supabase?.auth?.getSession) return false
              
              const { data } = await supabase.auth.getSession()
              return !!(data?.session)
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
  ;(client.from as jest.Mock).mockImplementation((t: string) => {
    if (t === table) {
      // Normalize provided response to the internal format used by createChainableBuilderInternal
      if (
        'single' in (response as any) ||
        'maybeSingle' in (response as any) ||
        'array' in (response as any)
      ) {
        const complex = response as {
          single?: { data: unknown; error: null }
          maybeSingle?: { data: unknown; error: null }
          array?: { data: unknown[]; error: null; count: number | null }
        }
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
        ;(builder as any).single = jest.fn(async () => chosenSingle)
        ;(builder as any).maybeSingle = jest.fn(
          async () => complex.maybeSingle ?? chosenSingle
        )
        return builder
      } else {
        const simple = response as { data: unknown; error: null }
        return createChainableBuilderInternal({
          data: Array.isArray(simple.data) ? simple.data : (simple.data ?? []),
          error: simple.error,
          count: Array.isArray(simple.data) ? simple.data.length : null,
        })
      }
    }
    // default builder for other tables
    return createChainableBuilderInternal({ data: [], error: null, count: 0 })
  })
}
