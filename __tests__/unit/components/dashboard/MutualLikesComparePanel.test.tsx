import { describe, expect, test, jest } from '@jest/globals'
import type { ReactNode } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import {
  MutualLikesComparePanel,
  type CompareLike,
} from '@/components/dashboard/MutualLikesComparePanel'

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href }: { children: ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}))

jest.mock('@/components/ui/property-image', () => ({
  PropertyImage: ({ alt }: { alt?: string }) => (
    <div data-testid="property-image" aria-label={alt} />
  ),
}))

const buildLike = (
  overrides: Partial<CompareLike> & { id: string }
): CompareLike => ({
  property_id: overrides.id,
  liked_by_count: overrides.liked_by_count ?? 2,
  last_liked_at: overrides.last_liked_at ?? '2024-01-02T00:00:00.000Z',
  property: overrides.property,
})

describe('MutualLikesComparePanel', () => {
  test('renders nothing when no selection', () => {
    const { container } = render(
      <MutualLikesComparePanel
        selected={[]}
        onRemove={() => {}}
        onClose={() => {}}
      />
    )
    expect(container.firstChild).toBeNull()
  })

  test('renders one card per selected property with key fields', () => {
    const selected = [
      buildLike({
        id: 'a',
        property: {
          address: '111 Aspen St',
          price: 500000,
          bedrooms: 3,
          bathrooms: 2,
          square_feet: 1500,
        },
      }),
      buildLike({
        id: 'b',
        property: {
          address: '222 Birch Ave',
          price: 700000,
          bedrooms: 4,
          bathrooms: 3,
          square_feet: 2200,
        },
      }),
    ]

    render(
      <MutualLikesComparePanel
        selected={selected}
        onRemove={() => {}}
        onClose={() => {}}
      />
    )

    expect(screen.getByText(/Comparing 2 homes/i)).toBeInTheDocument()
    expect(screen.getByTestId('compare-card-a')).toBeInTheDocument()
    expect(screen.getByTestId('compare-card-b')).toBeInTheDocument()

    expect(screen.getByText('111 Aspen St')).toBeInTheDocument()
    expect(screen.getByText('222 Birch Ave')).toBeInTheDocument()
    expect(screen.getByText('$500k')).toBeInTheDocument()
    expect(screen.getByText('$700k')).toBeInTheDocument()
    expect(screen.getByText('1,500')).toBeInTheDocument()
    expect(screen.getByText('2,200')).toBeInTheDocument()
  })

  test('highlights cheapest price and most beds with couples-primary class', () => {
    const selected = [
      buildLike({
        id: 'cheap',
        property: {
          address: 'Cheap',
          price: 300000,
          bedrooms: 2,
        },
      }),
      buildLike({
        id: 'pricey',
        property: {
          address: 'Pricey',
          price: 900000,
          bedrooms: 5,
        },
      }),
    ]

    render(
      <MutualLikesComparePanel
        selected={selected}
        onRemove={() => {}}
        onClose={() => {}}
      />
    )

    const cheapPrice = screen.getByText('$300k')
    expect(cheapPrice.className).toContain('text-couples-primary')

    const priceyPrice = screen.getByText('$900k')
    expect(priceyPrice.className).not.toContain('text-couples-primary')

    const fiveBeds = screen.getByText('5')
    expect(fiveBeds.className).toContain('text-couples-primary')
  })

  test('falls back to placeholder when property data is missing', () => {
    render(
      <MutualLikesComparePanel
        selected={[buildLike({ id: 'no-data' })]}
        onRemove={() => {}}
        onClose={() => {}}
      />
    )

    expect(screen.getByText('Property no-data')).toBeInTheDocument()
    // Three em-dashes for missing price/sqft/baths/beds — at least 1 row shows '—'
    expect(screen.getAllByText('—').length).toBeGreaterThan(0)
  })

  test('clicking remove fires onRemove with property id', () => {
    const onRemove = jest.fn()
    render(
      <MutualLikesComparePanel
        selected={[
          buildLike({
            id: 'a',
            property: { address: '111 Aspen St' },
          }),
        ]}
        onRemove={onRemove}
        onClose={() => {}}
      />
    )

    fireEvent.click(screen.getByTestId('compare-remove-a'))
    expect(onRemove).toHaveBeenCalledWith('a')
  })

  test('clicking close fires onClose', () => {
    const onClose = jest.fn()
    render(
      <MutualLikesComparePanel
        selected={[
          buildLike({ id: 'a', property: { address: '111 Aspen St' } }),
        ]}
        onRemove={() => {}}
        onClose={onClose}
      />
    )

    fireEvent.click(screen.getByTestId('compare-panel-close'))
    expect(onClose).toHaveBeenCalled()
  })
})
