import { renderHook, act, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { InteractionService } from '@/lib/services/interactions'
import {
  useInteractionSummary,
  useInfiniteInteractions,
  useRecordInteraction,
  useDeleteInteraction,
  interactionKeys,
} from '@/hooks/useInteractions'

// Jest auto-mock for InteractionService methods used by the hook
jest.mock('@/lib/services/interactions', () => ({
  InteractionService: {
    getInteractionSummary: jest.fn(),
    getInteractions: jest.fn(),
    recordInteraction: jest.fn(),
    deleteInteraction: jest.fn(),
  },
}))

const mockedInteractionService = jest.mocked(InteractionService)

describe('useInteractionSummary', () => {
  const getSummary = mockedInteractionService.getInteractionSummary

  const createWrapper = () => {
    const qc = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false, // disable automatic retries to ensure immediate error surfacing
          gcTime: Infinity, // avoid garbage collection during test
        },
      },
    })
    // eslint-disable-next-line react/display-name
    return ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={qc}>{children}</QueryClientProvider>
    )
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('success: returns summary and no error', async () => {
    getSummary.mockResolvedValue({ viewed: 2, liked: 1, passed: 0 })

    const { result } = renderHook(() => useInteractionSummary(), {
      wrapper: createWrapper(),
    })

    // Initial loading state
    expect(result.current.isLoading).toBe(true)

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.isError).toBe(false)
    expect(result.current.data).toEqual({ viewed: 2, liked: 1, passed: 0 })
  })

  test('error: sets isError', async () => {
    // Immediate rejection and retries disabled means error should surface deterministically
    getSummary.mockRejectedValue(new Error('boom'))

    const { result } = renderHook(() => useInteractionSummary(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isError).toBe(true), {
      timeout: 3000,
    })
    expect(result.current.data).toBeUndefined()
  })
})

describe('useInfiniteInteractions', () => {
  const getInteractions = mockedInteractionService.getInteractions

  const createWrapper = () => {
    const qc = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          gcTime: Infinity,
        },
      },
    })
    // eslint-disable-next-line react/display-name
    return ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={qc}>{children}</QueryClientProvider>
    )
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('loads first page and exposes nextCursor', async () => {
    getInteractions.mockResolvedValue({
      items: [{ id: 'p1' }],
      nextCursor: 'c2',
    })

    const { result } = renderHook(() => useInfiniteInteractions('viewed'), {
      wrapper: createWrapper(),
    })

    // initially fetching
    expect(result.current.isLoading).toBe(true)

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.data?.pages[0]).toEqual({
      items: [{ id: 'p1' }],
      nextCursor: 'c2',
    })
    expect(result.current.hasNextPage).toBe(true)
  })

  test('fetchNextPage uses nextCursor and appends', async () => {
    getInteractions
      .mockResolvedValueOnce({ items: [{ id: 'p1' }], nextCursor: 'c2' })
      .mockResolvedValueOnce({ items: [{ id: 'p2' }], nextCursor: null })

    const { result } = renderHook(() => useInfiniteInteractions('liked'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.data?.pages?.length).toBe(1))

    await act(async () => {
      await result.current.fetchNextPage()
    })

    await waitFor(() =>
      expect(getInteractions).toHaveBeenLastCalledWith('liked', {
        cursor: 'c2',
      })
    )
    expect(result.current.data?.pages.flatMap((p) => p.items)).toEqual([
      { id: 'p1' },
      { id: 'p2' },
    ])
    expect(result.current.hasNextPage).toBe(false)
  })

  test('handles error state', async () => {
    getInteractions.mockRejectedValue(new Error('bad'))

    const { result } = renderHook(() => useInfiniteInteractions('skip'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isError).toBe(true), {
      timeout: 3000,
    })
    expect(result.current.data).toBeUndefined()
  })
})

