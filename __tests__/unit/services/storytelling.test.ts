import {
  jest,
  describe,
  test,
  expect,
  beforeEach,
  afterEach,
} from '@jest/globals'
import {
  StorytellingService,
  generatePropertyStory,
} from '@/lib/services/storytelling'
import type { Property, Neighborhood } from '@/lib/schemas/property'

// Helper function to create mock Property objects
const createMockProperty = (overrides?: Partial<Property>): Property => ({
  id: 'prop-test-id',
  zpid: null,
  address: '123 Test St',
  city: 'Testville',
  state: 'TS',
  zip_code: '12345',
  price: 500000,
  bedrooms: 3,
  bathrooms: 2,
  square_feet: 1500,
  property_type: 'single_family',
  images: [],
  description: null,
  coordinates: null,
  neighborhood_id: null,
  amenities: [],
  year_built: 2000,
  lot_size_sqft: 5000,
  parking_spots: 2,
  listing_status: 'active',
  property_hash: null,
  is_active: true,
  created_at: '2023-01-01T00:00:00Z',
  updated_at: '2023-01-01T00:00:00Z',
  ...overrides,
})

// Helper function to create mock Neighborhood objects
const createMockNeighborhood = (
  overrides?: Partial<Neighborhood>
): Neighborhood => ({
  id: 'neigh-test-id',
  name: 'Test Neighborhood',
  city: 'Testville',
  state: 'TS',
  metro_area: null,
  bounds: null,
  median_price: 600000,
  walk_score: 70,
  transit_score: 50,
  created_at: '2023-01-01T00:00:00Z',
  ...overrides,
})

