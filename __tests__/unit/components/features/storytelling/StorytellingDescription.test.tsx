import { render, screen } from '@testing-library/react'
import { StorytellingDescription } from '@/components/features/storytelling/StorytellingDescription'
import type { Property, Neighborhood } from '@/lib/schemas/property'

// Mock framer-motion to avoid animation complexity in tests
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, className, ...props }: any) => {
      const {
        initial: _initial,
        animate: _animate,
        transition: _transition,
        whileHover: _whileHover,
        ...restProps
      } = props
      return (
        <div className={className} {...restProps}>
          {children}
        </div>
      )
    },
    p: ({ children, className, ...props }: any) => {
      const {
        initial: _initial,
        animate: _animate,
        transition: _transition,
        ...restProps
      } = props
      return (
        <p className={className} {...restProps}>
          {children}
        </p>
      )
    },
    span: ({ children, className, ...props }: any) => {
      const {
        initial: _initial,
        animate: _animate,
        transition: _transition,
        ...restProps
      } = props
      return (
        <span className={className} {...restProps}>
          {children}
        </span>
      )
    },
  },
}))

const mockProperty: Property = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  zpid: null,
  address: '123 Test Street',
  city: 'Test City',
  state: 'CA',
  zip_code: '90210',
  price: 450000,
  bedrooms: 3,
  bathrooms: 2,
  square_feet: 1800,
  property_type: 'house',
  images: null,
  description: null,
  coordinates: null,
  neighborhood_id: null,
  amenities: null,
  year_built: 2020,
  lot_size_sqft: 5000,
  parking_spots: 2,
  listing_status: 'active',
  property_hash: null,
  is_active: true,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
}

const mockNeighborhood: Neighborhood = {
  id: '123e4567-e89b-12d3-a456-426614174001',
  name: 'Test Neighborhood',
  city: 'Test City',
  state: 'CA',
  metro_area: 'Greater Test Area',
  bounds: null,
  median_price: 500000,
  walk_score: 85,
  transit_score: 70,
  created_at: '2024-01-01T00:00:00Z',
}

