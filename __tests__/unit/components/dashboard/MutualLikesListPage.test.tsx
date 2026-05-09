import { describe, expect, test, jest, beforeEach } from '@jest/globals'
import type { ReactNode } from 'react'
import { fireEvent, screen } from '@testing-library/react'
import { renderWithQuery } from '../../../utils/TestQueryProvider'
import { MutualLikesListPage } from '@/components/dashboard/MutualLikesListPage'

type MutualLikesQueryShape = {
  data: unknown[]
  isLoading: boolean
  error: Error | null
  refetch: () => void
}

const mockQuery: MutualLikesQueryShape = {
  data: [],
  isLoading: false,
  error: null,
  refetch: jest.fn(),
}

jest.mock('@/hooks/useCouples', () => ({
  useMutualLikes: () => mockQuery,
}))

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href }: { children: ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}))

const buildLike = (overrides: {
  id: string
  liked_by_count?: number
  last_liked_at?: string
  property?: {
    address?: string
    price?: number
    bedrooms?: number
    bathrooms?: number
  }
}) => ({
  property_id: overrides.id,
  liked_by_count: overrides.liked_by_count ?? 2,
  first_liked_at: '2024-01-01T00:00:00.000Z',
  last_liked_at: overrides.last_liked_at ?? '2024-01-02T00:00:00.000Z',
  user_ids: ['u1', 'u2'],
  property: overrides.property
    ? {
        address: overrides.property.address ?? '123 Main St',
        price: overrides.property.price ?? 500000,
        bedrooms: overrides.property.bedrooms ?? 3,
        bathrooms: overrides.property.bathrooms ?? 2,
      }
    : undefined,
})

describe('MutualLikesListPage', () => {
  beforeEach(() => {
    mockQuery.data = []
    mockQuery.isLoading = false
    mockQuery.error = null
  })

  test('renders empty state with high-contrast text', () => {
    renderWithQuery(<MutualLikesListPage />)

    const heading = screen.getByRole('heading', {
      name: 'No mutual likes yet',
    })
    expect(heading).toHaveClass('text-hm-stone-100')

    const description = screen.getByText(
      /Keep swiping — when your household likes the same home it will appear here\./i
    )
    expect(description).toHaveClass('text-hm-stone-300')
  })

  test('does not show toolbar when there are no mutual likes', () => {
    renderWithQuery(<MutualLikesListPage />)
    expect(screen.queryByTestId('mutual-likes-toolbar')).toBeNull()
  })

  test('shows toolbar with sort + filter selects when likes exist', () => {
    mockQuery.data = [
      buildLike({ id: 'a', property: { bedrooms: 3 } }),
      buildLike({ id: 'b', property: { bedrooms: 2 } }),
    ]

    renderWithQuery(<MutualLikesListPage />)

    expect(screen.getByTestId('mutual-likes-toolbar')).toBeInTheDocument()
    expect(screen.getByTestId('mutual-likes-sort')).toBeInTheDocument()
    expect(screen.getByTestId('mutual-likes-bed-filter')).toBeInTheDocument()
    expect(screen.getByTestId('mutual-likes-count')).toHaveTextContent(
      'Showing 2 of 2'
    )
  })

  test('default sort orders by most recently liked', () => {
    mockQuery.data = [
      buildLike({
        id: 'older',
        last_liked_at: '2024-01-01T00:00:00.000Z',
        property: { address: '111 Older St' },
      }),
      buildLike({
        id: 'newer',
        last_liked_at: '2024-06-01T00:00:00.000Z',
        property: { address: '222 Newer St' },
      }),
    ]

    renderWithQuery(<MutualLikesListPage />)

    const cards = screen.getAllByText(/St$/)
    expect(cards[0]).toHaveTextContent('222 Newer St')
    expect(cards[1]).toHaveTextContent('111 Older St')
  })

  test('sorting by highest price reorders the cards', () => {
    mockQuery.data = [
      buildLike({
        id: 'cheap',
        property: { address: '100 Cheap St', price: 100000 },
      }),
      buildLike({
        id: 'pricey',
        property: { address: '900 Pricey Ave', price: 900000 },
      }),
    ]

    renderWithQuery(<MutualLikesListPage />)

    const sort = screen.getByTestId('mutual-likes-sort') as HTMLSelectElement
    fireEvent.change(sort, { target: { value: 'price-desc' } })

    const cards = screen.getAllByText(/(Cheap St|Pricey Ave)/)
    expect(cards[0]).toHaveTextContent('900 Pricey Ave')
    expect(cards[1]).toHaveTextContent('100 Cheap St')
  })

  test('bedroom filter hides homes below the threshold', () => {
    mockQuery.data = [
      buildLike({
        id: 'studio',
        property: { address: '1 Studio Ln', bedrooms: 1 },
      }),
      buildLike({
        id: 'big',
        property: { address: '50 Big Blvd', bedrooms: 4 },
      }),
    ]

    renderWithQuery(<MutualLikesListPage />)

    const bedFilter = screen.getByTestId(
      'mutual-likes-bed-filter'
    ) as HTMLSelectElement
    fireEvent.change(bedFilter, { target: { value: '3' } })

    expect(screen.queryByText('1 Studio Ln')).toBeNull()
    expect(screen.getByText('50 Big Blvd')).toBeInTheDocument()
    expect(screen.getByTestId('mutual-likes-count')).toHaveTextContent(
      'Showing 1 of 2'
    )
  })

  test('shows filtered-empty state when filters hide everything', () => {
    mockQuery.data = [
      buildLike({
        id: 'studio',
        property: { address: '1 Studio Ln', bedrooms: 1 },
      }),
    ]

    renderWithQuery(<MutualLikesListPage />)

    const bedFilter = screen.getByTestId(
      'mutual-likes-bed-filter'
    ) as HTMLSelectElement
    fireEvent.change(bedFilter, { target: { value: '4' } })

    expect(
      screen.getByTestId('mutual-likes-filtered-empty')
    ).toBeInTheDocument()
    expect(screen.getByText(/No matches with current filters/i)).toBeInTheDocument()
  })

  test('"Clear filters" button restores defaults', () => {
    mockQuery.data = [
      buildLike({
        id: 'studio',
        property: { address: '1 Studio Ln', bedrooms: 1 },
      }),
    ]

    renderWithQuery(<MutualLikesListPage />)

    const bedFilter = screen.getByTestId(
      'mutual-likes-bed-filter'
    ) as HTMLSelectElement
    fireEvent.change(bedFilter, { target: { value: '4' } })

    fireEvent.click(screen.getByText('Clear filters'))

    expect(bedFilter.value).toBe('any')
    expect(screen.getByText('1 Studio Ln')).toBeInTheDocument()
  })
})
