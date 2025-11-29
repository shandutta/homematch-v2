import { renderHook, act, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  useMutualLikes,
  useHouseholdActivity,
  useCouplesStats,
  useNotifyInteraction,
  useCouplesFeatures,
} from '@/hooks/useCouplesFeatures'

// Mock global fetch
const mockFetch = jest.fn()
global.fetch = mockFetch

describe('useMutualLikes', () => {
  const createWrapper = () => {
    const qc = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          gcTime: Infinity,
        },
      },
    })
    function MutualLikesWrapper({ children }: { children: React.ReactNode }) {
      return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
    }

    return MutualLikesWrapper
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('returns mutual likes on success', async () => {
    const mockResponse = {
      mutualLikes: [
        { property_id: 'prop-1', liked_by_count: 2 },
        { property_id: 'prop-2', liked_by_count: 2 },
      ],
      performance: { totalTime: 50, cached: false, count: 2 },
    }

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    })

    const { result } = renderHook(() => useMutualLikes(), {
      wrapper: createWrapper(),
    })

    expect(result.current.isLoading).toBe(true)

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.isError).toBe(false)
    expect(result.current.data?.mutualLikes).toHaveLength(2)
    expect(result.current.data?.performance.count).toBe(2)
  })

  test('handles error state', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
    })

    const { result } = renderHook(() => useMutualLikes(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isError).toBe(true), {
      timeout: 3000,
    })

    expect(result.current.data).toBeUndefined()
  })

  test('passes includeProperties parameter correctly', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ mutualLikes: [], performance: {} }),
    })

    renderHook(() => useMutualLikes(false), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(mockFetch).toHaveBeenCalled())

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('includeProperties=false'),
      expect.any(Object)
    )
  })
})

describe('useHouseholdActivity', () => {
  const createWrapper = () => {
    const qc = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          gcTime: Infinity,
        },
      },
    })
    function HouseholdActivityWrapper({
      children,
    }: {
      children: React.ReactNode
    }) {
      return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
    }

    return HouseholdActivityWrapper
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('returns household activity on success', async () => {
    const mockResponse = {
      activities: [
        { id: 'act-1', type: 'like', created_at: '2024-01-01' },
        { id: 'act-2', type: 'mutual_like', created_at: '2024-01-02' },
      ],
      stats: { total_mutual_likes: 5 },
      pagination: { limit: 20, offset: 0, hasMore: false },
    }

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    })

    const { result } = renderHook(() => useHouseholdActivity(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.data?.activities).toHaveLength(2)
    expect(result.current.data?.pagination.hasMore).toBe(false)
  })

  test('passes limit and offset parameters', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({ activities: [], stats: null, pagination: {} }),
    })

    renderHook(() => useHouseholdActivity(10, 20), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(mockFetch).toHaveBeenCalled())

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('limit=10'),
      expect.any(Object)
    )
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('offset=20'),
      expect.any(Object)
    )
  })

  test('handles error state', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
    })

    const { result } = renderHook(() => useHouseholdActivity(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isError).toBe(true), {
      timeout: 3000,
    })
  })
})

describe('useCouplesStats', () => {
  const createWrapper = () => {
    const qc = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          gcTime: Infinity,
        },
      },
    })
    function CouplesStatsWrapper({ children }: { children: React.ReactNode }) {
      return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
    }

    return CouplesStatsWrapper
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('returns stats on success', async () => {
    const mockResponse = {
      stats: {
        total_mutual_likes: 10,
        total_household_likes: 50,
        activity_streak_days: 5,
        last_mutual_like_at: '2024-01-15',
      },
    }

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    })

    const { result } = renderHook(() => useCouplesStats(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.data?.stats.total_mutual_likes).toBe(10)
    expect(result.current.data?.stats.activity_streak_days).toBe(5)
  })

  test('handles error state', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
    })

    const { result } = renderHook(() => useCouplesStats(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isError).toBe(true), {
      timeout: 3000,
    })
  })
})

