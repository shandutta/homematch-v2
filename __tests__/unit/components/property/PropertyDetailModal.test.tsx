import { render, screen } from '@testing-library/react'
import { PropertyDetailModal } from '@/components/property/PropertyDetailModal'
import type { Property, Neighborhood } from '@/lib/schemas/property'
import type { PropertyVibes } from '@/lib/schemas/property-vibes'
import { useMutualLikes } from '@/hooks/useCouples'
import { usePropertyVibes } from '@/hooks/usePropertyVibes'
import { useNeighborhoodVibes } from '@/hooks/useNeighborhoodVibes'

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

jest.mock('@/hooks/useCouples', () => ({
  useMutualLikes: jest.fn(),
}))

jest.mock('@/hooks/usePropertyVibes', () => ({
  usePropertyVibes: jest.fn(),
}))

jest.mock('@/hooks/useNeighborhoodVibes', () => ({
  useNeighborhoodVibes: jest.fn(),
}))

const mockProperty: Property = {
  id: 'test-perk-4',
  zpid: '12345678',
  address: '61 Montclaire Dr',
  city: 'Fremont',
  state: 'CA',
  zip_code: '94539',
  price: 800000,
  bedrooms: 4,
  bathrooms: 4,
  square_feet: 5236,
  property_type: 'single_family',
  images: null,
  description: null,
  coordinates: null,
  neighborhood_id: null,
  amenities: null,
  year_built: 1999,
  lot_size_sqft: 9000,
  parking_spots: 2,
  listing_status: 'active',
  property_hash: null,
  is_active: true,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
}

const mockNeighborhood: Neighborhood = {
  id: 'test-neighborhood-1',
  name: 'Test Neighborhood',
  city: 'Fremont',
  state: 'CA',
  metro_area: 'Greater Bay Area',
  bounds: null,
  median_price: 1000000,
  walk_score: 85,
  transit_score: 70,
  created_at: '2024-01-01T00:00:00Z',
}

const mockVibes: PropertyVibes = {
  id: 'test-vibes-1',
  property_id: mockProperty.id,
  tagline:
    'A home built for hosting, with a pool table, outdoor kitchen, and views you never want to leave.',
  vibe_statement:
    'The kind of place where you host Sunday dinner and nobody wants to leave.',
  feature_highlights: [],
  lifestyle_fits: [
    {
      category: "Entertainer's Dream",
      score: 0.9,
      tier: 'perfect',
      reason:
        'The dedicated game room with a pool table and bar area is built for hosting friends and family.',
    },
  ],
  suggested_tags: ["Entertainer's Dream", 'Gallery-Ready Walls'],
  emotional_hooks: [
    "That outdoor kitchen? You'll be grilling for friends every weekend.",
    "The pool table isn't just for games—it's where the kids do homework while you cook dinner.",
  ],
  primary_vibes: [
    { name: 'Pool Table Central', intensity: 0.85, source: 'interior' },
  ],
  aesthetics: null,
  input_data: null,
  raw_output: null,
  model_used: 'test-model',
  images_analyzed: null,
  source_data_hash: 'test-hash',
  generation_cost_usd: null,
  confidence: 0.9,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
}

describe('PropertyDetailModal', () => {
  beforeEach(() => {
    ;(useMutualLikes as jest.Mock).mockReturnValue({ data: [] })
    ;(usePropertyVibes as jest.Mock).mockReturnValue({ data: mockVibes })
    ;(useNeighborhoodVibes as jest.Mock).mockReturnValue({ data: null })
  })

  it('keeps tags and future vision, but hides vibe statement and quotes', () => {
    render(
      <PropertyDetailModal
        property={mockProperty}
        neighborhood={mockNeighborhood}
        open={true}
        onOpenChange={jest.fn()}
      />
    )

    expect(screen.getByText('About this home')).toBeInTheDocument()
    expect(screen.getByText('Single Family')).toBeInTheDocument()

    // Keep: tagline + useful tags/box
    expect(screen.getByText(mockVibes.tagline)).toBeInTheDocument()
    expect(screen.getAllByText("Entertainer's Dream").length).toBeGreaterThan(0)
    expect(
      screen.getByText(mockVibes.lifestyle_fits[0].reason, { exact: false })
    ).toBeInTheDocument()
    expect(screen.getByText('Gallery-Ready Walls')).toBeInTheDocument()
    expect(screen.getByText('Pool Table Central')).toBeInTheDocument()

    // Drop: secondary vibe statement + quoted emotional hooks
    expect(screen.queryByText(mockVibes.vibe_statement)).not.toBeInTheDocument()
    expect(
      screen.queryByText(mockVibes.emotional_hooks![0], { exact: false })
    ).not.toBeInTheDocument()
    expect(
      screen.queryByText(mockVibes.emotional_hooks![1], { exact: false })
    ).not.toBeInTheDocument()

    // Drop: specific noisy perk copy
    expect(
      screen.queryByText('Historic charm meets modern convenience')
    ).not.toBeInTheDocument()
  })

  it('renders neighborhood vibes when available', () => {
    const neighborhoodVibes = {
      tagline: 'Transit-friendly and snackable streets',
      vibe_statement: 'Low-friction errands with a strong local food scene.',
      suggested_tags: ['Walkable', 'Food', 'Transit'],
    }

    ;(useNeighborhoodVibes as jest.Mock).mockReturnValue({
      data: neighborhoodVibes,
    })

    render(
      <PropertyDetailModal
        property={mockProperty}
        neighborhood={mockNeighborhood}
        open={true}
        onOpenChange={jest.fn()}
      />
    )

    expect(useNeighborhoodVibes).toHaveBeenCalledWith(mockNeighborhood.id)
    expect(screen.getByText(neighborhoodVibes.tagline)).toBeInTheDocument()
    expect(
      screen.getByText(neighborhoodVibes.vibe_statement)
    ).toBeInTheDocument()
    expect(screen.getByText('Walkable')).toBeInTheDocument()
    expect(screen.getByText('Food')).toBeInTheDocument()
    expect(screen.getByText('Transit')).toBeInTheDocument()
  })
})
