import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { PropertyDetailModal } from '@/components/property/PropertyDetailModal'
import { Property } from '@/lib/schemas/property'

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: any) => (
    <div data-testid="dialog" data-open={open}>
      {children}
    </div>
  ),
  DialogContent: ({
    children,
    onCloseAutoFocus: _onCloseAutoFocus,
    showCloseButton: _showCloseButton,
    ...props
  }: any) => (
    <div data-testid="dialog-content" {...props}>
      {children}
    </div>
  ),
  DialogHeader: ({ children }: any) => <div>{children}</div>,
  DialogTitle: ({ children }: any) => <div>{children}</div>,
  DialogDescription: ({ children }: any) => <div>{children}</div>,
}))

vi.mock('@/components/ui/property-image', () => ({
  PropertyImage: ({ src, alt }: { src?: string | string[]; alt: string }) => (
    <div
      data-testid="property-image"
      data-src={Array.isArray(src) ? src.join(',') : src}
    >
      {alt}
    </div>
  ),
}))

vi.mock('@/components/property/PropertyMap', () => ({
  PropertyMap: () => <div data-testid="property-map" />,
}))

vi.mock('@/components/features/storytelling/StorytellingDescription', () => ({
  StorytellingDescription: () => <div data-testid="storytelling" />,
}))

vi.mock('@/components/features/couples/MutualLikesBadge', () => ({
  MutualLikesIndicator: () => <div data-testid="mutual-likes" />,
}))

vi.mock('@/hooks/useCouples', () => ({
  useMutualLikes: () => ({ data: [] }),
}))

vi.mock('@/hooks/usePropertyVibes', () => ({
  usePropertyVibes: () => ({ data: null }),
}))

vi.mock('@/hooks/useNeighborhoodVibes', () => ({
  useNeighborhoodVibes: () => ({ data: null }),
}))

const baseProperty: Property = {
  id: 'prop-1',
  zpid: null,
  address: '123 Integration St',
  city: 'Testville',
  state: 'CA',
  zip_code: '90210',
  price: 815000,
  bedrooms: 4,
  bathrooms: 2.5,
  square_feet: 2100,
  property_type: 'single_family',
  images: [],
  description: null,
  coordinates: null,
  neighborhood_id: null,
  amenities: null,
  year_built: 1998,
  lot_size_sqft: null,
  parking_spots: null,
  listing_status: 'active',
  property_hash: null,
  is_active: true,
  created_at: null,
  updated_at: null,
}

const renderModal = (property: Property) =>
  render(
    <PropertyDetailModal
      property={property}
      neighborhood={undefined}
      open
      onOpenChange={() => {}}
    />
  )

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('PropertyDetailModal integration - carousel resilience', () => {
  it('normalizes the index when the new property has fewer images and hides controls', async () => {
    const firstProperty: Property = {
      ...baseProperty,
      images: [
        'https://img/one.jpg',
        'https://img/two.jpg',
        'https://img/three.jpg',
      ],
    }

    const { rerender } = renderModal(firstProperty)

    await userEvent.click(screen.getByTestId('next-image'))
    await userEvent.click(screen.getByTestId('next-image'))
    expect(screen.getByTestId('image-counter')).toHaveTextContent('3 / 3')

    const singleImageProperty: Property = {
      ...baseProperty,
      id: 'prop-2',
      address: '456 Reduced Ln',
      images: ['https://img/solo.jpg'],
    }

    rerender(
      <PropertyDetailModal
        property={singleImageProperty}
        neighborhood={undefined}
        open
        onOpenChange={() => {}}
      />
    )

    expect(screen.getByTestId('property-image')).toHaveAttribute(
      'data-src',
      'https://img/solo.jpg'
    )
    expect(screen.queryByTestId('next-image')).not.toBeInTheDocument()
    expect(screen.getByTestId('image-counter')).toHaveTextContent('1 / 1')
  })

  it('keeps the slide counter in sync when a property swap increases image count', async () => {
    const starterProperty: Property = {
      ...baseProperty,
      images: ['https://img/one.jpg'],
    }

    const { rerender } = renderModal(starterProperty)

    const richerProperty: Property = {
      ...baseProperty,
      id: 'prop-3',
      address: '789 Upgrade Ave',
      images: ['https://img/new-one.jpg', 'https://img/new-two.jpg'],
    }

    rerender(
      <PropertyDetailModal
        property={richerProperty}
        neighborhood={undefined}
        open
        onOpenChange={() => {}}
      />
    )

    expect(screen.getByTestId('image-counter')).toHaveTextContent('1 / 2')
    await userEvent.click(screen.getByTestId('next-image'))
    expect(screen.getByTestId('property-image')).toHaveAttribute(
      'data-src',
      'https://img/new-two.jpg'
    )
    expect(screen.getByTestId('image-counter')).toHaveTextContent('2 / 2')
  })
})
