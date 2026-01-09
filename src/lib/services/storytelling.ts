import { Property, Neighborhood } from '@/lib/schemas/property'

interface LifestyleContext {
  property: Property
  neighborhood?: Neighborhood
  isMutualLike?: boolean
}

type NormalizedPropertyType =
  | 'house'
  | 'condo'
  | 'townhome'
  | 'apartment'
  | 'other'

const normalizePropertyType = (
  type?: string | null
): NormalizedPropertyType => {
  const rawType = typeof type === 'string' ? type : ''

  if (!rawType) return 'house'
  if (rawType === 'single_family' || rawType === 'manufactured') return 'house'
  if (rawType === 'multi_family' || rawType === 'apartment') return 'apartment'
  if (rawType === 'townhouse' || rawType === 'townhome') return 'townhome'
  if (rawType === 'condo') return 'condo'
  if (rawType === 'house') return 'house'
  return 'other'
}

/**
 * Generates dynamic lifestyle descriptions based on property features
 */
export class StorytellingService {
  /**
   * Generate a compelling property story based on features
   */
  static generatePropertyStory(context: LifestyleContext): string {
    const { property, neighborhood, isMutualLike } = context

    if (isMutualLike) {
      return this.getMutualLikeMessage()
    }

    const features = this.analyzePropertyFeatures(property)
    return this.buildStoryFromFeatures(features, property, neighborhood)
  }

  /**
   * Get neighborhood-specific lifestyle perks
   */
  static getNeighborhoodLifestyle(neighborhood?: Neighborhood): string | null {
    if (!neighborhood) return null

    const perks: string[] = []

    // High walkability
    if (neighborhood.walk_score && neighborhood.walk_score > 80) {
      perks.push(
        'Walking distance to charming farmers markets and artisanal coffee shops',
        'Walk to restaurants and wine bars',
        'Explore tree-lined streets perfect for evening walks'
      )
    } else if (neighborhood.walk_score && neighborhood.walk_score > 60) {
      perks.push(
        'Easy access to local shops and neighborhood favorites',
        'Quiet residential streets perfect for morning jogs'
      )
    }

    // Transit accessibility
    if (neighborhood.transit_score && neighborhood.transit_score > 70) {
      perks.push(
        'Easy commutes for busy schedules via nearby transit connections',
        'Seamless city exploration without parking hassles',
        'Quick access to downtown cultural attractions and entertainment'
      )
    }

    // Default neighborhood charm
    if (perks.length === 0) {
      perks.push(
        'Charming neighborhood for a shared search',
        'Peaceful residential area with a strong sense of community',
        'Up-and-coming area with exciting new developments on the horizon'
      )
    }

    return perks[Math.floor(Math.random() * perks.length)]
  }

  /**
   * Generate lifestyle tags with household-focused messaging
   */
  static generateLifestyleTags(
    property: Property,
    neighborhood?: Neighborhood
  ): Array<{
    tag: string
    description: string
    priority: number
  }> {
    const propertyType = normalizePropertyType(property.property_type)
    const tags: Array<{ tag: string; description: string; priority: number }> =
      []

    // Work from home potential
    if (property.bedrooms && property.bedrooms >= 3) {
      tags.push({
        tag: 'Work from Home Ready',
        description:
          'Dedicated spaces for multiple people to thrive professionally',
        priority: 8,
      })
    }

    // Kitchen/culinary focus
    if (
      (property.square_feet && property.square_feet > 1200) ||
      property.amenities?.some((a) => a.toLowerCase().includes('kitchen'))
    ) {
      tags.push({
        tag: 'Culinary Paradise',
        description: 'Perfect kitchen for weekend cooking projects',
        priority: 7,
      })
    }

    // Family potential
    if (
      property.bedrooms &&
      property.bedrooms >= 3 &&
      property.bathrooms >= 2
    ) {
      tags.push({
        tag: 'Future Family Home',
        description: 'Space to grow your family and create lasting memories',
        priority: 9,
      })
    }

    // Entertaining
    if (property.square_feet && property.square_feet > 1500) {
      tags.push({
        tag: 'Entertainment Haven',
        description: 'Perfect for hosting friends and creating memories',
        priority: 6,
      })
    }

    // Cozy compact
    if (
      property.bedrooms &&
      property.bedrooms <= 2 &&
      property.square_feet &&
      property.square_feet <= 1200
    ) {
      tags.push({
        tag: 'City Hideaway',
        description: 'A cozy home base that keeps you close to the action',
        priority: 8,
      })
    }

    // Outdoor living
    if (
      propertyType === 'house' &&
      property.lot_size_sqft !== null &&
      property.lot_size_sqft > 1000
    ) {
      tags.push({
        tag: 'Private Oasis',
        description: 'Your own outdoor sanctuary for relaxation',
        priority: 7,
      })
    }

    // Urban amenities
    if (
      propertyType === 'condo' &&
      property.amenities?.some(
        (a) =>
          a.toLowerCase().includes('gym') ||
          a.toLowerCase().includes('pool') ||
          a.toLowerCase().includes('concierge')
      )
    ) {
      tags.push({
        tag: 'Resort-Style Living',
        description: 'Luxury amenities at your fingertips',
        priority: 7,
      })
    }

    // Walkable lifestyle
    if (neighborhood?.walk_score && neighborhood.walk_score > 70) {
      tags.push({
        tag: 'Dining District',
        description: 'Restaurants and nightlife within walking distance',
        priority: 8,
      })
    }

    // Always include a shared-home option
    tags.push({
      tag: 'Shared Retreat',
      description: 'Cozy home base for a smaller household',
      priority: 5,
    })

    // Sort by priority and return top 3
    return tags.sort((a, b) => b.priority - a.priority).slice(0, 3)
  }

