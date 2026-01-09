/**
 * Mock helper utilities for integration tests
 * Provides easy ways to customize centralized mocks for specific test scenarios
 */

import { createClient } from '@/lib/supabase/client'
import { createApiClient } from '@/lib/supabase/server'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import type { AuthError } from '@supabase/supabase-js'

type SupabaseAuthOverrides = Partial<Record<string, unknown>>
type SupabaseFromOverrides = (table: string) => Record<string, unknown>
type SupabaseOverrides = {
  auth?: SupabaseAuthOverrides
  from?: SupabaseFromOverrides
} & Record<string, unknown>

const asMocked = <T extends (...args: never[]) => unknown>(fn: T) =>
  fn as jest.MockedFunction<T>

/**
 * Helper to customize Supabase client mock for specific test scenarios
 */
export function mockSupabaseClient(overrides: SupabaseOverrides = {}) {
  const client = jest.mocked(createClient).mockReturnValue({
    auth: {
      signInWithPassword: jest.fn(() => Promise.resolve({ error: null })),
      signInWithOAuth: jest.fn(() => Promise.resolve({ error: null })),
      signUp: jest.fn(() => Promise.resolve({ error: null })),
      signOut: jest.fn(() => Promise.resolve({ error: null })),
      getUser: jest.fn(() =>
        Promise.resolve({
          data: { user: null },
          error: null,
        })
      ),
      getSession: jest.fn(() =>
        Promise.resolve({
          data: { session: null },
          error: null,
        })
      ),
      onAuthStateChange: jest.fn((_callback) => ({
        data: { subscription: { unsubscribe: jest.fn() } },
      })),
      ...overrides.auth,
    },
    from: jest.fn((table: string) => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn(() => Promise.resolve({ data: null, error: null })),
      then: jest.fn((onFulfilled) => onFulfilled({ data: [], error: null })),
      ...overrides.from?.(table),
    })),
    rpc: jest.fn(() => Promise.resolve({ data: null, error: null })),
    ...overrides,
  } as unknown as ReturnType<typeof createClient>)

  return client
}

/**
 * Helper to customize Supabase server client mock for API tests
 */
export function mockSupabaseServerClient(overrides: SupabaseOverrides = {}) {
  const client = jest.mocked(createApiClient).mockReturnValue({
    auth: {
      getUser: jest.fn(() =>
        Promise.resolve({
          data: { user: { id: 'test-user-id', email: 'test@example.com' } },
          error: null,
        })
      ),
      getSession: jest.fn(() =>
        Promise.resolve({
          data: {
            session: {
              user: { id: 'test-user-id', email: 'test@example.com' },
              access_token: 'test-token',
              refresh_token: 'test-refresh-token',
            },
          },
          error: null,
        })
      ),
      ...overrides.auth,
    },
    from: jest.fn((table: string) => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn(() => Promise.resolve({ data: null, error: null })),
      then: jest.fn((onFulfilled) => onFulfilled({ data: [], error: null })),
      ...overrides.from?.(table),
    })),
    rpc: jest.fn(() => Promise.resolve({ data: null, error: null })),
    ...overrides,
  } as unknown as ReturnType<typeof createApiClient>)

  return client
}

/**
 * Helper to customize Next.js router mock
 */
export function mockNextRouter(overrides: Record<string, unknown> = {}) {
  const router = {
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
    prefetch: jest.fn(),
    ...overrides,
  }

  jest.mocked(useRouter).mockReturnValue(router)

  return router
}

/**
 * Helper to mock authenticated user
 */
export function mockAuthenticatedUser(
  userId = 'test-user-id',
  email = 'test@example.com'
) {
  const user = {
    id: userId,
    email,
    app_metadata: {},
    user_metadata: {},
    aud: 'authenticated',
    created_at: new Date().toISOString(),
  }

  // Update client mock
  const clientMock = jest.mocked(createClient)
  const client = clientMock() as jest.Mocked<ReturnType<typeof createClient>>
  asMocked(client.auth.getUser).mockResolvedValue({
    data: { user },
    error: null,
  })
  asMocked(client.auth.getSession).mockResolvedValue({
    data: {
      session: {
        user,
        access_token: 'test-token',
        refresh_token: 'test-refresh-token',
        expires_in: 3600,
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        token_type: 'bearer',
      },
    },
    error: null,
  })

  // Update server mock
  const serverMock = jest.mocked(createApiClient)
  const server = serverMock() as jest.Mocked<ReturnType<typeof createApiClient>>
  asMocked(server.auth.getUser).mockResolvedValue({
    data: { user },
    error: null,
  })
  asMocked(server.auth.getSession).mockResolvedValue({
    data: {
      session: {
        user,
        access_token: 'test-token',
        refresh_token: 'test-refresh-token',
        expires_in: 3600,
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        token_type: 'bearer',
      },
    },
    error: null,
  })

  return user
}

/**
 * Helper to mock unauthenticated state
 */
export function mockUnauthenticatedUser() {
  const clientMock = jest.mocked(createClient)
  const client = clientMock() as jest.Mocked<ReturnType<typeof createClient>>
  const authError = new Error('Unauthorized') as AuthError
  asMocked(client.auth.getUser).mockResolvedValue({
    data: { user: null },
    error: authError,
  })
  asMocked(client.auth.getSession).mockResolvedValue({
    data: { session: null },
    error: null,
  })

  const serverMock = jest.mocked(createApiClient)
  const server = serverMock() as jest.Mocked<ReturnType<typeof createApiClient>>
  asMocked(server.auth.getUser).mockResolvedValue({
    data: { user: null },
    error: authError,
  })
  asMocked(server.auth.getSession).mockResolvedValue({
    data: { session: null },
    error: null,
  })
}

/**
 * Helper to track toast calls
 */
export function getToastCalls() {
  const successMock = jest.mocked(toast.success)
  const errorMock = jest.mocked(toast.error)
  const infoMock = jest.mocked(toast.info)
  const warningMock = jest.mocked(toast.warning)
  return {
    success: successMock.mock.calls,
    error: errorMock.mock.calls,
    info: infoMock.mock.calls,
    warning: warningMock.mock.calls,
  }
}

/**
 * Clear all mock function calls
 */
export function clearAllMocks() {
  jest.clearAllMocks()
}

/**
 * Helper to create an invalid refresh token error object
 * For use in tests that need to simulate stale sessions
 */
export function mockInvalidRefreshTokenError() {
  return {
    code: 'refresh_token_not_found',
    message: 'Invalid Refresh Token: Refresh Token Not Found',
    status: 400,
    name: 'AuthApiError',
  }
}
