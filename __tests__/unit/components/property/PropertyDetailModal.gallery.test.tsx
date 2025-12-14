/* eslint-disable @next/next/no-img-element */
import { describe, expect, it, jest } from '@jest/globals'
import userEvent from '@testing-library/user-event'
import { render, screen } from '@testing-library/react'

import { PropertyDetailModal } from '@/components/property/PropertyDetailModal'
import type { Property } from '@/lib/schemas/property'

jest.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: any) => (
    <div data-testid="dialog" data-open={open}>
      {children}
    </div>
  ),
  DialogContent: ({ children, ...props }: any) => (
    <div data-testid="dialog-content" {...props}>
      {children}
    </div>
  ),
  DialogHeader: ({ children }: any) => <div>{children}</div>,
  DialogTitle: ({ children }: any) => <div>{children}</div>,
  DialogDescription: ({ children }: any) => <div>{children}</div>,
}))

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
      src={Array.isArray(src) ? src.join(',') : src || ''}
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

jest.mock('@/hooks/useNeighborhoodVibes', () => ({
  useNeighborhoodVibes: () => ({
    data: null,
  }),
}))

const baseProperty: Property = {
  id: 'prop-1',
  zpid: null,
  address: '123 Main St',
  city: 'Anytown',
  state: 'CA',
  zip_code: '12345',
  price: 750000,
  bedrooms: 3,
  bathrooms: 2,
  square_feet: 1800,
  property_type: 'single_family',
  images: ['/image-one.jpg', '/image-two.jpg', '/image-three.jpg'],
  description: null,
  coordinates: null,
  neighborhood_id: null,
  amenities: null,
  year_built: null,
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
    <PropertyDetailModal property={property} open onOpenChange={jest.fn()} />
  )

describe('PropertyDetailModal gallery', () => {
  it('cycles through images and wraps via next/previous controls', async () => {
    renderModal(baseProperty)

    expect(screen.getByTestId('next-image')).toBeInTheDocument()
    expect(screen.getByTestId('previous-image')).toBeInTheDocument()
    expect(screen.getByTestId('image-counter')).toHaveTextContent('1 / 3')
    expect(screen.getByTestId('property-image')).toHaveAttribute(
      'src',
      '/image-one.jpg'
    )

    await userEvent.click(screen.getByTestId('next-image'))
    expect(screen.getByTestId('image-counter')).toHaveTextContent('2 / 3')
    expect(screen.getByTestId('property-image')).toHaveAttribute(
      'src',
      '/image-two.jpg'
    )

    await userEvent.click(screen.getByTestId('next-image'))
    expect(screen.getByTestId('image-counter')).toHaveTextContent('3 / 3')
    expect(screen.getByTestId('property-image')).toHaveAttribute(
      'src',
      '/image-three.jpg'
    )

    await userEvent.click(screen.getByTestId('next-image'))
    expect(screen.getByTestId('image-counter')).toHaveTextContent('1 / 3')
    expect(screen.getByTestId('property-image')).toHaveAttribute(
      'src',
      '/image-one.jpg'
    )

    await userEvent.click(screen.getByTestId('previous-image'))
    expect(screen.getByTestId('image-counter')).toHaveTextContent('3 / 3')
    expect(screen.getByTestId('property-image')).toHaveAttribute(
      'src',
      '/image-three.jpg'
    )
  })

  it('allows selecting a specific image via gallery dots', async () => {
    renderModal(baseProperty)

    await userEvent.click(screen.getByTestId('image-dot-2'))
    expect(screen.getByTestId('image-counter')).toHaveTextContent('3 / 3')
    expect(screen.getByTestId('property-image')).toHaveAttribute(
      'src',
      '/image-three.jpg'
    )
  })

  it('filters falsy image entries and keeps the counter accurate', async () => {
    const propertyWithMixedImages: Property = {
      ...baseProperty,
      images: [
        'https://img/one.jpg',
        '',
        null as unknown as string,
        'https://img/three.jpg',
      ],
    }

    renderModal(propertyWithMixedImages)

    expect(screen.getByTestId('image-counter')).toHaveTextContent('1 / 2')
    expect(screen.getByTestId('property-image')).toHaveAttribute(
      'src',
      'https://img/one.jpg'
    )
    expect(screen.queryByTestId('image-dot-2')).not.toBeInTheDocument()

    await userEvent.click(screen.getByTestId('next-image'))
    expect(screen.getByTestId('image-counter')).toHaveTextContent('2 / 2')
    expect(screen.getByTestId('property-image')).toHaveAttribute(
      'src',
      'https://img/three.jpg'
    )

    await userEvent.click(screen.getByTestId('next-image'))
    expect(screen.getByTestId('image-counter')).toHaveTextContent('1 / 2')
    expect(screen.getByTestId('property-image')).toHaveAttribute(
      'src',
      'https://img/one.jpg'
    )
  })

  it('resets the carousel when the property changes', async () => {
    const propertyWithTwoImages: Property = {
      ...baseProperty,
      images: ['/one.jpg', '/two.jpg'],
    }

    const { rerender } = renderModal(propertyWithTwoImages)

    await userEvent.click(screen.getByTestId('next-image'))
    expect(screen.getByTestId('image-counter')).toHaveTextContent('2 / 2')

    const nextProperty: Property = {
      ...baseProperty,
      id: 'prop-2',
      address: '456 Oak Ave',
      images: ['/new-one.jpg', '/new-two.jpg', '/new-three.jpg'],
    }

    rerender(
      <PropertyDetailModal
        property={nextProperty}
        open
        onOpenChange={jest.fn()}
      />
    )

    expect(screen.getByTestId('image-counter')).toHaveTextContent('1 / 3')
    expect(screen.getByTestId('property-image')).toHaveAttribute(
      'src',
      '/new-one.jpg'
    )
  })

  it('hides gallery controls when only a single image is available', () => {
    const singleImageProperty: Property = {
      ...baseProperty,
      images: ['/only.jpg'],
    }

    renderModal(singleImageProperty)

    expect(screen.queryByTestId('next-image')).not.toBeInTheDocument()
    expect(screen.queryByTestId('previous-image')).not.toBeInTheDocument()
    expect(screen.queryByTestId('image-counter')).not.toBeInTheDocument()
    expect(screen.queryByTestId('image-dot-0')).not.toBeInTheDocument()
  })
})
