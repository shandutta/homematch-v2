import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { EnhancedPropertyCard } from '@/components/dashboard/EnhancedPropertyCard'
import { createMockDatabaseProperty } from '@/__tests__/factories/test-data-factory'

// Mock Next.js Image component
interface MockImageProps {
  src: string
  alt: string
  onError?: () => void
  onLoad?: () => void
}

jest.mock('next/image', () => ({
  __esModule: true,
  default: ({ src, alt, onError, onLoad }: MockImageProps) => {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={alt} onError={onError} onLoad={onLoad} />
  },
}))

describe('EnhancedPropertyCard', () => {
  const mockOnLike = jest.fn()
  const mockOnDislike = jest.fn()

  const mockProperty = createMockDatabaseProperty({
    id: '1',
    address: '123 Test Street',
    city: 'Test City',
    state: 'TS',
    price: 500000,
    bedrooms: 3,
    bathrooms: 2.5,
    square_feet: 2000,
    property_type: 'single_family',
    images: [
      'https://example.com/image1.jpg',
      'https://example.com/image2.jpg',
      'https://example.com/image3.jpg',
    ],
  })

  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('renders property information correctly', () => {
    render(
      <EnhancedPropertyCard
        property={mockProperty}
        neighborhood="Test Neighborhood"
        onLike={mockOnLike}
        onDislike={mockOnDislike}
      />
    )

    // Use data-testid for stable targeting, fallback to content for user-facing validation
    expect(screen.getByTestId('property-address')).toHaveTextContent(
      '123 Test Street'
    )
    expect(screen.getByTestId('property-location')).toHaveTextContent(
      'Test Neighborhood, TS'
    )
    expect(screen.getByTestId('property-price')).toHaveTextContent('$500,000')
    expect(screen.getByTestId('property-beds-baths')).toHaveTextContent(
      '3 beds • 2.5 baths'
    )
    expect(screen.getByTestId('property-sqft')).toHaveTextContent('2,000 sqft')
    expect(screen.getByTestId('property-type')).toHaveTextContent(
      'single_family'
    )
  })

  test('renders action buttons when showActions is true', () => {
    render(
      <EnhancedPropertyCard
        property={mockProperty}
        onLike={mockOnLike}
        onDislike={mockOnDislike}
        showActions={true}
      />
    )

    expect(screen.getByTestId('pass-button')).toBeInTheDocument()
    expect(screen.getByTestId('like-button')).toBeInTheDocument()
  })

  test('hides action buttons when showActions is false', () => {
    render(
      <EnhancedPropertyCard
        property={mockProperty}
        onLike={mockOnLike}
        onDislike={mockOnDislike}
        showActions={false}
      />
    )

    expect(screen.queryByTestId('pass-button')).not.toBeInTheDocument()
    expect(screen.queryByTestId('like-button')).not.toBeInTheDocument()
  })

  test('calls onLike when like button is clicked', async () => {
    const user = userEvent.setup()

    render(
      <EnhancedPropertyCard
        property={mockProperty}
        onLike={mockOnLike}
        onDislike={mockOnDislike}
      />
    )

    const likeButton = screen.getByTestId('like-button')
    await user.click(likeButton)

    expect(mockOnLike).toHaveBeenCalledWith('1')
    expect(mockOnLike).toHaveBeenCalledTimes(1)
  })

  test('calls onDislike when pass button is clicked', async () => {
    const user = userEvent.setup()

    render(
      <EnhancedPropertyCard
        property={mockProperty}
        onLike={mockOnLike}
        onDislike={mockOnDislike}
      />
    )

    const passButton = screen.getByTestId('pass-button')
    await user.click(passButton)

    expect(mockOnDislike).toHaveBeenCalledWith('1')
    expect(mockOnDislike).toHaveBeenCalledTimes(1)
  })

  test('renders image navigation when multiple images', () => {
    render(
      <EnhancedPropertyCard
        property={mockProperty}
        onLike={mockOnLike}
        onDislike={mockOnDislike}
      />
    )

    expect(screen.getByTestId('previous-image-button')).toBeInTheDocument()
    expect(screen.getByTestId('next-image-button')).toBeInTheDocument()
    expect(screen.getByTestId('image-counter')).toHaveTextContent('1 / 3')
  })

  test('navigates images correctly', async () => {
    const user = userEvent.setup()

    render(
      <EnhancedPropertyCard
        property={mockProperty}
        onLike={mockOnLike}
        onDislike={mockOnDislike}
      />
    )

    const nextButton = screen.getByTestId('next-image-button')
    const prevButton = screen.getByTestId('previous-image-button')

    // Initially shows first image
    expect(screen.getByTestId('image-counter')).toHaveTextContent('1 / 3')

    // Click next
    await user.click(nextButton)
    expect(screen.getByTestId('image-counter')).toHaveTextContent('2 / 3')

    // Click next again
    await user.click(nextButton)
    expect(screen.getByTestId('image-counter')).toHaveTextContent('3 / 3')

    // Click next to wrap around
    await user.click(nextButton)
    expect(screen.getByTestId('image-counter')).toHaveTextContent('1 / 3')

    // Click previous to go back
    await user.click(prevButton)
    expect(screen.getByTestId('image-counter')).toHaveTextContent('3 / 3')
  })

  test('handles single image correctly', () => {
    const singleImageProperty = createMockDatabaseProperty({
      ...mockProperty,
      images: ['https://example.com/single.jpg'],
    })

    render(
      <EnhancedPropertyCard
        property={singleImageProperty}
        onLike={mockOnLike}
        onDislike={mockOnDislike}
      />
    )

    // Should not show navigation buttons
    expect(
      screen.queryByTestId('previous-image-button')
    ).not.toBeInTheDocument()
    expect(screen.queryByTestId('next-image-button')).not.toBeInTheDocument()
    expect(screen.queryByTestId('image-counter')).not.toBeInTheDocument()
  })

  test('handles no images with fallback', () => {
    const noImageProperty = createMockDatabaseProperty({
      ...mockProperty,
      images: [],
    })

    render(
      <EnhancedPropertyCard
        property={noImageProperty}
        onLike={mockOnLike}
        onDislike={mockOnDislike}
      />
    )

    // Should render with fallback image
    const image = screen.getByAltText('123 Test Street')
    expect(image).toHaveAttribute('src', '/images/properties/house-1.svg')
  })

  test('handles image load errors', () => {
    render(
      <EnhancedPropertyCard
        property={mockProperty}
        onLike={mockOnLike}
        onDislike={mockOnDislike}
      />
    )

    const image = screen.getByAltText('123 Test Street')

    // Simulate image error
    fireEvent.error(image)

    // Component should handle error gracefully (no crash)
    expect(screen.getByTestId('property-address')).toHaveTextContent(
      '123 Test Street'
    )
  })

  test('formats prices correctly', () => {
    const testCases = [
      { price: 1000000, expected: '$1,000,000' },
      { price: 99999, expected: '$99,999' },
      { price: 150000, expected: '$150,000' },
    ]

    testCases.forEach(({ price, expected }) => {
      const { rerender } = render(
        <EnhancedPropertyCard
          property={createMockDatabaseProperty({ price })}
          onLike={mockOnLike}
          onDislike={mockOnDislike}
        />
      )

      expect(screen.getByTestId('property-price')).toHaveTextContent(expected)
      rerender(<></>)
    })
  })

  test('handles missing optional data gracefully', () => {
    const minimalProperty = createMockDatabaseProperty({
      id: '1',
      address: '123 Test St',
      city: 'Test City',
      state: 'TS',
      price: 300000,
      bedrooms: 0,
      bathrooms: 0,
      square_feet: null,
      property_type: null,
    })

    render(
      <EnhancedPropertyCard
        property={minimalProperty}
        onLike={mockOnLike}
        onDislike={mockOnDislike}
      />
    )

    // Should still render
    expect(screen.getByTestId('property-address')).toHaveTextContent(
      '123 Test St'
    )
    expect(screen.getByTestId('property-beds-baths')).toHaveTextContent(
      '0 beds • 0 baths'
    )
    // Square feet should be empty string when null
    expect(screen.getByTestId('property-sqft')).toHaveTextContent('')
  })

  test('uses neighborhood when provided', () => {
    render(
      <EnhancedPropertyCard
        property={mockProperty}
        neighborhood="Custom Neighborhood"
        onLike={mockOnLike}
        onDislike={mockOnDislike}
      />
    )

    expect(screen.getByTestId('property-location')).toHaveTextContent(
      'Custom Neighborhood, TS'
    )
  })

  test('falls back to city when no neighborhood', () => {
    render(
      <EnhancedPropertyCard
        property={mockProperty}
        onLike={mockOnLike}
        onDislike={mockOnDislike}
      />
    )

    expect(screen.getByTestId('property-location')).toHaveTextContent(
      'Test City, TS'
    )
  })
})
