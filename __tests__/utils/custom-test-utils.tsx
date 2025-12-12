import React, { ReactElement } from 'react'
import { render, RenderOptions, RenderResult } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// Re-export everything from testing-library
export * from '@testing-library/react'

// Mock Supabase Client Factory
// Uses Jest if available, otherwise falls back to Vitest's vi
const createMockFn = () =>
  typeof jest !== 'undefined' ? jest.fn() : (globalThis as any).vi.fn()

export const createMockSupabaseClient = (): any => {
  const mockFn = createMockFn()
  return {
    from: mockFn.mockReturnValue({
      select: mockFn.mockReturnThis(),
      insert: mockFn.mockReturnThis(),
      update: mockFn.mockReturnThis(),
      delete: mockFn.mockReturnThis(),
      upsert: mockFn.mockReturnThis(),
      eq: mockFn.mockReturnThis(),
      neq: mockFn.mockReturnThis(),
      gt: mockFn.mockReturnThis(),
      gte: mockFn.mockReturnThis(),
      lt: mockFn.mockReturnThis(),
      lte: mockFn.mockReturnThis(),
      like: mockFn.mockReturnThis(),
      ilike: mockFn.mockReturnThis(),
      is: mockFn.mockReturnThis(),
      in: mockFn.mockReturnThis(),
      contains: mockFn.mockReturnThis(),
      containedBy: mockFn.mockReturnThis(),
      range: mockFn.mockReturnThis(),
      order: mockFn.mockReturnThis(),
      limit: mockFn.mockReturnThis(),
      single: mockFn.mockImplementation(() =>
        Promise.resolve({ data: null, error: null })
      ),
      maybeSingle: mockFn.mockImplementation(() =>
        Promise.resolve({ data: null, error: null })
      ),
      url: new URL('http://localhost:54200'),
      headers: {},
    }),
    rpc: mockFn.mockReturnThis(),
    auth: {
      signInWithPassword: mockFn,
      signOut: mockFn,
      getUser: mockFn,
      getSession: mockFn,
      onAuthStateChange: mockFn.mockReturnValue({
        data: { subscription: { unsubscribe: mockFn } },
      }),
    },
    storage: {
      from: mockFn.mockReturnValue({
        upload: mockFn,
        getPublicUrl: mockFn.mockReturnValue({
          data: { publicUrl: 'https://example.com/image.png' },
        }),
      }),
    },
  }
}

// ----------------------------------------------------------------------------
// Custom Render Options
// ----------------------------------------------------------------------------

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  queryClient?: QueryClient
  route?: string
}

export const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: 0,
        gcTime: Infinity,
      },
      mutations: {
        retry: false,
      },
    },
  })

/**
 * Custom render function that includes global providers:
 * - QueryClientProvider (React Query)
 */
export const renderWithProviders = (
  ui: ReactElement,
  options?: CustomRenderOptions
): RenderResult & { queryClient: QueryClient } => {
  const queryClient = options?.queryClient ?? createTestQueryClient()

  const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )
  }

  return {
    ...render(ui, { wrapper: AllTheProviders, ...options }),
    queryClient,
  }
}

// Alias for backward compatibility during migration
export const renderWithQuery = renderWithProviders
export const renderWithQueryClient = renderWithProviders
