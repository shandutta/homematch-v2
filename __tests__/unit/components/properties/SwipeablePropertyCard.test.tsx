import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'

// Mock framer-motion
jest.mock('framer-motion', () => {
  const MockMotionDiv = React.forwardRef<
    HTMLDivElement,
    React.HTMLProps<HTMLDivElement>
  >(({ children, ...rest }, ref) => (
    <div ref={ref} {...rest}>
      {children}
    </div>
  ))
  MockMotionDiv.displayName = 'MockMotionDiv'

  const MockMotionButton = React.forwardRef<
    HTMLButtonElement,
    React.HTMLProps<HTMLButtonElement>
  >((props, ref) => <button ref={ref} {...props} />)
  MockMotionButton.displayName = 'MockMotionButton'

  return {
    AnimatePresence: ({ children }: { children: React.ReactNode }) => (
      <>{children}</>
    ),
    useMotionValue: () => ({
      set: jest.fn(),
      get: jest.fn(() => 0),
    }),
    useTransform: () => ({
      set: jest.fn(),
      get: jest.fn(() => 0),
    }),
    useAnimation: () => ({
      start: jest.fn().mockResolvedValue(undefined),
      set: jest.fn(),
    }),
    motion: {
      div: MockMotionDiv,
      button: MockMotionButton,
    },
  }
})

// Mock the motion components
jest.mock('@/components/ui/motion-components', () => {
  const MockMotionDiv = React.forwardRef<
    HTMLDivElement,
    React.HTMLProps<HTMLDivElement>
  >(({ children, ...rest }, ref) => (
    <div ref={ref} {...rest} data-testid="motion-div">
      {children}
    </div>
  ))
  MockMotionDiv.displayName = 'MockMotionDiv'
  return { MotionDiv: MockMotionDiv }
})

