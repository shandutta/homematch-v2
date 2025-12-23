import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SwipeContainer } from '@/components/property/SwipeContainer'
import {
  createMockProperty,
  createMockNeighborhood,
} from '@/__tests__/factories/test-data-factory'

// Mock the PropertyCard component
jest.mock('@/components/property/PropertyCard', () => ({
  PropertyCard: ({ property }: any) => (
    <div data-testid="property-card">{property.address}</div>
  ),
}))

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({
      children,
      whileHover: _whileHover,
      whileTap: _whileTap,
      animate: _animate,
      initial: _initial,
      transition: _transition,
      style,
      drag: _drag,
      dragConstraints: _dragConstraints,
      dragElastic: _dragElastic,
      onDragStart: _onDragStart,
      onDrag: _onDrag,
      onDragEnd: _onDragEnd,
      ...props
    }: any) => (
      <div {...props} style={style}>
        {children}
      </div>
    ),
    button: ({
      children,
      whileHover: _whileHover,
      whileTap: _whileTap,
      animate: _animate,
      initial: _initial,
      transition: _transition,
      ...props
    }: any) => <button {...props}>{children}</button>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
  useMotionValue: () => ({
    get: jest.fn(() => 0),
    set: jest.fn(),
  }),
  useTransform: () => ({
    get: jest.fn(() => 0),
    set: jest.fn(),
  }),
  useAnimation: () => ({
    start: jest.fn().mockResolvedValue(undefined),
    set: jest.fn(),
  }),
}))

// Mock the useSwipePhysics hook
jest.mock('@/hooks/useSwipePhysics', () => ({
  useSwipePhysics: (options: any) => ({
    x: { get: () => 0, set: jest.fn() },
    y: { get: () => 0, set: jest.fn() },
    rotate: { get: () => 0, set: jest.fn() },
    opacity: { get: () => 1, set: jest.fn() },
    scale: { get: () => 1, set: jest.fn() },
    likeOpacity: { get: () => 0, set: jest.fn() },
    passOpacity: { get: () => 0, set: jest.fn() },
    cardTilt: { get: () => 0, set: jest.fn() },
    shadowIntensity: { get: () => 0.1, set: jest.fn() },
    controls: {
      start: jest.fn().mockResolvedValue(undefined),
      set: jest.fn(),
    },
    handleDragStart: jest.fn(),
    handleDrag: jest.fn(),
    handleDragEnd: jest.fn(),
    swipeCard: jest.fn((direction: 'left' | 'right') => {
      // Simulate the swipe completion by calling the onSwipeComplete callback
      if (options?.onSwipeComplete) {
        setTimeout(() => options.onSwipeComplete(direction), 0)
      }
    }),
    resetPosition: jest.fn(),
    SWIPE_THRESHOLD: 120,
    SWIPE_VELOCITY_THRESHOLD: 400,
  }),
  SPRING_CONFIG: {
    type: 'spring' as const,
    stiffness: 280,
    damping: 25,
    mass: 0.8,
  },
}))

// Mock HapticFeedback
jest.mock('@/lib/utils/haptic-feedback', () => ({
  HapticFeedback: {
    isAvailable: false,
    light: jest.fn(),
    medium: jest.fn(),
    success: jest.fn(),
    selection: jest.fn(),
  },
}))