describe('StorytellingService', () => {
  let mathRandomSpy: jest.SpyInstance

  beforeEach(() => {
    // Mock Math.random to ensure deterministic output for randomized selections
    // Setting it to 0 will always pick the first element in any array selection
    mathRandomSpy = jest.spyOn(Math, 'random').mockReturnValue(0)
  })

  afterEach(() => {
    // Restore Math.random to its original implementation after each test
    mathRandomSpy.mockRestore()
  })

  describe('generatePropertyStory', () => {
    test('should return a mutual like message when isMutualLike is true', () => {
      const property = createMockProperty()
      const context = { property, isMutualLike: true }
      const expectedMessage = 'Everyone said yes to this place' // First message from getMutualLikeMessage due to Math.random(0)

      const story = StorytellingService.generatePropertyStory(context)
      expect(story).toBe(expectedMessage)
    })

    test('should generate a story for a spacious house with outdoor space', () => {
      const property = createMockProperty({
        square_feet: 2000,
        amenities: ['large kitchen', 'garden'],
        property_type: 'single_family',
        lot_size_sqft: 600,
      })
      const neighborhood = createMockNeighborhood()
      const context = { property, neighborhood, isMutualLike: false }

      // With Math.random(0), expecting the first story added in buildStoryFromFeatures
      const expectedStory =
        'Start each day in your light-filled bedroom with space to breathe and dream'

      const story = StorytellingService.generatePropertyStory(context)
      expect(story).toBe(expectedStory)
    })

    test('should generate a story for a cozy apartment with minimal features', () => {
      const property = createMockProperty({
        bedrooms: 1,
        bathrooms: 1,
        square_feet: 800,
        property_type: 'multi_family',
        amenities: [],
        lot_size_sqft: null,
      })
      const neighborhood = createMockNeighborhood()
      const context = { property, neighborhood, isMutualLike: false }

      const expectedStory = 'Cozy mornings in a calm, comfortable space'

      const story = StorytellingService.generatePropertyStory(context)
      expect(story).toBe(expectedStory)
    })

    test('should handle property with balcony amenity', () => {
      const property = createMockProperty({
        amenities: ['balcony', 'parking'],
        square_feet: 1000,
      })
      const context = { property, isMutualLike: false }

      const story = StorytellingService.generatePropertyStory(context)
      // Should generate a balcony-related story
      expect(story).toBe(
        'Perfect for morning coffee on your private balcony, watching the world wake up together'
      )
    })

    test('should handle property with fireplace amenity', () => {
      const property = createMockProperty({
        amenities: ['fireplace'],
        square_feet: 1400,
      })
      const context = { property, isMutualLike: false }

      const story = StorytellingService.generatePropertyStory(context)
      // With Math.random(0), expecting the first story from buildStoryFromFeatures
      // Based on the property features, this should be cozy since 1400 <= 1500 and not spacious
      expect(story).toBe(
        "Cozy mornings wrapped in each other's arms in your intimate sanctuary"
      )
    })

    test('should handle null/undefined property fields gracefully', () => {
      const property = createMockProperty({
        bedrooms: null,
        bathrooms: null,
        square_feet: null,
        amenities: null,
        lot_size_sqft: null,
      })
      const context = { property, isMutualLike: false }

      const story = StorytellingService.generatePropertyStory(context)
      // Should not throw and return a reasonable story
      expect(typeof story).toBe('string')
      expect(story.length).toBeGreaterThan(0)
    })
  })

  describe('getNeighborhoodLifestyle', () => {
    test('should return null if no neighborhood is provided', () => {
      expect(StorytellingService.getNeighborhoodLifestyle(undefined)).toBeNull()
      expect(
        StorytellingService.getNeighborhoodLifestyle(null as any)
      ).toBeNull()
    })

    test('should return a perk for high walk score (>80)', () => {
      const neighborhood = createMockNeighborhood({ walk_score: 85 })
      const expectedPerk =
        'Walking distance to charming farmers markets and artisanal coffee shops'
      expect(StorytellingService.getNeighborhoodLifestyle(neighborhood)).toBe(
        expectedPerk
      )
    })

    test('should return a perk for medium walk score (>60 and <=80)', () => {
      const neighborhood = createMockNeighborhood({ walk_score: 65 })
      const expectedPerk =
        'Easy access to local shops and neighborhood favorites'
      expect(StorytellingService.getNeighborhoodLifestyle(neighborhood)).toBe(
        expectedPerk
      )
    })

    test('should return a perk for high transit score (>70)', () => {
      const neighborhood = createMockNeighborhood({
        transit_score: 75,
        walk_score: 0,
      })
      const expectedPerk =
        'Easy commutes for busy schedules via nearby transit connections'
      expect(StorytellingService.getNeighborhoodLifestyle(neighborhood)).toBe(
        expectedPerk
      )
    })

    test('should return a default perk if no scores meet thresholds', () => {
      const neighborhood = createMockNeighborhood({
        walk_score: 50,
        transit_score: 60,
      })
      const expectedPerk = 'Charming neighborhood for a shared search'
      expect(StorytellingService.getNeighborhoodLifestyle(neighborhood)).toBe(
        expectedPerk
      )
    })

    test('should apply correct logic at walk_score boundary 80', () => {
      const neighborhoodAt80 = createMockNeighborhood({ walk_score: 80 })
      const neighborhoodAt81 = createMockNeighborhood({ walk_score: 81 })

      // At 80, it should fall into the ">60" category
      expect(
        StorytellingService.getNeighborhoodLifestyle(neighborhoodAt80)
      ).toBe('Easy access to local shops and neighborhood favorites')
      // At 81, it should fall into the ">80" category
      expect(
        StorytellingService.getNeighborhoodLifestyle(neighborhoodAt81)
      ).toBe(
        'Walking distance to charming farmers markets and artisanal coffee shops'
      )
    })

    test('should apply correct logic at walk_score boundary 60', () => {
      const neighborhoodAt59 = createMockNeighborhood({
        walk_score: 59,
        transit_score: 50,
      })
      const neighborhoodAt60 = createMockNeighborhood({
        walk_score: 60,
        transit_score: 50,
      })
      const neighborhoodAt61 = createMockNeighborhood({
        walk_score: 61,
        transit_score: 50,
      })

      // At 59, should get default
      expect(
        StorytellingService.getNeighborhoodLifestyle(neighborhoodAt59)
      ).toBe('Charming neighborhood for a shared search')
      // At 60, should get default (condition is > 60)
      expect(
        StorytellingService.getNeighborhoodLifestyle(neighborhoodAt60)
      ).toBe('Charming neighborhood for a shared search')
      // At 61, should get medium walk score
      expect(
        StorytellingService.getNeighborhoodLifestyle(neighborhoodAt61)
      ).toBe('Easy access to local shops and neighborhood favorites')
    })

    test('should apply correct logic at transit_score boundary 70', () => {
      const neighborhoodAt70 = createMockNeighborhood({
        walk_score: 50,
        transit_score: 70,
      })
      const neighborhoodAt71 = createMockNeighborhood({
        walk_score: 50,
        transit_score: 71,
      })

      // At 70, should get default (condition is > 70)
      expect(
        StorytellingService.getNeighborhoodLifestyle(neighborhoodAt70)
      ).toBe('Charming neighborhood for a shared search')
      // At 71, should get transit perk
      expect(
        StorytellingService.getNeighborhoodLifestyle(neighborhoodAt71)
      ).toBe('Easy commutes for busy schedules via nearby transit connections')
    })

    test('should handle null walk_score and transit_score', () => {
      const neighborhood = createMockNeighborhood({
        walk_score: null,
        transit_score: null,
      })
      const expectedPerk = 'Charming neighborhood for a shared search'
      expect(StorytellingService.getNeighborhoodLifestyle(neighborhood)).toBe(
        expectedPerk
      )
    })
  })

  describe('generateLifestyleTags', () => {
    test('should generate and sort multiple tags, returning the top 3 by priority', () => {
      const property = createMockProperty({
        bedrooms: 4, // Triggers 'Work from Home Ready' (P8), 'Future Family Home' (P9)
        bathrooms: 3, // Triggers 'Future Family Home' (P9)
        square_feet: 1800, // Triggers 'Culinary Paradise' (P7), 'Entertainment Haven' (P6)
        property_type: 'single_family',
        lot_size_sqft: 1500, // Triggers 'Private Oasis' (P7)
        amenities: [],
      })
      const neighborhood = createMockNeighborhood({ walk_score: 75 }) // Triggers 'Dining District' (P8)

      const tags = StorytellingService.generateLifestyleTags(
        property,
        neighborhood
      )

      expect(tags).toHaveLength(3)
      expect(tags[0].tag).toBe('Future Family Home')
      expect(tags[0].priority).toBe(9)

      // Check that we have the expected high-priority tags
      const tagNames = tags.map((tag) => tag.tag)
      expect(tagNames).toContain('Future Family Home')
      expect(tagNames).toContain('Work from Home Ready')
      expect(tagNames).toContain('Dining District')
    })

    test('should generate "Culinary Paradise" tag when kitchen amenity is present', () => {
      const property = createMockProperty({
        square_feet: 1000, // Below 1200 threshold
        amenities: ['Outdoor Space', 'Modern Kitchen'], // Kitchen amenity present
      })
      const tags = StorytellingService.generateLifestyleTags(property)
      expect(tags).toContainEqual(
        expect.objectContaining({
          tag: 'Culinary Paradise',
          description: 'Perfect kitchen for weekend cooking projects',
          priority: 7,
        })
      )
    })

    test('should generate "Culinary Paradise" tag when square_feet > 1200', () => {
      const property = createMockProperty({
        square_feet: 1300, // Above 1200 threshold
        amenities: [], // No kitchen amenity
      })
      const tags = StorytellingService.generateLifestyleTags(property)
      expect(tags).toContainEqual(
        expect.objectContaining({
          tag: 'Culinary Paradise',
          description: 'Perfect kitchen for weekend cooking projects',
          priority: 7,
        })
      )
    })

    test('should generate "Resort-Style Living" tag for condos with gym/pool/concierge amenities', () => {
      const property = createMockProperty({
        property_type: 'condo',
        amenities: ['gym', 'concierge service'],
        bedrooms: 2, // Reset to not trigger Future Family Home and Work from Home Ready
        bathrooms: 1,
        square_feet: 1000, // Below 1200 to not trigger Culinary Paradise
      })
      const tags = StorytellingService.generateLifestyleTags(property)
      expect(tags).toContainEqual(
        expect.objectContaining({
          tag: 'Resort-Style Living',
          description: 'Luxury amenities at your fingertips',
          priority: 7,
        })
      )
    })

    test('should not generate "Resort-Style Living" tag for non-condos', () => {
      const property = createMockProperty({
        property_type: 'single_family',
        amenities: ['gym', 'pool'],
      })
      const tags = StorytellingService.generateLifestyleTags(property)
      const tagNames = tags.map((tag) => tag.tag)
      expect(tagNames).not.toContain('Resort-Style Living')
    })

    test('should include "Shared Retreat" tag when minimal conditions are met', () => {
      const property = createMockProperty({
        bedrooms: 1,
        bathrooms: 1,
        square_feet: 500,
        property_type: 'multi_family',
        amenities: [],
        lot_size_sqft: null,
      })
      const neighborhood = createMockNeighborhood({
        walk_score: 50,
        transit_score: 50,
      })
      const tags = StorytellingService.generateLifestyleTags(
        property,
        neighborhood
      )

      // Should include Shared Retreat tag (always added)
      expect(tags).toContainEqual(
        expect.objectContaining({
          tag: 'Shared Retreat',
          description: 'Cozy home base for a smaller household',
          priority: 5,
        })
      )
      expect(tags.length).toBeGreaterThan(0)
    })

    test('should generate "City Hideaway" at boundary conditions', () => {
      const property = createMockProperty({
        bedrooms: 2, // <= 2
        square_feet: 1200, // <= 1200
        property_type: 'condo',
        amenities: [],
        lot_size_sqft: null,
      })
      const tags = StorytellingService.generateLifestyleTags(property)
      expect(tags).toContainEqual(
        expect.objectContaining({
          tag: 'City Hideaway',
          description: 'A cozy home base that keeps you close to the action',
          priority: 8,
        })
      )
    })

    test('should generate "Work from Home Ready" for 3+ bedrooms', () => {
      const property = createMockProperty({
        bedrooms: 3,
        bathrooms: 2,
        square_feet: 1400,
      })
      const tags = StorytellingService.generateLifestyleTags(property)
      expect(tags).toContainEqual(
        expect.objectContaining({
          tag: 'Work from Home Ready',
          description:
            'Dedicated spaces for multiple people to thrive professionally',
          priority: 8,
        })
      )
    })

    test('should generate "Future Family Home" for 3+ bedrooms and 2+ bathrooms', () => {
      const property = createMockProperty({
        bedrooms: 3,
        bathrooms: 2,
        square_feet: 1400,
      })
      const tags = StorytellingService.generateLifestyleTags(property)
      expect(tags).toContainEqual(
        expect.objectContaining({
          tag: 'Future Family Home',
          description: 'Space to grow your family and create lasting memories',
          priority: 9,
        })
      )
    })

    test('should generate "Entertainment Haven" for large square footage', () => {
      const property = createMockProperty({
        square_feet: 1600, // > 1500
        bedrooms: 2,
        bathrooms: 2,
      })
      const tags = StorytellingService.generateLifestyleTags(property)
      expect(tags).toContainEqual(
        expect.objectContaining({
          tag: 'Entertainment Haven',
          description: 'Perfect for hosting friends and creating memories',
          priority: 6,
        })
      )
    })

    test('should generate "Private Oasis" for houses with large lot size', () => {
      const property = createMockProperty({
        property_type: 'single_family',
        lot_size_sqft: 1500, // > 1000
        bedrooms: 2, // Reset to not trigger other high priority tags
        bathrooms: 1,
        square_feet: 1000, // Below thresholds
      })
      const tags = StorytellingService.generateLifestyleTags(property)
      expect(tags).toContainEqual(
        expect.objectContaining({
          tag: 'Private Oasis',
          description: 'Your own outdoor sanctuary for relaxation',
          priority: 7,
        })
      )
    })

    test('should generate "Dining District" for high walk score neighborhoods', () => {
      const property = createMockProperty({
        bedrooms: 2,
        bathrooms: 1,
        square_feet: 1000,
      })
      const neighborhood = createMockNeighborhood({ walk_score: 80 }) // > 70
      const tags = StorytellingService.generateLifestyleTags(
        property,
        neighborhood
      )
      expect(tags).toContainEqual(
        expect.objectContaining({
          tag: 'Dining District',
          description: 'Restaurants and nightlife within walking distance',
          priority: 8,
        })
      )
    })

    test('should handle null bedrooms, bathrooms, and square_feet', () => {
      const property = createMockProperty({
        bedrooms: null,
        bathrooms: null,
        square_feet: null,
        amenities: [],
        lot_size_sqft: null,
      })
      const tags = StorytellingService.generateLifestyleTags(property)

      // Should always include Shared Retreat
      expect(tags).toContainEqual(
        expect.objectContaining({
          tag: 'Shared Retreat',
          priority: 5,
        })
      )
      expect(tags.length).toBeGreaterThan(0)
    })

    test('should handle empty amenities array', () => {
      const property = createMockProperty({
        amenities: [],
        square_feet: 800,
      })
      const tags = StorytellingService.generateLifestyleTags(property)
      expect(tags.length).toBeGreaterThan(0)
      // Should not throw error
    })

    test('should handle null amenities', () => {
      const property = createMockProperty({
        amenities: null,
        square_feet: 800,
      })
      const tags = StorytellingService.generateLifestyleTags(property)
      expect(tags.length).toBeGreaterThan(0)
      // Should not throw error
    })

    test('should be case-insensitive for amenity matching', () => {
      const property = createMockProperty({
        property_type: 'condo',
        amenities: ['GYM', 'Pool', 'CONCIERGE'],
        square_feet: 1000,
      })
      const tags = StorytellingService.generateLifestyleTags(property)
      expect(tags).toContainEqual(
        expect.objectContaining({
          tag: 'Resort-Style Living',
        })
      )
    })
  })
})

