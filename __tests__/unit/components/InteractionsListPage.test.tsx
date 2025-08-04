import { jest, describe, it, expect } from '@jest/globals'
import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import { InteractionsListPage } from '@/components/dashboard/InteractionsListPage'

// Mock the hook used by the component
jest.mock('@/hooks/useInteractions', () => ({
  useInfiniteInteractions: jest.fn(),
}))

import { useInfiniteInteractions as mockedUseInfiniteInteractions } from '@/hooks/useInteractions'
const mockedUseInfinite = mockedUseInfiniteInteractions as unknown as jest.Mock

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
  })

  it('renders loading skeletons when loading and no data yet', () => {
    mockedUseInfinite.mockReturnValue({
      ...baseHookState,
      isLoading: true,
      data: undefined,
    })

    render(<InteractionsListPage type="viewed" title="Viewed" />)

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

    render(<InteractionsListPage type="liked" title="Liked" />)

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
                property_type: 'house',
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
    render(<InteractionsListPage type="skip" title="Passed" />)

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
                property_type: 'house',
              },
            ],
          },
        ],
      },
    })

    render(<InteractionsListPage type="viewed" title="Viewed" />)

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
                property_type: 'house',
              },
            ],
          },
        ],
      },
    })

    render(<InteractionsListPage type="viewed" title="Viewed" />)

    const btn = screen.getByRole('button', {
      name: /Loading more.../i,
    }) as HTMLButtonElement
    expect(btn.disabled).toBe(true)
  })
})