describe('useNotifyInteraction', () => {
  let queryClient: QueryClient
  let invalidateQueriesSpy: jest.SpyInstance

  const createWrapper = () => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          gcTime: Infinity,
        },
        mutations: {
          retry: false,
        },
      },
    })
    invalidateQueriesSpy = jest.spyOn(queryClient, 'invalidateQueries')
    function NotifyInteractionWrapper({
      children,
    }: {
      children: React.ReactNode
    }) {
      return (
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      )
    }

    return NotifyInteractionWrapper
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  afterEach(() => {
    invalidateQueriesSpy?.mockRestore()
  })

  test('sends notification and invalidates queries on success', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          success: true,
          mutual_like_created: false,
          notification_sent: true,
        }),
    })

    const wrapper = createWrapper()
    const { result } = renderHook(() => useNotifyInteraction(), { wrapper })

    await act(async () => {
      result.current.mutate({ propertyId: 'prop-123', interactionType: 'like' })
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/couples/notify',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          propertyId: 'prop-123',
          interactionType: 'like',
        }),
      })
    )

    // Should invalidate activity and stats
    expect(invalidateQueriesSpy).toHaveBeenCalled()
  })

  test('invalidates mutual likes cache when mutual like is created', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          success: true,
          mutual_like_created: true,
          notification_sent: true,
          partner_user_id: 'partner-456',
        }),
    })

    const wrapper = createWrapper()
    const { result } = renderHook(() => useNotifyInteraction(), { wrapper })

    await act(async () => {
      result.current.mutate({ propertyId: 'prop-123', interactionType: 'like' })
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    // Should have invalidated mutual-likes specifically
    expect(invalidateQueriesSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: expect.arrayContaining(['couples', 'mutual-likes']),
      })
    )
  })

  test('handles error state', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
    })

    const wrapper = createWrapper()
    const { result } = renderHook(() => useNotifyInteraction(), { wrapper })

    await act(async () => {
      result.current.mutate({ propertyId: 'prop-123', interactionType: 'like' })
    })

    await waitFor(() => expect(result.current.isError).toBe(true), {
      timeout: 3000,
    })
  })
})

describe('useCouplesFeatures (combined hook)', () => {
  const createWrapper = () => {
    const qc = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          gcTime: Infinity,
        },
        mutations: {
          retry: false,
        },
      },
    })
    function CouplesFeaturesWrapper({
      children,
    }: {
      children: React.ReactNode
    }) {
      return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
    }

    return CouplesFeaturesWrapper
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('returns combined loading state', async () => {
    // Mock all three endpoints
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({ mutualLikes: [], performance: { cached: false } }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({ activities: [], stats: null, pagination: {} }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ stats: {} }),
      })

    const { result } = renderHook(() => useCouplesFeatures(), {
      wrapper: createWrapper(),
    })

    // Initially loading
    expect(result.current.isLoading).toBe(true)

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.mutualLikes).toEqual([])
    expect(result.current.activity).toEqual([])
  })

  test('provides notifyInteraction mutation', async () => {
    // Mock initial data fetches
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({ mutualLikes: [], performance: { cached: false } }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({ activities: [], stats: null, pagination: {} }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ stats: {} }),
      })
      // Mock notify interaction
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            mutual_like_created: false,
            notification_sent: true,
          }),
      })

    const { result } = renderHook(() => useCouplesFeatures(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.notifyInteraction).toBeDefined()
    expect(typeof result.current.notifyInteraction).toBe('function')
  })

  test('provides refreshData function', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({ mutualLikes: [], performance: { cached: false } }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({ activities: [], stats: null, pagination: {} }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ stats: {} }),
      })

    const { result } = renderHook(() => useCouplesFeatures(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.refreshData).toBeDefined()
    expect(typeof result.current.refreshData).toBe('function')
  })
})
