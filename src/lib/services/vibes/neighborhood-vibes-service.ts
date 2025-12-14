import { Neighborhood } from '@/lib/schemas/property'
import {
  NeighborhoodVibeOutput,
  neighborhoodVibeOutputSchema,
} from '@/lib/schemas/neighborhood-vibes'
import { NeighborhoodStatsResult } from '@/lib/services/supabase-rpc-types'
import {
  OpenRouterClient,
  createOpenRouterClient,
  type UsageInfo,
} from './openrouter-client'

const DEFAULT_NEIGHBORHOOD_MODEL =
  process.env.NEIGHBORHOOD_VIBES_MODEL || 'openai/gpt-4o-mini'

export interface NeighborhoodVibeContext {
  neighborhood: Neighborhood
  stats?: NeighborhoodStatsResult | null
}

export interface NeighborhoodVibeResult {
  vibes: NeighborhoodVibeOutput
  usage: UsageInfo
  modelUsed: string
}

export class NeighborhoodVibesService {
  private client: OpenRouterClient
  private model: string

  constructor(
    client?: OpenRouterClient,
    model: string = DEFAULT_NEIGHBORHOOD_MODEL
  ) {
    this.model = model
    this.client = client || createOpenRouterClient(undefined, model)
  }

  async generateVibe(
    context: NeighborhoodVibeContext
  ): Promise<NeighborhoodVibeResult> {
    const { neighborhood, stats } = context

    const systemPrompt =
      'You write concise, trustworthy neighborhood vibe blurbs for homebuyers. Use only the provided data. Avoid clichés, buzzwords, and fake specifics. Keep it human, 2-3 sentences max, and highlight what makes the area feel unique.'

    const userPrompt = this.buildUserPrompt(neighborhood, stats)

    const { response, usage } = await this.client.chatCompletion(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      {
        model: this.model,
        temperature: 0.4,
        maxTokens: 500,
        responseFormat: { type: 'json_object' },
      }
    )

    const rawContent = response.choices[0]?.message?.content
    if (!rawContent) {
      throw new Error('Empty response from LLM')
    }

    let vibes: NeighborhoodVibeOutput
    try {
      const parsed = JSON.parse(rawContent)
      vibes = neighborhoodVibeOutputSchema.parse(parsed)
    } catch (error) {
      throw new Error(
        `Failed to parse neighborhood vibes response: ${
          error instanceof Error ? error.message : String(error)
        }`
      )
    }

    return { vibes, usage, modelUsed: this.model }
  }

  private buildUserPrompt(
    neighborhood: Neighborhood,
    stats?: NeighborhoodStatsResult | null
  ): string {
    const lines = [
      `Neighborhood: ${neighborhood.name}, ${neighborhood.city}, ${neighborhood.state}`,
    ]

    if (neighborhood.metro_area) {
      lines.push(`Metro area: ${neighborhood.metro_area}`)
    }

    lines.push(
      `Median price: ${neighborhood.median_price ? `$${Math.round(neighborhood.median_price).toLocaleString()}` : 'unknown'}`
    )

    lines.push(
      `Walk score: ${neighborhood.walk_score ?? 'unknown'}, Transit score: ${
        neighborhood.transit_score ?? 'unknown'
      }`
    )

    if (stats) {
      lines.push(
        `Listings snapshot — total: ${stats.total_properties}, median: $${Math.round(stats.median_price).toLocaleString()}, range: $${Math.round(stats.price_range_min).toLocaleString()}-$${Math.round(stats.price_range_max).toLocaleString()}, avg beds: ${stats.avg_bedrooms.toFixed(1)}, avg baths: ${stats.avg_bathrooms.toFixed(1)}, avg sqft: ${stats.avg_square_feet.toFixed(0)}`
      )
    }

    lines.push(
      'Return JSON with: tagline (<=140 chars, specific tone), vibeSummary (2-3 sentences grounded in the data), keywords (3-8 concise lowercase descriptors).'
    )

    return lines.join('\n')
  }
}

export function createNeighborhoodVibesService(
  apiKey?: string,
  model?: string
): NeighborhoodVibesService {
  const client = createOpenRouterClient(
    apiKey,
    model || DEFAULT_NEIGHBORHOOD_MODEL
  )
  return new NeighborhoodVibesService(
    client,
    model || DEFAULT_NEIGHBORHOOD_MODEL
  )
}
