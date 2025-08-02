import { jest, describe, test, expect } from '@jest/globals'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  useInteractionSummary,
  useRecordInteraction,
} from '@/hooks/useInteractions'
import { InteractionService } from '@/lib/services/interactions'

// Mock the service layer
jest.mock('@/lib/services/interactions')
const mockInteractionService = InteractionService as jest.Mocked<
  typeof InteractionService
>

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false, // Disable retries for tests
      },
    },
  })

describe('useInteractions Hooks', () => {
  test('useInteractionSummary should fetch and return summary data', async () => {
    const mockSummary = { liked: 5, passed: 3, viewed: 8 }
    mockInteractionService.getInteractionSummary.mockResolvedValue(mockSummary)

    const queryClient = createTestQueryClient()
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )

    const { result } = renderHook(() => useInteractionSummary(), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual(mockSummary)
    expect(
      mockInteractionService.getInteractionSummary
    ).toHaveBeenCalledTimes(1)
  })

  test('useRecordInteraction should call the service and invalidate queries on success', async () => {
    const queryClient = createTestQueryClient()
    const invalidateQueriesSpy = jest.spyOn(queryClient, 'invalidateQueries')
    mockInteractionService.recordInteraction.mockResolvedValue({} as any)

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )

    const { result } = renderHook(() => useRecordInteraction(), { wrapper })

    result.current.mutate({ propertyId: 'prop-1', type: 'liked' })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(mockInteractionService.recordInteraction).toHaveBeenCalledWith(
      'prop-1',
      'liked'
    )
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: ['interactions', 'summary'],
    })
  })
})
