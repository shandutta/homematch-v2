import { jest, describe, test, expect, beforeEach } from '@jest/globals'
import { screen, fireEvent, act } from '@testing-library/react'
import { renderWithQuery } from '../../../utils/TestQueryProvider'
import { PropertyCard } from '@/components/property/PropertyCard'
import { Property } from '@/lib/schemas/property'
import type { NeighborhoodVibesRecord } from '@/lib/schemas/neighborhood-vibes'

// Mock heavy / network-bound child components
jest.mock('@/components/property/PropertyMap', () => ({
  PropertyMap: () => <div data-testid="property-map" />,
}))

jest.mock('@/components/features/storytelling/StorytellingDescription', () => ({
  StorytellingDescription: () => <div data-testid="storytelling-description" />,
}))

jest.mock('@/components/features/couples/MutualLikesBadge', () => ({
  MutualLikesIndicator: () => <div data-testid="mutual-likes-indicator" />,
}))

jest.mock('@/hooks/useCouples', () => ({
  useMutualLikes: () => ({ data: [] }),
}))

jest.mock('@/hooks/usePropertyVibes', () => ({
  usePropertyVibes: () => ({ data: null }),
}))

const mockNeighborhoodVibesRef: { current: NeighborhoodVibesRecord | null } = {
  current: null,
}

jest.mock('@/hooks/useNeighborhoodVibes', () => ({
  useNeighborhoodVibes: () => ({ data: mockNeighborhoodVibesRef.current }),
}))

const FIXED_NOW = new Date('2026-05-09T12:00:00.000Z').getTime()

const daysAgo = (days: number): string =>
  new Date(FIXED_NOW - days * 24 * 60 * 60 * 1000).toISOString()

const buildProperty = (overrides: Partial<Property> = {}): Property => ({
  id: 'prop-polish-1',
  zpid: '99887766',
  address: '500 Maple Ave',
  city: 'Springfield',
  state: 'IL',
  zip_code: '62704',
  price: 600000,
  bedrooms: 3,
  bathrooms: 2,
  square_feet: 2000,
  images: ['/img.jpg'],
  coordinates: null,
  created_at: daysAgo(30),
  updated_at: daysAgo(2),
  amenities: null,
  description: null,
  is_active: true,
  listing_status: 'active',
  lot_size_sqft: null,
  neighborhood_id: null,
  parking_spots: null,
  property_hash: null,
  property_type: 'single_family',
  year_built: null,
  ...overrides,
})

describe('PropertyCard polish — dashboard', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    jest.setSystemTime(FIXED_NOW)
    mockNeighborhoodVibesRef.current = null
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  test('renders price-per-sqft when sqft is available', () => {
    renderWithQuery(<PropertyCard property={buildProperty()} />)
    // 600000 / 2000 = 300
    expect(screen.getByTestId('property-price-per-sqft')).toHaveTextContent(
      '$300/sqft'
    )
  })

  test('omits price-per-sqft when square_feet is missing', () => {
    renderWithQuery(
      <PropertyCard property={buildProperty({ square_feet: null })} />
    )
    expect(screen.queryByTestId('property-price-per-sqft')).toBeNull()
  })

  test('shows "New listing" pill when created within last 7 days', () => {
    renderWithQuery(
      <PropertyCard property={buildProperty({ created_at: daysAgo(3) })} />
    )
    expect(screen.getByTestId('property-days-on-market')).toHaveTextContent(
      'New listing'
    )
  })

  test('shows day count when older than 7 days', () => {
    renderWithQuery(
      <PropertyCard property={buildProperty({ created_at: daysAgo(45) })} />
    )
    expect(screen.getByTestId('property-days-on-market')).toHaveTextContent(
      '45d listed'
    )
  })

  test('hides days-on-market badge when created_at is missing', () => {
    renderWithQuery(
      <PropertyCard property={buildProperty({ created_at: null })} />
    )
    expect(screen.queryByTestId('property-days-on-market')).toBeNull()
  })

  test('renders neighborhood vibe badge when vibes have a theme', () => {
    mockNeighborhoodVibesRef.current = {
      id: '00000000-0000-0000-0000-000000000001',
      neighborhood_id: '00000000-0000-0000-0000-000000000002',
      tagline: 'Walkable, leafy, friendly',
      vibe_statement: 'A family-first neighborhood with a strong community.',
      neighborhood_themes: [
        {
          name: 'Family-friendly',
          whyItMatters: 'Schools rated top in district',
        },
      ],
      local_highlights: [],
      resident_fits: [],
      suggested_tags: ['walkable', 'leafy'],
      model_used: 'test',
      source_data_hash: 'hash',
    }

    renderWithQuery(<PropertyCard property={buildProperty()} />)
    const badge = screen.getByTestId('property-vibe-badge')
    expect(badge).toHaveTextContent('Family-friendly')
  })

  test('falls back to first suggested tag when no themes are present', () => {
    mockNeighborhoodVibesRef.current = {
      id: '00000000-0000-0000-0000-000000000003',
      neighborhood_id: '00000000-0000-0000-0000-000000000004',
      tagline: 'Quiet streets',
      vibe_statement: 'Quiet residential pocket close to transit.',
      neighborhood_themes: [],
      local_highlights: [],
      resident_fits: [],
      suggested_tags: ['transit-friendly', 'quiet'],
      model_used: 'test',
      source_data_hash: 'hash',
    }

    renderWithQuery(<PropertyCard property={buildProperty()} />)
    expect(screen.getByTestId('property-vibe-badge')).toHaveTextContent(
      'transit-friendly'
    )
  })

  test('renders trust signals: Zillow attribution + last-updated', () => {
    renderWithQuery(<PropertyCard property={buildProperty()} />)

    const attribution = screen.getByTestId('property-source-attribution')
    expect(attribution).toHaveTextContent('via Zillow')
    expect(attribution.getAttribute('href')).toContain('zillow.com')

    expect(screen.getByTestId('property-last-updated')).toHaveTextContent(
      /Updated/
    )
  })

  test('shows like-feedback overlay when like button is clicked', () => {
    const onDecision = jest.fn()
    renderWithQuery(
      <PropertyCard property={buildProperty()} onDecision={onDecision} />
    )

    fireEvent.click(screen.getByLabelText('Like property'))

    expect(onDecision).toHaveBeenCalledWith('prop-polish-1', 'liked')
    expect(screen.getByTestId('property-feedback-liked')).toBeTruthy()

    act(() => {
      jest.advanceTimersByTime(800)
    })
  })

  test('shows skip-feedback overlay when pass button is clicked', () => {
    const onDecision = jest.fn()
    renderWithQuery(
      <PropertyCard property={buildProperty()} onDecision={onDecision} />
    )

    fireEvent.click(screen.getByLabelText('Pass property'))

    expect(onDecision).toHaveBeenCalledWith('prop-polish-1', 'skip')
    expect(screen.getByTestId('property-feedback-skip')).toBeTruthy()

    act(() => {
      jest.advanceTimersByTime(800)
    })
  })
})
