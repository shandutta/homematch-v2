/* eslint-disable @next/next/no-img-element */
import { jest, describe, test, expect } from '@jest/globals'
import { fireEvent, screen } from '@testing-library/react'
import { renderWithQuery } from '../../utils/TestQueryProvider'
import { PropertyDetailModal } from '@/components/property/PropertyDetailModal'
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
  PropertyImage: ({ src, alt }: { src?: string | string[]; alt: string }) => (
    <img
      data-testid="property-image"
      src={Array.isArray(src) ? src.join(',') : src}
      alt={alt}
    />
  ),
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

const baseProperty: Property = {
  id: 'prop-1',
  address: '123 Main St',
  city: 'Anytown',
  state: 'CA',
  zip_code: '12345',
  price: 750000,
  bedrooms: 3,
  bathrooms: 2,
  square_feet: 1800,
  images: ['/image-one.jpg', '/image-two.jpg', '/image-three.jpg'],
  coordinates: null,
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

const renderModal = (property: Property) =>
  renderWithQuery(
    <PropertyDetailModal
      property={property}
      open={true}
      onOpenChange={jest.fn()}
    />
  )

describe('PropertyDetailModal', () => {
  test('renders navigation controls and cycles through images', () => {
    renderModal(baseProperty)

    expect(screen.getByTestId('next-image')).toBeInTheDocument()
    expect(screen.getByTestId('previous-image')).toBeInTheDocument()
    expect(screen.getByTestId('image-counter')).toHaveTextContent('1 / 3')
    expect(screen.getByTestId('property-image')).toHaveAttribute(
      'src',
      '/image-one.jpg'
    )

    fireEvent.click(screen.getByTestId('next-image'))
    expect(screen.getByTestId('image-counter')).toHaveTextContent('2 / 3')
    expect(screen.getByTestId('property-image')).toHaveAttribute(
      'src',
      '/image-two.jpg'
    )

    fireEvent.click(screen.getByTestId('previous-image'))
    expect(screen.getByTestId('image-counter')).toHaveTextContent('1 / 3')
    expect(screen.getByTestId('property-image')).toHaveAttribute(
      'src',
      '/image-one.jpg'
    )
  })

  test('resets the carousel when the property changes', () => {
    const { rerender } = renderModal(baseProperty)

    fireEvent.click(screen.getByTestId('next-image'))
    expect(screen.getByTestId('image-counter')).toHaveTextContent('2 / 3')

    const newProperty: Property = {
      ...baseProperty,
      id: 'prop-2',
      address: '456 Oak Ave',
      images: ['/new-one.jpg', '/new-two.jpg'],
    }

    rerender(
      <PropertyDetailModal
        property={newProperty}
        open={true}
        onOpenChange={jest.fn()}
      />
    )

    expect(screen.getByTestId('image-counter')).toHaveTextContent('1 / 2')
    expect(screen.getByTestId('property-image')).toHaveAttribute(
      'src',
      '/new-one.jpg'
    )
  })

  test('hides navigation controls when only one image is available', () => {
    const singleImageProperty: Property = {
      ...baseProperty,
      images: ['/only.jpg'],
    }

    renderModal(singleImageProperty)

    expect(screen.queryByTestId('next-image')).toBeNull()
    expect(screen.queryByTestId('previous-image')).toBeNull()
    expect(screen.queryByTestId('image-counter')).toBeNull()
  })
})
