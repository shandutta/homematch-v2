import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { InteractionService } from '@/lib/services/interactions';
import { useInteractionSummary, useInfiniteInteractions } from '@/hooks/useInteractions';

// Jest auto-mock for InteractionService methods used by the hook
jest.mock('@/lib/services/interactions', () => ({
  InteractionService: {
    getInteractionSummary: jest.fn(),
    getInteractions: jest.fn(),
  },
}));

describe('useInteractionSummary', () => {
  const getSummary = InteractionService.getInteractionSummary as jest.Mock;

  const createWrapper = () => {
    const qc = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,           // disable automatic retries to ensure immediate error surfacing
          gcTime: Infinity,       // avoid garbage collection during test
        },
      },
    });
    // eslint-disable-next-line react/display-name
    return ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={qc}>{children}</QueryClientProvider>
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('success: returns summary and no error', async () => {
    getSummary.mockResolvedValue({ viewed: 2, liked: 1, passed: 0 });

    const { result } = renderHook(() => useInteractionSummary(), { wrapper: createWrapper() });

    // Initial loading state
    expect(result.current.isLoading).toBe(true);

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.isError).toBe(false);
    expect(result.current.data).toEqual({ viewed: 2, liked: 1, passed: 0 });
  });

  test('error: sets isError', async () => {
    // Immediate rejection and retries disabled means error should surface deterministically
    getSummary.mockRejectedValue(new Error('boom'));

    const { result } = renderHook(() => useInteractionSummary(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true), { timeout: 3000 });
    expect(result.current.data).toBeUndefined();
  });
});

describe('useInfiniteInteractions', () => {
  const getInteractions = InteractionService.getInteractions as jest.Mock;

  const createWrapper = () => {
    const qc = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          gcTime: Infinity,
        },
      },
    });
    // eslint-disable-next-line react/display-name
    return ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={qc}>{children}</QueryClientProvider>
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('loads first page and exposes nextCursor', async () => {
    getInteractions.mockResolvedValue({ items: [{ id: 'p1' }], nextCursor: 'c2' });

    const { result } = renderHook(() => useInfiniteInteractions('viewed'), { wrapper: createWrapper() });

    // initially fetching
    expect(result.current.isLoading).toBe(true);

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.data?.pages[0]).toEqual({ items: [{ id: 'p1' }], nextCursor: 'c2' });
    expect(result.current.hasNextPage).toBe(true);
  });

  test('fetchNextPage uses nextCursor and appends', async () => {
    getInteractions
      .mockResolvedValueOnce({ items: [{ id: 'p1' }], nextCursor: 'c2' })
      .mockResolvedValueOnce({ items: [{ id: 'p2' }], nextCursor: null });

    const { result } = renderHook(() => useInfiniteInteractions('liked'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.data?.pages?.length).toBe(1));

    await act(async () => {
      await result.current.fetchNextPage();
    });

    await waitFor(() => expect(getInteractions).toHaveBeenLastCalledWith('liked', { cursor: 'c2' }));
    expect(result.current.data?.pages.flatMap(p => p.items)).toEqual([{ id: 'p1' }, { id: 'p2' }]);
    expect(result.current.hasNextPage).toBe(false);
  });

  test('handles error state', async () => {
    getInteractions.mockRejectedValue(new Error('bad'));

    const { result } = renderHook(() => useInfiniteInteractions('skip'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true), { timeout: 3000 });
    expect(result.current.data).toBeUndefined();
  });
});