describe('StorytellingDescription', () => {
  it('renders storytelling description for regular properties', () => {
    render(
      <StorytellingDescription
        property={mockProperty}
        neighborhood={mockNeighborhood}
        isMutualLike={false}
      />
    )

    // Should render a description - find any paragraph with meaningful content
    const descriptions = document.querySelectorAll('p')
    const hasDescription = Array.from(descriptions).some(
      (p) => p.textContent && p.textContent.length > 20
    )
    expect(hasDescription).toBe(true)
  })

  it('renders different description for mutual likes', () => {
    render(
      <StorytellingDescription
        property={mockProperty}
        neighborhood={mockNeighborhood}
        isMutualLike={true}
      />
    )

    // Should render a mutual like message - check for one of the possible messages
    const possibleTexts = [
      'Both hearts say yes to this special place',
      'Your perfect match found the perfect match',
      'Two hearts, one home, endless possibilities',
      'When you both know, you both know',
      'This is where your shared dreams take shape',
      'Love at first sight, for both of you',
    ]

    const foundText = possibleTexts.some((text) => {
      try {
        screen.getByText(text)
        return true
      } catch {
        return false
      }
    })

    expect(foundText).toBe(true)
  })

  it('renders lifestyle tags', () => {
    // Run test multiple times since tags are randomized
    let foundExpectedTag = false
    let foundTagContainer = false

    for (let i = 0; i < 5; i++) {
      const { unmount } = render(
        <StorytellingDescription
          property={mockProperty}
          neighborhood={mockNeighborhood}
          isMutualLike={false}
        />
      )

      // Should render some lifestyle tags
      // With 3 bedrooms, 2 baths, and 1800 sqft, should get various tags
      // Tags are randomized, so we check for possible tags this property qualifies for
      const possibleTags = [
        'Family Haven',
        'Work from Home Ready',
        "Entertainer's Dream",
        'Love Nest',
        'Future Family Home',
        'Entertainment Haven',
      ]

      // At least one of the possible tags should be present
      const foundTag = possibleTags.some((tag) => {
        try {
          screen.getByText(tag)
          return true
        } catch {
          return false
        }
      })

      // Should render multiple tags - check the container has multiple badge elements
      const tagContainer = document.querySelector('.flex.flex-wrap.gap-2')

      if (foundTag && tagContainer && tagContainer.children.length >= 2) {
        foundExpectedTag = true
        foundTagContainer = true
        unmount()
        break
      }

      if (foundTag) foundExpectedTag = true
      if (tagContainer && tagContainer.children.length >= 2)
        foundTagContainer = true

      unmount()
    }

    expect(foundExpectedTag).toBe(true)
    expect(foundTagContainer).toBe(true)
  })

  it('renders appropriate tags for small properties', () => {
    const smallProperty: Property = {
      ...mockProperty,
      bedrooms: 1,
      bathrooms: 1,
      square_feet: 800,
      property_type: 'condo',
    }

    // Run test multiple times since tags are randomized
    let foundExpectedTag = false
    for (let i = 0; i < 10; i++) {
      const { unmount } = render(
        <StorytellingDescription
          property={smallProperty}
          neighborhood={mockNeighborhood}
          isMutualLike={false}
        />
      )

      // Small properties should get "Cozy Retreat", "Urban Love Nest", or "Love Nest"
      const expectedTags = ['Cozy Retreat', 'Love Nest', 'Urban Love Nest']
      const foundTag = expectedTags.some((tag) => {
        try {
          screen.getByText(tag)
          return true
        } catch {
          return false
        }
      })

      if (foundTag) {
        foundExpectedTag = true
        unmount()
        break
      }
      unmount()
    }

    expect(foundExpectedTag).toBe(true)
  })

  it("renders Scholar's Den tag for high walk score neighborhoods", () => {
    const highWalkScoreNeighborhood: Neighborhood = {
      ...mockNeighborhood,
      walk_score: 95,
    }

    // Run test multiple times since tags are randomized
    let foundScholarsDen = false
    for (let i = 0; i < 20; i++) {
      const { unmount } = render(
        <StorytellingDescription
          property={mockProperty}
          neighborhood={highWalkScoreNeighborhood}
          isMutualLike={false}
        />
      )

      if (
        screen.queryByText("Scholar's Den") ||
        screen.queryByText('Date Night Central')
      ) {
        foundScholarsDen = true
        unmount()
        break
      }
      unmount()
    }

    // Should eventually render one of the high walk score tags
    expect(foundScholarsDen).toBe(true)
  })

  it('renders Pet Paradise for houses with large lots', () => {
    const largeHouse: Property = {
      ...mockProperty,
      property_type: 'house',
      lot_size_sqft: 8000,
    }

    // Run test multiple times since tags are randomized
    let foundPetParadise = false
    for (let i = 0; i < 10; i++) {
      const { unmount } = render(
        <StorytellingDescription
          property={largeHouse}
          neighborhood={mockNeighborhood}
          isMutualLike={false}
        />
      )

      if (screen.queryByText('Pet Paradise')) {
        foundPetParadise = true
        unmount()
        break
      }
      unmount()
    }

    // Should eventually render Pet Paradise tag due to large lot
    expect(foundPetParadise).toBe(true)
  })

  it('applies custom className', () => {
    const { container } = render(
      <StorytellingDescription
        property={mockProperty}
        neighborhood={mockNeighborhood}
        className="custom-class"
        isMutualLike={false}
      />
    )

    // Should have custom class
    expect(container.firstChild).toHaveClass('custom-class')
  })

  it('handles properties without neighborhood', () => {
    render(
      <StorytellingDescription property={mockProperty} isMutualLike={false} />
    )

    // Should still render without errors
    const descriptions = document.querySelectorAll('p')
    const hasDescription = Array.from(descriptions).some(
      (p) => p.textContent && p.textContent.length > 10
    )
    expect(hasDescription).toBe(true)
  })
})
