import React, { ReactElement } from 'react'
import { render, RenderOptions, RenderResult } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// Re-export everything from testing-library
export * from '@testing-library/react'

// Mock Supabase Client Factory
// Uses Jest if available, otherwise falls back to Vitest's vi
type MockFn<Args extends unknown[] = unknown[], Return = unknown> = ((
  ...args: Args
) => Return) & {
  mockReturnValue: (value: Return) => MockFn<Args, Return>
  mockReturnThis: () => MockFn<Args, Return>
  mockImplementation: (impl: (...args: Args) => Return) => MockFn<Args, Return>
}

const createMockFn = <
  Args extends unknown[] = unknown[],
  Return = unknown,
>(): MockFn<Args, Return> => {
  if (typeof jest !== 'undefined') {
    return jest.fn() as unknown as MockFn<Args, Return>
  }
  if (globalThis.vi) {
    return globalThis.vi.fn() as unknown as MockFn<Args, Return>
  }
  throw new Error('No test mock library found')
}

type MockSupabaseQuery = {
  select: MockFn<unknown[], MockSupabaseQuery>
  insert: MockFn<unknown[], MockSupabaseQuery>
  update: MockFn<unknown[], MockSupabaseQuery>
  delete: MockFn<unknown[], MockSupabaseQuery>
  upsert: MockFn<unknown[], MockSupabaseQuery>
  eq: MockFn<unknown[], MockSupabaseQuery>
  neq: MockFn<unknown[], MockSupabaseQuery>
  gt: MockFn<unknown[], MockSupabaseQuery>
  gte: MockFn<unknown[], MockSupabaseQuery>
  lt: MockFn<unknown[], MockSupabaseQuery>
  lte: MockFn<unknown[], MockSupabaseQuery>
  like: MockFn<unknown[], MockSupabaseQuery>
  ilike: MockFn<unknown[], MockSupabaseQuery>
  is: MockFn<unknown[], MockSupabaseQuery>
  in: MockFn<unknown[], MockSupabaseQuery>
  contains: MockFn<unknown[], MockSupabaseQuery>
  containedBy: MockFn<unknown[], MockSupabaseQuery>
  range: MockFn<unknown[], MockSupabaseQuery>
  order: MockFn<unknown[], MockSupabaseQuery>
  limit: MockFn<unknown[], MockSupabaseQuery>
  single: MockFn<[], Promise<{ data: null; error: null }>>
  maybeSingle: MockFn<[], Promise<{ data: null; error: null }>>
  url: URL
  headers: Record<string, string>
}

type MockSupabaseClient = {
  from: MockFn<[string], MockSupabaseQuery>
  rpc: MockFn
  auth: {
    signInWithPassword: MockFn
    signOut: MockFn
    getUser: MockFn
    getSession: MockFn
    onAuthStateChange: MockFn
  }
  storage: {
    from: MockFn<
      [string],
      {
        upload: MockFn
        getPublicUrl: MockFn
      }
    >
  }
}

export const createMockSupabaseClient = (): MockSupabaseClient => {
  const mockFn = createMockFn()
  const query: MockSupabaseQuery = {
    select: createMockFn(),
    insert: createMockFn(),
    update: createMockFn(),
    delete: createMockFn(),
    upsert: createMockFn(),
    eq: createMockFn(),
    neq: createMockFn(),
    gt: createMockFn(),
    gte: createMockFn(),
    lt: createMockFn(),
    lte: createMockFn(),
    like: createMockFn(),
    ilike: createMockFn(),
    is: createMockFn(),
    in: createMockFn(),
    contains: createMockFn(),
    containedBy: createMockFn(),
    range: createMockFn(),
    order: createMockFn(),
    limit: createMockFn(),
    single: createMockFn(),
    maybeSingle: createMockFn(),
    url: new URL('http://localhost:54200'),
    headers: {},
  }

  const chainMethods: Array<
    keyof Omit<MockSupabaseQuery, 'single' | 'maybeSingle' | 'url' | 'headers'>
  > = [
    'select',
    'insert',
    'update',
    'delete',
    'upsert',
    'eq',
    'neq',
    'gt',
    'gte',
    'lt',
    'lte',
    'like',
    'ilike',
    'is',
    'in',
    'contains',
    'containedBy',
    'range',
    'order',
    'limit',
  ]

  for (const method of chainMethods) {
    query[method].mockReturnValue(query)
  }
  query.single.mockImplementation(() =>
    Promise.resolve({ data: null, error: null })
  )
  query.maybeSingle.mockImplementation(() =>
    Promise.resolve({ data: null, error: null })
  )

  return {
    from: (mockFn as MockFn<[string], MockSupabaseQuery>).mockReturnValue(
      query
    ),
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
      from: (
        mockFn as MockFn<
          [string],
          {
            upload: MockFn
            getPublicUrl: MockFn
          }
        >
      ).mockReturnValue({
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
