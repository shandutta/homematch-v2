import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

/**
 * Creates a fully typed mock Supabase client for unit tests
 * Provides comprehensive query builder chains and proper TypeScript safety
 * Redesigned to support both chaining AND individual method verification
 */
export const makeMockClient = (): jest.Mocked<SupabaseClient<Database>> => {
  // Create a reusable mock query builder that supports chaining
  const createMockQueryBuilder = () => {
    const mockQueryBuilder = {
      // Query methods
      select: jest.fn(),
      insert: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      upsert: jest.fn(),

      // Filter methods
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
      containedBy: jest.fn(),
      rangeGt: jest.fn(),
      rangeGte: jest.fn(),
      rangeLt: jest.fn(),
      rangeLte: jest.fn(),
      rangeAdjacent: jest.fn(),
      overlaps: jest.fn(),
      textSearch: jest.fn(),
      match: jest.fn(),
      not: jest.fn(),
      or: jest.fn(),
      filter: jest.fn(),

      // Modifiers
      order: jest.fn(),
      limit: jest.fn(),
      range: jest.fn(),
      abortSignal: jest.fn(),

      // Terminators - these end the chain and return promises
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
      maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
      then: jest.fn().mockResolvedValue({ data: [], error: null, count: null }),

      // For direct promise resolution
      $$typeof: Symbol.for('react.element'), // Helps with React testing
    } as any

    // Configure all non-terminator methods to return the same builder for chaining
    Object.keys(mockQueryBuilder).forEach((key) => {
      if (
        typeof mockQueryBuilder[key] === 'function' &&
        !['single', 'maybeSingle', 'then'].includes(key)
      ) {
        mockQueryBuilder[key].mockImplementation(() => {
          // Return the builder for chaining
          return mockQueryBuilder
        })
      }
    })

    return mockQueryBuilder
  }

  // Create mock storage bucket
  const createMockStorageBucket = () => ({
    upload: jest.fn().mockResolvedValue({ data: null, error: null }),
    download: jest.fn().mockResolvedValue({ data: null, error: null }),
    remove: jest.fn().mockResolvedValue({ data: null, error: null }),
    list: jest.fn().mockResolvedValue({ data: [], error: null }),
    createSignedUrl: jest.fn().mockResolvedValue({ data: null, error: null }),
    createSignedUrls: jest.fn().mockResolvedValue({ data: [], error: null }),
    getPublicUrl: jest
      .fn()
      .mockReturnValue({ data: { publicUrl: 'mock-url' } }),
    move: jest.fn().mockResolvedValue({ data: null, error: null }),
    copy: jest.fn().mockResolvedValue({ data: null, error: null }),
    update: jest.fn().mockResolvedValue({ data: null, error: null }),
  })

  // Create a shared query builder instance that can be accessed for verification
  const sharedQueryBuilder = createMockQueryBuilder()

  // Main mock client
  const mockClient = {
    // Database operations
    from: jest.fn(() => sharedQueryBuilder),
    rpc: jest.fn().mockResolvedValue({ data: null, error: null }),

    // Expose query builder methods on main client for test verification
    // This allows tests to call expect(supabaseMock.select).toHaveBeenCalledWith()
    select: sharedQueryBuilder.select,
    insert: sharedQueryBuilder.insert,
    update: sharedQueryBuilder.update,
    delete: sharedQueryBuilder.delete,
    upsert: sharedQueryBuilder.upsert,
    eq: sharedQueryBuilder.eq,
    neq: sharedQueryBuilder.neq,
    gt: sharedQueryBuilder.gt,
    gte: sharedQueryBuilder.gte,
    lt: sharedQueryBuilder.lt,
    lte: sharedQueryBuilder.lte,
    like: sharedQueryBuilder.like,
    ilike: sharedQueryBuilder.ilike,
    in: sharedQueryBuilder.in,
    contains: sharedQueryBuilder.contains,
    containedBy: sharedQueryBuilder.containedBy,
    rangeGt: sharedQueryBuilder.rangeGt,
    rangeGte: sharedQueryBuilder.rangeGte,
    rangeLt: sharedQueryBuilder.rangeLt,
    rangeLte: sharedQueryBuilder.rangeLt,
    rangeAdjacent: sharedQueryBuilder.rangeAdjacent,
    overlaps: sharedQueryBuilder.overlaps,
    textSearch: sharedQueryBuilder.textSearch,
    match: sharedQueryBuilder.match,
    not: sharedQueryBuilder.not,
    or: sharedQueryBuilder.or,
    filter: sharedQueryBuilder.filter,
    order: sharedQueryBuilder.order,
    limit: sharedQueryBuilder.limit,
    range: sharedQueryBuilder.range,
    abortSignal: sharedQueryBuilder.abortSignal,
    single: sharedQueryBuilder.single,
    maybeSingle: sharedQueryBuilder.maybeSingle,
    then: sharedQueryBuilder.then,

    // Authentication
    auth: {
      getUser: jest
        .fn()
        .mockResolvedValue({ data: { user: null }, error: null }),
      getSession: jest
        .fn()
        .mockResolvedValue({ data: { session: null }, error: null }),
      signInWithPassword: jest.fn().mockResolvedValue({
        data: { user: null, session: null },
        error: null,
      }),
      signInWithOAuth: jest.fn().mockResolvedValue({
        data: { url: null, provider: 'google' },
        error: null,
      }),
      signOut: jest.fn().mockResolvedValue({ error: null }),
      signUp: jest.fn().mockResolvedValue({
        data: { user: null, session: null },
        error: null,
      }),
      resetPasswordForEmail: jest
        .fn()
        .mockResolvedValue({ data: {}, error: null }),
      updateUser: jest.fn().mockResolvedValue({
        data: { user: null },
        error: null,
      }),
      refreshSession: jest.fn().mockResolvedValue({
        data: { session: null, user: null },
        error: null,
      }),
      setSession: jest.fn().mockResolvedValue({
        data: { session: null, user: null },
        error: null,
      }),
      onAuthStateChange: jest.fn().mockReturnValue({
        data: { subscription: { unsubscribe: jest.fn() } },
      }),
      startAutoRefresh: jest.fn(),
      stopAutoRefresh: jest.fn(),
    } as any,

    // Storage
    storage: {
      from: jest.fn(() => createMockStorageBucket()),
      getBucket: jest.fn().mockResolvedValue({ data: null, error: null }),
      listBuckets: jest.fn().mockResolvedValue({ data: [], error: null }),
      createBucket: jest.fn().mockResolvedValue({ data: null, error: null }),
      deleteBucket: jest.fn().mockResolvedValue({ data: null, error: null }),
      emptyBucket: jest.fn().mockResolvedValue({ data: null, error: null }),
      updateBucket: jest.fn().mockResolvedValue({ data: null, error: null }),
    } as any,

    // Realtime
    realtime: {
      connect: jest.fn(),
      disconnect: jest.fn(),
      getChannels: jest.fn().mockReturnValue([]),
      removeChannel: jest.fn(),
      removeAllChannels: jest.fn(),
      channel: jest.fn().mockReturnValue({
        on: jest.fn().mockReturnThis(),
        subscribe: jest.fn().mockReturnValue('ok'),
        unsubscribe: jest.fn().mockReturnValue('ok'),
        send: jest.fn().mockReturnValue('ok'),
      }),
    } as any,

    // Edge Functions
    functions: {
      invoke: jest.fn().mockResolvedValue({ data: null, error: null }),
    } as any,

    // Additional properties that might be accessed
    supabaseUrl: 'mock-url',
    supabaseKey: 'mock-key',
    rest: {} as any,
    realtimeUrl: 'mock-realtime-url',
    authUrl: 'mock-auth-url',
    storageUrl: 'mock-storage-url',
    functionsUrl: 'mock-functions-url',
  }

  return mockClient as unknown as jest.Mocked<SupabaseClient<Database>>
}

