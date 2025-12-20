import { render, screen } from '@testing-library/react'
import { DashboardPropertyGrid } from '@/components/features/dashboard/DashboardPropertyGrid'

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ href, children }: any) => <a href={href}>{children}</a>,
}))

jest.mock('@/components/property/PropertyCard', () => ({
  PropertyCard: ({ property }: any) => (
    <div data-testid="property-card">{property.address}</div>
  ),
}))

jest.mock('@/components/properties/SwipeablePropertyCard', () => ({
  SwipeablePropertyCard: () => <div data-testid="swipeable-card" />,
}))

jest.mock('@/components/ads/InFeedAd', () => ({
  InFeedAd: () => <div data-testid="in-feed-ad" />,
}))

const mockProperty = {
  id: 'property-1',
  address: '123 Main St',
  city: 'San Francisco',
  state: 'CA',
  zip_code: '94103',
  price: 500000,
  bedrooms: 2,
  bathrooms: 2,
  square_feet: 1200,
  property_type: 'single_family',
  listing_status: 'active',
  images: [],
  description: null,
  neighborhood_id: null,
  amenities: [],
  year_built: 1990,
  lot_size_sqft: null,
  parking_spots: null,
  property_hash: null,
  is_active: true,
  created_at: null,
  updated_at: null,
} as any

describe('DashboardPropertyGrid', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: jest.fn().mockImplementation((query) => ({
        matches: false,
        media: query,
        onchange: null,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        addListener: jest.fn(),
        removeListener: jest.fn(),
        dispatchEvent: jest.fn(),
      })),
    })
  })

  it('shows a Filters button in the toolbar', () => {
    render(
      <DashboardPropertyGrid
        properties={[mockProperty]}
        onDecision={jest.fn()}
      />
    )

    expect(screen.getByRole('link', { name: /filters/i })).toHaveAttribute(
      'href',
      '/settings?tab=preferences'
    )
  })

  it('renders a Review filters CTA when empty', () => {
    render(<DashboardPropertyGrid properties={[]} onDecision={jest.fn()} />)

    expect(
      screen.getByRole('link', { name: /review filters/i })
    ).toHaveAttribute('href', '/settings?tab=preferences')
  })
})
