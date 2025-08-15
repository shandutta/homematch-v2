import { Property, Neighborhood } from '@/lib/schemas/property'

interface LifestyleContext {
  property: Property
  neighborhood?: Neighborhood
  isMutualLike?: boolean
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
        'Stroll to romantic date night restaurants and intimate wine bars',
        'Explore tree-lined streets perfect for evening walks hand-in-hand'
      )
    } else if (neighborhood.walk_score && neighborhood.walk_score > 60) {
      perks.push(
        'Easy access to local shops and neighborhood favorites',
        'Quiet residential streets perfect for morning jogs together'
      )
    }

    // Transit accessibility
    if (neighborhood.transit_score && neighborhood.transit_score > 70) {
      perks.push(
        'Easy commute for both partners via nearby transit connections',
        'Seamless city exploration without parking hassles',
        'Quick access to downtown cultural attractions and entertainment'
      )
    }

    // Default neighborhood charm
    if (perks.length === 0) {
      perks.push(
        'Charming neighborhood perfect for couples starting their journey',
        'Peaceful residential area with a strong sense of community',
        'Up-and-coming area with exciting new developments on the horizon'
      )
    }

    return perks[Math.floor(Math.random() * perks.length)]
  }

  /**
   * Generate lifestyle tags with couple-focused messaging
   */
  static generateLifestyleTags(
    property: Property,
    neighborhood?: Neighborhood
  ): Array<{
    tag: string
    description: string
    priority: number
  }> {
    const tags: Array<{ tag: string; description: string; priority: number }> =
      []

    // Work from home potential
    if (property.bedrooms && property.bedrooms >= 3) {
      tags.push({
        tag: 'Work from Home Ready',
        description:
          'Dedicated spaces for both of you to thrive professionally',
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
        description: 'Perfect kitchen for weekend cooking adventures together',
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

    // Cozy romantic
    if (
      property.bedrooms &&
      property.bedrooms <= 2 &&
      property.square_feet &&
      property.square_feet <= 1200
    ) {
      tags.push({
        tag: 'Urban Love Nest',
        description: 'Intimate space designed for two hearts as one',
        priority: 8,
      })
    }

    // Outdoor living
    if (
      property.property_type === 'house' &&
      property.lot_size_sqft &&
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
      property.property_type === 'condo' &&
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
        tag: 'Date Night Central',
        description: 'Restaurants and entertainment within walking distance',
        priority: 8,
      })
    }

    // Always include a romantic element
    tags.push({
      tag: 'Love Nest',
      description: 'Your perfect space to build a life together',
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
      'Both hearts say yes to this special place ❤️',
      'Your perfect match found the perfect match',
      'Two hearts, one home, endless possibilities',
      'When you both know, you both know',
      'This is where your shared dreams take shape',
      'Love at first sight, for both of you',
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
        property.property_type === 'house' &&
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
        'Perfect for morning coffee on your private balcony, watching the world wake up together'
      )
    } else if (features.isSpacious) {
      stories.push(
        'Start each day in your light-filled bedroom with space to breathe and dream'
      )
    } else {
      stories.push(
        "Cozy mornings wrapped in each other's arms in your intimate sanctuary"
      )
    }

    // Evening scenarios
    if (features.hasFireplace) {
      stories.push(
        'Cozy fireplace perfect for romantic winter evenings with wine and conversation'
      )
    } else if (features.hasOutdoorSpace) {
      stories.push(
        'End busy days unwinding together in your private outdoor sanctuary'
      )
    } else {
      stories.push(
        'Create intimate dinner experiences in your thoughtfully designed space'
      )
    }

    // Kitchen/culinary
    if (features.hasLargeKitchen) {
      stories.push(
        'Spacious kitchen becomes your weekend adventure playground - cooking, laughing, creating'
      )
    } else {
      stories.push(
        'Efficient kitchen perfect for romantic dinners for two and morning coffee rituals'
      )
    }

    // Work/lifestyle
    if (features.hasMultipleRooms) {
      stories.push(
        'Flexible spaces that adapt as your relationship and careers evolve together'
      )
    } else if (features.isCozy) {
      stories.push(
        'Intimate space that brings you closer while giving room for individual pursuits'
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