/**
 * Default mock client instance for quick access
 * Can be imported directly in tests that need a simple mock
 */
export const mockSupabaseClient = makeMockClient()

/**
 * Helper to reset all mocks on the client
 * Useful in beforeEach hooks to ensure clean test state
 */
export const resetMockClient = (
  client: jest.Mocked<SupabaseClient<Database>> = mockSupabaseClient
) => {
  jest.clearAllMocks()

  // Reset specific mock implementations that might have been customized
  client.from.mockImplementation(() => {
    const builder = client.from({} as any)
    return builder
  })
}

/**
 * Helper to configure mock responses for common patterns
 * Works with the redesigned mock architecture to maintain method verification
 * and eliminate timeout issues
 */
export const configureMockResponse = (
  client: jest.Mocked<SupabaseClient<Database>>,
  table: keyof Database['public']['Tables'],
  response: { data?: any; error?: any; count?: number }
) => {
  // The key insight: we need to configure the query builder returned by from()
  // to have the correct terminator responses, not the main client

  // Get the query builder that from() returns (this is the sharedQueryBuilder)
  const queryBuilder = client.from(table as any)

  // Configure the terminator methods on the query builder to return the specified response
  if (queryBuilder && typeof queryBuilder === 'object') {
    // Type assertion to avoid TS errors - in runtime these methods exist on the mock
    const qb = queryBuilder as any
    if (qb.single) {
      qb.single.mockResolvedValue(response)
    }
    if (qb.maybeSingle) {
      qb.maybeSingle.mockResolvedValue(response)
    }
    if (qb.then) {
      qb.then.mockResolvedValue(response)
    }
  }

  // For queries that return arrays/lists, configure the promise resolution
  if (Array.isArray(response.data)) {
    const listResponse = {
      data: response.data,
      error: response.error,
      count: response.count,
    }
    // Type assertion to avoid TS errors - in runtime these methods exist on the mock
    const qb = queryBuilder as any
    if (qb && qb.then) {
      qb.then.mockResolvedValue(listResponse)
    }
  }

  // Return the client for chaining if needed
  return client
}

/**
 * Helper to configure mock responses for RPC (stored procedure) calls
 */
export const configureMockRpcResponse = (
  client: jest.Mocked<SupabaseClient<Database>>,
  response: { data?: any; error?: any }
) => {
  ;(client.rpc as jest.Mock).mockResolvedValue(response)
  return client
}
