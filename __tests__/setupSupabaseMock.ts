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
type AnyFn = (...args: any[]) => any

const createChainableBuilder = () => {
  const builder = {
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
    then: jest
      .fn()
      .mockImplementation((onFulfilled: AnyFn) =>
        Promise.resolve(onFulfilled({ data: [], error: null, count: null }))
      ),
  } as any

  // Set up circular references after builder is created
  builder.select.mockReturnValue(builder)
  builder.insert.mockReturnValue(builder)
  builder.update.mockReturnValue(builder)
  builder.delete.mockReturnValue(builder)
  builder.eq.mockReturnValue(builder)
  builder.neq.mockReturnValue(builder)
  builder.gt.mockReturnValue(builder)
  builder.gte.mockReturnValue(builder)
  builder.lt.mockReturnValue(builder)
  builder.lte.mockReturnValue(builder)
  builder.like.mockReturnValue(builder)
  builder.ilike.mockReturnValue(builder)
  builder.in.mockReturnValue(builder)
  builder.contains.mockReturnValue(builder)
  builder.order.mockReturnValue(builder)
  builder.limit.mockReturnValue(builder)
  builder.range.mockReturnValue(builder)

  return builder
}

const mockSupabaseClient: any = {
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
  // Enhanced chainable builder with more methods
  ...createChainableBuilder(),
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
