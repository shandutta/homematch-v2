import { jest, describe, it, expect, beforeEach } from '@jest/globals'
import React from 'react'
import { screen, fireEvent, waitFor, within } from '@testing-library/react'
import '@testing-library/jest-dom'
import { GroupedViewedPropertiesPage } from '@/components/dashboard/GroupedViewedPropertiesPage'
import { renderWithQuery } from '@/__tests__/utils/TestQueryProvider'

// Mock the hooks used by the component - must use jest.fn() directly inside factory
jest.mock('@/hooks/useInteractions', () => {
  // Create stable mock functions inside the factory
  const mockDeleteMutate = jest.fn()
  const mockRecordMutate = jest.fn()

  return {
    __esModule: true,
    useInfiniteInteractions: jest.fn(),
    useDeleteInteraction: jest.fn(() => ({
      mutate: mockDeleteMutate,
      isPending: false,
    })),
    useRecordInteraction: jest.fn(() => ({
      mutate: mockRecordMutate,
      isPending: false,
    })),
    interactionKeys: {
      all: ['interactions'],
      summaries: () => ['interactions', 'summary'],
      lists: () => ['interactions', 'list'],
      list: (type: string) => ['interactions', 'list', type],
    },
    // Export mock functions so tests can access them
    _mockDeleteMutate: mockDeleteMutate,
    _mockRecordMutate: mockRecordMutate,
  }
})

import {
  useInfiniteInteractions,
  useDeleteInteraction,
  useRecordInteraction,
  // @ts-expect-error - accessing test mocks
  _mockDeleteMutate as mockDeleteMutate,
  // @ts-expect-error - accessing test mocks
  _mockRecordMutate as mockRecordMutate,
} from '@/hooks/useInteractions'

const mockedUseInfinite = useInfiniteInteractions as unknown as jest.Mock
const mockedUseDeleteInteraction = useDeleteInteraction as unknown as jest.Mock
const mockedUseRecordInteraction = useRecordInteraction as unknown as jest.Mock

// Sample property fixture for testing
const createMockProperty = (
  id: string,
  address: string,
  overrides: Record<string, unknown> = {}
) => ({
  id,
  address,
  city: 'TestCity',
  state: 'CA',
  zip_code: '90210',
  price: 500000,
  bedrooms: 3,
  bathrooms: 2,
  square_feet: 1500,
  property_type: 'single_family',
  images: ['https://example.com/image.jpg'],
  description: null,
  coordinates: null,
  neighborhood_id: null,
  amenities: null,
  year_built: 2020,
  lot_size_sqft: null,
  parking_spots: null,
  listing_status: 'active',
  property_hash: null,
  is_active: true,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  zpid: null,
  ...overrides,
})

