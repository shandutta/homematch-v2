import { render, screen } from '@testing-library/react'
import { StorytellingDescription } from '@/components/features/storytelling/StorytellingDescription'
import type { Property, Neighborhood } from '@/lib/schemas/property'
import type { PropertyVibes } from '@/lib/schemas/property-vibes'

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
  property_type: 'single_family',
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

const mockVibes: PropertyVibes = {
  id: '123e4567-e89b-12d3-a456-426614174999',
  property_id: mockProperty.id,
  tagline: 'A bright, modern home with a real workspace.',
  vibe_statement:
    'Work in the quiet office, then cook on the big island and open the sliders to the deck.',
  feature_highlights: [],
  lifestyle_fits: [
    {
      category: 'Remote Work Ready',
      score: 0.9,
      reason: 'Dedicated office space and strong natural light for long days.',
    },
  ],
  suggested_tags: [
    "Chef's Kitchen",
    'Remote Work Ready',
    'Indoor-Outdoor Flow',
  ],
  emotional_hooks: [
    'That island is where laptops and dinner prep share space.',
    'The deck makes weeknights feel like weekends.',
  ],
  primary_vibes: [
    { name: 'Clean Lines, Warm Light', intensity: 0.8, source: 'both' },
  ],
  aesthetics: {
    lightingQuality: 'natural_abundant',
    colorPalette: ['warm gray', 'white trim'],
    architecturalStyle: 'Updated contemporary with open-plan living',
    overallCondition: 'pristine',
  },
  input_data: null,
  raw_output: null,
  model_used: 'qwen/qwen3-vl-8b-instruct',
  images_analyzed: [],
  source_data_hash: 'test-hash',
  generation_cost_usd: 0.003,
  confidence: 0.85,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
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

  it('uses LLM vibes when provided', () => {
    render(
      <StorytellingDescription
        property={mockProperty}
        neighborhood={mockNeighborhood}
        vibes={mockVibes}
        isMutualLike={false}
        variant="full"
        showLifestyleTags={true}
        showFutureVision={true}
      />
    )

    expect(screen.getByText(mockVibes.tagline)).toBeInTheDocument()
    expect(screen.getByText(mockVibes.vibe_statement)).toBeInTheDocument()
    expect(screen.getByText("Chef's Kitchen")).toBeInTheDocument()
  })

  it('aliases legacy couple-focused tags from stored vibes', () => {
    const legacyVibes: PropertyVibes = {
      ...mockVibes,
      lifestyle_fits: [
        {
          category: 'Urban Love Nest',
          score: 0.9,
          reason: 'Compact space that keeps everything close.',
        },
      ],
      suggested_tags: ['Love Nest', 'Urban Love Nest'],
    }

    render(
      <StorytellingDescription
        property={mockProperty}
        neighborhood={mockNeighborhood}
        vibes={legacyVibes}
        isMutualLike={false}
        variant="full"
        showLifestyleTags={true}
        showFutureVision={true}
      />
    )

    expect(screen.getAllByText('Shared Retreat').length).toBeGreaterThan(0)
    expect(screen.getAllByText('City Hideaway').length).toBeGreaterThan(0)
    expect(screen.queryByText('Love Nest')).toBeNull()
    expect(screen.queryByText('Urban Love Nest')).toBeNull()
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
      'Everyone said yes to this place',
      'Your shared list just got a strong favorite',
      'Shared goals, one home, endless possibilities',
      'When everyone agrees, you know',
      'This is where your shared plans take shape',
      'Instant favorite for everyone',
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
        'Shared Retreat',
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

      // Small properties should get "Cozy Retreat", "City Hideaway", or "Shared Retreat"
      const expectedTags = ['Cozy Retreat', 'Shared Retreat', 'City Hideaway']
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
        screen.queryByText('Dining District')
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
      id: 'test-property-4', // Use ID that deterministically includes Pet Paradise
      property_type: 'single_family',
      lot_size_sqft: 8000,
    }

    render(
      <StorytellingDescription
        property={largeHouse}
        neighborhood={mockNeighborhood}
        isMutualLike={false}
      />
    )

    // Should render Pet Paradise tag due to large lot (deterministic based on property ID)
    expect(screen.getByText('Pet Paradise')).toBeInTheDocument()
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
