// Phase 0/1 closure: P1-property-stats-rpc
import {
// Phase 0/1 closure: P1-property-stats-rpc

  aestheticsSchema,
  ALL_PROPERTY_TAGS,
  FIT_TIERS,
  getTierDisplay,
  lifestyleFitSchema,
  LIFESTYLE_TAGS,
  llmVibesInputSchema,
  llmVibesOutputSchema,
  notableFeatureSchema,
  PROPERTY_TAGS,
  scoreToTier,
  vibeSchema,
} from '@/lib/schemas/property-vibes'

describe('property-vibes constants and helpers', () => {
  describe('PROPERTY_TAGS / ALL_PROPERTY_TAGS', () => {
    it('exports all 6 categories', () => {
      expect(Object.keys(PROPERTY_TAGS)).toEqual([
        'architectural',
        'outdoor',
        'interior',
        'lifestyle',
        'aesthetic',
        'location',
      ])
    })

    it('flattens all categories into ALL_PROPERTY_TAGS', () => {
      const expectedCount =
        PROPERTY_TAGS.architectural.length +
        PROPERTY_TAGS.outdoor.length +
        PROPERTY_TAGS.interior.length +
        PROPERTY_TAGS.lifestyle.length +
        PROPERTY_TAGS.aesthetic.length +
        PROPERTY_TAGS.location.length
      expect(ALL_PROPERTY_TAGS).toHaveLength(expectedCount)
    })

    it('exposes LIFESTYLE_TAGS as alias for ALL_PROPERTY_TAGS', () => {
      expect(LIFESTYLE_TAGS).toBe(ALL_PROPERTY_TAGS)
    })
  })

  describe('FIT_TIERS', () => {
    it('exposes all 4 tiers', () => {
      expect(FIT_TIERS).toEqual(['perfect', 'strong', 'good', 'possible'])
    })
  })

  describe('scoreToTier', () => {
    it('maps 0.95 → perfect', () => {
      expect(scoreToTier(0.95)).toBe('perfect')
    })

    it('maps boundary 0.9 → perfect', () => {
      expect(scoreToTier(0.9)).toBe('perfect')
    })

    it('maps 0.75 → strong', () => {
      expect(scoreToTier(0.75)).toBe('strong')
    })

    it('maps boundary 0.7 → strong', () => {
      expect(scoreToTier(0.7)).toBe('strong')
    })

    it('maps 0.55 → good', () => {
      expect(scoreToTier(0.55)).toBe('good')
    })

    it('maps boundary 0.5 → good', () => {
      expect(scoreToTier(0.5)).toBe('good')
    })

    it('maps anything below 0.5 → possible', () => {
      expect(scoreToTier(0.49)).toBe('possible')
      expect(scoreToTier(0)).toBe('possible')
    })
  })

  describe('getTierDisplay', () => {
    it('returns 3 stars for perfect', () => {
      expect(getTierDisplay('perfect')).toEqual({
        stars: '★★★',
        label: 'Perfect Fit',
      })
    })

    it('returns 2 stars for strong', () => {
      expect(getTierDisplay('strong')).toEqual({
        stars: '★★',
        label: 'Strong Fit',
      })
    })

    it('returns 1 star for good', () => {
      expect(getTierDisplay('good')).toEqual({
        stars: '★',
        label: 'Good Fit',
      })
    })

    it('returns ○ for possible', () => {
      expect(getTierDisplay('possible')).toEqual({
        stars: '○',
        label: 'Could Work',
      })
    })
  })
})