describe('generatePropertyStory (convenience function)', () => {
  let mathRandomSpy: jest.SpyInstance

  beforeEach(() => {
    mathRandomSpy = jest.spyOn(Math, 'random').mockReturnValue(0)
  })

  afterEach(() => {
    mathRandomSpy.mockRestore()
    jest.restoreAllMocks()
  })

  test('should correctly call static methods and aggregate results', () => {
    const property = createMockProperty()
    const neighborhood = createMockNeighborhood({ walk_score: 85 }) // >80 to get first perk
    const isMutualLike = false

    const result = generatePropertyStory(property, neighborhood, isMutualLike)

    expect(result).toHaveProperty('story')
    expect(result).toHaveProperty('neighborhoodPerk')
    expect(result).toHaveProperty('lifestyleTags')

    expect(typeof result.story).toBe('string')
    expect(result.story.length).toBeGreaterThan(0)

    expect(typeof result.neighborhoodPerk).toBe('string')
    expect(result.neighborhoodPerk).toBe(
      'Walking distance to charming farmers markets and artisanal coffee shops'
    )

    expect(Array.isArray(result.lifestyleTags)).toBe(true)
    expect(result.lifestyleTags.length).toBeGreaterThan(0)
    expect(result.lifestyleTags.length).toBeLessThanOrEqual(3)
  })

  test('should handle mutual like scenario correctly', () => {
    const property = createMockProperty()
    const neighborhood = createMockNeighborhood({ walk_score: 85 }) // >80 to get first perk
    const isMutualLike = true

    const result = generatePropertyStory(property, neighborhood, isMutualLike)

    expect(result.story).toBe('Everyone said yes to this place')
    expect(result.neighborhoodPerk).toBe(
      'Walking distance to charming farmers markets and artisanal coffee shops'
    )
    expect(result.lifestyleTags.length).toBeGreaterThan(0)
  })

  test('should handle no neighborhood gracefully', () => {
    const property = createMockProperty()
    const isMutualLike = false

    const result = generatePropertyStory(property, undefined, isMutualLike)

    expect(result.story).toBeTruthy()
    expect(result.neighborhoodPerk).toBeNull()
    expect(result.lifestyleTags.length).toBeGreaterThan(0)
  })

  test('should return default isMutualLike as false when not provided', () => {
    const property = createMockProperty()
    const neighborhood = createMockNeighborhood()

    const result = generatePropertyStory(property, neighborhood)

    // Should not return mutual like message since isMutualLike defaults to false
    expect(result.story).not.toBe('Everyone said yes to this place')
  })
})