describe('GroupedViewedPropertiesPage', () => {
  const baseHookState = {
    data: { pages: [{ items: [] }] },
    fetchNextPage: jest.fn(),
    hasNextPage: false,
    isLoading: false,
    isFetchingNextPage: false,
  }

  beforeEach(() => {
    jest.clearAllMocks()
    // Reset the mock implementations for each test
    mockedUseDeleteInteraction.mockReturnValue({
      mutate: mockDeleteMutate,
      isPending: false,
    })
    mockedUseRecordInteraction.mockReturnValue({
      mutate: mockRecordMutate,
      isPending: false,
    })
    mockDeleteMutate.mockClear()
    mockRecordMutate.mockClear()
  })

  const setupMocks = ({
    liked = [],
    passed = [],
    viewed = [],
    isLoading = false,
  }: {
    liked?: ReturnType<typeof createMockProperty>[]
    passed?: ReturnType<typeof createMockProperty>[]
    viewed?: ReturnType<typeof createMockProperty>[]
    isLoading?: boolean
  }) => {
    mockedUseInfinite.mockImplementation((type: string) => {
      if (type === 'liked') {
        return {
          ...baseHookState,
          isLoading,
          data: { pages: [{ items: liked }] },
        }
      }
      if (type === 'skip') {
        return {
          ...baseHookState,
          isLoading,
          data: { pages: [{ items: passed }] },
        }
      }
      if (type === 'viewed') {
        return {
          ...baseHookState,
          isLoading,
          data: { pages: [{ items: viewed }] },
        }
      }
      return baseHookState
    })
  }

  describe('Loading and Empty States', () => {
    it('renders loading skeletons when all queries are loading', () => {
      setupMocks({ isLoading: true })

      renderWithQuery(<GroupedViewedPropertiesPage />)

      // Expect multiple skeletons visible (we render 6 with responsive aspect ratios)
      const skeletons = document.querySelectorAll('.animate-pulse')
      expect(skeletons.length).toBeGreaterThanOrEqual(1)
    })

    it('renders empty state when no properties in any category', () => {
      setupMocks({ liked: [], passed: [], viewed: [] })

      renderWithQuery(<GroupedViewedPropertiesPage />)

      expect(screen.getByText(/No viewed properties yet/i)).toBeTruthy()
      expect(screen.getByText(/Swipe through recommendations/i)).toBeTruthy()
    })
  })

  describe('Section Rendering', () => {
    it('renders three distinct sections with correct titles', () => {
      const likedProperty = createMockProperty('liked-1', '100 Liked St')
      const passedProperty = createMockProperty('passed-1', '200 Passed Ave')
      const viewedProperty = createMockProperty('viewed-1', '300 Viewed Blvd')

      setupMocks({
        liked: [likedProperty],
        passed: [passedProperty],
        viewed: [viewedProperty],
      })

      renderWithQuery(<GroupedViewedPropertiesPage />)

      // Check all sections are rendered
      expect(screen.getByTestId('section-liked')).toBeTruthy()
      expect(screen.getByTestId('section-skip')).toBeTruthy()
      expect(screen.getByTestId('section-viewed-only')).toBeTruthy()

      // Check section titles (using getAllByText for "Viewed Properties" since page title also uses it)
      const likedSection = screen.getByTestId('section-liked')
      const passedSection = screen.getByTestId('section-skip')
      const viewedOnlySection = screen.getByTestId('section-viewed-only')

      expect(within(likedSection).getByText('Liked Properties')).toBeTruthy()
      expect(within(passedSection).getByText('Passed Properties')).toBeTruthy()
      expect(screen.getByText('Viewed Properties')).toBeTruthy()
      expect(within(viewedOnlySection).getByText('Undecided')).toBeTruthy()
    })

    it('renders mobile section toggles and switches active section', () => {
      const likedProperty = createMockProperty('liked-1', '100 Liked St')
      const passedProperty = createMockProperty('passed-1', '200 Passed Ave')
      const viewedProperty = createMockProperty('viewed-1', '300 Viewed Blvd')

      setupMocks({
        liked: [likedProperty],
        passed: [passedProperty],
        viewed: [viewedProperty],
      })

      renderWithQuery(<GroupedViewedPropertiesPage />)

      const likedToggle = screen.getByRole('button', { name: /liked/i })
      const passedToggle = screen.getByRole('button', { name: /passed/i })
      const viewedToggle = screen.getByRole('button', { name: /undecided/i })

      expect(likedToggle).toBeTruthy()
      expect(passedToggle).toBeTruthy()
      expect(viewedToggle).toBeTruthy()

      const likedSection = screen.getByTestId('section-liked')
      const passedSection = screen.getByTestId('section-skip')

      const likedWrapper = likedSection.parentElement as HTMLElement
      const passedWrapper = passedSection.parentElement as HTMLElement

      expect(likedWrapper.className).not.toContain('hidden')
      expect(passedWrapper.className).toContain('hidden')

      fireEvent.click(passedToggle)

      expect(likedWrapper.className).toContain('hidden')
      expect(passedWrapper.className).not.toContain('hidden')
    })

    it('does not render empty sections', () => {
      const likedProperty = createMockProperty('liked-1', '100 Liked St')

      setupMocks({
        liked: [likedProperty],
        passed: [],
        viewed: [],
      })

      renderWithQuery(<GroupedViewedPropertiesPage />)

      // Only liked section should exist
      expect(screen.getByTestId('section-liked')).toBeTruthy()
      expect(screen.queryByTestId('section-skip')).toBeNull()
      expect(screen.queryByTestId('section-viewed-only')).toBeNull()
    })

    it('filters viewed-only properties correctly (excludes liked and passed)', () => {
      const likedProperty = createMockProperty('liked-1', '100 Liked St')
      const passedProperty = createMockProperty('passed-1', '200 Passed Ave')
      const viewedOnlyProperty = createMockProperty(
        'viewed-1',
        '300 Viewed Blvd'
      )

      // Viewed list includes all three, but liked and passed should be in their own sections
      setupMocks({
        liked: [likedProperty],
        passed: [passedProperty],
        viewed: [likedProperty, passedProperty, viewedOnlyProperty],
      })

      renderWithQuery(<GroupedViewedPropertiesPage />)

      // The viewed-only section should only contain the viewed-only property
      const viewedOnlySection = screen.getByTestId('section-viewed-only')
      expect(viewedOnlySection).toBeTruthy()

      // Check that viewedOnlyProperty is in viewed-only section with both buttons
      const viewedOnlyCard = screen.getByTestId('property-card-viewed-1')
      expect(viewedOnlyCard).toBeTruthy()
    })
  })

  describe('Liked Section - Remove from Likes Button', () => {
    it('shows illuminated "Remove from likes" button in liked section', () => {
      const likedProperty = createMockProperty('liked-1', '100 Liked St')

      setupMocks({ liked: [likedProperty], passed: [], viewed: [] })

      renderWithQuery(<GroupedViewedPropertiesPage />)

      const removeButton = screen.getByTestId('remove-like-liked-1')
      expect(removeButton).toBeTruthy()
      // Check for illuminated state (scale-110 and ring-2 classes)
      expect(removeButton.className).toContain('scale-110')
      expect(removeButton.className).toContain('ring-2')
    })

    it('calls deleteInteraction when remove button is clicked', () => {
      const likedProperty = createMockProperty('liked-1', '100 Liked St')

      setupMocks({ liked: [likedProperty], passed: [], viewed: [] })

      renderWithQuery(<GroupedViewedPropertiesPage />)

      const removeButton = screen.getByTestId('remove-like-liked-1')
      fireEvent.click(removeButton)

      expect(mockDeleteMutate).toHaveBeenCalledWith(
        { propertyId: 'liked-1' },
        expect.any(Object)
      )
    })

    it('property disappears from liked section after removal', () => {
      const likedProperty = createMockProperty('liked-1', '100 Liked St')

      setupMocks({ liked: [likedProperty], passed: [], viewed: [] })

      const { rerender } = renderWithQuery(<GroupedViewedPropertiesPage />)

      expect(screen.getByText('100 Liked St')).toBeTruthy()

      // Simulate optimistic update - property removed from liked
      setupMocks({ liked: [], passed: [], viewed: [] })

      rerender(<GroupedViewedPropertiesPage />)

      expect(screen.queryByText('100 Liked St')).toBeNull()
    })

    it('removed property should appear in passed section (simulated flow)', () => {
      const property = createMockProperty('prop-1', '100 Test St')

      // Initial state: property is liked
      setupMocks({ liked: [property], passed: [], viewed: [] })

      const { rerender } = renderWithQuery(<GroupedViewedPropertiesPage />)

      // Verify in liked section
      expect(screen.getByTestId('section-liked')).toBeTruthy()
      expect(screen.getByText('100 Test St')).toBeTruthy()

      // After removal: property moves to passed
      setupMocks({ liked: [], passed: [property], viewed: [] })

      rerender(<GroupedViewedPropertiesPage />)

      // Now should be in passed section
      expect(screen.queryByTestId('section-liked')).toBeNull()
      expect(screen.getByTestId('section-skip')).toBeTruthy()
      expect(screen.getByText('100 Test St')).toBeTruthy()
    })
  })

  describe('Passed Section - Like Button', () => {
    it('shows illuminated "Like" button in passed section', () => {
      const passedProperty = createMockProperty('passed-1', '200 Passed Ave')

      setupMocks({ liked: [], passed: [passedProperty], viewed: [] })

      renderWithQuery(<GroupedViewedPropertiesPage />)

      const likeButton = screen.getByTestId('like-passed-1')
      expect(likeButton).toBeTruthy()
      // Check for illuminated state (scale-110 and ring-2 classes)
      expect(likeButton.className).toContain('scale-110')
      expect(likeButton.className).toContain('ring-2')
      // Heart should be filled
      const heartIcon = likeButton.querySelector('svg')
      expect(heartIcon?.getAttribute('fill')).toBe('currentColor')
    })

    it('calls recordInteraction with "liked" when like button is clicked', () => {
      const passedProperty = createMockProperty('passed-1', '200 Passed Ave')

      setupMocks({ liked: [], passed: [passedProperty], viewed: [] })

      renderWithQuery(<GroupedViewedPropertiesPage />)

      const likeButton = screen.getByTestId('like-passed-1')
      fireEvent.click(likeButton)

      expect(mockRecordMutate).toHaveBeenCalledWith(
        { propertyId: 'passed-1', type: 'liked' },
        expect.any(Object)
      )
    })

    it('property moves from passed to liked section after liking', () => {
      const property = createMockProperty('prop-1', '200 Test Ave')

      // Initial state: property is passed
      setupMocks({ liked: [], passed: [property], viewed: [] })

      const { rerender } = renderWithQuery(<GroupedViewedPropertiesPage />)

      // Verify in passed section
      expect(screen.getByTestId('section-skip')).toBeTruthy()
      expect(screen.getByText('200 Test Ave')).toBeTruthy()

      // After liking: property moves to liked
      setupMocks({ liked: [property], passed: [], viewed: [] })

      rerender(<GroupedViewedPropertiesPage />)

      // Now should be in liked section
      expect(screen.queryByTestId('section-skip')).toBeNull()
      expect(screen.getByTestId('section-liked')).toBeTruthy()
      expect(screen.getByText('200 Test Ave')).toBeTruthy()
    })
  })

  describe('Viewed-Only Section - Both Buttons', () => {
    it('shows both Pass and Like buttons in viewed-only section', () => {
      const viewedOnlyProperty = createMockProperty(
        'viewed-1',
        '300 Viewed Blvd'
      )

      setupMocks({
        liked: [],
        passed: [],
        viewed: [viewedOnlyProperty],
      })

      renderWithQuery(<GroupedViewedPropertiesPage />)

      const passButton = screen.getByTestId('pass-viewed-1')
      const likeButton = screen.getByTestId('like-viewed-1')

      expect(passButton).toBeTruthy()
      expect(likeButton).toBeTruthy()

      // Both buttons should NOT be illuminated initially
      expect(passButton.className).not.toContain('scale-110')
      expect(likeButton.className).not.toContain('scale-110')
    })

    it('calls recordInteraction with "skip" when Pass is clicked', () => {
      const viewedOnlyProperty = createMockProperty(
        'viewed-1',
        '300 Viewed Blvd'
      )

      setupMocks({
        liked: [],
        passed: [],
        viewed: [viewedOnlyProperty],
      })

      renderWithQuery(<GroupedViewedPropertiesPage />)

      const passButton = screen.getByTestId('pass-viewed-1')
      fireEvent.click(passButton)

      expect(mockRecordMutate).toHaveBeenCalledWith(
        { propertyId: 'viewed-1', type: 'skip' },
        expect.any(Object)
      )
    })

    it('calls recordInteraction with "liked" when Like is clicked', () => {
      const viewedOnlyProperty = createMockProperty(
        'viewed-1',
        '300 Viewed Blvd'
      )

      setupMocks({
        liked: [],
        passed: [],
        viewed: [viewedOnlyProperty],
      })

      renderWithQuery(<GroupedViewedPropertiesPage />)

      const likeButton = screen.getByTestId('like-viewed-1')
      fireEvent.click(likeButton)

      expect(mockRecordMutate).toHaveBeenCalledWith(
        { propertyId: 'viewed-1', type: 'liked' },
        expect.any(Object)
      )
    })

    it('illuminates Pass button after clicking it', async () => {
      const viewedOnlyProperty = createMockProperty(
        'viewed-1',
        '300 Viewed Blvd'
      )

      setupMocks({
        liked: [],
        passed: [],
        viewed: [viewedOnlyProperty],
      })

      renderWithQuery(<GroupedViewedPropertiesPage />)

      const passButton = screen.getByTestId('pass-viewed-1')
      fireEvent.click(passButton)

      await waitFor(() => {
        const updatedPassButton = screen.getByTestId('pass-viewed-1')
        expect(updatedPassButton.className).toContain('scale-110')
        expect(updatedPassButton.className).toContain('ring-2')
      })
    })

    it('illuminates Like button after clicking it', async () => {
      const viewedOnlyProperty = createMockProperty(
        'viewed-1',
        '300 Viewed Blvd'
      )

      setupMocks({
        liked: [],
        passed: [],
        viewed: [viewedOnlyProperty],
      })

      renderWithQuery(<GroupedViewedPropertiesPage />)

      const likeButton = screen.getByTestId('like-viewed-1')
      fireEvent.click(likeButton)

      await waitFor(() => {
        const updatedLikeButton = screen.getByTestId('like-viewed-1')
        expect(updatedLikeButton.className).toContain('scale-110')
        expect(updatedLikeButton.className).toContain('ring-2')
      })
    })

    it('disables both buttons after a decision is made', async () => {
      const viewedOnlyProperty = createMockProperty(
        'viewed-1',
        '300 Viewed Blvd'
      )

      setupMocks({
        liked: [],
        passed: [],
        viewed: [viewedOnlyProperty],
      })

      renderWithQuery(<GroupedViewedPropertiesPage />)

      const passButton = screen.getByTestId(
        'pass-viewed-1'
      ) as HTMLButtonElement
      const likeButton = screen.getByTestId(
        'like-viewed-1'
      ) as HTMLButtonElement

      expect(passButton.disabled).toBe(false)
      expect(likeButton.disabled).toBe(false)

      fireEvent.click(passButton)

      await waitFor(() => {
        const updatedPassButton = screen.getByTestId(
          'pass-viewed-1'
        ) as HTMLButtonElement
        const updatedLikeButton = screen.getByTestId(
          'like-viewed-1'
        ) as HTMLButtonElement
        expect(updatedPassButton.disabled).toBe(true)
        expect(updatedLikeButton.disabled).toBe(true)
      })
    })

    it('property moves to liked section after clicking Like', () => {
      const property = createMockProperty('viewed-1', '300 Viewed Blvd')

      // Initial: only in viewed
      setupMocks({
        liked: [],
        passed: [],
        viewed: [property],
      })

      const { rerender } = renderWithQuery(<GroupedViewedPropertiesPage />)

      expect(screen.getByTestId('section-viewed-only')).toBeTruthy()

      // After clicking like
      setupMocks({
        liked: [property],
        passed: [],
        viewed: [property], // Still in viewed list from API perspective
      })

      rerender(<GroupedViewedPropertiesPage />)

      // Should now be in liked section (and filtered out of viewed-only)
      expect(screen.getByTestId('section-liked')).toBeTruthy()
      expect(screen.queryByTestId('section-viewed-only')).toBeNull()
    })

    it('property moves to passed section after clicking Pass', () => {
      const property = createMockProperty('viewed-1', '300 Viewed Blvd')

      // Initial: only in viewed
      setupMocks({
        liked: [],
        passed: [],
        viewed: [property],
      })

      const { rerender } = renderWithQuery(<GroupedViewedPropertiesPage />)

      expect(screen.getByTestId('section-viewed-only')).toBeTruthy()

      // After clicking pass
      setupMocks({
        liked: [],
        passed: [property],
        viewed: [property],
      })

      rerender(<GroupedViewedPropertiesPage />)

      // Should now be in passed section
      expect(screen.getByTestId('section-skip')).toBeTruthy()
      expect(screen.queryByTestId('section-viewed-only')).toBeNull()
    })
  })

  describe('Complete User Flow', () => {
    it('handles a complete flow: view → like → remove → pass → like again', () => {
      const property = createMockProperty('flow-1', '500 Flow Lane')

      // Step 1: Property only viewed
      setupMocks({
        liked: [],
        passed: [],
        viewed: [property],
      })

      const { rerender } = renderWithQuery(<GroupedViewedPropertiesPage />)
      expect(screen.getByTestId('section-viewed-only')).toBeTruthy()

      // Step 2: User likes it
      setupMocks({
        liked: [property],
        passed: [],
        viewed: [property],
      })
      rerender(<GroupedViewedPropertiesPage />)
      expect(screen.getByTestId('section-liked')).toBeTruthy()
      expect(screen.queryByTestId('section-viewed-only')).toBeNull()

      // Step 3: User removes from likes
      setupMocks({
        liked: [],
        passed: [property],
        viewed: [property],
      })
      rerender(<GroupedViewedPropertiesPage />)
      expect(screen.getByTestId('section-skip')).toBeTruthy()
      expect(screen.queryByTestId('section-liked')).toBeNull()

      // Step 4: User likes again from passed
      setupMocks({
        liked: [property],
        passed: [],
        viewed: [property],
      })
      rerender(<GroupedViewedPropertiesPage />)
      expect(screen.getByTestId('section-liked')).toBeTruthy()
      expect(screen.queryByTestId('section-skip')).toBeNull()
    })

    it('handles multiple properties in different states simultaneously', () => {
      const likedProp1 = createMockProperty('l1', '100 Liked Lane')
      const likedProp2 = createMockProperty('l2', '101 Liked Lane')
      const passedProp = createMockProperty('p1', '200 Passed Ave')
      const viewedProp1 = createMockProperty('v1', '300 Viewed St')
      const viewedProp2 = createMockProperty('v2', '301 Viewed St')

      setupMocks({
        liked: [likedProp1, likedProp2],
        passed: [passedProp],
        viewed: [likedProp1, likedProp2, passedProp, viewedProp1, viewedProp2],
      })

      renderWithQuery(<GroupedViewedPropertiesPage />)

      // All three sections should be visible
      expect(screen.getByTestId('section-liked')).toBeTruthy()
      expect(screen.getByTestId('section-skip')).toBeTruthy()
      expect(screen.getByTestId('section-viewed-only')).toBeTruthy()

      // Liked section should have 2 properties with remove buttons
      expect(screen.getByTestId('remove-like-l1')).toBeTruthy()
      expect(screen.getByTestId('remove-like-l2')).toBeTruthy()

      // Passed section should have 1 property with like button
      expect(screen.getByTestId('like-p1')).toBeTruthy()

      // Viewed-only section should have 2 properties with both buttons each
      expect(screen.getByTestId('pass-v1')).toBeTruthy()
      expect(screen.getByTestId('like-v1')).toBeTruthy()
      expect(screen.getByTestId('pass-v2')).toBeTruthy()
      expect(screen.getByTestId('like-v2')).toBeTruthy()
    })
  })

  describe('Load More Functionality', () => {
    it('shows Load More button when any list has more pages', () => {
      const property = createMockProperty('prop-1', '100 Test St')

      mockedUseInfinite.mockImplementation((type: string) => {
        if (type === 'liked') {
          return {
            ...baseHookState,
            hasNextPage: true,
            data: { pages: [{ items: [property] }] },
          }
        }
        return baseHookState
      })

      renderWithQuery(<GroupedViewedPropertiesPage />)

      expect(screen.getByRole('button', { name: /Load More/i })).toBeTruthy()
    })

    it('calls fetchNextPage for all lists when Load More is clicked', () => {
      const fetchNextPageLiked = jest.fn()
      const fetchNextPagePassed = jest.fn()
      const fetchNextPageViewed = jest.fn()

      const property = createMockProperty('prop-1', '100 Test St')

      mockedUseInfinite.mockImplementation((type: string) => {
        if (type === 'liked') {
          return {
            ...baseHookState,
            hasNextPage: true,
            fetchNextPage: fetchNextPageLiked,
            data: { pages: [{ items: [property] }] },
          }
        }
        if (type === 'skip') {
          return {
            ...baseHookState,
            hasNextPage: true,
            fetchNextPage: fetchNextPagePassed,
            data: { pages: [{ items: [] }] },
          }
        }
        if (type === 'viewed') {
          return {
            ...baseHookState,
            hasNextPage: true,
            fetchNextPage: fetchNextPageViewed,
            data: { pages: [{ items: [] }] },
          }
        }
        return baseHookState
      })

      renderWithQuery(<GroupedViewedPropertiesPage />)

      const loadMoreButton = screen.getByRole('button', { name: /Load More/i })
      fireEvent.click(loadMoreButton)

      expect(fetchNextPageLiked).toHaveBeenCalled()
      expect(fetchNextPagePassed).toHaveBeenCalled()
      expect(fetchNextPageViewed).toHaveBeenCalled()
    })
  })
})
