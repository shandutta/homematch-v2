import { jest, describe, test, expect } from '@jest/globals'
import { render, screen } from '@testing-library/react'
import { PropertySwiper } from '@/components/features/properties/PropertySwiper'
import { Property } from '@/lib/schemas/property'

// Mock the TinderCard component as it's a third-party library with its own tests
jest.mock('react-tinder-card', () => ({
  __esModule: true,
  default: ({
    children,
    onSwipe,
  }: {
    children: React.ReactNode
    onSwipe: (dir: string) => void
  }) => (
    <div data-testid="tinder-card" data-swipe={(dir: string) => onSwipe(dir)}>
      {children}
    </div>
  ),
}))

const mockProperties: Property[] = [
  {
    id: 'prop-1',
    zpid: null,
    address: '1 Cool St',
    city: 'Anytown',
    state: 'CA',
    zip_code: '12345',
    price: 100000,
    bedrooms: 2,
    bathrooms: 1,
    square_feet: 900,
    property_type: 'house',
    images: null,
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
  },
  {
    id: 'prop-2',
    zpid: null,
    address: '2 Neat Ave',
    city: 'Anytown',
    state: 'CA',
    zip_code: '12345',
    price: 200000,
    bedrooms: 3,
    bathrooms: 2,
    square_feet: 1200,
    property_type: 'condo',
    images: null,
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
  },
]

describe('PropertySwiper Component', () => {
  test('should render a card for each property', () => {
    const onDecision = jest.fn()
    render(
      <PropertySwiper properties={mockProperties} onDecision={onDecision} />
    )
    const cards = screen.getAllByTestId('tinder-card')
    expect(cards).toHaveLength(2)
    expect(screen.getByText('1 Cool St')).toBeDefined()
    expect(screen.getByText('2 Neat Ave')).toBeDefined()
  })

  test('should render empty state when no properties are provided', () => {
    const onDecision = jest.fn()
    render(<PropertySwiper properties={[]} onDecision={onDecision} />)
    expect(screen.getByText('All out of properties!')).toBeDefined()
  })

  // Note: Testing the actual swipe gesture is an E2E concern.
  // Here, we can unit test the `onSwipe` callback logic if needed,
  // but the current implementation is simple enough that it's covered
  // by testing the onDecision prop on the child card.
})
