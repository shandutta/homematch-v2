import { z } from 'zod'

const propertyTypeEnum = z.enum([
  'single_family',
  'condo',
  'townhome',
  'multi_family',
  'manufactured',
  'land',
  'other',
])

export const matchPreferencesSchema = z.object({
  price_min: z.number().min(0).optional(),
  price_max: z.number().min(0).optional(),
  bedrooms_min: z.number().min(0).max(20).optional(),
  bedrooms_max: z.number().min(0).max(20).optional(),
  bathrooms_min: z.number().min(0).max(20).optional(),
  bathrooms_max: z.number().min(0).max(20).optional(),
  square_feet_min: z.number().min(0).optional(),
  property_types: z.array(propertyTypeEnum).optional(),
  must_have_amenities: z.array(z.string().max(64)).max(20).optional(),
  nice_to_have_amenities: z.array(z.string().max(64)).max(20).optional(),
  preferred_cities: z.array(z.string().max(100)).max(20).optional(),
  free_text: z.string().max(2000).optional(),
})

export const matchCandidatePropertySchema = z.object({
  id: z.string().uuid(),
  address: z.string().max(255),
  city: z.string().max(100),
  state: z.string().length(2),
  zip_code: z.string().max(10),
  price: z.number().min(0),
  bedrooms: z.number().min(0).max(20),
  bathrooms: z.number().min(0).max(20),
  square_feet: z.number().min(0).nullable(),
  property_type: propertyTypeEnum.nullable(),
  amenities: z.array(z.string()).nullable(),
  year_built: z.number().min(1800).nullable(),
  description: z.string().max(4000).nullable(),
  walk_score: z.number().min(0).max(100).nullable().optional(),
})

export const matchRequestSchema = z.object({
  preferences: matchPreferencesSchema,
  candidates: z.array(matchCandidatePropertySchema).min(1).max(50),
  top_k: z.number().int().min(1).max(50).default(10),
})

export const matchCitationSchema = z.object({
  field: z.enum([
    'price',
    'bedrooms',
    'bathrooms',
    'square_feet',
    'property_type',
    'amenities',
    'year_built',
    'city',
    'description',
  ]),
  evidence: z.string().min(1).max(500),
})

export const rankedPropertySchema = z.object({
  property_id: z.string().uuid(),
  rank: z.number().int().min(1),
  score: z.number().min(0).max(1),
  rationale: z.string().min(1).max(1000),
  citations: z.array(matchCitationSchema).min(1).max(10),
  concerns: z.array(z.string().max(300)).max(5).default([]),
})

export const matchResultSchema = z.object({
  ranked: z.array(rankedPropertySchema),
  mode: z.enum(['mock', 'llm']),
  model: z.string().nullable(),
  generated_at: z.string().datetime(),
  candidate_count: z.number().int().min(0),
  truncated: z.boolean(),
})

export type MatchPreferences = z.infer<typeof matchPreferencesSchema>
export type MatchCandidateProperty = z.infer<typeof matchCandidatePropertySchema>
export type MatchRequest = z.infer<typeof matchRequestSchema>
export type MatchCitation = z.infer<typeof matchCitationSchema>
export type RankedProperty = z.infer<typeof rankedPropertySchema>
export type MatchResult = z.infer<typeof matchResultSchema>
