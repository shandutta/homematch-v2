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
    property_type: 'house',
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

    // Check address
    expect(screen.getByText('123 Test Street')).toBeInTheDocument()
    expect(screen.getByText(/Test Neighborhood, TS/)).toBeInTheDocument()

    // Check price formatting
    expect(screen.getByText('$500,000')).toBeInTheDocument()

    // Check beds/baths
    expect(screen.getByText('3 beds • 2.5 baths')).toBeInTheDocument()

    // Check square footage
    expect(screen.getByText('2,000 sqft')).toBeInTheDocument()

    // Check property type
    expect(screen.getByText('house')).toBeInTheDocument()
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

    expect(screen.getByRole('button', { name: /pass/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /like/i })).toBeInTheDocument()
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

    expect(screen.queryByRole('button', { name: /pass/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /like/i })).not.toBeInTheDocument()
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

    const likeButton = screen.getByRole('button', { name: /like/i })
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

    const passButton = screen.getByRole('button', { name: /pass/i })
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

    expect(screen.getByRole('button', { name: 'Previous image' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Next image' })).toBeInTheDocument()
    expect(screen.getByText('1 / 3')).toBeInTheDocument()
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

    const nextButton = screen.getByRole('button', { name: 'Next image' })
    const prevButton = screen.getByRole('button', { name: 'Previous image' })

    // Initially shows first image
    expect(screen.getByText('1 / 3')).toBeInTheDocument()

    // Click next
    await user.click(nextButton)
    expect(screen.getByText('2 / 3')).toBeInTheDocument()

    // Click next again
    await user.click(nextButton)
    expect(screen.getByText('3 / 3')).toBeInTheDocument()

    // Click next to wrap around
    await user.click(nextButton)
    expect(screen.getByText('1 / 3')).toBeInTheDocument()

    // Click previous to go back
    await user.click(prevButton)
    expect(screen.getByText('3 / 3')).toBeInTheDocument()
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
    expect(screen.queryByRole('button', { name: 'Previous image' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Next image' })).not.toBeInTheDocument()
    expect(screen.queryByText(/1 \/ 1/)).not.toBeInTheDocument()
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
    expect(screen.getByText('123 Test Street')).toBeInTheDocument()
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

      expect(screen.getByText(expected)).toBeInTheDocument()
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
    expect(screen.getByText('123 Test St')).toBeInTheDocument()
    expect(screen.getByText('0 beds • 0 baths')).toBeInTheDocument()
    // Square feet should be empty string when null
    expect(screen.queryByText(/sqft/)).not.toBeInTheDocument()
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

    expect(screen.getByText(/Custom Neighborhood, TS/)).toBeInTheDocument()
  })

  test('falls back to city when no neighborhood', () => {
    render(
      <EnhancedPropertyCard
        property={mockProperty}
        onLike={mockOnLike}
        onDislike={mockOnDislike}
      />
    )

    expect(screen.getByText(/Test City, TS/)).toBeInTheDocument()
  })
})