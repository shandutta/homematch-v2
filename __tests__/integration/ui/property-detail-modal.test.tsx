/* eslint-disable @next/next/no-img-element */
import { describe, test, expect, beforeEach, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { PropertyDetailModal } from '@/components/property/PropertyDetailModal'
import type { Property } from '@/lib/schemas/property'

vi.mock('@/components/property/PropertyMap', () => ({
  PropertyMap: () => <div data-testid="property-map" />,
}))

vi.mock('@/components/features/storytelling/StorytellingDescription', () => ({
  StorytellingDescription: () => <div data-testid="storytelling-description" />,
}))

vi.mock('@/components/features/couples/MutualLikesBadge', () => ({
  MutualLikesIndicator: () => <div data-testid="mutual-likes-indicator" />,
}))

vi.mock('@/components/ui/property-image', () => ({
  PropertyImage: ({ src, alt }: { src?: string | string[]; alt: string }) => (
    <img
      data-testid="property-image"
      src={Array.isArray(src) ? src.join(',') : src}
      alt={alt}
    />
  ),
}))

vi.mock('@/hooks/useCouples', () => ({
  useMutualLikes: () => ({
    data: [],
  }),
}))

vi.mock('@/hooks/usePropertyVibes', () => ({
  usePropertyVibes: () => ({
    data: null,
  }),
}))

const baseProperty: Property = {
  id: 'prop-1',
  address: '789 Cedar Ln',
  city: 'Sometown',
  state: 'TX',
  zip_code: '75001',
  price: 625000,
  bedrooms: 4,
  bathrooms: 3,
  square_feet: 2100,
  images: ['/gallery-1.jpg', '/gallery-2.jpg', '/gallery-3.jpg'],
  coordinates: null,
  created_at: '2024-02-01T00:00:00.000Z',
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
  zpid: '987654321',
}

describe('PropertyDetailModal integration', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    })
  })

  const renderModal = (property: Property) =>
    render(
      <QueryClientProvider client={queryClient}>
        <PropertyDetailModal
          property={property}
          open={true}
          onOpenChange={vi.fn()}
        />
      </QueryClientProvider>
    )

  test('allows selecting specific images from the gallery dots', () => {
    renderModal(baseProperty)

    expect(screen.getByTestId('image-counter')).toHaveTextContent('1 / 3')
    expect(screen.getByTestId('property-image')).toHaveAttribute(
      'src',
      '/gallery-1.jpg'
    )

    fireEvent.click(screen.getByTestId('image-dot-2'))

    expect(screen.getByTestId('image-counter')).toHaveTextContent('3 / 3')
    expect(screen.getByTestId('property-image')).toHaveAttribute(
      'src',
      '/gallery-3.jpg'
    )
  })

  test('keeps navigation controls hidden when gallery is not multi-image', () => {
    const singleImageProperty: Property = {
      ...baseProperty,
      images: ['/solo.jpg'],
    }

    renderModal(singleImageProperty)

    expect(screen.queryByTestId('image-dot-0')).toBeNull()
    expect(screen.queryByTestId('next-image')).toBeNull()
  })
})
