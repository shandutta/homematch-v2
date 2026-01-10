/**
 * Global Supabase mocks for Jest.
 * IMPORTANT: Do not import from __mocks__ directly in tests.
 * This file centralizes jest.mock calls and pulls test doubles from a local helper,
 * not from a __mocks__ module import in the test files themselves.
 */
/// <reference types="jest" />
import { jest } from '@jest/globals'
/**
 * Importing from __mocks__ directly can trip jest/no-mocks-import when used in tests.
 * This central setup file is allowed to import internal test helpers.
 * To appease the rule, inline the simple mock here rather than importing from __mocks__.
 */

type MockThenCallback = (value: {
  data: unknown[]
  error: null
  count: number | null
}) => unknown

type MockFn<Args extends unknown[], Return> = jest.MockedFunction<
  (...args: Args) => Return
>

type MockChainableBuilder = {
  select: MockFn<[], MockChainableBuilder>
  insert: MockFn<[], MockChainableBuilder>
  update: MockFn<[], MockChainableBuilder>
  delete: MockFn<[], MockChainableBuilder>
  eq: MockFn<[], MockChainableBuilder>
  neq: MockFn<[], MockChainableBuilder>
  gt: MockFn<[], MockChainableBuilder>
  gte: MockFn<[], MockChainableBuilder>
  lt: MockFn<[], MockChainableBuilder>
  lte: MockFn<[], MockChainableBuilder>
  like: MockFn<[], MockChainableBuilder>
  ilike: MockFn<[], MockChainableBuilder>
  in: MockFn<[], MockChainableBuilder>
  contains: MockFn<[], MockChainableBuilder>
  order: MockFn<[], MockChainableBuilder>
  limit: MockFn<[], MockChainableBuilder>
  range: MockFn<[], MockChainableBuilder>
  single: MockFn<[], Promise<{ data: null; error: null }>>
  maybeSingle: MockFn<[], Promise<{ data: null; error: null }>>
  then: MockFn<[MockThenCallback], Promise<unknown>>
}

const createChainableBuilder = (): MockChainableBuilder => {
  const builder: MockChainableBuilder = {
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
    single: jest.fn().mockResolvedValue({ data: null, error: null }),
    maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
    then: jest.fn(),
  }

  // Set up circular references after builder is created
  const chainMethods: Array<
    keyof Omit<MockChainableBuilder, 'single' | 'maybeSingle' | 'then'>
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
    builder[method].mockReturnValue(builder)
  }
  builder.then.mockImplementation((onFulfilled: MockThenCallback) =>
    Promise.resolve(onFulfilled({ data: [], error: null, count: null }))
  )

  return builder
}

type MockSupabaseClient = MockChainableBuilder & {
  from: MockFn<[string], MockChainableBuilder>
  rpc: MockFn<[], Promise<{ data: null; error: null }>>
  auth: {
    getUser: MockFn<[], Promise<{ data: { user: null }; error: null }>>
    getSession: MockFn<[], Promise<{ data: { session: null }; error: null }>>
    signInWithPassword: MockFn<
      [],
      Promise<{ data: { user: null; session: null }; error: null }>
    >
    signInWithOAuth: MockFn<[], Promise<{ data: { url: null }; error: null }>>
    signOut: MockFn<[], Promise<{ error: null }>>
    signUp: MockFn<
      [],
      Promise<{ data: { user: null; session: null }; error: null }>
    >
    verifyOtp: MockFn<
      [],
      Promise<{ data: { user: null; session: null }; error: null }>
    >
    resend: MockFn<[], Promise<{ data: null; error: null }>>
    resetPasswordForEmail: MockFn<
      [],
      Promise<{ data: Record<string, never>; error: null }>
    >
    updateUser: MockFn<[], Promise<{ data: { user: null }; error: null }>>
    onAuthStateChange: MockFn<
      [],
      { data: { subscription: { unsubscribe: MockFn<[], void> } } }
    >
  }
  storage: {
    from: MockFn<
      [string],
      {
        upload: MockFn<[], Promise<{ data: null; error: null }>>
        download: MockFn<[], Promise<{ data: null; error: null }>>
        getPublicUrl: MockFn<[string], { data: { publicUrl: string } }>
        remove: MockFn<[], Promise<{ data: null; error: null }>>
        list: MockFn<[], Promise<{ data: unknown[]; error: null }>>
      }
    >
  }
  realtime: {
    channel: MockFn<
      [],
      {
        subscribe: MockFn<[], void>
        unsubscribe: MockFn<[], void>
        on: MockFn<[], void>
      }
    >
  }
}

const chainableBuilder = createChainableBuilder()
const mockSupabaseClient: MockSupabaseClient = {
  ...chainableBuilder,
  from: jest.fn(() => createChainableBuilder()),
  rpc: jest.fn(async () => ({ data: null, error: null })),
  auth: {
    getUser: jest.fn(async () => ({ data: { user: null }, error: null })),
    getSession: jest.fn(async () => ({ data: { session: null }, error: null })),
    signInWithPassword: jest.fn(async () => ({
      data: { user: null, session: null },
      error: null,
    })),
    signInWithOAuth: jest.fn(async () => ({
      data: { url: null },
      error: null,
    })),
    signOut: jest.fn(async () => ({ error: null })),
    signUp: jest.fn(async () => ({
      data: { user: null, session: null },
      error: null,
    })),
    verifyOtp: jest.fn(async () => ({
      data: { user: null, session: null },
      error: null,
    })),
    resend: jest.fn(async () => ({ data: null, error: null })),
    resetPasswordForEmail: jest.fn(async () => ({ data: {}, error: null })),
    updateUser: jest.fn(async () => ({ data: { user: null }, error: null })),
    onAuthStateChange: jest.fn(() => ({
      data: { subscription: { unsubscribe: jest.fn() } },
    })),
  },
  storage: {
    from: jest.fn(() => ({
      upload: jest.fn(async () => ({ data: null, error: null })),
      download: jest.fn(async () => ({ data: null, error: null })),
      getPublicUrl: jest.fn((path: string) => ({
        data: { publicUrl: `mock-url/${path}` },
      })),
      remove: jest.fn(async () => ({ data: null, error: null })),
      list: jest.fn(async () => ({ data: [], error: null })),
    })),
  },
  realtime: {
    channel: jest.fn(() => ({
      subscribe: jest.fn(),
      unsubscribe: jest.fn(),
      on: jest.fn().mockReturnThis(),
    })),
  },
}

// Mock the Supabase client creation globally by mocking the original module path
jest.mock('@supabase/supabase-js', () => {
  // Avoid spreading non-object types; return only what we need
  return {
    createClient: jest.fn(() => mockSupabaseClient),
  }
})

// Also mock the server-side createClient for services that use it (original import path)
jest.mock('@/lib/supabase/server', () => {
  return {
    createClient: jest.fn(() => Promise.resolve(mockSupabaseClient)),
    createApiClient: jest.fn(() => mockSupabaseClient),
  }
})

// Mock the client-side createClient (original import path)
jest.mock('@/lib/supabase/client', () => {
  return {
    createClient: jest.fn(() => mockSupabaseClient),
  }
})

// Mock Next.js router globally
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
    prefetch: jest.fn(),
  })),
  useSearchParams: jest.fn(() => new URLSearchParams()),
  usePathname: jest.fn(() => '/'),
  redirect: jest.fn(),
  notFound: jest.fn(),
}))

// Mock process.env for tests
const originalEnv = process.env
process.env = {
  ...originalEnv,
  NODE_ENV: 'test',
  NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
}
