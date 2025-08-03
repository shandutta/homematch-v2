import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

/**
 * Simplified TypeScript-safe mock Supabase client
 * Focus on functionality over complex chaining
 */
export const makeMockClient = (): jest.Mocked<SupabaseClient<Database>> => {
  // Create chainable query builder that all tables will use
  const createQueryBuilder = () => {
    const builder = {
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      upsert: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      neq: jest.fn().mockReturnThis(),
      gt: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      lt: jest.fn().mockReturnThis(),
      lte: jest.fn().mockReturnThis(),
      like: jest.fn().mockReturnThis(),
      ilike: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      contains: jest.fn().mockReturnThis(),
      containedBy: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      range: jest.fn().mockReturnThis(),
      or: jest.fn().mockReturnThis(),
      not: jest.fn().mockReturnThis(),
      filter: jest.fn().mockReturnThis(),
      match: jest.fn().mockReturnThis(),
      textSearch: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
      maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
      then: jest.fn().mockResolvedValue({ data: [], error: null }),
    }

    // Make chainable
    Object.keys(builder).forEach((key) => {
      if (!['single', 'maybeSingle', 'then'].includes(key)) {
        ;(builder as any)[key].mockReturnValue(builder)
      }
    })

    return builder
  }

  // Create a simple mock that works reliably
  const mockClient = {
    // Database operations - return query builder by default
    from: jest.fn(() => createQueryBuilder()),
    rpc: jest.fn().mockResolvedValue({ data: null, error: null }),

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
      from: jest.fn().mockReturnValue({
        upload: jest.fn().mockResolvedValue({ data: null, error: null }),
        download: jest.fn().mockResolvedValue({ data: null, error: null }),
        remove: jest.fn().mockResolvedValue({ data: null, error: null }),
        list: jest.fn().mockResolvedValue({ data: [], error: null }),
        createSignedUrl: jest
          .fn()
          .mockResolvedValue({ data: null, error: null }),
        createSignedUrls: jest
          .fn()
          .mockResolvedValue({ data: [], error: null }),
        getPublicUrl: jest
          .fn()
          .mockReturnValue({ data: { publicUrl: 'mock-url' } }),
        move: jest.fn().mockResolvedValue({ data: null, error: null }),
        copy: jest.fn().mockResolvedValue({ data: null, error: null }),
        update: jest.fn().mockResolvedValue({ data: null, error: null }),
      }),
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

    // Additional properties
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
 * Simple helper to mock a complete query chain
 * This approach mocks the entire from() chain at once and exposes methods for verification
 */
export const configureMockResponse = (
  client: jest.Mocked<SupabaseClient<Database>>,
  table: keyof Database['public']['Tables'],
  response: { data?: any; error?: any; count?: number }
) => {
  // Create a chainable mock that resolves to the response
  const chainableMock = {
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    upsert: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    neq: jest.fn().mockReturnThis(),
    gt: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(),
    lt: jest.fn().mockReturnThis(),
    lte: jest.fn().mockReturnThis(),
    like: jest.fn().mockReturnThis(),
    ilike: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    contains: jest.fn().mockReturnThis(),
    containedBy: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    range: jest.fn().mockReturnThis(),
    or: jest.fn().mockReturnThis(),
    not: jest.fn().mockReturnThis(),
    filter: jest.fn().mockReturnThis(),
    match: jest.fn().mockReturnThis(),
    textSearch: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue(response),
    maybeSingle: jest.fn().mockResolvedValue(response),
    then: jest.fn((callback) => {
      // Handle promise-like behavior for async/await
      if (callback) {
        return Promise.resolve(callback(response))
      }
      return Promise.resolve(response)
    }),
  }

  // Add promise interface to make it awaitable
  ;(chainableMock as any)[Symbol.toStringTag] = 'Promise'
  ;(chainableMock as any).catch = jest.fn().mockReturnThis()
  ;(chainableMock as any).finally = jest.fn().mockReturnThis()

  // Make all methods return this for chaining except terminators
  Object.keys(chainableMock).forEach((key) => {
    if (!['single', 'maybeSingle', 'then'].includes(key)) {
      ;(chainableMock as any)[key].mockReturnValue(chainableMock)
    }
  })

  // Mock the from method to return our chainable mock
  client.from.mockReturnValue(chainableMock as any)

  // IMPORTANT: Expose the chainable mock methods on the main client for test verification
  // This allows tests to call expect(supabaseMock.insert).toHaveBeenCalledWith()
  ;(client as any).select = chainableMock.select
  ;(client as any).insert = chainableMock.insert
  ;(client as any).update = chainableMock.update
  ;(client as any).delete = chainableMock.delete
  ;(client as any).upsert = chainableMock.upsert
  ;(client as any).eq = chainableMock.eq
  ;(client as any).neq = chainableMock.neq
  ;(client as any).gt = chainableMock.gt
  ;(client as any).gte = chainableMock.gte
  ;(client as any).lt = chainableMock.lt
  ;(client as any).lte = chainableMock.lte
  ;(client as any).like = chainableMock.like
  ;(client as any).ilike = chainableMock.ilike
  ;(client as any).in = chainableMock.in
  ;(client as any).contains = chainableMock.contains
  ;(client as any).containedBy = chainableMock.containedBy
  ;(client as any).order = chainableMock.order
  ;(client as any).limit = chainableMock.limit
  ;(client as any).range = chainableMock.range
  ;(client as any).or = chainableMock.or
  ;(client as any).not = chainableMock.not
  ;(client as any).filter = chainableMock.filter
  ;(client as any).match = chainableMock.match
  ;(client as any).textSearch = chainableMock.textSearch
  ;(client as any).single = chainableMock.single
  ;(client as any).maybeSingle = chainableMock.maybeSingle
  ;(client as any).then = chainableMock.then

  return chainableMock
}

/**
 * Default mock client instance
 */
export const mockSupabaseClient = makeMockClient()

/**
 * Helper to reset all mocks
 */
export const resetMockClient = () => {
  jest.clearAllMocks()
}

/**
 * Helper for RPC calls
 */
export const configureMockRpcResponse = (
  client: jest.Mocked<SupabaseClient<Database>>,
  response: { data?: any; error?: any }
) => {
  ;(client.rpc as jest.Mock).mockResolvedValue(response)
  return client
}
