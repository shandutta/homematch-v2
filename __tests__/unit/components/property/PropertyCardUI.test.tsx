import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import { PropertyCardUI } from '@/components/property/PropertyCardUI'
import type { Property } from '@/lib/schemas/property'

jest.mock('@/components/property/PropertyMap', () => ({
  PropertyMap: () => <div data-testid="property-map" />,
}))

jest.mock('@/components/features/storytelling/StorytellingDescription', () => ({
  StorytellingDescription: () => <div data-testid="storytelling-description" />,
}))

jest.mock('@/components/features/couples/MutualLikesBadge', () => ({
  MutualLikesIndicator: () => <div data-testid="mutual-likes-indicator" />,
}))

jest.mock('@/components/ui/property-image', () => ({
  PropertyImage: ({ alt }: { alt: string }) => (
    <div data-testid="property-image" aria-label={alt} />
  ),
}))

const mockProperty: Property = {
  id: 'prop-ui-1',
  address: '123 UI St',
  city: 'Anytown',
  state: 'CA',
  zip_code: '12345',
  price: 500000,
  bedrooms: 3,
  bathrooms: 2,
  square_feet: 1500,
  images: ['/image1.jpg'],
  coordinates: { lat: 37.7749, lng: -122.4194 } as any,
  created_at: '2024-01-01T00:00:00.000Z',
  amenities: null,
  description: null,
  is_active: true,
  listing_status: 'active',
  lot_size_sqft: null,
  neighborhood_id: null,
  parking_spots: null,
  property_hash: null,
  property_type: 'single_family',
  updated_at: null,
  year_built: null,
  zpid: '12345678',
}

describe('PropertyCardUI', () => {
  it('renders a Details CTA when clickable and toggle enabled', () => {
    const handleClick = jest.fn()

    render(
      <PropertyCardUI
        property={mockProperty}
        onCardClick={handleClick}
        enableDetailsToggle
        isClickable
        showMap={false}
      />
    )

    const detailsButton = screen.getByTestId('details-cta')
    expect(detailsButton).toBeInTheDocument()

    fireEvent.click(detailsButton)
    expect(handleClick).toHaveBeenCalled()
  })

  it('hides map content when showMap is false', () => {
    render(
      <PropertyCardUI
        property={mockProperty}
        enableDetailsToggle
        isClickable
        showMap={false}
      />
    )

    expect(screen.queryByTestId('property-map')).not.toBeInTheDocument()
    expect(screen.getByTestId('storytelling-description')).toBeInTheDocument()
  })

  it('does not render map/story toggle buttons', () => {
    render(
      <PropertyCardUI
        property={mockProperty}
        enableDetailsToggle
        isClickable
        showMap
      />
    )

    expect(screen.queryByRole('button', { name: 'Map' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Story' })).toBeNull()
  })
})
