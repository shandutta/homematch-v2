import { z } from 'zod'

// Predefined lifestyle tags that the LLM can suggest
export const LIFESTYLE_TAGS = [
  'Work from Home Ready',
  'Commuter Friendly',
  'Cozy Retreat',
  'Entertainment Haven',
  'Family Haven',
  'Culinary Paradise',
  'Pet Paradise',
  'Wellness Sanctuary',
  'Natural Light Haven',
  'Urban Oasis',
  'Weekend Retreat',
  'Outdoor Living',
  'City Views',
  'Beach Lifestyle',
  'Future Family Home',
  "Entertainer's Dream",
  'First-Time Buyer Friendly',
  'Investment Ready',
  'Modern Minimalist',
  'Classic Charm',
] as const

export type LifestyleTag = (typeof LIFESTYLE_TAGS)[number]

// Individual vibe with intensity score
export const vibeSchema = z.object({
  name: z.string().min(1).max(50),
  intensity: z.number().min(0).max(1),
  source: z.enum(['interior', 'exterior', 'both']),
})

// Lifestyle fit indicator
export const lifestyleFitSchema = z.object({
  category: z.string().min(1).max(50),
  score: z.number().min(0).max(1),
  reason: z.string().min(1).max(200),
})

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
  architecturalStyle: z.string().max(50),
  overallCondition: z.enum([
    'pristine',
    'well_maintained',
    'dated_but_clean',
    'needs_work',
  ]),
})

// LLM Output Schema - what the model returns
export const llmVibesOutputSchema = z.object({
  tagline: z.string().min(10).max(80),
  vibeStatement: z.string().min(20).max(200),
  primaryVibes: z.array(vibeSchema).min(2).max(4),
  lifestyleFits: z.array(lifestyleFitSchema).min(2).max(6),
  notableFeatures: z.array(notableFeatureSchema).min(2).max(8),
  aesthetics: aestheticsSchema,
  emotionalHooks: z.array(z.string().max(100)).min(2).max(4),
  suggestedTags: z.array(z.string()).min(2).max(4),
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