describe('property-vibes schemas', () => {
  describe('vibeSchema', () => {
    it('accepts a valid vibe', () => {
      expect(
        vibeSchema.safeParse({
          name: 'Cozy retreat',
          intensity: 0.7,
          source: 'interior',
        }).success
      ).toBe(true)
    })

    it('rejects intensity outside 0..1', () => {
      expect(
        vibeSchema.safeParse({ name: 'X', intensity: 1.5, source: 'both' })
          .success
      ).toBe(false)
    })

    it('rejects unknown source', () => {
      expect(
        vibeSchema.safeParse({ name: 'X', intensity: 0.5, source: 'roof' })
          .success
      ).toBe(false)
    })
  })

  describe('lifestyleFitSchema', () => {
    it('accepts a valid lifestyle fit', () => {
      expect(
        lifestyleFitSchema.safeParse({
          category: 'Pet Paradise',
          score: 0.8,
          tier: 'strong',
          reason: 'Big yard',
        }).success
      ).toBe(true)
    })

    it('tier is optional', () => {
      expect(
        lifestyleFitSchema.safeParse({
          category: 'Foodie',
          score: 0.5,
          reason: 'Walk to restaurants',
        }).success
      ).toBe(true)
    })

    it('rejects score above 1', () => {
      expect(
        lifestyleFitSchema.safeParse({
          category: 'X',
          score: 1.5,
          reason: 'Y',
        }).success
      ).toBe(false)
    })
  })

  describe('notableFeatureSchema', () => {
    it('accepts feature with all fields', () => {
      expect(
        notableFeatureSchema.safeParse({
          feature: 'Quartz countertops',
          location: 'kitchen',
          appealFactor: 'Premium finish',
        }).success
      ).toBe(true)
    })

    it('location is optional', () => {
      expect(
        notableFeatureSchema.safeParse({
          feature: 'X',
          appealFactor: 'Y',
        }).success
      ).toBe(true)
    })
  })

  describe('aestheticsSchema', () => {
    it('accepts valid aesthetics', () => {
      expect(
        aestheticsSchema.safeParse({
          lightingQuality: 'natural_abundant',
          colorPalette: ['white', 'oak'],
          architecturalStyle: 'Craftsman',
          overallCondition: 'pristine',
        }).success
      ).toBe(true)
    })

    it('rejects invalid lightingQuality', () => {
      expect(
        aestheticsSchema.safeParse({
          lightingQuality: 'nope',
          colorPalette: [],
          architecturalStyle: 'X',
          overallCondition: 'pristine',
        }).success
      ).toBe(false)
    })

    it('rejects more than 4 color palette entries', () => {
      expect(
        aestheticsSchema.safeParse({
          lightingQuality: 'mixed',
          colorPalette: ['a', 'b', 'c', 'd', 'e'],
          architecturalStyle: 'X',
          overallCondition: 'pristine',
        }).success
      ).toBe(false)
    })
  })

  describe('llmVibesOutputSchema', () => {
    it('accepts a complete output', () => {
      const result = llmVibesOutputSchema.safeParse({
        tagline: 'A perfect coastal retreat',
        vibeStatement:
          'A bright and airy home with abundant natural light and ocean breezes.',
        primaryVibes: [
          { name: 'Sunlit Living', intensity: 0.8, source: 'interior' },
          { name: 'Ocean Breeze', intensity: 0.7, source: 'exterior' },
        ],
        lifestyleFits: [
          {
            category: 'Beach Lover',
            score: 0.9,
            reason: 'Steps from the sand',
          },
          { category: 'Remote Work', score: 0.7, reason: 'Quiet street' },
        ],
        notableFeatures: [],
        aesthetics: {
          lightingQuality: 'natural_abundant',
          colorPalette: ['white'],
          architecturalStyle: 'Coastal',
          overallCondition: 'pristine',
        },
        emotionalHooks: [],
        suggestedTags: [
          'Coastal Casual',
          'Bright & Airy',
          'Walkable Neighborhood',
        ],
      })
      expect(result.success).toBe(true)
    })

    it('rejects suggested tags that are not in the catalog', () => {
      const result = llmVibesOutputSchema.safeParse({
        tagline: 'Tagline that is long enough',
        vibeStatement: 'A statement long enough to validate the schema rule.',
        primaryVibes: [
          { name: 'V1', intensity: 0.5, source: 'both' },
          { name: 'V2', intensity: 0.5, source: 'both' },
        ],
        lifestyleFits: [
          { category: 'A', score: 0.5, reason: 'r' },
          { category: 'B', score: 0.5, reason: 'r' },
        ],
        notableFeatures: [],
        aesthetics: {
          lightingQuality: 'mixed',
          colorPalette: [],
          architecturalStyle: '',
          overallCondition: 'pristine',
        },
        emotionalHooks: [],
        suggestedTags: ['Made-up Tag', 'Another Fake', 'Nonsense'],
      })
      expect(result.success).toBe(false)
    })
  })

  describe('llmVibesInputSchema', () => {
    it('accepts a valid input', () => {
      const result = llmVibesInputSchema.safeParse({
        property: {
          address: '1 Main',
          city: 'Oakland',
          state: 'CA',
          price: 500000,
          bedrooms: 3,
          bathrooms: 2,
          square_feet: 1500,
          property_type: 'single_family',
          year_built: 2000,
          lot_size_sqft: 5000,
          amenities: ['pool'],
        },
        images: [{ url: 'https://cdn.example.com/x.jpg', category: 'kitchen' }],
        modelId: 'claude-sonnet-4-6',
      })
      expect(result.success).toBe(true)
    })

    it('rejects non-URL image url', () => {
      const result = llmVibesInputSchema.safeParse({
        property: {
          address: '1 Main',
          city: 'Oakland',
          state: 'CA',
          price: 500000,
          bedrooms: 3,
          bathrooms: 2,
          square_feet: null,
          property_type: null,
          year_built: null,
          lot_size_sqft: null,
          amenities: null,
        },
        images: [{ url: 'not-a-url', category: 'kitchen' }],
        modelId: 'm',
      })
      expect(result.success).toBe(false)
    })
  })
})
