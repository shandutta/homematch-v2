/**
 * Mock helper utilities for integration tests
 * Provides easy ways to customize centralized mocks for specific test scenarios
 */

import { createClient } from '@/lib/supabase/client'
import { createApiClient } from '@/lib/supabase/server'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  AuthError,
  createClient as createSupabaseClient,
} from '@supabase/supabase-js'
import type { AppDatabase } from '@/types/app-database'
import {
  createMockSession,
  createMockUser,
} from '@/__tests__/factories/typed-mock-factory'

type SupabaseAuthOverrides = Partial<Record<string, unknown>>
type SupabaseFromOverrides = (table: string) => Record<string, unknown>
type SupabaseOverrides = {
  auth?: SupabaseAuthOverrides
  from?: SupabaseFromOverrides
} & Record<string, unknown>

const createMockFetch = (): typeof fetch => {
  return async () =>
    new Response(JSON.stringify({ data: null, error: null }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
}

const createBaseClient = () =>
  createSupabaseClient<AppDatabase>('http://localhost:54321', 'test-key', {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
    global: {
      fetch: createMockFetch(),
    },
  })

/**
 * Helper to customize Supabase client mock for specific test scenarios
 */
export function mockSupabaseClient(overrides: SupabaseOverrides = {}) {
  const client = createBaseClient()
  const {
    auth: authOverrides,
    from: fromOverrides,
    ...restOverrides
  } = overrides

  const auth = client.auth
  const defaultUser = createMockUser()
  const defaultSession = createMockSession({ user: defaultUser })
  auth.signInWithPassword = jest.fn<
    ReturnType<typeof auth.signInWithPassword>,
    Parameters<typeof auth.signInWithPassword>
  >(async () => ({
    data: { user: defaultUser, session: defaultSession },
    error: null,
  }))
  auth.signInWithOAuth = jest.fn<
    ReturnType<typeof auth.signInWithOAuth>,
    Parameters<typeof auth.signInWithOAuth>
  >(async () => ({
    data: { provider: 'google', url: 'https://example.com/oauth' },
    error: null,
  }))
  auth.signUp = jest.fn<
    ReturnType<typeof auth.signUp>,
    Parameters<typeof auth.signUp>
  >(async () => ({
    data: { user: defaultUser, session: defaultSession },
    error: null,
  }))
  auth.signOut = jest.fn<
    ReturnType<typeof auth.signOut>,
    Parameters<typeof auth.signOut>
  >(async () => ({ error: null }))
  auth.getUser = jest.fn<
    ReturnType<typeof auth.getUser>,
    Parameters<typeof auth.getUser>
  >(async () => ({
    data: { user: defaultUser },
    error: null,
  }))
  auth.getSession = jest.fn<
    ReturnType<typeof auth.getSession>,
    Parameters<typeof auth.getSession>
  >(async () => ({
    data: { session: defaultSession },
    error: null,
  }))
  auth.onAuthStateChange = jest.fn<
    ReturnType<typeof auth.onAuthStateChange>,
    Parameters<typeof auth.onAuthStateChange>
  >((callback) => ({
    data: {
      subscription: {
        id: 'test-subscription',
        callback,
        unsubscribe: jest.fn(),
      },
    },
  }))

  if (authOverrides) {
    Object.assign(auth, authOverrides)
  }

  if (fromOverrides) {
    const baseFrom = client.from.bind(client)
    const fromMock = jest.fn<
      ReturnType<typeof client.from>,
      Parameters<typeof client.from>
    >((table) => {
      const query = baseFrom(table)
      const extra = fromOverrides(String(table))
      if (extra && typeof extra === 'object') {
        return Object.assign(query, extra)
      }
      return query
    })
    client.from = fromMock
  }

  Object.assign(client, restOverrides)

  jest.mocked(createClient).mockReturnValue(client)

  return client
}

/**
 * Helper to customize Supabase server client mock for API tests
 */
export function mockSupabaseServerClient(overrides: SupabaseOverrides = {}) {
  const client = createBaseClient()
  const {
    auth: authOverrides,
    from: fromOverrides,
    ...restOverrides
  } = overrides

  const auth = client.auth
  const user = createMockUser()
  auth.getUser = jest.fn<
    ReturnType<typeof auth.getUser>,
    Parameters<typeof auth.getUser>
  >(async () => ({
    data: { user },
    error: null,
  }))
  auth.getSession = jest.fn<
    ReturnType<typeof auth.getSession>,
    Parameters<typeof auth.getSession>
  >(async () => ({
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
  }))

  if (authOverrides) {
    Object.assign(auth, authOverrides)
  }

  if (fromOverrides) {
    const baseFrom = client.from.bind(client)
    const fromMock = jest.fn<
      ReturnType<typeof client.from>,
      Parameters<typeof client.from>
    >((table) => {
      const query = baseFrom(table)
      const extra = fromOverrides(String(table))
      if (extra && typeof extra === 'object') {
        return Object.assign(query, extra)
      }
      return query
    })
    client.from = fromMock
  }

  Object.assign(client, restOverrides)

  jest.mocked(createApiClient).mockReturnValue(client)

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
  const client = clientMock()
  jest.mocked(client.auth.getUser).mockResolvedValue({
    data: { user },
    error: null,
  })
  jest.mocked(client.auth.getSession).mockResolvedValue({
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
  const server = serverMock()
  jest.mocked(server.auth.getUser).mockResolvedValue({
    data: { user },
    error: null,
  })
  jest.mocked(server.auth.getSession).mockResolvedValue({
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
  const client = clientMock()
  const authError = new AuthError('Unauthorized')
  jest.mocked(client.auth.getUser).mockResolvedValue({
    data: { user: null },
    error: authError,
  })
  jest.mocked(client.auth.getSession).mockResolvedValue({
    data: { session: null },
    error: null,
  })

  const serverMock = jest.mocked(createApiClient)
  const server = serverMock()
  jest.mocked(server.auth.getUser).mockResolvedValue({
    data: { user: null },
    error: authError,
  })
  jest.mocked(server.auth.getSession).mockResolvedValue({
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
