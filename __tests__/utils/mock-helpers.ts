/**
 * Mock helper utilities for integration tests
 * Provides easy ways to customize centralized mocks for specific test scenarios
 */

import { createClient } from '@/lib/supabase/client'
import { createApiClient } from '@/lib/supabase/server'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

/**
 * Helper to customize Supabase client mock for specific test scenarios
 */
export function mockSupabaseClient(overrides: any = {}) {
  const client = (createClient as jest.Mock).mockReturnValue({
    auth: {
      signInWithPassword: jest.fn(() => Promise.resolve({ error: null })),
      signInWithOAuth: jest.fn(() => Promise.resolve({ error: null })),
      signUp: jest.fn(() => Promise.resolve({ error: null })),
      signOut: jest.fn(() => Promise.resolve({ error: null })),
      getUser: jest.fn(() => Promise.resolve({ 
        data: { user: null }, 
        error: null 
      })),
      getSession: jest.fn(() => Promise.resolve({ 
        data: { session: null }, 
        error: null 
      })),
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
  })
  
  return client
}

/**
 * Helper to customize Supabase server client mock for API tests
 */
export function mockSupabaseServerClient(overrides: any = {}) {
  const client = (createApiClient as jest.Mock).mockReturnValue({
    auth: {
      getUser: jest.fn(() => Promise.resolve({ 
        data: { user: { id: 'test-user-id', email: 'test@example.com' } }, 
        error: null 
      })),
      getSession: jest.fn(() => Promise.resolve({ 
        data: { 
          session: { 
            user: { id: 'test-user-id', email: 'test@example.com' },
            access_token: 'test-token',
            refresh_token: 'test-refresh-token',
          } 
        }, 
        error: null 
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
  })
  
  return client
}

/**
 * Helper to customize Next.js router mock
 */
export function mockNextRouter(overrides: any = {}) {
  const router = {
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
    prefetch: jest.fn(),
    ...overrides,
  };
  
  (useRouter as jest.Mock).mockReturnValue(router)
  
  return router
}

/**
 * Helper to mock authenticated user
 */
export function mockAuthenticatedUser(userId = 'test-user-id', email = 'test@example.com') {
  const user = {
    id: userId,
    email,
    app_metadata: {},
    user_metadata: {},
    aud: 'authenticated',
    created_at: new Date().toISOString(),
  }

  // Update client mock
  const clientMock = createClient as jest.Mock
  const client = clientMock()
  client.auth.getUser.mockResolvedValue({ 
    data: { user }, 
    error: null 
  })
  client.auth.getSession.mockResolvedValue({ 
    data: { 
      session: { 
        user,
        access_token: 'test-token',
        refresh_token: 'test-refresh-token',
      } 
    }, 
    error: null 
  })

  // Update server mock
  const serverMock = createApiClient as jest.Mock
  const server = serverMock()
  server.auth.getUser.mockResolvedValue({ 
    data: { user }, 
    error: null 
  })
  server.auth.getSession.mockResolvedValue({ 
    data: { 
      session: { 
        user,
        access_token: 'test-token',
        refresh_token: 'test-refresh-token',
      } 
    }, 
    error: null 
  })

  return user
}

/**
 * Helper to mock unauthenticated state
 */
export function mockUnauthenticatedUser() {
  const clientMock = createClient as jest.Mock
  const client = clientMock()
  client.auth.getUser.mockResolvedValue({ 
    data: { user: null }, 
    error: new Error('Unauthorized') 
  })
  client.auth.getSession.mockResolvedValue({ 
    data: { session: null }, 
    error: null 
  })

  const serverMock = createApiClient as jest.Mock
  const server = serverMock()
  server.auth.getUser.mockResolvedValue({ 
    data: { user: null }, 
    error: new Error('Unauthorized') 
  })
  server.auth.getSession.mockResolvedValue({ 
    data: { session: null }, 
    error: null 
  })
}

/**
 * Helper to track toast calls
 */
export function getToastCalls() {
  return {
    success: (toast.success as jest.Mock).mock.calls,
    error: (toast.error as jest.Mock).mock.calls,
    info: (toast.info as jest.Mock).mock.calls,
    warning: (toast.warning as jest.Mock).mock.calls,
  }
}

/**
 * Clear all mock function calls
 */
export function clearAllMocks() {
  jest.clearAllMocks()
}