describe('SwipeContainer', () => {
  const mockOnSwipe = jest.fn()
  const mockOnEmpty = jest.fn()

  const mockProperties = [
    createMockProperty({ id: '1', address: '123 Main St' }),
    createMockProperty({ id: '2', address: '456 Oak Ave' }),
    createMockProperty({ id: '3', address: '789 Pine Rd' }),
  ]

  const mockNeighborhoods = [
    createMockNeighborhood({ id: mockProperties[0].neighborhood_id || '1' }),
    createMockNeighborhood({ id: mockProperties[1].neighborhood_id || '2' }),
    createMockNeighborhood({ id: mockProperties[2].neighborhood_id || '3' }),
  ]

  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('renders current property card', () => {
    render(
      <SwipeContainer
        properties={mockProperties}
        neighborhoods={mockNeighborhoods}
        onSwipe={mockOnSwipe}
        onEmpty={mockOnEmpty}
      />
    )

    // Should show first property
    expect(screen.getByText('123 Main St')).toBeInTheDocument()
  })

  test('renders empty state when no properties', () => {
    render(
      <SwipeContainer
        properties={[]}
        neighborhoods={[]}
        onSwipe={mockOnSwipe}
        onEmpty={mockOnEmpty}
      />
    )

    expect(screen.getByText('All caught up!')).toBeInTheDocument()
    expect(
      screen.getByText(
        "You've seen all available properties in this search. Check back later for new listings that fit your filters."
      )
    ).toBeInTheDocument()
  })

  test('renders action buttons', () => {
    render(
      <SwipeContainer
        properties={mockProperties}
        neighborhoods={mockNeighborhoods}
        onSwipe={mockOnSwipe}
        onEmpty={mockOnEmpty}
      />
    )

    expect(
      screen.getByRole('button', { name: 'Not quite right' })
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'We like this one!' })
    ).toBeInTheDocument()
  })

  test('handles left swipe (pass)', async () => {
    const user = userEvent.setup()

    render(
      <SwipeContainer
        properties={mockProperties}
        neighborhoods={mockNeighborhoods}
        onSwipe={mockOnSwipe}
        onEmpty={mockOnEmpty}
      />
    )

    const passButton = screen.getByRole('button', { name: 'Not quite right' })
    await user.click(passButton)

    expect(mockOnSwipe).toHaveBeenCalledWith('left')
    expect(mockOnSwipe).toHaveBeenCalledTimes(1)
  })

  test('handles right swipe (like)', async () => {
    const user = userEvent.setup()

    render(
      <SwipeContainer
        properties={mockProperties}
        neighborhoods={mockNeighborhoods}
        onSwipe={mockOnSwipe}
        onEmpty={mockOnEmpty}
      />
    )

    const likeButton = screen.getByRole('button', { name: 'We like this one!' })
    await user.click(likeButton)

    expect(mockOnSwipe).toHaveBeenCalledWith('right')
    expect(mockOnSwipe).toHaveBeenCalledTimes(1)
  })

  test('advances to next property after swipe', async () => {
    const user = userEvent.setup()

    render(
      <SwipeContainer
        properties={mockProperties}
        neighborhoods={mockNeighborhoods}
        onSwipe={mockOnSwipe}
        onEmpty={mockOnEmpty}
      />
    )

    // Initially shows first property
    expect(screen.getByText('123 Main St')).toBeInTheDocument()

    // Swipe right
    const likeButton = screen.getByTestId('like-button')
    await user.click(likeButton)

    // Wait for state update and verify second property appears
    await waitFor(() => {
      expect(screen.getByText('456 Oak Ave')).toBeInTheDocument()
    })

    // First property should no longer be visible
    expect(screen.queryByText('123 Main St')).not.toBeInTheDocument()
  })

  test('calls onEmpty when reaching last property', async () => {
    const user = userEvent.setup()
    const twoProperties = mockProperties.slice(0, 2)

    render(
      <SwipeContainer
        properties={twoProperties}
        neighborhoods={mockNeighborhoods}
        onSwipe={mockOnSwipe}
        onEmpty={mockOnEmpty}
      />
    )

    const likeButton = screen.getByRole('button', { name: 'We like this one!' })

    // First swipe
    await user.click(likeButton)
    expect(mockOnEmpty).not.toHaveBeenCalled()

    // Second swipe (last property)
    await user.click(likeButton)
    expect(mockOnEmpty).toHaveBeenCalledTimes(1)
  })

  test('shows swipe instructions on first property', () => {
    render(
      <SwipeContainer
        properties={mockProperties}
        neighborhoods={mockNeighborhoods}
        onSwipe={mockOnSwipe}
        onEmpty={mockOnEmpty}
      />
    )

    expect(screen.getByTestId('swipe-instructions')).toBeInTheDocument()
    expect(screen.getByTestId('swipe-instructions')).toHaveTextContent(
      'Swipe to discover your perfect home together'
    )
  })

  test('hides swipe instructions after first swipe', async () => {
    const user = userEvent.setup()

    render(
      <SwipeContainer
        properties={mockProperties}
        neighborhoods={mockNeighborhoods}
        onSwipe={mockOnSwipe}
        onEmpty={mockOnEmpty}
      />
    )

    // Instructions visible initially
    expect(screen.getByTestId('swipe-instructions')).toBeInTheDocument()

    // Swipe
    const likeButton = screen.getByTestId('like-button')
    await user.click(likeButton)

    // Wait for state update - instructions should be gone
    await waitFor(() => {
      expect(screen.queryByTestId('swipe-instructions')).not.toBeInTheDocument()
    })
  })

  test('renders multiple property cards in stack', () => {
    render(
      <SwipeContainer
        properties={mockProperties}
        neighborhoods={mockNeighborhoods}
        onSwipe={mockOnSwipe}
        onEmpty={mockOnEmpty}
      />
    )

    const propertyCards = screen.getAllByTestId('property-card')
    // Should render up to 3 cards in the stack
    expect(propertyCards).toHaveLength(3)
  })

  test('handles neighborhoods prop correctly', () => {
    // Test with no neighborhoods
    render(
      <SwipeContainer
        properties={mockProperties}
        onSwipe={mockOnSwipe}
        onEmpty={mockOnEmpty}
      />
    )

    // Should still render without neighborhoods
    expect(screen.getByText('123 Main St')).toBeInTheDocument()
  })

  test('buttons have proper accessibility attributes', () => {
    render(
      <SwipeContainer
        properties={mockProperties}
        neighborhoods={mockNeighborhoods}
        onSwipe={mockOnSwipe}
        onEmpty={mockOnEmpty}
      />
    )

    const passButton = screen.getByTestId('pass-button')
    const likeButton = screen.getByTestId('like-button')

    // Test accessibility attributes
    expect(passButton).toHaveAttribute('aria-label', 'Not quite right')
    expect(likeButton).toHaveAttribute('aria-label', 'We like this one!')
    expect(passButton).toHaveAttribute('type', 'button')
    expect(likeButton).toHaveAttribute('type', 'button')
  })
})
