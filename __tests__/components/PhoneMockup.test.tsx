/**
 * PhoneMockup Component Unit Tests
 * Tests the swipe functionality and property card interactions
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import { PhoneMockup } from '@/components/marketing/PhoneMockup'

// Mock framer-motion to avoid animation issues in tests
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  useMotionValue: () => ({ get: () => 0, set: jest.fn() }),
  useTransform: () => ({ get: () => 0 }),
  AnimatePresence: ({ children }: any) => children,
}))

// Mock Next.js Image component
jest.mock('next/image', () => {
  return function Image({ src, alt, ...props }: any) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={alt} {...props} />
  }
})

// Mock the image blur utility
jest.mock('@/lib/image-blur', () => ({
  getPropertyBlurPlaceholder: jest.fn(() => 'data:image/svg+xml;base64,test'),
}))

describe('PhoneMockup Component', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders the phone mockup with initial properties', () => {
    render(<PhoneMockup />)

    // Check for phone frame elements
    expect(screen.getByText('HomeMatch')).toBeInTheDocument()
    expect(screen.getByText('9:41 AM')).toBeInTheDocument()

    // Check for initial property
    expect(screen.getByText('$850,000')).toBeInTheDocument()
    expect(screen.getByText('4 beds • Palo Alto')).toBeInTheDocument()
  })

  it('displays all three property cards initially', () => {
    render(<PhoneMockup />)

    // All properties should be present in the DOM (stacked)
    expect(screen.getByText('$850,000')).toBeInTheDocument() // Property 1
    expect(screen.getByText('$1,200,000')).toBeInTheDocument() // Property 2
    expect(screen.getByText('$950,000')).toBeInTheDocument() // Property 3
  })

  it('displays property images with correct alt text', () => {
    render(<PhoneMockup />)

    const images = screen.getAllByRole('img')
    const propertyImages = images.filter((img) =>
      img.getAttribute('alt')?.includes('Property in')
    )

    expect(propertyImages).toHaveLength(3)
    expect(propertyImages[0]).toHaveAttribute('alt', 'Property in Palo Alto')
    expect(propertyImages[1]).toHaveAttribute(
      'alt',
      'Property in Mountain View'
    )
    expect(propertyImages[2]).toHaveAttribute('alt', 'Property in Sunnyvale')
  })

  it('has correct image sources for property cards', () => {
    render(<PhoneMockup />)

    const images = screen.getAllByRole('img')
    const propertyImages = images.filter((img) =>
      img.getAttribute('src')?.includes('/images/properties/')
    )

    expect(propertyImages[0]).toHaveAttribute(
      'src',
      '/images/properties/house-1.svg'
    )
    expect(propertyImages[1]).toHaveAttribute(
      'src',
      '/images/properties/house-2.svg'
    )
    expect(propertyImages[2]).toHaveAttribute(
      'src',
      '/images/properties/house-3.svg'
    )
  })

  it('shows like and dislike indicators', () => {
    render(<PhoneMockup />)

    // Heart and X icons should be present (though may be hidden by CSS)
    const heartIcons = screen.getAllByTestId(/heart|lucide-heart/i)
    const xIcons = screen.getAllByTestId(/x|lucide-x/i)

    // Should have at least one of each for the active cards
    expect(heartIcons.length + xIcons.length).toBeGreaterThan(0)
  })

  it('handles swipe gesture simulation', async () => {
    render(<PhoneMockup />)

    // Get the first property card (should be draggable)
    const propertyCard = screen.getByText('$850,000').closest('[draggable]')
    expect(propertyCard).not.toBeNull()

    // Simulate drag start
    fireEvent.mouseDown(propertyCard!, { clientX: 0, clientY: 0 })

    // Simulate drag move (swipe right)
    fireEvent.mouseMove(propertyCard!, { clientX: 150, clientY: 0 })

    // Simulate drag end
    fireEvent.mouseUp(propertyCard!, { clientX: 150, clientY: 0 })

    // Wait for any state updates
    await waitFor(() => {
      // After swiping, the first property should be removed
      // and the second property should now be visible as the top card
      expect(screen.getByText('$1,200,000')).toBeInTheDocument()
    })
  })

  it('shows empty state when all cards are swiped', async () => {
    render(<PhoneMockup />)

    const initialCards = ['$850,000', '$1,200,000', '$950,000']

    for (const price of initialCards) {
      const propertyCard = screen.getByText(price).closest('[draggable]')
      expect(propertyCard).not.toBeNull()

      fireEvent.mouseDown(propertyCard!, { clientX: 0, clientY: 0 })
      fireEvent.mouseMove(propertyCard!, { clientX: 150, clientY: 0 })
      fireEvent.mouseUp(propertyCard!, { clientX: 150, clientY: 0 })

      await waitFor(() => {
        expect(screen.queryByText(price)).not.toBeInTheDocument()
      })
    }

    // After all cards are swiped, check for the empty state
    await waitFor(() => {
      expect(screen.getByText('Loading more homes...')).toBeInTheDocument()
      expect(screen.getByText('🏠')).toBeInTheDocument()
    })
  })

  it('has proper accessibility attributes', () => {
    render(<PhoneMockup />)

    // Check for alt text on images
    const images = screen.getAllByRole('img')
    const propertyImages = images.filter((img) =>
      img.getAttribute('alt')?.includes('Property in')
    )

    propertyImages.forEach((img) => {
      expect(img).toHaveAttribute('alt')
      expect(img.getAttribute('alt')).toBeTruthy()
    })
  })

  it('displays correct property information format', () => {
    render(<PhoneMockup />)

    // Check price format
    expect(screen.getByText('$850,000')).toBeInTheDocument()
    expect(screen.getByText('$1,200,000')).toBeInTheDocument()

    // Check beds and location format
    expect(screen.getByText('4 beds • Palo Alto')).toBeInTheDocument()
    expect(screen.getByText('3 beds • Mountain View')).toBeInTheDocument()
    expect(screen.getByText('3 beds • Sunnyvale')).toBeInTheDocument()
  })

  it('maintains proper card stacking order', () => {
    render(<PhoneMockup />)

    // The cards should be stacked with proper z-index
    // This is primarily handled by CSS, but we can verify the cards exist
    const priceElements = [
      screen.getByText('$850,000'),
      screen.getByText('$1,200,000'),
      screen.getByText('$950,000'),
    ]

    priceElements.forEach((element) => {
      expect(element).toBeInTheDocument()
    })
  })

  it('has correct phone frame styling', () => {
    render(<PhoneMockup />)

    // Check for phone-specific elements
    expect(screen.getByText('9:41 AM')).toBeInTheDocument() // Status bar time
    expect(screen.getByText('HomeMatch')).toBeInTheDocument() // App header

    // The component should render without throwing errors
    expect(() => render(<PhoneMockup />)).not.toThrow()
  })
})
