import { render, screen, waitFor } from '@testing-library/react'
import { DashboardPropertyGrid } from '@/components/features/dashboard/DashboardPropertyGrid'

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ href, children }: any) => <a href={href}>{children}</a>,
}))

const mockPropertyCard = jest.fn(({ property }: any) => (
  <div data-testid="property-card">{property.address}</div>
))

jest.mock('@/components/property/PropertyCard', () => ({
  PropertyCard: (props: any) => mockPropertyCard(props),
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
    mockPropertyCard.mockClear()
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

  it('passes map-disabled detail props to PropertyCard in grid view', () => {
    render(
      <DashboardPropertyGrid
        properties={[mockProperty]}
        onDecision={jest.fn()}
      />
    )

    expect(mockPropertyCard).toHaveBeenCalled()
    const props = mockPropertyCard.mock.calls[0]?.[0]
    expect(props).toEqual(
      expect.objectContaining({
        showMap: false,
        enableDetailsToggle: true,
        showStory: true,
        storyVariant: 'futureVision',
      })
    )
  })

  it('renders the swipeable stack on mobile', async () => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: jest.fn().mockImplementation((query) => ({
        matches: true,
        media: query,
        onchange: null,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        addListener: jest.fn(),
        removeListener: jest.fn(),
        dispatchEvent: jest.fn(),
      })),
    })

    render(
      <DashboardPropertyGrid
        properties={[mockProperty]}
        onDecision={jest.fn()}
      />
    )

    await waitFor(() => {
      expect(screen.getByTestId('swipeable-card')).toBeInTheDocument()
    })
  })
})
