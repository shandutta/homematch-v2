import { z } from 'zod'

export const neighborhoodThemeSchema = z.object({
  name: z.string().min(2).max(80),
  whyItMatters: z.string().min(10).max(180),
  intensity: z.number().min(0).max(1).optional(),
})

export const residentProfileSchema = z.object({
  profile: z.string().min(2).max(80),
  reason: z.string().min(10).max(180),
})

export const localHighlightSchema = z.object({
  name: z.string().min(2).max(80),
  category: z.string().min(2).max(60),
  whyItMatters: z.string().min(10).max(200),
})

export const neighborhoodVibesOutputSchema = z.object({
  tagline: z.string().min(8).max(140),
  vibeStatement: z.string().min(30).max(380),
  neighborhoodThemes: z.array(neighborhoodThemeSchema).min(2).max(4),
  localHighlights: z.array(localHighlightSchema).min(2).max(6),
  residentFits: z.array(residentProfileSchema).min(2).max(5),
  suggestedTags: z.array(z.string()).min(3).max(8),
})

export type NeighborhoodVibesOutput = z.infer<
  typeof neighborhoodVibesOutputSchema
>

export const neighborhoodVibesRecordSchema = z.object({
  id: z.string().uuid(),
  neighborhood_id: z.string().uuid(),
  tagline: z.string(),
  vibe_statement: z.string(),
  neighborhood_themes: z.array(neighborhoodThemeSchema),
  local_highlights: z.array(localHighlightSchema),
  resident_fits: z.array(residentProfileSchema),
  suggested_tags: z.array(z.string()),
  model_used: z.string(),
  source_data_hash: z.string(),
  input_data: z.unknown().optional(),
  raw_output: z.string().optional(),
  confidence: z.number().optional(),
  generation_cost_usd: z.number().optional(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
})

export type NeighborhoodVibesRecord = z.infer<
  typeof neighborhoodVibesRecordSchema
>

export type NeighborhoodVibesInsert = Omit<
  NeighborhoodVibesRecord,
  'id' | 'created_at' | 'updated_at'
>
