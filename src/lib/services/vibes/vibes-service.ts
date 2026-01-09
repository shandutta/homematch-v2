/**
 * Property Vibes Service
 *
 * Main service for generating property vibes using vision LLMs.
 * Orchestrates image selection, LLM calls, and result storage.
 */

import crypto from 'node:crypto'
import type { Property } from '@/lib/schemas/property'
import {
  ALL_PROPERTY_TAGS,
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

type CanonicalTag = (typeof ALL_PROPERTY_TAGS)[number]

function normalizeTagKey(tag: string): string {
  return tag
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}

const CANONICAL_TAG_BY_KEY = new Map<string, CanonicalTag>(
  ALL_PROPERTY_TAGS.map((tag) => [normalizeTagKey(tag), tag])
)

const TAG_SYNONYMS: Record<string, CanonicalTag> = {
  [normalizeTagKey('Commute Friendly')]: 'Commuter Friendly',
  [normalizeTagKey('Rooftop Living')]: 'Urban Rooftop',
  [normalizeTagKey('Outdoor Living')]: 'Indoor-Outdoor Flow',
  [normalizeTagKey('Modern Minimalist')]: 'Minimalist Living',
  [normalizeTagKey('Modernist Architecture')]: 'Contemporary Lines',
  [normalizeTagKey('Architectural Details')]: 'Built-In Character',
  [normalizeTagKey('City Skyline Perch')]: 'City Skyline',
}

function normalizeToCanonicalTag(tag: string): CanonicalTag | null {
  const key = normalizeTagKey(tag)
  const synonym = TAG_SYNONYMS[key]
  if (synonym) return synonym
  return CANONICAL_TAG_BY_KEY.get(key) ?? null
}

function uniquePush<T>(arr: T[], value: T): void {
  if (!arr.includes(value)) arr.push(value)
}

function inferTagsFromText(text: string): CanonicalTag[] {
  const out: CanonicalTag[] = []
  const t = text.toLowerCase()

  const rules: Array<[RegExp, CanonicalTag]> = [
    [
      /\bchef\b|\bkitchen island\b|\bdouble oven\b|\bgas cooktop\b/,
      "Chef's Kitchen",
    ],
    [/\bopen concept\b|\bopen[- ]plan\b/, 'Open Concept Flow'],
    [/\bhardwood\b/, 'Hardwood Throughout'],
    [/\bfireplace\b/, 'Fireplace Focal Point'],
    [/\bvaulted\s+ceil/i, 'Vaulted Ceilings'],
    [
      /\bnatural light\b|\bbright\b|\bfloor-to-ceiling\b/,
      'Natural Light Filled',
    ],
    [/\bwalk[- ]in\b.*\bcloset\b/, 'Walk-In Closets'],
    [/\bspa\b.*\bbath\b|\bsoaking tub\b/, 'Spa Bathroom'],
    [/\bwine\b|\bcellar\b/, 'Wine Storage'],
    [/\btheater\b|\bhome cinema\b|\bprojector\b/, 'Home Theater Ready'],
    [/\bsmart home\b|\bwired\b/, 'Smart Home Wired'],
    [/\bpool\b/, 'Pool Ready'],
    [/\brooftop\b|\broof deck\b/, 'Urban Rooftop'],
    [/\bporch\b/, 'Porch Life Central'],
    [/\bgarden\b/, 'Garden Paradise'],
    [/\bcourtyard\b/, 'Courtyard Living'],
    [/\bmountain\b.*\bview|\bviews?\b.*\bmountain\b/, 'Mountain Views'],
    [/\bwater\b.*\bview|\bviews?\b.*\bwater\b|\bbay\b.*\bview/, 'Water Views'],
    [/\bskyline\b/, 'City Skyline'],
    [/\bwalkable\b/, 'Walkable Neighborhood'],
    [/\btransit\b|\btrain\b|\bsubway\b|\bbart\b/, 'Transit Accessible'],
    [/\bminimalist\b|\bminimal\b/, 'Minimalist Living'],
    [/\bvictorian\b/, 'Victorian Character'],
    [/\bmid[- ]century\b|\bmidcentury\b|\bmcm\b/, 'Mid-Century Modern'],
    [/\bcraftsman\b/, 'Craftsman Details'],
    [/\bcolonial\b/, 'Colonial Elegance'],
    [/\bfarmhouse\b/, 'Farmhouse Charm'],
    [/\bart deco\b/, 'Art Deco Flair'],
    [/\branch\b/, 'Ranch Style'],
    [/\bmediterranean\b/, 'Mediterranean Influence'],
    [/\bindustrial\b/, 'Industrial Loft'],
    [/\btudor\b/, 'Tudor Elements'],
    [/\bcape cod\b/, 'Cape Cod Classic'],
    [/\bprairie\b/, 'Prairie Style'],
    [/\bbrownstone\b/, 'Brownstone Beauty'],
    [/\bspanish\b/, 'Spanish Revival'],
    [/\bcoastal\b/, 'Coastal Casual'],
    [/\bbohemian\b|\bboho\b/, 'Bohemian Spirit'],
    [/\brustic\b/, 'Rustic Charm'],
    [/\bbold\b|\bdramatic\b/, 'Bold & Dramatic'],
    [/\bneutral\b/, 'Soft & Neutral'],
    [/\bairy\b/, 'Bright & Airy'],
    [/\bcozy\b|\bwarm\b/, 'Cozy & Warm'],
    [/\beclectic\b/, 'Eclectic Mix'],
    [/\btimeless\b|\bclassic\b/, 'Timeless Classic'],
    [/\burban\b/, 'Urban Edge'],
  ]

  for (const [pattern, tag] of rules) {
    if (pattern.test(t)) uniquePush(out, tag)
  }

  return out
}

export interface VibesGenerationResult {
  propertyId: string
  vibes: LLMVibesOutput
  images: ImageSelectionResult
  usage: UsageInfo
  processingTimeMs: number
  rawOutput: string
  repairApplied: boolean
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

  private static normalizeSuggestedTagsFromCandidate(
    candidate: Record<string, unknown>,
    repaired: Record<string, unknown>
  ): CanonicalTag[] {
    const normalized: CanonicalTag[] = []

    const rawTags = candidate.suggestedTags
    if (Array.isArray(rawTags)) {
      for (const t of rawTags) {
        if (typeof t !== 'string') continue
        const canonical = normalizeToCanonicalTag(t)
        if (canonical) uniquePush(normalized, canonical)
      }
    }

    const fits = repaired.lifestyleFits
    if (Array.isArray(fits)) {
      const scored: Array<{ tag: CanonicalTag; score: number }> = []
      for (const f of fits) {
        if (!VibesService.isRecord(f)) continue
        if (typeof f.category !== 'string') continue
        const canonical = normalizeToCanonicalTag(f.category)
        if (!canonical) continue
        const score =
          typeof f.score === 'number' && Number.isFinite(f.score) ? f.score : 0
        scored.push({ tag: canonical, score })
      }

      scored
        .sort((a, b) => b.score - a.score)
        .forEach(({ tag }) => uniquePush(normalized, tag))
    }

    const textParts: string[] = []
    if (typeof repaired.tagline === 'string') textParts.push(repaired.tagline)
    if (typeof repaired.vibeStatement === 'string')
      textParts.push(repaired.vibeStatement)

    const notable = repaired.notableFeatures
    if (Array.isArray(notable)) {
      const notableKeys: Array<'feature' | 'location' | 'appealFactor'> = [
        'feature',
        'location',
        'appealFactor',
      ]
      for (const n of notable) {
        if (!VibesService.isRecord(n)) continue
        for (const key of notableKeys) {
          const value = n[key]
          if (typeof value === 'string') textParts.push(value)
        }
      }
    }

    const aesthetics = repaired.aesthetics
    if (VibesService.isRecord(aesthetics)) {
      const arch = aesthetics.architecturalStyle
      if (typeof arch === 'string') textParts.push(arch)
      const lighting = aesthetics.lightingQuality
      if (lighting === 'natural_abundant' || lighting === 'natural_moderate') {
        uniquePush(normalized, 'Natural Light Filled')
      }
    }

    const inferred = inferTagsFromText(textParts.join('\n'))
    for (const tag of inferred) uniquePush(normalized, tag)

    return normalized.slice(0, 8)
  }

  private static finalizeSuggestedTags(vibes: LLMVibesOutput): LLMVibesOutput {
    const unique: CanonicalTag[] = []
    for (const tag of vibes.suggestedTags) {
      uniquePush(unique, tag)
    }

    if (unique.length >= 4) {
      return { ...vibes, suggestedTags: unique.slice(0, 8) }
    }

    const candidate: Record<string, unknown> = {
      tagline: vibes.tagline,
      vibeStatement: vibes.vibeStatement,
      notableFeatures: vibes.notableFeatures,
      lifestyleFits: vibes.lifestyleFits,
      aesthetics: vibes.aesthetics,
      suggestedTags: unique,
    }

    const filled = VibesService.normalizeSuggestedTagsFromCandidate(
      candidate,
      candidate
    )

    const merged: CanonicalTag[] = [...unique]
    for (const tag of filled) uniquePush(merged, tag)

    return { ...vibes, suggestedTags: merged.slice(0, 8) }
  }

  private static isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value != null && !Array.isArray(value)
  }

  private static clampString(
    value: unknown,
    maxLength: number
  ): string | undefined {
    if (typeof value !== 'string') return
    return value.length <= maxLength ? value : value.slice(0, maxLength)
  }

  private static parseAndClampNumber(
    value: unknown,
    min: number,
    max: number
  ): number | undefined {
    const num =
      typeof value === 'number'
        ? value
        : typeof value === 'string'
          ? Number(value)
          : NaN
    if (!Number.isFinite(num)) return
    return Math.min(max, Math.max(min, num))
  }

  private static clampStringArray(
    value: unknown,
    maxItems: number,
    maxItemLength: number
  ): string[] | undefined {
    if (!Array.isArray(value)) return
    return value
      .filter((v) => typeof v === 'string')
      .map((s) => (s.length <= maxItemLength ? s : s.slice(0, maxItemLength)))
      .slice(0, maxItems)
  }

  private static extractJsonPayload(raw: string): string {
    let text = raw.trim()
    if (text.startsWith('```')) {
      text = text
        .replace(/^```(?:json)?/i, '')
        .replace(/```$/i, '')
        .trim()
    }

    const firstBrace = text.indexOf('{')
    const lastBrace = text.lastIndexOf('}')
    if (firstBrace >= 0 && lastBrace > firstBrace) {
      text = text.slice(firstBrace, lastBrace + 1)
    }

    return text
  }

  private static repairJsonString(text: string): string {
    return text
      .replace(/,\s*([}\]])/g, '$1')
      .replace(/}\s*{/g, '},{')
      .replace(/}\s*"/g, '},"')
      .replace(/"\s*{/g, '",{')
  }

  private static parseJsonWithRepair(raw: string): {
    value: unknown
    repairApplied: boolean
  } {
    const extracted = VibesService.extractJsonPayload(raw)
    try {
      return { value: JSON.parse(extracted), repairApplied: false }
    } catch {
      const repaired = VibesService.repairJsonString(extracted)
      return { value: JSON.parse(repaired), repairApplied: true }
    }
  }

  private static repairVibesCandidate(value: unknown): unknown {
    if (!VibesService.isRecord(value)) return value

    const obj = value
    const repaired: Record<string, unknown> = { ...obj }

    const tagline = VibesService.clampString(obj.tagline, 120)
    if (tagline != null) repaired.tagline = tagline

    const vibeStatement = VibesService.clampString(obj.vibeStatement, 350)
    if (vibeStatement != null) repaired.vibeStatement = vibeStatement

    if (Array.isArray(obj.primaryVibes)) {
      repaired.primaryVibes = obj.primaryVibes.slice(0, 4).map((v) => {
        if (!VibesService.isRecord(v)) return v
        const next: Record<string, unknown> = { ...v }

        const name = VibesService.clampString(v.name, 80)
        if (name != null) next.name = name

        const intensity = VibesService.parseAndClampNumber(v.intensity, 0, 1)
        if (intensity != null) next.intensity = intensity

        const source = v.source
        if (
          source !== 'interior' &&
          source !== 'exterior' &&
          source !== 'both'
        ) {
          next.source = 'both'
        }

        return next
      })
    }

    if (Array.isArray(obj.lifestyleFits)) {
      repaired.lifestyleFits = obj.lifestyleFits.slice(0, 6).map((f) => {
        if (!VibesService.isRecord(f)) return f
        const next: Record<string, unknown> = { ...f }

        const category = VibesService.clampString(f.category, 50)
        if (category != null) next.category = category

        const score = VibesService.parseAndClampNumber(f.score, 0, 1)
        if (score != null) next.score = score

        const reason = VibesService.clampString(f.reason, 200)
        if (reason != null) next.reason = reason

        return next
      })
    }

    if (Array.isArray(obj.notableFeatures)) {
      repaired.notableFeatures = obj.notableFeatures.slice(0, 8).map((f) => {
        if (!VibesService.isRecord(f)) return f
        const next: Record<string, unknown> = { ...f }

        const feature = VibesService.clampString(f.feature, 100)
        if (feature != null) next.feature = feature

        const location = VibesService.clampString(f.location, 50)
        if (location != null) next.location = location

        const appealFactor = VibesService.clampString(f.appealFactor, 200)
        if (appealFactor != null) next.appealFactor = appealFactor

        return next
      })
    }

    if (VibesService.isRecord(obj.aesthetics)) {
      const a = obj.aesthetics
      const next: Record<string, unknown> = { ...a }

      const lightingQuality = a.lightingQuality
      if (
        lightingQuality !== 'natural_abundant' &&
        lightingQuality !== 'natural_moderate' &&
        lightingQuality !== 'artificial_warm' &&
        lightingQuality !== 'artificial_cool' &&
        lightingQuality !== 'mixed'
      ) {
        next.lightingQuality = 'mixed'
      }

      const colorPalette = VibesService.clampStringArray(a.colorPalette, 4, 30)
      if (colorPalette != null) next.colorPalette = colorPalette

      const architecturalStyle = VibesService.clampString(
        a.architecturalStyle,
        80
      )
      if (architecturalStyle != null)
        next.architecturalStyle = architecturalStyle

      const overallCondition = a.overallCondition
      if (
        overallCondition !== 'pristine' &&
        overallCondition !== 'well_maintained' &&
        overallCondition !== 'dated_but_clean' &&
        overallCondition !== 'needs_work'
      ) {
        next.overallCondition = 'well_maintained'
      }

      repaired.aesthetics = next
    }

    const emotionalHooks = VibesService.clampStringArray(
      obj.emotionalHooks,
      4,
      200
    )
    if (emotionalHooks != null) repaired.emotionalHooks = emotionalHooks

    const normalizedTags = VibesService.normalizeSuggestedTagsFromCandidate(
      obj,
      repaired
    )
    if (normalizedTags.length > 0) {
      repaired.suggestedTags = normalizedTags
    }

    return repaired
  }

  /**
   * Generate vibes for a single property
   */
  async generateVibes(property: Property): Promise<VibesGenerationResult> {
    const startTime = Date.now()

    // Select strategic images
    const selectionSeed = Number.parseInt(
      crypto.createHash('md5').update(property.id).digest('hex').slice(0, 8),
      16
    )
    const images = selectStrategicImages(
      property.images,
      property.property_type,
      property.lot_size_sqft,
      18,
      selectionSeed
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

    const attemptConfigs = [
      { temperature: 0.7, maxTokens: 2000 },
      { temperature: 0.2, maxTokens: 2000 },
    ]

    let parsedVibes: LLMVibesOutput | null = null
    let rawOutput = ''
    let repairApplied = false
    let lastError: unknown = null
    let lastPreview: string | null = null
    const usageTotals: UsageInfo = {
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
      estimatedCostUsd: 0,
    }

    for (let attempt = 0; attempt < attemptConfigs.length; attempt++) {
      const { response, usage } = await this.client.chatCompletion(
        [{ role: 'system', content: systemPrompt }, userMessage],
        {
          ...attemptConfigs[attempt],
          responseFormat: { type: 'json_object' },
        }
      )

      usageTotals.promptTokens += usage.promptTokens
      usageTotals.completionTokens += usage.completionTokens
      usageTotals.totalTokens += usage.totalTokens
      usageTotals.estimatedCostUsd += usage.estimatedCostUsd

      const rawContent = response.choices?.[0]?.message?.content
      if (!rawContent) {
        lastError = new Error('Empty response from LLM')
        repairApplied = true
        continue
      }

      rawOutput = rawContent

      try {
        const parsedResult = VibesService.parseJsonWithRepair(rawContent)
        const parsed = parsedResult.value
        const jsonRepairApplied = parsedResult.repairApplied

        const firstPass = llmVibesOutputSchema.safeParse(parsed)
        if (firstPass.success) {
          parsedVibes = firstPass.data
        } else {
          const repaired = VibesService.repairVibesCandidate(parsed)
          const repairedPass = llmVibesOutputSchema.safeParse(repaired)
          if (!repairedPass.success) {
            throw repairedPass.error
          }
          parsedVibes = repairedPass.data
          repairApplied = true
        }

        repairApplied = repairApplied || jsonRepairApplied || attempt > 0
        break
      } catch (parseError) {
        lastError = parseError
        lastPreview =
          rawContent.length > 2000
            ? `${rawContent.slice(0, 2000)}…`
            : rawContent
        repairApplied = true
      }
    }

    if (!parsedVibes) {
      if (lastPreview) {
        console.error(
          '[VibesService] Failed to parse/validate LLM response:',
          `property=${property.id}`,
          lastPreview
        )
      }
      throw new Error(
        `Failed to parse LLM response: ${lastError instanceof Error ? lastError.message : String(lastError)}`
      )
    }

    const processingTimeMs = Date.now() - startTime
    const vibes = VibesService.finalizeSuggestedTags(parsedVibes)

    return {
      propertyId: property.id,
      vibes,
      images,
      usage: usageTotals,
      processingTimeMs,
      rawOutput,
      repairApplied,
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
      beforeEach?: (
        property: Property,
        index: number,
        total: number
      ) => Promise<Property | void> | Property | void
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
      let property = properties[i]

      try {
        const prepared = await options?.beforeEach?.(
          property,
          i,
          properties.length
        )
        if (prepared) property = prepared

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
