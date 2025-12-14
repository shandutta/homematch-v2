import crypto from 'node:crypto'
import {
  neighborhoodVibesOutputSchema,
  type NeighborhoodVibesInsert,
  type NeighborhoodVibesOutput,
} from '@/lib/schemas/neighborhood-vibes'
import {
  DEFAULT_VIBES_MODEL,
  OpenRouterClient,
  createOpenRouterClient,
  type UsageInfo,
} from '@/lib/services/vibes/openrouter-client'
import {
  buildNeighborhoodVibePrompt,
  type NeighborhoodContext,
} from './prompts'

export interface NeighborhoodVibesResult {
  neighborhoodId: string
  vibes: NeighborhoodVibesOutput
  usage: UsageInfo
  processingTimeMs: number
}

export interface NeighborhoodVibesError {
  neighborhoodId: string
  error: string
  code?: string
}

export interface NeighborhoodBatchResult {
  success: NeighborhoodVibesResult[]
  failed: NeighborhoodVibesError[]
  totalCostUsd: number
  totalTimeMs: number
}

export class NeighborhoodVibesService {
  private client: OpenRouterClient

  constructor(client?: OpenRouterClient) {
    this.client = client || createOpenRouterClient()
  }

  async generateVibes(
    context: NeighborhoodContext
  ): Promise<NeighborhoodVibesResult> {
    const start = Date.now()
    const { systemPrompt, userPrompt } = buildNeighborhoodVibePrompt(context)

    const { response, usage } = await this.client.chatCompletion(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      {
        temperature: 0.6,
        maxTokens: 1200,
        responseFormat: { type: 'json_object' },
      }
    )

    const content = response.choices[0]?.message?.content
    if (!content) {
      throw new Error('Empty response from LLM')
    }

    let parsed: NeighborhoodVibesOutput
    try {
      const json = JSON.parse(content)
      parsed = neighborhoodVibesOutputSchema.parse(json)
    } catch (error) {
      console.error(
        '[NeighborhoodVibesService] Failed to parse LLM response:',
        content
      )
      throw new Error(
        `Failed to parse LLM response: ${error instanceof Error ? error.message : String(error)}`
      )
    }

    return {
      neighborhoodId: context.neighborhoodId,
      vibes: parsed,
      usage,
      processingTimeMs: Date.now() - start,
    }
  }

  async generateBatch(
    contexts: NeighborhoodContext[],
    options?: {
      delayMs?: number
      onProgress?: (completed: number, total: number) => void
    }
  ): Promise<NeighborhoodBatchResult> {
    const delayMs = options?.delayMs ?? 750
    const start = Date.now()

    const results: NeighborhoodBatchResult = {
      success: [],
      failed: [],
      totalCostUsd: 0,
      totalTimeMs: 0,
    }

    for (let i = 0; i < contexts.length; i++) {
      const context = contexts[i]
      try {
        const result = await this.generateVibes(context)
        results.success.push(result)
        results.totalCostUsd += result.usage.estimatedCostUsd
      } catch (error) {
        results.failed.push({
          neighborhoodId: context.neighborhoodId,
          error: error instanceof Error ? error.message : String(error),
          code: error instanceof Error ? error.name : undefined,
        })
      }

      options?.onProgress?.(i + 1, contexts.length)
      if (i < contexts.length - 1) {
        await this.delay(delayMs)
      }
    }

    results.totalTimeMs = Date.now() - start
    return results
  }

  static generateSourceHash(context: NeighborhoodContext): string {
    const payload = JSON.stringify({
      name: context.name,
      city: context.city,
      state: context.state,
      metroArea: context.metroArea,
      medianPrice: context.medianPrice,
      walkScore: context.walkScore,
      transitScore: context.transitScore,
      sampleProperties: context.sampleProperties.slice(0, 10),
    })
    return crypto.createHash('md5').update(payload).digest('hex')
  }

  static toInsertRecord(
    result: NeighborhoodVibesResult,
    context: NeighborhoodContext,
    rawOutput: string
  ): NeighborhoodVibesInsert {
    const vibes = result.vibes

    return {
      neighborhood_id: result.neighborhoodId,
      tagline: vibes.tagline,
      vibe_statement: vibes.vibeStatement,
      neighborhood_themes: vibes.neighborhoodThemes,
      local_highlights: vibes.localHighlights,
      resident_fits: vibes.residentFits,
      suggested_tags: vibes.suggestedTags,
      input_data: {
        neighborhood: {
          name: context.name,
          city: context.city,
          state: context.state,
          metroArea: context.metroArea,
          medianPrice: context.medianPrice,
          walkScore: context.walkScore,
          transitScore: context.transitScore,
        },
        sampleProperties: context.sampleProperties,
        modelId: DEFAULT_VIBES_MODEL,
      },
      raw_output: rawOutput,
      model_used: DEFAULT_VIBES_MODEL,
      source_data_hash: NeighborhoodVibesService.generateSourceHash(context),
      generation_cost_usd: result.usage.estimatedCostUsd,
      confidence: 0.82,
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}

export function createNeighborhoodVibesService(
  apiKey?: string,
  model?: string
): NeighborhoodVibesService {
  const client = createOpenRouterClient(apiKey, model)
  return new NeighborhoodVibesService(client)
}