describe('useRecordInteraction', () => {
  const recordInteraction = mockedInteractionService.recordInteraction

  let queryClient: QueryClient

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
    // eslint-disable-next-line react/display-name
    return ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )
  }

  // Helper to check if a query is invalidated (stale)
  const isQueryInvalidated = (queryKey: readonly unknown[]) => {
    const state = queryClient.getQueryState(queryKey)
    return state?.isInvalidated === true
  }

  beforeEach(() => {
    jest.clearAllMocks()
    recordInteraction.mockResolvedValue({ success: true })
  })

  test('calls InteractionService.recordInteraction with correct params', async () => {
    const wrapper = createWrapper()

    const { result } = renderHook(() => useRecordInteraction(), { wrapper })

    await act(async () => {
      result.current.mutate({ propertyId: 'prop-123', type: 'liked' })
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(recordInteraction).toHaveBeenCalledWith('prop-123', 'liked')
  })

  test('marks summary query as stale after recording interaction', async () => {
    const wrapper = createWrapper()
    // Pre-populate cache so we can verify it becomes stale
    queryClient.setQueryData(interactionKeys.summaries(), {
      liked: 3,
      viewed: 5,
      passed: 2,
    })

    const { result } = renderHook(() => useRecordInteraction(), { wrapper })

    await act(async () => {
      result.current.mutate({ propertyId: 'prop-123', type: 'liked' })
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    // The summary query should be marked as stale (invalidated)
    expect(isQueryInvalidated(interactionKeys.summaries())).toBe(true)
  })

  test('marks target list as stale when recording a like', async () => {
    const wrapper = createWrapper()
    // Pre-populate cache so we can verify it becomes stale
    queryClient.setQueryData(interactionKeys.list('liked'), {
      pages: [{ items: [], nextCursor: null }],
      pageParams: [undefined],
    })

    const { result } = renderHook(() => useRecordInteraction(), { wrapper })

    await act(async () => {
      result.current.mutate({ propertyId: 'prop-123', type: 'liked' })
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    // The liked list should be marked as stale
    expect(isQueryInvalidated(interactionKeys.list('liked'))).toBe(true)
  })

  test('marks viewed list as stale when recording any interaction', async () => {
    const wrapper = createWrapper()
    // Pre-populate cache so we can verify it becomes stale
    queryClient.setQueryData(interactionKeys.list('viewed'), {
      pages: [{ items: [], nextCursor: null }],
      pageParams: [undefined],
    })

    const { result } = renderHook(() => useRecordInteraction(), { wrapper })

    await act(async () => {
      result.current.mutate({ propertyId: 'prop-123', type: 'skip' })
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    // The viewed list should be marked as stale
    expect(isQueryInvalidated(interactionKeys.list('viewed'))).toBe(true)
  })

  test('marks all required queries as stale when recording a skip', async () => {
    const wrapper = createWrapper()
    // Pre-populate caches so we can verify they become stale
    queryClient.setQueryData(interactionKeys.summaries(), {
      liked: 3,
      viewed: 5,
      passed: 2,
    })
    queryClient.setQueryData(interactionKeys.list('skip'), {
      pages: [{ items: [], nextCursor: null }],
      pageParams: [undefined],
    })
    queryClient.setQueryData(interactionKeys.list('viewed'), {
      pages: [{ items: [], nextCursor: null }],
      pageParams: [undefined],
    })

    const { result } = renderHook(() => useRecordInteraction(), { wrapper })

    await act(async () => {
      result.current.mutate({ propertyId: 'prop-123', type: 'skip' })
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    // Should mark as stale: summaries, skip list, and viewed list
    expect(isQueryInvalidated(interactionKeys.summaries())).toBe(true)
    expect(isQueryInvalidated(interactionKeys.list('skip'))).toBe(true)
    expect(isQueryInvalidated(interactionKeys.list('viewed'))).toBe(true)
  })

  test('optimistically updates summary before mutation completes', async () => {
    // Make the mutation take some time
    recordInteraction.mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(() => resolve({ success: true }), 100)
        )
    )

    const wrapper = createWrapper()

    // Pre-populate the summary cache
    queryClient.setQueryData(interactionKeys.summaries(), {
      viewed: 5,
      liked: 3,
      passed: 2,
    })

    const { result } = renderHook(() => useRecordInteraction(), { wrapper })

    act(() => {
      result.current.mutate({ propertyId: 'prop-123', type: 'liked' })
    })

    // Check optimistic update happened immediately (before mutation completes)
    await waitFor(() => {
      const summary = queryClient.getQueryData<{ liked: number }>(
        interactionKeys.summaries()
      )
      expect(summary?.liked).toBe(4) // incremented from 3 to 4
    })
  })
})

describe('useDeleteInteraction', () => {
  const deleteInteraction = mockedInteractionService.deleteInteraction

  let queryClient: QueryClient

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
    // eslint-disable-next-line react/display-name
    return ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )
  }

  // Helper to check if a query is invalidated (stale)
  const isQueryInvalidated = (queryKey: readonly unknown[]) => {
    const state = queryClient.getQueryState(queryKey)
    return state?.isInvalidated === true
  }

  beforeEach(() => {
    jest.clearAllMocks()
    deleteInteraction.mockResolvedValue({ deleted: true, count: 1 })
  })

  test('calls InteractionService.deleteInteraction with correct params', async () => {
    const wrapper = createWrapper()

    const { result } = renderHook(() => useDeleteInteraction('liked'), {
      wrapper,
    })

    await act(async () => {
      result.current.mutate({ propertyId: 'prop-123' })
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(deleteInteraction).toHaveBeenCalledWith('prop-123')
  })

  test('marks summary and list queries as stale after deleting interaction', async () => {
    const wrapper = createWrapper()
    // Pre-populate caches so we can verify they become stale
    queryClient.setQueryData(interactionKeys.summaries(), {
      liked: 3,
      viewed: 5,
      passed: 2,
    })
    queryClient.setQueryData(interactionKeys.list('liked'), {
      pages: [{ items: [{ id: 'prop-123' }], nextCursor: null }],
      pageParams: [undefined],
    })

    const { result } = renderHook(() => useDeleteInteraction('liked'), {
      wrapper,
    })

    await act(async () => {
      result.current.mutate({ propertyId: 'prop-123' })
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    // Both summary and list should be marked as stale
    expect(isQueryInvalidated(interactionKeys.summaries())).toBe(true)
    expect(isQueryInvalidated(interactionKeys.list('liked'))).toBe(true)
  })

  test('optimistically removes item from list and decrements summary', async () => {
    // Make the mutation take some time
    deleteInteraction.mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(() => resolve({ deleted: true }), 100)
        )
    )

    const wrapper = createWrapper()

    // Pre-populate the caches
    queryClient.setQueryData(interactionKeys.summaries(), {
      viewed: 5,
      liked: 3,
      passed: 2,
    })
    queryClient.setQueryData(interactionKeys.list('liked'), {
      pages: [
        { items: [{ id: 'prop-123' }, { id: 'prop-456' }], nextCursor: null },
      ],
      pageParams: [undefined],
    })

    const { result } = renderHook(() => useDeleteInteraction('liked'), {
      wrapper,
    })

    act(() => {
      result.current.mutate({ propertyId: 'prop-123' })
    })

    // Check optimistic updates happened immediately
    await waitFor(() => {
      const summary = queryClient.getQueryData<{ liked: number }>(
        interactionKeys.summaries()
      )
      expect(summary?.liked).toBe(2) // decremented from 3 to 2

      const list = queryClient.getQueryData<{
        pages: Array<{ items: Array<{ id: string }> }>
      }>(interactionKeys.list('liked'))
      const items = list?.pages.flatMap((p) => p.items) ?? []
      expect(items.map((i) => i.id)).not.toContain('prop-123')
      expect(items.map((i) => i.id)).toContain('prop-456')
    })
  })
})