// Mock the motion button
jest.mock('@/components/ui/motion-button', () => ({
  MotionButton: ({
    children,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button {...props}>{children}</button>
  ),
}))

// Mock the PropertyCard component
jest.mock('@/components/property/PropertyCard', () => ({
  PropertyCard: ({ property }: { property: { address: string } }) => (
    <div data-testid="property-card">{property.address}</div>
  ),
}))

// Mock the useSwipePhysics hook with inline jest.fn()
jest.mock('@/hooks/useSwipePhysics', () => ({
  useSwipePhysics: jest.fn(() => ({
    x: { set: jest.fn(), get: jest.fn(() => 0) },
    y: { set: jest.fn(), get: jest.fn(() => 0) },
    rotate: { set: jest.fn(), get: jest.fn(() => 0) },
    opacity: { set: jest.fn(), get: jest.fn(() => 1) },
    scale: { set: jest.fn(), get: jest.fn(() => 1) },
    likeOpacity: { set: jest.fn(), get: jest.fn(() => 0) },
    passOpacity: { set: jest.fn(), get: jest.fn(() => 0) },
    controls: {
      start: jest.fn().mockResolvedValue(undefined),
      set: jest.fn(),
    },
    handleDragStart: jest.fn(),
    handleDrag: jest.fn(),
    handleDragEnd: jest.fn(),
    swipeCard: jest.fn(),
    SWIPE_THRESHOLD: 120,
    SWIPE_VELOCITY_THRESHOLD: 400,
  })),
}))

// Mock haptic feedback
jest.mock('@/lib/utils/haptic-feedback', () => ({
  useHapticFeedback: () => ({
    light: jest.fn(),
    medium: jest.fn(),
    success: jest.fn(),
    heavy: jest.fn(),
    error: jest.fn(),
    warning: jest.fn(),
    selection: jest.fn(),
    impact: jest.fn(),
    custom: jest.fn(),
    isAvailable: true,
  }),
}))

// Mock dashboard tokens
jest.mock('@/lib/styles/dashboard-tokens', () => ({
  dashboardTokens: {
    colors: {
      success: { 500: '#22c55e', 600: '#16a34a' },
      error: { 500: '#ef4444', 600: '#dc2626' },
    },
  },
}))

// Import after mocks
import { SwipeablePropertyCard } from '@/components/properties/SwipeablePropertyCard'
import { useSwipePhysics } from '@/hooks/useSwipePhysics'
import type { Property } from '@/lib/schemas/property'

// Get mock references
const mockUseSwipePhysics = useSwipePhysics as jest.Mock
const mockSwipeCard = jest.fn()
const mockHandleDragStart = jest.fn()
const mockHandleDrag = jest.fn()
const mockHandleDragEnd = jest.fn()

const createMockProperty = (overrides: Partial<Property> = {}): Property => ({
  id: 'test-property-1',
  zpid: 'zpid-1',
  address: '123 Main St',
  city: 'San Francisco',
  state: 'CA',
  zip_code: '94102',
  price: 500000,
  bedrooms: 3,
  bathrooms: 2,
  square_feet: 1500,
  property_type: 'single_family',
  images: ['https://example.com/image1.jpg'],
  description: 'Beautiful home',
  coordinates: { lat: 37.7749, lng: -122.4194 },
  neighborhood_id: null,
  amenities: ['parking', 'garden'],
  year_built: 2000,
  lot_size_sqft: 5000,
  parking_spots: 2,
  listing_status: 'active',
  property_hash: null,
  is_active: true,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  ...overrides,
})

describe('SwipeablePropertyCard', () => {
  const mockOnDecision = jest.fn()
  const mockOnUndo = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()

    // Reset the mock to return fresh mock functions
    mockUseSwipePhysics.mockReturnValue({
      x: { set: jest.fn(), get: jest.fn(() => 0) },
      y: { set: jest.fn(), get: jest.fn(() => 0) },
      rotate: { set: jest.fn(), get: jest.fn(() => 0) },
      opacity: { set: jest.fn(), get: jest.fn(() => 1) },
      scale: { set: jest.fn(), get: jest.fn(() => 1) },
      likeOpacity: { set: jest.fn(), get: jest.fn(() => 0) },
      passOpacity: { set: jest.fn(), get: jest.fn(() => 0) },
      controls: {
        start: jest.fn().mockResolvedValue(undefined),
        set: jest.fn(),
      },
      handleDragStart: mockHandleDragStart,
      handleDrag: mockHandleDrag,
      handleDragEnd: mockHandleDragEnd,
      swipeCard: mockSwipeCard,
      SWIPE_THRESHOLD: 120,
      SWIPE_VELOCITY_THRESHOLD: 400,
    })
  })

  describe('rendering', () => {
    it('renders the current property', () => {
      const properties = [createMockProperty()]

      render(
        <SwipeablePropertyCard
          properties={properties}
          currentIndex={0}
          onDecision={mockOnDecision}
        />
      )

      expect(screen.getByTestId('property-card')).toHaveTextContent(
        '123 Main St'
      )
    })

    it('shows empty state when no properties remain', () => {
      render(
        <SwipeablePropertyCard
          properties={[]}
          currentIndex={0}
          onDecision={mockOnDecision}
        />
      )

      expect(screen.getByText('No more properties!')).toBeInTheDocument()
      expect(
        screen.getByText('Check back later for new listings.')
      ).toBeInTheDocument()
    })

    it('shows empty state when currentIndex exceeds properties length', () => {
      const properties = [createMockProperty()]

      render(
        <SwipeablePropertyCard
          properties={properties}
          currentIndex={5}
          onDecision={mockOnDecision}
        />
      )

      expect(screen.getByText('No more properties!')).toBeInTheDocument()
    })

    it('renders action buttons', () => {
      const properties = [createMockProperty()]

      render(
        <SwipeablePropertyCard
          properties={properties}
          currentIndex={0}
          onDecision={mockOnDecision}
        />
      )

      expect(
        screen.getByRole('button', { name: /pass on this property/i })
      ).toBeInTheDocument()
      expect(
        screen.getByRole('button', { name: /like this property/i })
      ).toBeInTheDocument()
    })

    it('renders undo button when onUndo is provided', () => {
      const properties = [createMockProperty()]

      render(
        <SwipeablePropertyCard
          properties={properties}
          currentIndex={0}
          onDecision={mockOnDecision}
          onUndo={mockOnUndo}
        />
      )

      expect(
        screen.getByRole('button', { name: /undo last action/i })
      ).toBeInTheDocument()
    })

    it('does not render undo button when onUndo is not provided', () => {
      const properties = [createMockProperty()]

      render(
        <SwipeablePropertyCard
          properties={properties}
          currentIndex={0}
          onDecision={mockOnDecision}
        />
      )

      expect(
        screen.queryByRole('button', { name: /undo last action/i })
      ).not.toBeInTheDocument()
    })
  })

  describe('button interactions', () => {
    it('calls swipeCard with "left" when pass button is clicked', () => {
      const properties = [createMockProperty()]

      render(
        <SwipeablePropertyCard
          properties={properties}
          currentIndex={0}
          onDecision={mockOnDecision}
        />
      )

      const passButton = screen.getByRole('button', {
        name: /pass on this property/i,
      })
      fireEvent.click(passButton)

      expect(mockSwipeCard).toHaveBeenCalledWith('left')
    })

    it('calls swipeCard with "right" when like button is clicked', () => {
      const properties = [createMockProperty()]

      render(
        <SwipeablePropertyCard
          properties={properties}
          currentIndex={0}
          onDecision={mockOnDecision}
        />
      )

      const likeButton = screen.getByRole('button', {
        name: /like this property/i,
      })
      fireEvent.click(likeButton)

      expect(mockSwipeCard).toHaveBeenCalledWith('right')
    })

    it('calls onUndo when undo button is clicked', () => {
      const properties = [createMockProperty()]

      render(
        <SwipeablePropertyCard
          properties={properties}
          currentIndex={0}
          onDecision={mockOnDecision}
          onUndo={mockOnUndo}
        />
      )

      const undoButton = screen.getByRole('button', {
        name: /undo last action/i,
      })
      fireEvent.click(undoButton)

      expect(mockOnUndo).toHaveBeenCalled()
    })
  })

  describe('card stack', () => {
    it('renders multiple cards in stack', () => {
      const properties = [
        createMockProperty({ id: 'prop-1', address: '123 Main St' }),
        createMockProperty({ id: 'prop-2', address: '456 Oak Ave' }),
        createMockProperty({ id: 'prop-3', address: '789 Pine Rd' }),
      ]

      render(
        <SwipeablePropertyCard
          properties={properties}
          currentIndex={0}
          onDecision={mockOnDecision}
        />
      )

      const propertyCards = screen.getAllByTestId('property-card')
      // Current card + stack cards (up to STACK_DEPTH)
      expect(propertyCards.length).toBeGreaterThanOrEqual(2)
    })

    it('applies custom className', () => {
      const properties = [createMockProperty()]

      const { container } = render(
        <SwipeablePropertyCard
          properties={properties}
          currentIndex={0}
          onDecision={mockOnDecision}
          className="custom-class"
        />
      )

      expect(container.firstChild).toHaveClass('custom-class')
    })
  })

  describe('accessibility', () => {
    it('has accessible button labels', () => {
      const properties = [createMockProperty()]

      render(
        <SwipeablePropertyCard
          properties={properties}
          currentIndex={0}
          onDecision={mockOnDecision}
          onUndo={mockOnUndo}
        />
      )

      expect(
        screen.getByRole('button', { name: /pass on this property/i })
      ).toHaveAttribute('aria-label')
      expect(
        screen.getByRole('button', { name: /like this property/i })
      ).toHaveAttribute('aria-label')
      expect(
        screen.getByRole('button', { name: /undo last action/i })
      ).toHaveAttribute('aria-label')
    })

    it('buttons have correct type attribute', () => {
      const properties = [createMockProperty()]

      render(
        <SwipeablePropertyCard
          properties={properties}
          currentIndex={0}
          onDecision={mockOnDecision}
        />
      )

      const passButton = screen.getByRole('button', {
        name: /pass on this property/i,
      })
      const likeButton = screen.getByRole('button', {
        name: /like this property/i,
      })

      expect(passButton).toHaveAttribute('type', 'button')
      expect(likeButton).toHaveAttribute('type', 'button')
    })
  })

  describe('hints', () => {
    it('shows hints when showHints prop is true', () => {
      const properties = [createMockProperty()]

      render(
        <SwipeablePropertyCard
          properties={properties}
          currentIndex={0}
          onDecision={mockOnDecision}
          showHints={true}
        />
      )

      // Hints are animated, so we check for the container
      const motionDivs = screen.getAllByTestId('motion-div')
      expect(motionDivs.length).toBeGreaterThan(0)
    })
  })

  describe('edge cases', () => {
    it('handles property with minimal data', () => {
      const minimalProperty = createMockProperty({
        images: null,
        description: null,
        square_feet: null,
        amenities: null,
        year_built: null,
        lot_size_sqft: null,
        parking_spots: null,
      })

      render(
        <SwipeablePropertyCard
          properties={[minimalProperty]}
          currentIndex={0}
          onDecision={mockOnDecision}
        />
      )

      expect(screen.getByTestId('property-card')).toBeInTheDocument()
    })

    it('does not call swipeCard when no current property', () => {
      render(
        <SwipeablePropertyCard
          properties={[]}
          currentIndex={0}
          onDecision={mockOnDecision}
        />
      )

      // Component shows empty state, no buttons to click
      expect(
        screen.queryByRole('button', { name: /like/i })
      ).not.toBeInTheDocument()
    })
  })
})
