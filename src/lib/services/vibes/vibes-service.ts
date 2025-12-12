/**
 * Property Vibes Service
 *
 * Main service for generating property vibes using vision LLMs.
 * Orchestrates image selection, LLM calls, and result storage.
 */

import crypto from 'node:crypto'
import type { Property } from '@/lib/schemas/property'
import {
  llmVibesOutputSchema,
  type LLMVibesOutput,
  type PropertyVibesInsert,
} from '@/lib/schemas/property-vibes'
import {
  OpenRouterClient,
  createOpenRouterClient,
  DEFAULT_VIBES_MODEL,
  type UsageInfo,
} from './openrouter-client'
import { buildVibesMessages, type PropertyContext } from './prompts'
import {
  selectStrategicImages,
  type ImageSelectionResult,
} from './image-selector'

export interface VibesGenerationResult {
  propertyId: string
  vibes: LLMVibesOutput
  images: ImageSelectionResult
  usage: UsageInfo
  processingTimeMs: number
}

export interface VibesGenerationError {
  propertyId: string
  error: string
  code?: string
}

export interface BatchGenerationResult {
  success: VibesGenerationResult[]
  failed: VibesGenerationError[]
  totalCostUsd: number
  totalTimeMs: number
}

export class VibesService {
  private client: OpenRouterClient

  constructor(client?: OpenRouterClient) {
    this.client = client || createOpenRouterClient()
  }

  /**
   * Generate vibes for a single property
   */
  async generateVibes(property: Property): Promise<VibesGenerationResult> {
    const startTime = Date.now()

    // Select strategic images
    const images = selectStrategicImages(
      property.images,
      property.property_type,
      property.lot_size_sqft
    )

    if (images.selectedImages.length === 0) {
      throw new Error(`No images available for property ${property.id}`)
    }

    // Build property context (including description for richer analysis)
    const context: PropertyContext = {
      address: property.address,
      city: property.city,
      state: property.state,
      price: property.price,
      bedrooms: property.bedrooms,
      bathrooms: property.bathrooms,
      squareFeet: property.square_feet,
      propertyType: property.property_type,
      yearBuilt: property.year_built,
      lotSizeSqft: property.lot_size_sqft,
      amenities: property.amenities,
      description: property.description,
    }

    // Build prompts
    const { systemPrompt, userPrompt, imageUrls } = buildVibesMessages(
      context,
      images.selectedImages.map((img) => img.url)
    )

    // Create vision message with images
    const userMessage = this.client.createVisionMessage(
      userPrompt,
      imageUrls,
      'low' // Use low detail to reduce token costs
    )

    // Call LLM
    const { response, usage } = await this.client.chatCompletion(
      [{ role: 'system', content: systemPrompt }, userMessage],
      {
        temperature: 0.7,
        maxTokens: 2000,
        responseFormat: { type: 'json_object' },
      }
    )

    // Parse and validate response
    const rawContent = response.choices[0]?.message?.content
    if (!rawContent) {
      throw new Error('Empty response from LLM')
    }

    let parsedVibes: LLMVibesOutput
    try {
      const parsed = JSON.parse(rawContent)
      parsedVibes = llmVibesOutputSchema.parse(parsed)
    } catch (parseError) {
      console.error('[VibesService] Failed to parse LLM response:', rawContent)
      throw new Error(
        `Failed to parse LLM response: ${parseError instanceof Error ? parseError.message : String(parseError)}`
      )
    }

    const processingTimeMs = Date.now() - startTime

    return {
      propertyId: property.id,
      vibes: parsedVibes,
      images,
      usage,
      processingTimeMs,
    }
  }

  /**
   * Generate vibes for multiple properties with rate limiting
   */
  async generateVibesBatch(
    properties: Property[],
    options?: {
      delayMs?: number
      onProgress?: (completed: number, total: number) => void
    }
  ): Promise<BatchGenerationResult> {
    const delayMs = options?.delayMs ?? 1000
    const startTime = Date.now()

    const results: BatchGenerationResult = {
      success: [],
      failed: [],
      totalCostUsd: 0,
      totalTimeMs: 0,
    }

    for (let i = 0; i < properties.length; i++) {
      const property = properties[i]

      try {
        const result = await this.generateVibes(property)
        results.success.push(result)
        results.totalCostUsd += result.usage.estimatedCostUsd
      } catch (error) {
        results.failed.push({
          propertyId: property.id,
          error: error instanceof Error ? error.message : String(error),
          code: error instanceof Error ? error.name : undefined,
        })
      }

      // Progress callback
      options?.onProgress?.(i + 1, properties.length)

      // Rate limiting delay (skip for last item)
      if (i < properties.length - 1) {
        await this.delay(delayMs)
      }
    }

    results.totalTimeMs = Date.now() - startTime

    if (process.env.NODE_ENV === 'development') {
      console.log(
        `[VibesService] Batch complete: ${results.success.length} success, ${results.failed.length} failed, $${results.totalCostUsd.toFixed(4)} total cost, ${results.totalTimeMs}ms`
      )
    }

    return results
  }

  /**
   * Generate a source data hash for cache invalidation
   */
  static generateSourceHash(property: Property): string {
    const hashInput = JSON.stringify({
      address: property.address,
      city: property.city,
      property_type: property.property_type,
      bedrooms: property.bedrooms,
      bathrooms: property.bathrooms,
      square_feet: property.square_feet,
      price: property.price,
      year_built: property.year_built,
      images: property.images?.slice(0, 5),
    })
    return crypto.createHash('md5').update(hashInput).digest('hex')
  }

  /**
   * Convert generation result to database insert format
   */
  static toInsertRecord(
    result: VibesGenerationResult,
    property: Property,
    rawOutput: string
  ): PropertyVibesInsert {
    const vibes = result.vibes

    return {
      property_id: result.propertyId,
      tagline: vibes.tagline,
      vibe_statement: vibes.vibeStatement,
      feature_highlights: vibes.notableFeatures,
      lifestyle_fits: vibes.lifestyleFits,
      suggested_tags: vibes.suggestedTags,
      emotional_hooks: vibes.emotionalHooks,
      primary_vibes: vibes.primaryVibes,
      aesthetics: vibes.aesthetics,
      input_data: {
        property: {
          address: property.address,
          city: property.city,
          state: property.state,
          price: property.price,
          bedrooms: property.bedrooms,
          bathrooms: property.bathrooms,
          square_feet: property.square_feet,
          property_type: property.property_type,
          year_built: property.year_built,
          lot_size_sqft: property.lot_size_sqft,
          amenities: property.amenities,
        },
        images: result.images.selectedImages.map((img) => ({
          url: img.url,
          category: img.category,
        })),
        modelId: DEFAULT_VIBES_MODEL,
      },
      raw_output: rawOutput,
      model_used: DEFAULT_VIBES_MODEL,
      images_analyzed: result.images.selectedImages.map((img) => img.url),
      source_data_hash: VibesService.generateSourceHash(property),
      generation_cost_usd: result.usage.estimatedCostUsd,
      confidence: 0.85, // Could be computed from model response
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}

/**
 * Create a VibesService instance
 */
export function createVibesService(
  apiKey?: string,
  model?: string
): VibesService {
  const client = createOpenRouterClient(apiKey, model)
  return new VibesService(client)
}
