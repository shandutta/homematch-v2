import { z } from 'zod'

// Expanded property tags organized by category (~80 total)
export const PROPERTY_TAGS = {
  // Architectural Style (15)
  architectural: [
    'Victorian Character',
    'Mid-Century Modern',
    'Craftsman Details',
    'Contemporary Lines',
    'Spanish Revival',
    'Colonial Elegance',
    'Farmhouse Charm',
    'Art Deco Flair',
    'Ranch Style',
    'Mediterranean Influence',
    'Industrial Loft',
    'Tudor Elements',
    'Cape Cod Classic',
    'Prairie Style',
    'Brownstone Beauty',
  ],

  // Outdoor & Views (12)
  outdoor: [
    'Private Oasis',
    "Entertainer's Yard",
    'Urban Rooftop',
    'Garden Paradise',
    'Pool Ready',
    'Mountain Views',
    'Water Views',
    'City Skyline',
    'Wooded Retreat',
    'Desert Landscape',
    'Courtyard Living',
    'Wraparound Porch',
  ],

  // Interior Features (15)
  interior: [
    "Chef's Kitchen",
    'Open Concept Flow',
    'Hardwood Throughout',
    'Fireplace Focal Point',
    'Vaulted Ceilings',
    'Natural Light Filled',
    'Built-In Character',
    'Spa Bathroom',
    'Walk-In Closets',
    'Bonus Room Flex',
    'Finished Basement',
    'Attic Potential',
    'Wine Storage',
    'Home Theater Ready',
    'Smart Home Wired',
  ],

  // Lifestyle Fit (18)
  lifestyle: [
    'Remote Work Ready',
    'Commuter Friendly',
    "Entertainer's Dream",
    'Growing Family',
    'Empty Nester',
    'First-Time Buyer',
    'Investment Property',
    'Multi-Gen Living',
    'Pet Paradise',
    'Fitness Focused',
    'Creative Studio',
    'Wellness Sanctuary',
    'Culinary Haven',
    "Book Lover's Nook",
    'Hobbyist Heaven',
    'Minimalist Living',
    "Collector's Space",
    'Indoor-Outdoor Flow',
  ],

  // Vibe & Aesthetic (12)
  aesthetic: [
    'Bright & Airy',
    'Cozy & Warm',
    'Sleek & Modern',
    'Rustic Charm',
    'Bohemian Spirit',
    'Coastal Casual',
    'Urban Edge',
    'Timeless Classic',
    'Eclectic Mix',
    'Serene Retreat',
    'Bold & Dramatic',
    'Soft & Neutral',
  ],

  // Location & Convenience (10)
  location: [
    'Walkable Neighborhood',
    'Quiet Cul-de-sac',
    'Corner Lot',
    'Near Parks',
    'School District Draw',
    'Transit Accessible',
    'Restaurant Row',
    'Up-and-Coming Area',
    'Established Community',
    'Privacy & Space',
  ],
} as const

// Flatten all tags into a single array for validation
export const ALL_PROPERTY_TAGS = [
  ...PROPERTY_TAGS.architectural,
  ...PROPERTY_TAGS.outdoor,
  ...PROPERTY_TAGS.interior,
  ...PROPERTY_TAGS.lifestyle,
  ...PROPERTY_TAGS.aesthetic,
  ...PROPERTY_TAGS.location,
] as const

export type PropertyTag = (typeof ALL_PROPERTY_TAGS)[number]
export type TagCategory = keyof typeof PROPERTY_TAGS

// Legacy alias for backwards compatibility
export const LIFESTYLE_TAGS = ALL_PROPERTY_TAGS
export type LifestyleTag = PropertyTag

// Lifestyle fit tiers (replacing arbitrary percentages)
export const FIT_TIERS = ['perfect', 'strong', 'good', 'possible'] as const
export type FitTier = (typeof FIT_TIERS)[number]

// Individual vibe with intensity score
// Note: name can be longer (80 chars) to allow unique, property-specific descriptors
export const vibeSchema = z.object({
  name: z.string().min(1).max(80),
  intensity: z.number().min(0).max(1),
  source: z.enum(['interior', 'exterior', 'both']),
})

// Lifestyle fit indicator with tier-based scoring
export const lifestyleFitSchema = z.object({
  category: z.string().min(1).max(50),
  // Keep numeric score for sorting/filtering, but UI shows tier
  score: z.number().min(0).max(1),
  // Tier is derived from score: perfect (0.9+), strong (0.7-0.89), good (0.5-0.69), possible (0.3-0.49)
  tier: z.enum(FIT_TIERS).optional(),
  reason: z.string().min(1).max(200),
})

