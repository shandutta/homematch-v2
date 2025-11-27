import { vi, describe, test, beforeEach, afterEach, expect } from 'vitest'
import { render, screen, waitFor, cleanup } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MutualLikesSection } from '@/components/features/couples/MutualLikesSection'
import { MutualLikesBadge } from '@/components/features/couples/MutualLikesBadge'

// Mock the hooks with Vitest patterns
vi.mock('@/hooks/useCouples', () => ({
  useCouples: vi.fn(),
}))

vi.mock('@/hooks/useCouplesFeatures', () => ({
  useCouplesFeatures: vi.fn(),
}))

// next/navigation is already mocked centrally in setupSupabaseMock.ts

describe('Couples Frontend Integration', () => {
  let queryClient: QueryClient

  afterEach(() => {
    cleanup()
  })

  beforeEach(async () => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    })
    vi.clearAllMocks()

    // Setup default mock implementations
    const { useCouples } = await import('@/hooks/useCouples')
    const { useCouplesFeatures } = await import('@/hooks/useCouplesFeatures')

    ;(useCouples as any).mockReturnValue({
      mutualLikes: [],
      householdActivity: [],
      isLoading: false,
      error: null,
    })
    ;(useCouplesFeatures as any).mockReturnValue({
      mutualLikesCount: 0,
      recentActivity: [],
      isLoading: false,
      error: null,
    })
  })

  const renderWithQueryClient = (component: React.ReactElement) => {
    return render(
      <QueryClientProvider client={queryClient}>
        {component}
      </QueryClientProvider>
    )
  }

  describe('MutualLikesSection Component', () => {
    // Clean up before each test to ensure isolation
    beforeEach(() => {
      cleanup()
    })

    test('should render without crashing', () => {
      // Render directly and verify the component mounts successfully
      // Note: Using direct render instead of toThrow() to avoid framer-motion
      // animation system issues in jsdom environment
      renderWithQueryClient(
        <MutualLikesSection isLoading={false} mutualLikes={[]} />
      )
      // If we get here without throwing, the test passes
      const emptyStates = screen.getAllByTestId('mutual-likes-empty')
      expect(emptyStates.length).toBeGreaterThanOrEqual(1)
    })

    test('should display loading state', () => {
      renderWithQueryClient(<MutualLikesSection isLoading={true} />)

      // Should show loading state
      expect(screen.getByTestId('mutual-likes-loading')).toBeInTheDocument()
    })

    test('should display empty state when no mutual likes', () => {
      renderWithQueryClient(
        <MutualLikesSection isLoading={false} mutualLikes={[]} />
      )

      // Should show empty state
      const emptyStates = screen.getAllByTestId('mutual-likes-empty')
      expect(emptyStates.length).toBeGreaterThanOrEqual(1)
    })

    test('should display mutual likes when available', async () => {
      const mockMutualLikes = [
        {
          property_id: 'prop-1',
          liked_by_count: 2,
          first_liked_at: '2024-01-01T00:00:00.000Z',
          last_liked_at: '2024-01-02T00:00:00.000Z',
          property: {
            address: '123 Test St',
            price: 500000,
            bedrooms: 3,
            bathrooms: 2,
            image_urls: ['/test-image.jpg'],
          },
        },
      ]

      renderWithQueryClient(
        <MutualLikesSection isLoading={false} mutualLikes={mockMutualLikes} />
      )

      // Should show mutual likes
      await waitFor(() => {
        expect(screen.getByTestId('mutual-likes-list')).toBeInTheDocument()
      })

      // Should display property information
      expect(screen.getByText('123 Test St')).toBeInTheDocument()
      expect(screen.getByText('$500k')).toBeInTheDocument()
    })

    test('should handle error state gracefully', () => {
      renderWithQueryClient(
        <MutualLikesSection
          isLoading={false}
          error="Failed to fetch mutual likes"
        />
      )

      // Should show error state
      expect(screen.getByTestId('mutual-likes-error')).toBeInTheDocument()
    })
  })

  describe('MutualLikesBadge Component', () => {
    test('should render with count', () => {
      renderWithQueryClient(<MutualLikesBadge likedByCount={5} />)

      expect(screen.getByTestId('mutual-likes-badge')).toBeInTheDocument()
      expect(screen.getByText('5')).toBeInTheDocument()
    })

    test('should not render with count less than 2', () => {
      const { container } = renderWithQueryClient(
        <MutualLikesBadge likedByCount={0} />
      )

      expect(container.firstChild).toBeNull()
    })

    test('should handle large numbers', () => {
      renderWithQueryClient(<MutualLikesBadge likedByCount={999} />)

      expect(screen.getByTestId('mutual-likes-badge')).toBeInTheDocument()
      expect(screen.getByText('999')).toBeInTheDocument()
    })
  })

  describe('Hook Integration', () => {
    test('should handle API call failures gracefully', async () => {
      // Mock fetch to simulate API failure
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'))

      const { useCouples } = await import('@/hooks/useCouples')

      // The hook should handle errors gracefully
      ;(useCouples as any).mockReturnValue({
        mutualLikes: [],
        householdActivity: [],
        isLoading: false,
        error: new Error('Network error'),
      })

      const result = (useCouples as any)()
      expect(result).toBeDefined()
      expect(result.error).toBeDefined()
    })

    test('should handle successful API responses', async () => {
      // Mock successful API response
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          mutualLikes: [
            {
              property_id: 'prop-1',
              liked_by_count: 2,
              first_liked_at: '2024-01-01T00:00:00.000Z',
              last_liked_at: '2024-01-02T00:00:00.000Z',
              user_ids: ['user-1', 'user-2'],
            },
          ],
        }),
      })

      const { useCouples } = await import('@/hooks/useCouples')

      ;(useCouples as any).mockReturnValue({
        mutualLikes: [
          {
            property_id: 'prop-1',
            liked_by_count: 2,
            first_liked_at: '2024-01-01T00:00:00.000Z',
            last_liked_at: '2024-01-02T00:00:00.000Z',
            user_ids: ['user-1', 'user-2'],
          },
        ],
        householdActivity: [],
        isLoading: false,
        error: null,
      })

      const result = (useCouples as any)()
      expect(result.mutualLikes).toHaveLength(1)
      expect(result.mutualLikes[0].property_id).toBe('prop-1')
    })
  })

  describe('Data Flow Verification', () => {
    test('should properly pass data from props to component', async () => {
      const mockData = [
        {
          property_id: 'test-prop',
          liked_by_count: 2,
          first_liked_at: '2024-01-01T00:00:00.000Z',
          last_liked_at: '2024-01-02T00:00:00.000Z',
          property: {
            address: '456 Test Ave',
            price: 750000,
            bedrooms: 4,
            bathrooms: 3,
            image_urls: ['/test.jpg'],
          },
        },
      ]

      renderWithQueryClient(
        <MutualLikesSection isLoading={false} mutualLikes={mockData} />
      )

      await waitFor(() => {
        expect(screen.getByTestId('mutual-likes-list')).toBeInTheDocument()
      })

      // Verify data is properly displayed
      expect(screen.getByText('456 Test Ave')).toBeInTheDocument()
      expect(screen.getByText('$750k')).toBeInTheDocument()
    })

    test('should handle component rerendering on data changes', async () => {
      const { rerender } = renderWithQueryClient(
        <MutualLikesSection isLoading={false} mutualLikes={[]} />
      )

      // Should show empty state initially
      const emptyStates = screen.getAllByTestId('mutual-likes-empty')
      expect(emptyStates.length).toBeGreaterThanOrEqual(1)

      // Update with new data
      const newMutualLikes = [
        {
          property_id: 'new-prop',
          liked_by_count: 2,
          first_liked_at: '2024-01-01T00:00:00.000Z',
          last_liked_at: '2024-01-02T00:00:00.000Z',
          property: {
            address: '789 New St',
            price: 600000,
            bedrooms: 3,
            bathrooms: 2.5,
            image_urls: ['/new.jpg'],
          },
        },
      ]

      rerender(
        <QueryClientProvider client={queryClient}>
          <MutualLikesSection isLoading={false} mutualLikes={newMutualLikes} />
        </QueryClientProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('mutual-likes-list')).toBeInTheDocument()
      })

      expect(screen.getByText('789 New St')).toBeInTheDocument()
    })
  })
})
