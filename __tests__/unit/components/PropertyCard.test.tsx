import { jest, describe, test, expect } from '@jest/globals'
import { screen, fireEvent } from '@testing-library/react'
import { renderWithQuery } from '../../utils/TestQueryProvider'
import { PropertyCard } from '@/components/property/PropertyCard'
import { Property } from '@/lib/schemas/property'

// Mock child components
jest.mock('@/components/property/PropertyMap', () => ({
  PropertyMap: () => <div data-testid="property-map" />,
}))

jest.mock('@/components/features/storytelling/StorytellingDescription', () => ({
  StorytellingDescription: () => <div data-testid="storytelling-description" />,
}))

jest.mock('@/components/features/couples/MutualLikesBadge', () => ({
  MutualLikesIndicator: () => <div data-testid="mutual-likes-indicator" />,
}))

jest.mock('@/hooks/useCouples', () => ({
  useMutualLikes: () => ({
    data: [],
  }),
}))

const mockProperty: Property = {
  id: 'prop-1',
  address: '123 Main St',
  city: 'Anytown',
  state: 'CA',
  zip_code: '12345',
  price: 500000,
  bedrooms: 3,
  bathrooms: 2,
  square_feet: 1500,
  images: ['/image1.jpg'],
  coordinates: null,
  created_at: '2024-01-01T00:00:00.000Z',
  amenities: null,
  description: null,
  is_active: true,
  listing_status: 'active',
  lot_size_sqft: null,
  neighborhood_id: null,
  parking_spots: null,
  property_hash: null,
  property_type: 'single_family',
  updated_at: null,
  year_built: null,
  zpid: '12345678',
}

/**
 * Helper to get stat value from the new horizontal layout.
 * New structure: <span><Icon/><span class="font-medium">VALUE</span><span>LABEL</span></span>
 */
const getStatValueByLabel = (label: string) => {
  // Find the label text (e.g., "bed", "bath", "sqft")
  const labelElement = screen.getByText((content, element) => {
    return (
      element?.tagName.toLowerCase() === 'span' &&
      element?.className.includes('text-hm-stone-500') &&
      content.toLowerCase() === label.toLowerCase()
    )
  })
  // The value is the previous sibling with class "font-medium"
  const valueElement = labelElement.previousElementSibling as HTMLElement | null
  if (!valueElement || !valueElement.classList.contains('font-medium')) {
    throw new Error(`Value element for ${label} stat not found`)
  }
  return valueElement
}

describe('PropertyCard Component', () => {
  test('should render property details correctly', () => {
    renderWithQuery(<PropertyCard property={mockProperty} />)
    expect(screen.getByText('123 Main St')).toBeDefined()
    expect(screen.getByText('$500,000')).toBeDefined()
    // New layout uses lowercase labels: "bed", "bath", "sqft"
    expect(getStatValueByLabel('bed')).toHaveTextContent('3')
    expect(getStatValueByLabel('bath')).toHaveTextContent('2')
    expect(getStatValueByLabel('sqft')).toHaveTextContent('1,500')
  })

  test('should render Zillow link with correct href', () => {
    renderWithQuery(<PropertyCard property={mockProperty} />)
    const zillowLink = screen.getByLabelText('View on Zillow')
    expect(zillowLink).toBeTruthy()
    expect(zillowLink.getAttribute('href')).toBe(
      'https://www.zillow.com/homedetails/12345678_zpid/'
    )
  })

  test('should render action buttons when onDecision is provided', () => {
    const onDecision = jest.fn()
    renderWithQuery(
      <PropertyCard property={mockProperty} onDecision={onDecision} />
    )
    expect(screen.getByLabelText('Pass property')).toBeDefined()
    expect(screen.getByLabelText('Like property')).toBeDefined()
  })

  test('should not render action buttons when onDecision is not provided', () => {
    renderWithQuery(<PropertyCard property={mockProperty} />)
    expect(screen.queryByLabelText('Pass property')).toBeNull()
    expect(screen.queryByLabelText('Like property')).toBeNull()
  })

  test('should call onDecision with "skip" when pass button is clicked', () => {
    const onDecision = jest.fn()
    renderWithQuery(
      <PropertyCard property={mockProperty} onDecision={onDecision} />
    )
    fireEvent.click(screen.getByLabelText('Pass property'))
    expect(onDecision).toHaveBeenCalledWith('prop-1', 'skip')
  })

  test('should call onDecision with "liked" when like button is clicked', () => {
    const onDecision = jest.fn()
    renderWithQuery(
      <PropertyCard property={mockProperty} onDecision={onDecision} />
    )
    fireEvent.click(screen.getByLabelText('Like property'))
    expect(onDecision).toHaveBeenCalledWith('prop-1', 'liked')
  })

  test('should render PropertyMap when coordinates are present', () => {
    const propertyWithCoords: Property = {
      ...mockProperty,
      coordinates: { lat: 37.7749, lng: -122.4194 } as any,
    }
    renderWithQuery(<PropertyCard property={propertyWithCoords} />)
    expect(screen.getByTestId('property-map')).toBeDefined()
  })

  test('should not render PropertyMap when coordinates are null', () => {
    const propWithoutCoords: Property = { ...mockProperty, coordinates: null }
    renderWithQuery(<PropertyCard property={propWithoutCoords} />)
    expect(screen.queryByTestId('property-map')).toBeNull()
  })

  test('should render StorytellingDescription component', () => {
    renderWithQuery(<PropertyCard property={mockProperty} />)
    expect(screen.getByTestId('storytelling-description')).toBeDefined()
  })

  test('should render MutualLikesIndicator component', () => {
    renderWithQuery(<PropertyCard property={mockProperty} />)
    expect(screen.getByTestId('mutual-likes-indicator')).toBeDefined()
  })
})