  /**
   * Private helper methods
   */
  private static getMutualLikeMessage(): string {
    const messages = [
      'Everyone said yes to this place',
      'Your shared list just got a strong favorite',
      'Shared goals, one home, endless possibilities',
      'When everyone agrees, you know',
      'This is where your shared plans take shape',
      'Instant favorite for everyone',
    ]

    return messages[Math.floor(Math.random() * messages.length)]
  }

  private static analyzePropertyFeatures(property: Property): {
    hasBalcony: boolean
    hasFireplace: boolean
    hasLargeKitchen: boolean
    hasOutdoorSpace: boolean
    isSpacious: boolean
    isCozy: boolean
    hasMultipleRooms: boolean
  } {
    const amenities = property.amenities || []
    const amenityText = amenities.join(' ').toLowerCase()
    const propertyType = normalizePropertyType(property.property_type)

    return {
      hasBalcony:
        amenityText.includes('balcony') ||
        amenityText.includes('patio') ||
        amenityText.includes('deck'),
      hasFireplace: amenityText.includes('fireplace'),
      hasLargeKitchen:
        amenityText.includes('kitchen') ||
        (property.square_feet !== null && property.square_feet > 1200),
      hasOutdoorSpace:
        propertyType === 'house' &&
        property.lot_size_sqft !== null &&
        property.lot_size_sqft > 500,
      isSpacious:
        property.square_feet !== null ? property.square_feet > 1500 : false,
      isCozy:
        property.square_feet !== null ? property.square_feet <= 1200 : true,
      hasMultipleRooms:
        property.bedrooms !== null ? property.bedrooms >= 3 : false,
    }
  }

  private static buildStoryFromFeatures(
    features: ReturnType<typeof StorytellingService.analyzePropertyFeatures>,
    _property: Property,
    _neighborhood?: Neighborhood
  ): string {
    const stories: string[] = []

    // Morning scenarios
    if (features.hasBalcony) {
      stories.push(
        'Perfect for morning coffee on your private balcony as the day starts'
      )
    } else if (features.isSpacious) {
      stories.push(
        'Start each day in your light-filled bedroom with space to breathe and dream'
      )
    } else {
      stories.push('Cozy mornings in a calm, comfortable space')
    }

    // Evening scenarios
    if (features.hasFireplace) {
      stories.push(
        'Cozy fireplace for winter evenings with a good book or a movie'
      )
    } else if (features.hasOutdoorSpace) {
      stories.push('End busy days unwinding in your private outdoor space')
    } else {
      stories.push('Host easy dinners in your thoughtfully designed space')
    }

    // Kitchen/culinary
    if (features.hasLargeKitchen) {
      stories.push('Spacious kitchen built for weekend cooking projects')
    } else {
      stories.push('Efficient kitchen that keeps daily routines simple')
    }

    // Work/lifestyle
    if (features.hasMultipleRooms) {
      stories.push(
        'Flexible spaces that adapt as your household and careers evolve'
      )
    } else if (features.isCozy) {
      stories.push(
        'Compact space that still leaves room for individual routines'
      )
    }

    // Entertaining
    if (features.isSpacious) {
      stories.push(
        'Open layout flows beautifully for hosting friends and building your social circle'
      )
    }

    // Select random story
    return stories[Math.floor(Math.random() * stories.length)]
  }
}

/**
 * Convenience function for quick access to storytelling features
 */
export function generatePropertyStory(
  property: Property,
  neighborhood?: Neighborhood,
  isMutualLike = false
): {
  story: string
  neighborhoodPerk: string | null
  lifestyleTags: ReturnType<typeof StorytellingService.generateLifestyleTags>
} {
  return {
    story: StorytellingService.generatePropertyStory({
      property,
      neighborhood,
      isMutualLike,
    }),
    neighborhoodPerk:
      StorytellingService.getNeighborhoodLifestyle(neighborhood),
    lifestyleTags: StorytellingService.generateLifestyleTags(
      property,
      neighborhood
    ),
  }
}
