import { jest, describe, test, expect } from '@jest/globals'
import { screen } from '@testing-library/react'
import { renderWithQuery } from '../../utils/TestQueryProvider'
import { PropertyCard } from '@/components/property/PropertyCard'
import { Property } from '@/lib/schemas/property'
import { useNeighborhoodVibes } from '@/hooks/useNeighborhoodVibes'

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
  useMutualLikes: () => ({
    data: [],
  }),
}))

jest.mock('@/hooks/usePropertyVibes', () => ({
  usePropertyVibes: () => ({
    data: null,
  }),
}))

jest.mock('@/hooks/useNeighborhoodVibes', () => ({
  useNeighborhoodVibes: jest.fn(),
}))

const mockProperty: Property = {
  id: 'prop-1',
  address: '123 Main St',
  city: 'Anytown',
  state: 'CA',
  zip_code: '12345',
  price: 500000,
  bedrooms: 3,
  bathrooms: 2,
  square_feet: 1500,
  images: ['/image1.jpg'],
  coordinates: null,
  created_at: '2024-01-01T00:00:00.000Z',
  amenities: null,
  description: null,
  is_active: true,
  listing_status: 'active',
  lot_size_sqft: null,
  neighborhood_id: 'test-neighborhood-1',
  parking_spots: null,
  property_hash: null,
  property_type: 'single_family',
  updated_at: null,
  year_built: null,
  zpid: '12345678',
}

describe('PropertyCard neighborhood vibes', () => {
  test('renders neighborhood vibes when available', () => {
    const mockUseNeighborhoodVibes = jest.mocked(useNeighborhoodVibes)
    mockUseNeighborhoodVibes.mockReturnValue({
      data: {
        tagline: 'Coffee shops and quiet streets',
        vibe_statement: 'A leafy pocket with weekend brunch energy.',
        suggested_tags: ['Brunch', 'Walkable', 'Parks', 'Calm', 'Extra'],
      },
    })

    renderWithQuery(<PropertyCard property={mockProperty} />)

    expect(useNeighborhoodVibes).toHaveBeenCalledWith('test-neighborhood-1')

    expect(screen.getByText('Neighborhood vibe')).toBeDefined()
    expect(screen.getByText('Coffee shops and quiet streets')).toBeDefined()
  })
})