// Helper to convert score to tier
export function scoreToTier(score: number): FitTier {
  if (score >= 0.9) return 'perfect'
  if (score >= 0.7) return 'strong'
  if (score >= 0.5) return 'good'
  return 'possible'
}

// Helper to get tier display info
export function getTierDisplay(tier: FitTier): {
  stars: string
  label: string
} {
  switch (tier) {
    case 'perfect':
      return { stars: '★★★', label: 'Perfect Fit' }
    case 'strong':
      return { stars: '★★', label: 'Strong Fit' }
    case 'good':
      return { stars: '★', label: 'Good Fit' }
    case 'possible':
      return { stars: '○', label: 'Could Work' }
  }
}

// Notable feature detected from images
export const notableFeatureSchema = z.object({
  feature: z.string().min(1).max(100),
  location: z.string().max(50).optional(),
  appealFactor: z.string().min(1).max(200),
})

// Aesthetic qualities from visual analysis
export const aestheticsSchema = z.object({
  lightingQuality: z.enum([
    'natural_abundant',
    'natural_moderate',
    'artificial_warm',
    'artificial_cool',
    'mixed',
  ]),
  colorPalette: z.array(z.string().max(30)).max(4),
  architecturalStyle: z.string().max(80),
  overallCondition: z.enum([
    'pristine',
    'well_maintained',
    'dated_but_clean',
    'needs_work',
  ]),
})

// LLM Output Schema - what the model returns
export const llmVibesOutputSchema = z.object({
  tagline: z.string().min(10).max(120),
  vibeStatement: z.string().min(20).max(350),
  // Primary vibes: unique, property-specific descriptors (not generic)
  primaryVibes: z.array(vibeSchema).min(2).max(4),
  // Lifestyle fits: who would love this home and why
  lifestyleFits: z.array(lifestyleFitSchema).min(2).max(6),
  // Notable features: specific standout details
  notableFeatures: z.array(notableFeatureSchema).min(2).max(8),
  // Aesthetics: visual analysis
  aesthetics: aestheticsSchema,
  // Emotional hooks: conversational lifestyle moments (real estate agent + friend voice)
  emotionalHooks: z.array(z.string().max(200)).min(1).max(4),
  // Tags: 4-8 from the predefined categories (architectural, outdoor, interior, lifestyle, aesthetic, location)
  suggestedTags: z.array(z.string()).min(4).max(8),
})

// LLM Input Schema - what we send to the model
export const llmVibesInputSchema = z.object({
  property: z.object({
    address: z.string(),
    city: z.string(),
    state: z.string(),
    price: z.number(),
    bedrooms: z.number(),
    bathrooms: z.number(),
    square_feet: z.number().nullable(),
    property_type: z.string().nullable(),
    year_built: z.number().nullable(),
    lot_size_sqft: z.number().nullable(),
    amenities: z.array(z.string()).nullable(),
  }),
  images: z.array(
    z.object({
      url: z.string().url(),
      category: z.string(),
    })
  ),
  modelId: z.string(),
})

// Database record schema
export const propertyVibesSchema = z.object({
  id: z.string().uuid(),
  property_id: z.string().uuid(),

  // Generated content
  tagline: z.string(),
  vibe_statement: z.string(),
  feature_highlights: z.array(notableFeatureSchema),
  lifestyle_fits: z.array(lifestyleFitSchema),
  suggested_tags: z.array(z.string()),
  emotional_hooks: z.array(z.string()).nullable(),

  // Visual analysis
  primary_vibes: z.array(vibeSchema),
  aesthetics: aestheticsSchema.nullable(),

  // Raw I/O for training
  input_data: llmVibesInputSchema.nullable(),
  raw_output: z.string().nullable(),

  // Metadata
  model_used: z.string(),
  images_analyzed: z.array(z.string()).nullable(),
  source_data_hash: z.string(),
  generation_cost_usd: z.number().nullable(),
  confidence: z.number().min(0).max(1).nullable(),

  created_at: z.string().datetime().nullable(),
  updated_at: z.string().datetime().nullable(),
})

// Insert schema (omit auto-generated fields)
export const propertyVibesInsertSchema = propertyVibesSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
})

// Export types
export type Vibe = z.infer<typeof vibeSchema>
export type LifestyleFit = z.infer<typeof lifestyleFitSchema>
export type NotableFeature = z.infer<typeof notableFeatureSchema>
export type Aesthetics = z.infer<typeof aestheticsSchema>
export type LLMVibesOutput = z.infer<typeof llmVibesOutputSchema>
export type LLMVibesInput = z.infer<typeof llmVibesInputSchema>
export type PropertyVibes = z.infer<typeof propertyVibesSchema>
export type PropertyVibesInsert = z.infer<typeof propertyVibesInsertSchema>
