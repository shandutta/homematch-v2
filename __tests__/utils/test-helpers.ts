import React from 'react'
import { render } from '@testing-library/react'
import { jest } from '@jest/globals'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

type MockSupabaseClient = {
  from: jest.Mock
  rpc: jest.Mock
  auth: {
    signInWithPassword: jest.Mock
    signOut: jest.Mock
    getUser: jest.Mock
  }
}

export const createMockSupabaseClient = (): MockSupabaseClient => {
  return {
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      neq: jest.fn().mockReturnThis(),
      gt: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      lt: jest.fn().mockReturnThis(),
      lte: jest.fn().mockReturnThis(),
      like: jest.fn().mockReturnThis(),
      ilike: jest.fn().mockReturnThis(),
      is: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      contains: jest.fn().mockReturnThis(),
      containedBy: jest.fn().mockReturnThis(),
      range: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      single: jest
        .fn()
        .mockImplementation(() => Promise.resolve({ data: null, error: null })),
    }),
    rpc: jest.fn().mockReturnThis(),
    auth: {
      signInWithPassword: jest.fn(),
      signOut: jest.fn(),
      getUser: jest.fn(),
    },
  }
}

// React Query test renderer to DRY wrapper boilerplate
export const renderWithQueryClient = (
  ui: React.ReactElement,
  options?: {
    queryClient?: QueryClient
  }
) => {
  const qc =
    options?.queryClient ??
    new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          gcTime: Infinity,
        },
      },
    })

  // Use React.createElement to avoid JSX parsing issues in some TS/Jest setups
  const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) =>
    React.createElement(QueryClientProvider, { client: qc }, children)

  return {
    ...render(ui, { wrapper: Wrapper }),
    queryClient: qc,
  }
}
