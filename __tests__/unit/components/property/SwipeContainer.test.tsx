import { render, screen } from '@testing-library/react'
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

    expect(screen.getByText('No properties to show')).toBeInTheDocument()
    expect(
      screen.getByText('Check back later for new listings!')
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

    expect(screen.getByRole('button', { name: 'Pass' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Like' })).toBeInTheDocument()
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

    const passButton = screen.getByRole('button', { name: 'Pass' })
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

    const likeButton = screen.getByRole('button', { name: 'Like' })
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
    const likeButton = screen.getByRole('button', { name: 'Like' })
    await user.click(likeButton)

    // Should now show second property
    expect(screen.getByText('456 Oak Ave')).toBeInTheDocument()
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

    const likeButton = screen.getByRole('button', { name: 'Like' })

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

    expect(screen.getByText('Swipe or tap to like/dislike')).toBeInTheDocument()
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
    expect(screen.getByText('Swipe or tap to like/dislike')).toBeInTheDocument()

    // Swipe
    const likeButton = screen.getByRole('button', { name: 'Like' })
    await user.click(likeButton)

    // Instructions should be gone
    expect(
      screen.queryByText('Swipe or tap to like/dislike')
    ).not.toBeInTheDocument()
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

  test('button hover states work correctly', async () => {
    const user = userEvent.setup()

    render(
      <SwipeContainer
        properties={mockProperties}
        neighborhoods={mockNeighborhoods}
        onSwipe={mockOnSwipe}
        onEmpty={mockOnEmpty}
      />
    )

    const passButton = screen.getByRole('button', { name: 'Pass' })
    const likeButton = screen.getByRole('button', { name: 'Like' })

    // Test hover classes are applied
    await user.hover(passButton)
    expect(passButton).toHaveClass('group')

    await user.hover(likeButton)
    expect(likeButton).toHaveClass('group')
  })
})
