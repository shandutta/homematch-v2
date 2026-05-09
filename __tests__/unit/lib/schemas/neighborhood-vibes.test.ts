import {
  localHighlightSchema,
  neighborhoodThemeSchema,
  neighborhoodVibesInputSchema,
  neighborhoodVibesOutputSchema,
  neighborhoodVibesRecordSchema,
  residentProfileSchema,
} from '@/lib/schemas/neighborhood-vibes'

const VALID_UUID = '11111111-1111-1111-1111-111111111111'

describe('neighborhood-vibes schemas', () => {
  describe('neighborhoodThemeSchema', () => {
    it('accepts a valid theme', () => {
      expect(
        neighborhoodThemeSchema.safeParse({
          name: 'Walkable',
          whyItMatters: 'Errands without a car make daily life simpler.',
          intensity: 0.6,
        }).success
      ).toBe(true)
    })

    it('intensity is optional', () => {
      expect(
        neighborhoodThemeSchema.safeParse({
          name: 'Walkable',
          whyItMatters: 'Errands without a car make daily life simpler.',
        }).success
      ).toBe(true)
    })

    it('rejects intensity above 1', () => {
      expect(
        neighborhoodThemeSchema.safeParse({
          name: 'Walkable',
          whyItMatters: 'Long enough reason here',
          intensity: 2,
        }).success
      ).toBe(false)
    })

    it('rejects whyItMatters shorter than 10 chars', () => {
      expect(
        neighborhoodThemeSchema.safeParse({
          name: 'Walkable',
          whyItMatters: 'short',
        }).success
      ).toBe(false)
    })
  })

  describe('residentProfileSchema', () => {
    it('accepts a valid profile', () => {
      expect(
        residentProfileSchema.safeParse({
          profile: 'Young families',
          reason: 'Top-rated public schools and quiet streets nearby.',
        }).success
      ).toBe(true)
    })

    it('rejects profile shorter than 2 chars', () => {
      expect(
        residentProfileSchema.safeParse({
          profile: 'a',
          reason: 'A reason long enough.',
        }).success
      ).toBe(false)
    })
  })

  describe('localHighlightSchema', () => {
    it('accepts a valid highlight', () => {
      expect(
        localHighlightSchema.safeParse({
          name: 'Riverside Park',
          category: 'park',
          whyItMatters: 'Sunday picnics and a riverside trail just for you.',
        }).success
      ).toBe(true)
    })
  })

  describe('neighborhoodVibesOutputSchema', () => {
    const validOutput = {
      tagline: 'Friendly streets and easy living',
      vibeStatement:
        'A walkable neighborhood with friendly neighbors, parks, and great schools.',
      neighborhoodThemes: [
        { name: 'Walkable', whyItMatters: 'Errands on foot are simple here.' },
        { name: 'Schools', whyItMatters: 'Top-rated schools draw families.' },
      ],
      localHighlights: [
        {
          name: 'River Park',
          category: 'park',
          whyItMatters: 'Sunday picnics by the river make weekends special.',
        },
        {
          name: 'Cafe Verde',
          category: 'cafe',
          whyItMatters: 'A cozy spot for catching up over a slow coffee.',
        },
      ],
      residentFits: [
        { profile: 'Families', reason: 'Top-rated schools and quiet streets.' },
        { profile: 'Remote workers', reason: 'Reliable cafes and fast wifi.' },
      ],
      suggestedTags: ['Walkable', 'Family Friendly', 'Park-Adjacent'],
    }

    it('accepts a valid output', () => {
      expect(neighborhoodVibesOutputSchema.safeParse(validOutput).success).toBe(
        true
      )
    })

    it('rejects fewer than 2 neighborhood themes', () => {
      const result = neighborhoodVibesOutputSchema.safeParse({
        ...validOutput,
        neighborhoodThemes: [validOutput.neighborhoodThemes[0]],
      })
      expect(result.success).toBe(false)
    })

    it('rejects fewer than 3 suggested tags', () => {
      const result = neighborhoodVibesOutputSchema.safeParse({
        ...validOutput,
        suggestedTags: ['only', 'two'],
      })
      expect(result.success).toBe(false)
    })

    it('rejects more than 4 neighborhood themes', () => {
      const result = neighborhoodVibesOutputSchema.safeParse({
        ...validOutput,
        neighborhoodThemes: Array(5).fill(validOutput.neighborhoodThemes[0]),
      })
      expect(result.success).toBe(false)
    })
  })

  describe('neighborhoodVibesInputSchema', () => {
    it('accepts a complete input', () => {
      const result = neighborhoodVibesInputSchema.safeParse({
        neighborhood: {
          name: 'Rockridge',
          city: 'Oakland',
          state: 'CA',
          metroArea: 'Bay Area',
          medianPrice: 700000,
          walkScore: 90,
          transitScore: 80,
        },
        listingStats: {
          total_properties: 100,
          avg_price: 750000,
          median_price: '700000',
          price_range_min: 500000,
          price_range_max: 1500000,
          avg_bedrooms: 3,
          avg_bathrooms: 2,
          avg_square_feet: 1500,
        },
        sampleProperties: [
          {
            address: '1 Main',
            price: 500000,
            bedrooms: 3,
            bathrooms: 2,
            propertyType: 'single_family',
          },
        ],
        modelId: 'm',
      })
      expect(result.success).toBe(true)
    })

    it('listingStats is optional', () => {
      const result = neighborhoodVibesInputSchema.safeParse({
        neighborhood: { name: 'X', city: 'Y', state: 'Z' },
        sampleProperties: [],
        modelId: 'm',
      })
      expect(result.success).toBe(true)
    })

    it('accepts numeric-like strings in listingStats', () => {
      const result = neighborhoodVibesInputSchema.safeParse({
        neighborhood: { name: 'X', city: 'Y', state: 'Z' },
        listingStats: {
          total_properties: '100',
          avg_price: null,
          median_price: '700000',
          price_range_min: '500000',
          price_range_max: '1500000',
          avg_bedrooms: '3',
          avg_bathrooms: '2',
          avg_square_feet: null,
        },
        sampleProperties: [],
        modelId: 'm',
      })
      expect(result.success).toBe(true)
    })
  })

  describe('neighborhoodVibesRecordSchema', () => {
    it('accepts a valid record', () => {
      const result = neighborhoodVibesRecordSchema.safeParse({
        id: VALID_UUID,
        neighborhood_id: VALID_UUID,
        tagline: 'A walkable retreat',
        vibe_statement: 'Quiet streets and great schools.',
        neighborhood_themes: [
          { name: 'Walkable', whyItMatters: 'Errands made simple.' },
          { name: 'Schools', whyItMatters: 'Top-rated nearby schools.' },
        ],
        local_highlights: [
          {
            name: 'Park',
            category: 'park',
            whyItMatters: 'Picnics by the river make Sunday mornings special.',
          },
          {
            name: 'Cafe',
            category: 'cafe',
            whyItMatters: 'Cozy spot for friends to catch up over coffee.',
          },
        ],
        resident_fits: [
          { profile: 'Families', reason: 'Quiet streets and good schools.' },
          { profile: 'Workers', reason: 'Quiet cafes for remote work.' },
        ],
        suggested_tags: ['Walkable', 'Family', 'Cozy'],
        model_used: 'claude-sonnet-4-6',
        source_data_hash: 'abc',
      })
      expect(result.success).toBe(true)
    })
  })
})
