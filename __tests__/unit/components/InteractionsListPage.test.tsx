import { jest, describe, it, expect } from '@jest/globals'
import React from 'react'
import { screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import { InteractionsListPage } from '@/components/dashboard/InteractionsListPage'
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
const createMockProperty = (id: string, address: string) => ({
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
})

describe('InteractionsListPage', () => {
  const baseHookState = {
    data: undefined as any,
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

  it('renders loading skeletons when loading and no data yet', () => {
    mockedUseInfinite.mockReturnValue({
      ...baseHookState,
      isLoading: true,
      data: undefined,
    })

    renderWithQuery(<InteractionsListPage type="viewed" title="Viewed" />)

    // Expect multiple skeletons visible (we render 6)
    const skeletons = document.querySelectorAll('.animate-pulse.h-96')
    expect(skeletons.length).toBeGreaterThanOrEqual(1)
  })

  it('renders empty state when no properties after load', () => {
    mockedUseInfinite.mockReturnValue({
      ...baseHookState,
      isLoading: false,
      data: { pages: [{ items: [] }] },
    })

    renderWithQuery(<InteractionsListPage type="liked" title="Liked" />)

    expect(screen.getByText(/No liked yet\./i)).toBeTruthy()
    expect(
      screen.getByText(/Start swiping to see properties here!/i)
    ).toBeTruthy()
  })

  it('renders PropertyCard for each item when data present', () => {
    mockedUseInfinite.mockReturnValue({
      ...baseHookState,
      isLoading: false,
      data: {
        pages: [
          {
            items: [
              {
                id: 'p1',
                address: '123 A',
                city: 'X',
                state: 'CA',
                zip_code: '00000',
                price: 1,
                bedrooms: 1,
                bathrooms: 1,
                square_feet: 1,
                property_type: 'single_family',
              },
            ],
          },
          {
            items: [
              {
                id: 'p2',
                address: '456 B',
                city: 'Y',
                state: 'CA',
                zip_code: '00000',
                price: 2,
                bedrooms: 2,
                bathrooms: 2,
                square_feet: 2,
                property_type: 'condo',
              },
            ],
          },
        ],
      },
    })

    // 'skip' is the allowed literal in InteractionType (domain renamed from "passed")
    renderWithQuery(<InteractionsListPage type="skip" title="Passed" />)

    // We expect to see two cards' addresses rendered via PropertyCard
    expect(screen.getByText('123 A')).toBeTruthy()
    expect(screen.getByText('456 B')).toBeTruthy()
  })

  it('shows Load More when hasNextPage, calls fetchNextPage on click', () => {
    const fetchNextPage = jest.fn()

    mockedUseInfinite.mockReturnValue({
      ...baseHookState,
      isLoading: false,
      hasNextPage: true,
      fetchNextPage,
      data: {
        pages: [
          {
            items: [
              {
                id: 'p1',
                address: '123 A',
                city: 'X',
                state: 'CA',
                zip_code: '00000',
                price: 1,
                bedrooms: 1,
                bathrooms: 1,
                square_feet: 1,
                property_type: 'single_family',
              },
            ],
          },
        ],
      },
    })

    renderWithQuery(<InteractionsListPage type="viewed" title="Viewed" />)

    const btn = screen.getByRole('button', {
      name: /Load More/i,
    }) as HTMLButtonElement
    expect(btn.disabled).toBe(false)

    fireEvent.click(btn)
    expect(fetchNextPage).toHaveBeenCalled()
  })

  it('disables Load More when isFetchingNextPage', () => {
    mockedUseInfinite.mockReturnValue({
      ...baseHookState,
      isLoading: false,
      hasNextPage: true,
      isFetchingNextPage: true,
      data: {
        pages: [
          {
            items: [
              {
                id: 'p1',
                address: '123 A',
                city: 'X',
                state: 'CA',
                zip_code: '00000',
                price: 1,
                bedrooms: 1,
                bathrooms: 1,
                square_feet: 1,
                property_type: 'single_family',
              },
            ],
          },
        ],
      },
    })

    renderWithQuery(<InteractionsListPage type="viewed" title="Viewed" />)

    const btn = screen.getByRole('button', {
      name: /Loading more.../i,
    }) as HTMLButtonElement
    expect(btn.disabled).toBe(true)
  })

  describe('Liked Page - Remove from Likes', () => {
    it('shows "Remove from likes" button on liked page', () => {
      mockedUseInfinite.mockReturnValue({
        ...baseHookState,
        isLoading: false,
        data: {
          pages: [{ items: [createMockProperty('liked-1', '100 Liked St')] }],
        },
      })

      renderWithQuery(
        <InteractionsListPage type="liked" title="Liked Properties" />
      )

      const removeButton = screen.getByRole('button', {
        name: /Remove from likes/i,
      })
      expect(removeButton).toBeTruthy()
    })

    it('calls deleteInteraction.mutate when "Remove from likes" is clicked', async () => {
      mockedUseInfinite.mockReturnValue({
        ...baseHookState,
        isLoading: false,
        data: {
          pages: [{ items: [createMockProperty('liked-1', '100 Liked St')] }],
        },
      })

      renderWithQuery(
        <InteractionsListPage type="liked" title="Liked Properties" />
      )

      const removeButton = screen.getByRole('button', {
        name: /Remove from likes/i,
      })
      fireEvent.click(removeButton)

      expect(mockDeleteMutate).toHaveBeenCalledWith(
        { propertyId: 'liked-1' },
        expect.any(Object)
      )
    })

    it('property should disappear from liked list after removal (optimistic update simulation)', async () => {
      // First render with the property
      const property = createMockProperty('liked-1', '100 Liked St')
      mockedUseInfinite.mockReturnValue({
        ...baseHookState,
        isLoading: false,
        data: {
          pages: [{ items: [property] }],
        },
      })

      const { rerender } = renderWithQuery(
        <InteractionsListPage type="liked" title="Liked Properties" />
      )

      expect(screen.getByText('100 Liked St')).toBeTruthy()

      // Simulate the optimistic update by re-rendering with empty data
      mockedUseInfinite.mockReturnValue({
        ...baseHookState,
        isLoading: false,
        data: {
          pages: [{ items: [] }],
        },
      })

      rerender(<InteractionsListPage type="liked" title="Liked Properties" />)

      // Property should no longer be visible
      expect(screen.queryByText('100 Liked St')).toBeNull()
      // Empty state should show
      expect(screen.getByText(/No liked properties yet\./i)).toBeTruthy()
    })
  })

  describe('Passed Page - Like from Passed', () => {
    it('shows "Like this home" button on passed page', () => {
      mockedUseInfinite.mockReturnValue({
        ...baseHookState,
        isLoading: false,
        data: {
          pages: [
            { items: [createMockProperty('passed-1', '200 Passed Ave')] },
          ],
        },
      })

      renderWithQuery(
        <InteractionsListPage type="skip" title="Passed Properties" />
      )

      const likeButton = screen.getByRole('button', {
        name: /Like this home/i,
      })
      expect(likeButton).toBeTruthy()
    })

    it('calls recordInteraction.mutate with "liked" when "Like this home" is clicked on passed page', async () => {
      mockedUseInfinite.mockReturnValue({
        ...baseHookState,
        isLoading: false,
        data: {
          pages: [
            { items: [createMockProperty('passed-1', '200 Passed Ave')] },
          ],
        },
      })

      renderWithQuery(
        <InteractionsListPage type="skip" title="Passed Properties" />
      )

      const likeButton = screen.getByRole('button', {
        name: /Like this home/i,
      })
      fireEvent.click(likeButton)

      expect(mockRecordMutate).toHaveBeenCalledWith(
        { propertyId: 'passed-1', type: 'liked' },
        expect.any(Object)
      )
    })

    it('property should disappear from passed list and appear on liked list (simulated)', async () => {
      // First render with the property on passed page
      const property = createMockProperty('passed-1', '200 Passed Ave')
      mockedUseInfinite.mockReturnValue({
        ...baseHookState,
        isLoading: false,
        data: {
          pages: [{ items: [property] }],
        },
      })

      const { rerender } = renderWithQuery(
        <InteractionsListPage type="skip" title="Passed Properties" />
      )

      expect(screen.getByText('200 Passed Ave')).toBeTruthy()

      // Simulate the mutation completing - property removed from passed list
      mockedUseInfinite.mockReturnValue({
        ...baseHookState,
        isLoading: false,
        data: {
          pages: [{ items: [] }],
        },
      })

      rerender(<InteractionsListPage type="skip" title="Passed Properties" />)

      // Property should no longer be visible on passed page
      expect(screen.queryByText('200 Passed Ave')).toBeNull()
    })
  })

  describe('Viewed Page - Pass and Like buttons', () => {
    it('shows both Pass and Like buttons on viewed page', () => {
      mockedUseInfinite.mockReturnValue({
        ...baseHookState,
        isLoading: false,
        data: {
          pages: [
            { items: [createMockProperty('viewed-1', '300 Viewed Blvd')] },
          ],
        },
      })

      renderWithQuery(
        <InteractionsListPage type="viewed" title="Viewed Properties" />
      )

      const passButton = screen.getByRole('button', {
        name: /Pass on this home/i,
      })
      const likeButton = screen.getByRole('button', {
        name: /Like this home/i,
      })

      expect(passButton).toBeTruthy()
      expect(likeButton).toBeTruthy()
    })

    it('calls recordInteraction with "skip" when Pass is clicked on viewed page', async () => {
      mockedUseInfinite.mockReturnValue({
        ...baseHookState,
        isLoading: false,
        data: {
          pages: [
            { items: [createMockProperty('viewed-1', '300 Viewed Blvd')] },
          ],
        },
      })

      renderWithQuery(
        <InteractionsListPage type="viewed" title="Viewed Properties" />
      )

      const passButton = screen.getByRole('button', {
        name: /Pass on this home/i,
      })
      fireEvent.click(passButton)

      expect(mockRecordMutate).toHaveBeenCalledWith(
        { propertyId: 'viewed-1', type: 'skip' },
        expect.any(Object)
      )
    })

    it('calls recordInteraction with "liked" when Like is clicked on viewed page', async () => {
      mockedUseInfinite.mockReturnValue({
        ...baseHookState,
        isLoading: false,
        data: {
          pages: [
            { items: [createMockProperty('viewed-1', '300 Viewed Blvd')] },
          ],
        },
      })

      renderWithQuery(
        <InteractionsListPage type="viewed" title="Viewed Properties" />
      )

      const likeButton = screen.getByRole('button', {
        name: /Like this home/i,
      })
      fireEvent.click(likeButton)

      expect(mockRecordMutate).toHaveBeenCalledWith(
        { propertyId: 'viewed-1', type: 'liked' },
        expect.any(Object)
      )
    })

    it('disables buttons after a decision is made on viewed page', async () => {
      mockedUseInfinite.mockReturnValue({
        ...baseHookState,
        isLoading: false,
        data: {
          pages: [
            { items: [createMockProperty('viewed-1', '300 Viewed Blvd')] },
          ],
        },
      })

      renderWithQuery(
        <InteractionsListPage type="viewed" title="Viewed Properties" />
      )

      const passButton = screen.getByRole('button', {
        name: /Pass on this home/i,
      }) as HTMLButtonElement
      const likeButton = screen.getByRole('button', {
        name: /Like this home/i,
      }) as HTMLButtonElement

      // Before decision, buttons should be enabled
      expect(passButton.disabled).toBe(false)
      expect(likeButton.disabled).toBe(false)

      // Click the pass button
      fireEvent.click(passButton)

      // After decision, both buttons should be disabled (due to local state update)
      // The component tracks propertyDecisions internally
      await waitFor(() => {
        const buttons = screen.getAllByRole('button')
        // Find the pass and like buttons again after state update
        const updatedPassButton = buttons.find((b) =>
          b.getAttribute('aria-label')?.includes('Pass')
        ) as HTMLButtonElement | undefined
        const updatedLikeButton = buttons.find((b) =>
          b.getAttribute('aria-label')?.includes('Like')
        ) as HTMLButtonElement | undefined

        if (updatedPassButton) {
          expect(updatedPassButton.disabled).toBe(true)
        }
        if (updatedLikeButton) {
          expect(updatedLikeButton.disabled).toBe(true)
        }
      })
    })
  })

  describe('Multiple properties interaction', () => {
    it('handles multiple properties with independent button states', () => {
      mockedUseInfinite.mockReturnValue({
        ...baseHookState,
        isLoading: false,
        data: {
          pages: [
            {
              items: [
                createMockProperty('p1', '111 First St'),
                createMockProperty('p2', '222 Second St'),
                createMockProperty('p3', '333 Third St'),
              ],
            },
          ],
        },
      })

      renderWithQuery(
        <InteractionsListPage type="liked" title="Liked Properties" />
      )

      // All three properties should be visible
      expect(screen.getByText('111 First St')).toBeTruthy()
      expect(screen.getByText('222 Second St')).toBeTruthy()
      expect(screen.getByText('333 Third St')).toBeTruthy()

      // All should have remove buttons
      const removeButtons = screen.getAllByRole('button', {
        name: /Remove from likes/i,
      })
      expect(removeButtons).toHaveLength(3)
    })

    it('clicking remove on one property only affects that property', () => {
      mockedUseInfinite.mockReturnValue({
        ...baseHookState,
        isLoading: false,
        data: {
          pages: [
            {
              items: [
                createMockProperty('p1', '111 First St'),
                createMockProperty('p2', '222 Second St'),
              ],
            },
          ],
        },
      })

      renderWithQuery(
        <InteractionsListPage type="liked" title="Liked Properties" />
      )

      const removeButtons = screen.getAllByRole('button', {
        name: /Remove from likes/i,
      })

      // Click the first remove button
      fireEvent.click(removeButtons[0])

      // Should only call mutate for the first property
      expect(mockDeleteMutate).toHaveBeenCalledTimes(1)
      expect(mockDeleteMutate).toHaveBeenCalledWith(
        { propertyId: 'p1' },
        expect.any(Object)
      )
    })
  })
})
