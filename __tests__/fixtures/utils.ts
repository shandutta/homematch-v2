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

export const utilsFixtures = {
  makeMockClient,
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
