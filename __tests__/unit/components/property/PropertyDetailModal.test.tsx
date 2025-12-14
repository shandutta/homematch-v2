import { describe, expect, it } from '@jest/globals'
import userEvent from '@testing-library/user-event'
import { render, screen } from '@testing-library/react'

import { PropertyDetailModal } from '@/components/property/PropertyDetailModal'
import { Property } from '@/lib/schemas/property'

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

jest.mock('@/components/ui/property-image', () => ({
  PropertyImage: ({ src, alt }: { src?: string | string[]; alt: string }) => (
    <div
      data-testid="property-image"
      data-src={Array.isArray(src) ? src.join(',') : src}
    >
      {alt}
    </div>
  ),
}))

jest.mock('@/components/property/PropertyMap', () => ({
  PropertyMap: () => <div data-testid="property-map" />,
}))

jest.mock('@/components/features/storytelling/StorytellingDescription', () => ({
  StorytellingDescription: () => <div data-testid="storytelling" />,
}))

jest.mock('@/components/features/couples/MutualLikesBadge', () => ({
  MutualLikesIndicator: () => <div data-testid="mutual-likes" />,
}))

jest.mock('@/hooks/useCouples', () => ({
  useMutualLikes: () => ({ data: [] }),
}))

jest.mock('@/hooks/usePropertyVibes', () => ({
  usePropertyVibes: () => ({ data: null }),
}))

const baseProperty: Property = {
  id: 'e74e6b48-2b76-4dae-98f1-9a10f1b1a001',
  zpid: null,
  address: '123 Main St',
  city: 'Anytown',
  state: 'CA',
  zip_code: '12345',
  price: 750000,
  bedrooms: 3,
  bathrooms: 2,
  square_feet: 1500,
  property_type: 'single_family',
  images: [],
  description: null,
  coordinates: null,
  neighborhood_id: null,
  amenities: null,
  year_built: 1995,
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
      onOpenChange={jest.fn()}
    />
  )

describe('PropertyDetailModal image carousel', () => {
  it('shows navigation controls and counter when multiple images are available', () => {
    const propertyWithImages: Property = {
      ...baseProperty,
      images: ['https://img/one.jpg', 'https://img/two.jpg'],
    }

    renderModal(propertyWithImages)

    expect(screen.getByLabelText('Previous photo')).toBeInTheDocument()
    expect(screen.getByLabelText('Next photo')).toBeInTheDocument()
    expect(screen.getByText('1 / 2')).toBeInTheDocument()
  })

  it('hides navigation controls when only a single valid image exists', () => {
    const propertyWithSingleImage: Property = {
      ...baseProperty,
      images: ['https://img/only.jpg'],
    }

    renderModal(propertyWithSingleImage)

    expect(screen.queryByLabelText('Previous photo')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Next photo')).not.toBeInTheDocument()
    expect(screen.queryByText(/\d+ \/ \d+/)).not.toBeInTheDocument()
    expect(screen.getByTestId('property-image')).toHaveAttribute(
      'data-src',
      'https://img/only.jpg'
    )
  })

  it('cycles through images and wraps when navigating next and previous', async () => {
    const propertyWithImages: Property = {
      ...baseProperty,
      images: ['https://img/one.jpg', 'https://img/two.jpg'],
    }

    renderModal(propertyWithImages)

    const image = screen.getByTestId('property-image')
    expect(image).toHaveAttribute('data-src', 'https://img/one.jpg')

    await userEvent.click(screen.getByLabelText('Next photo'))
    expect(image).toHaveAttribute('data-src', 'https://img/two.jpg')
    expect(screen.getByText('2 / 2')).toBeInTheDocument()

    await userEvent.click(screen.getByLabelText('Next photo'))
    expect(image).toHaveAttribute('data-src', 'https://img/one.jpg')
    expect(screen.getByText('1 / 2')).toBeInTheDocument()

    await userEvent.click(screen.getByLabelText('Previous photo'))
    expect(image).toHaveAttribute('data-src', 'https://img/two.jpg')
    expect(screen.getByText('2 / 2')).toBeInTheDocument()
  })

  it('filters out falsy image entries and keeps the counter accurate', async () => {
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

    const image = screen.getByTestId('property-image')
    expect(image).toHaveAttribute('data-src', 'https://img/one.jpg')
    expect(screen.getByText('1 / 2')).toBeInTheDocument()

    await userEvent.click(screen.getByLabelText('Next photo'))
    expect(image).toHaveAttribute('data-src', 'https://img/three.jpg')
    expect(screen.getByText('2 / 2')).toBeInTheDocument()

    await userEvent.click(screen.getByLabelText('Next photo'))
    expect(image).toHaveAttribute('data-src', 'https://img/one.jpg')
    expect(screen.getByText('1 / 2')).toBeInTheDocument()
  })

  it('resets image index when the property changes', async () => {
    const propertyWithImages: Property = {
      ...baseProperty,
      images: ['https://img/one.jpg', 'https://img/two.jpg'],
    }

    const { rerender } = renderModal(propertyWithImages)

    await userEvent.click(screen.getByLabelText('Next photo'))
    expect(screen.getByText('2 / 2')).toBeInTheDocument()

    const nextProperty: Property = {
      ...baseProperty,
      id: '8d65ffb8-0d35-47f5-bd02-b1d9f0f3b123',
      address: '456 Oak Ave',
      images: [
        'https://img/new-one.jpg',
        'https://img/new-two.jpg',
        'https://img/new-three.jpg',
      ],
    }

    rerender(
      <PropertyDetailModal
        property={nextProperty}
        neighborhood={undefined}
        open
        onOpenChange={jest.fn()}
      />
    )

    const image = screen.getByTestId('property-image')
    expect(image).toHaveAttribute('data-src', 'https://img/new-one.jpg')
    expect(screen.getByText('1 / 3')).toBeInTheDocument()
  })
})
