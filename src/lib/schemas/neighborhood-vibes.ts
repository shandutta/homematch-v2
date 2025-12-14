import { z } from 'zod'

export const neighborhoodVibeOutputSchema = z.object({
  tagline: z.string().min(8).max(140),
  vibeSummary: z.string().min(40).max(360),
  keywords: z.array(z.string().min(2).max(40)).min(3).max(8),
  confidence: z.number().min(0).max(1).default(0.8).optional(),
})

export type NeighborhoodVibeOutput = z.infer<
  typeof neighborhoodVibeOutputSchema
>

export interface NeighborhoodVibeRecord {
  vibe_tagline: string
  vibe_summary: string
  vibe_keywords: string[]
  vibe_generated_at: string
  vibe_model: string
  vibe_confidence?: number
}
