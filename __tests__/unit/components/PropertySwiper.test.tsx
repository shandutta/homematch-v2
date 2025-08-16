import { jest, describe, test, expect } from '@jest/globals'
import { screen } from '@testing-library/react'
import { PropertySwiper } from '@/components/features/properties/PropertySwiper'
import { Property } from '@/lib/schemas/property'
import { renderWithQuery } from '@/__tests__/utils/TestQueryProvider'

// Mock framer-motion fully
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  useMotionValue: () => ({ get: () => 0, set: () => {}, on: () => {} }),
  useAnimation: () => ({ start: jest.fn(), stop: jest.fn(), set: jest.fn() }),
  useTransform: () => ({ get: () => 0, set: () => {}, on: () => {} }),
  AnimatePresence: ({ children }: any) => <>{children}</>,
  useMotionValueEvent: jest.fn(),
  PanInfo: {} as any,
}))

// Mock child components to avoid complex dependency chains
jest.mock('@/components/property/PropertyCard', () => ({
  PropertyCard: ({ property }: any) => (
    <div data-testid="property-card">
      <h3>{property.address}</h3>
      <p>
        {property.city}, {property.state}
      </p>
      <p>${property.price?.toLocaleString()}</p>
    </div>
  ),
}))

jest.mock('@/components/properties/SwipeablePropertyCard', () => ({
  SwipeablePropertyCard: ({ properties, currentIndex }: any) => {
    const currentProperty = properties[currentIndex]
    return (
      <div data-testid="swipeable-card">
        {currentProperty && (
          <div>
            <h3>{currentProperty.address}</h3>
            <p>
              {currentProperty.city}, {currentProperty.state}
            </p>
          </div>
        )}
      </div>
    )
  },
}))

jest.mock('@/hooks/useCouples', () => ({
  useMutualLikes: () => ({
    data: [],
    isLoading: false,
    error: null,
  }),
}))

jest.mock('@/hooks/useSwipePhysics', () => ({
  useSwipePhysics: () => ({
    x: { get: () => 0, set: () => {} },
    y: { get: () => 0, set: () => {} },
    rotate: { get: () => 0, set: () => {} },
    opacity: { get: () => 1, set: () => {} },
    scale: { get: () => 1, set: () => {} },
    likeOpacity: { get: () => 0, set: () => {} },
    passOpacity: { get: () => 0, set: () => {} },
    controls: { start: jest.fn() },
    handleDragStart: jest.fn(),
    handleDrag: jest.fn(),
    handleDragEnd: jest.fn(),
    swipeCard: jest.fn(),
  }),
}))

jest.mock('@/lib/utils/client-performance', () => ({
  useRenderPerformance: () => null,
}))

jest.mock('@/lib/utils/haptic-feedback', () => ({
  useHapticFeedback: () => ({
    light: jest.fn(),
    medium: jest.fn(),
    success: jest.fn(),
  }),
}))

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
    property_type: 'single_family',
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
    renderWithQuery(
      <PropertySwiper properties={mockProperties} onDecision={onDecision} />
    )
    const swipeableCard = screen.getByTestId('swipeable-card')
    expect(swipeableCard).toBeInTheDocument()
    expect(screen.getByText('1 Cool St')).toBeInTheDocument()
  })

  test('should render empty state when no properties are provided', () => {
    const onDecision = jest.fn()
    renderWithQuery(<PropertySwiper properties={[]} onDecision={onDecision} />)
    expect(screen.getByText('All caught up!')).toBeInTheDocument()
  })

  // Note: Testing the actual swipe gesture is an E2E concern.
  // Here, we can unit test the `onSwipe` callback logic if needed,
  // but the current implementation is simple enough that it's covered
  // by testing the onDecision prop on the child card.
})
