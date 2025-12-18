import { randomUUID } from 'crypto'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { describe, it, expect, beforeAll, afterEach } from 'vitest'

import { backfillVibes } from '@/lib/services/vibes/backfill'
import { VibesService } from '@/lib/services/vibes'
import type { LLMVibesOutput } from '@/lib/schemas/property-vibes'
import type { Property } from '@/lib/schemas/property'
import type { Database } from '@/types/database'

const requireSupabaseEnv = () => {
  const supabaseUrl =
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceKey) {
    throw new Error('Missing Supabase configuration for integration tests')
  }

  return { supabaseUrl, serviceKey }
}

const silentLogger = {
  log: () => {},
  warn: () => {},
  error: () => {},
}

const baseVibes: LLMVibesOutput = {
  tagline: 'A bright home with calm energy',
  vibeStatement:
    'Light-filled rooms, an easy flow, and plenty of space to host friends.',
  primaryVibes: [
    { name: 'Bright & Airy', intensity: 0.8, source: 'both' },
    { name: 'Cozy & Warm', intensity: 0.6, source: 'interior' },
  ],
  lifestyleFits: [
    {
      category: 'Remote Work Ready',
      score: 0.8,
      reason: 'Extra room easily fits a desk and closes off for calls.',
    },
    {
      category: "Entertainer's Dream",
      score: 0.7,
      reason: 'Open flow makes gatherings feel effortless.',
    },
  ],
  notableFeatures: [
    {
      feature: 'Kitchen island',
      location: 'kitchen',
      appealFactor: 'Easy prep and hangout zone.',
    },
    {
      feature: 'Backyard deck',
      location: 'yard',
      appealFactor: 'Great for morning coffee and dinner outside.',
    },
  ],
  aesthetics: {
    lightingQuality: 'natural_abundant',
    colorPalette: ['warm gray', 'white'],
    architecturalStyle: 'Contemporary',
    overallCondition: 'well_maintained',
  },
  emotionalHooks: ['Morning coffee feels like a ritual here.'],
  suggestedTags: [
    'Remote Work Ready',
    "Chef's Kitchen",
    'Open Concept Flow',
    'Natural Light Filled',
  ],
}

const makePropertyInsert = (
  overrides?: Partial<Database['public']['Tables']['properties']['Insert']>
): Database['public']['Tables']['properties']['Insert'] => ({
  id: randomUUID(),
  zpid: String(Math.floor(Math.random() * 1_000_000_000)),
  address: 'Backfill Test',
  city: 'Test City',
  state: 'TS',
  zip_code: '12345',
  price: 500000,
  bedrooms: 3,
  bathrooms: 2,
  square_feet: 1500,
  property_type: 'single_family',
  images: ['https://example.com/0.jpg'],
  listing_status: 'active',
  is_active: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
})

type GenerateCall = { propertyId: string; imageCount: number }

class MockVibesService {
  calls: GenerateCall[] = []
  failures = new Map<string, { error: string; code?: string }>()

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
  ) {
    const startedAt = Date.now()
    const success = []
    const failed = []

    for (let i = 0; i < properties.length; i++) {
      let property = properties[i]

      const prepared = await options?.beforeEach?.(
        property,
        i,
        properties.length
      )
      if (prepared) property = prepared

      this.calls.push({
        propertyId: property.id,
        imageCount: Array.isArray(property.images) ? property.images.length : 0,
      })

      const forcedFailure = this.failures.get(property.id)
      if (forcedFailure) {
        failed.push({
          propertyId: property.id,
          error: forcedFailure.error,
          code: forcedFailure.code,
        })
        options?.onProgress?.(i + 1, properties.length)
        continue
      }

      const vibes: LLMVibesOutput = {
        ...baseVibes,
        tagline: `${baseVibes.tagline} (${property.id.slice(0, 8)})`,
      }

      success.push({
        propertyId: property.id,
        vibes,
        images: {
          selectedImages: [
            {
              url:
                (Array.isArray(property.images) ? property.images[0] : null) ??
                'https://example.com/0.jpg',
              category: 'exterior',
            },
          ],
          strategy: 'single',
          totalAvailable: Array.isArray(property.images)
            ? property.images.length
            : 0,
        },
        usage: {
          promptTokens: 1,
          completionTokens: 1,
          totalTokens: 2,
          estimatedCostUsd: 0.001,
        },
        processingTimeMs: 1,
        rawOutput: JSON.stringify(vibes),
        repairApplied: false,
      })

      options?.onProgress?.(i + 1, properties.length)
    }

    return {
      success,
      failed,
      totalCostUsd: success.length * 0.001,
      totalTimeMs: Date.now() - startedAt,
    }
  }
}

describe.sequential('Integration: backfill-vibes', () => {
  let supabaseAdmin: ReturnType<typeof createSupabaseClient<Database>>
  let createdPropertyIds: string[] = []

  beforeAll(() => {
    const env = requireSupabaseEnv()
    supabaseAdmin = createSupabaseClient<Database>(
      env.supabaseUrl,
      env.serviceKey
    )
  })

  afterEach(async () => {
    if (createdPropertyIds.length) {
      await supabaseAdmin
        .from('property_vibes')
        .delete()
        .in('property_id', createdPropertyIds)
      await supabaseAdmin
        .from('properties')
        .delete()
        .in('id', createdPropertyIds)
      createdPropertyIds = []
    }
  })

  it('skips properties with matching source hash when force=false', async () => {
    const p1 = makePropertyInsert({ images: ['https://example.com/0.jpg'] })
    const p2 = makePropertyInsert({ images: ['https://example.com/1.jpg'] })
    createdPropertyIds.push(p1.id, p2.id)

    await supabaseAdmin.from('properties').upsert([p1, p2])

    const { data: inserted, error: readError } = await supabaseAdmin
      .from('properties')
      .select('*')
      .in('id', [p1.id, p2.id])

    if (readError) throw readError
    const fullP1 = inserted?.find((row) => row.id === p1.id)
    if (!fullP1) throw new Error('Missing inserted property')

    const matchingHash = VibesService.generateSourceHash(fullP1 as any)

    await supabaseAdmin.from('property_vibes').insert({
      property_id: p1.id,
      tagline: 'OLD TAGLINE',
      vibe_statement: 'Old statement for skip coverage.',
      model_used: 'test',
      source_data_hash: matchingHash,
    })

    const mockService = new MockVibesService()

    const result = await backfillVibes(
      {
        limit: 10,
        batchSize: 10,
        delayMs: 0,
        force: false,
        propertyIds: [p1.id, p2.id],
        refreshImages: false,
        forceImages: false,
        minImages: 10,
        imageDelayMs: 0,
      },
      {
        supabase: supabaseAdmin,
        vibesService: mockService,
        logger: silentLogger,
      }
    )

    expect(result.attempted).toBe(1)
    expect(result.skipped).toBe(1)
    expect(mockService.calls.map((c) => c.propertyId)).toEqual([p2.id])

    const { data: vibesRows, error: vibesError } = await supabaseAdmin
      .from('property_vibes')
      .select('property_id, tagline')
      .in('property_id', [p1.id, p2.id])

    if (vibesError) throw vibesError

    const byId = new Map(
      (vibesRows ?? []).map((r) => [r.property_id, r.tagline])
    )
    expect(byId.get(p1.id)).toBe('OLD TAGLINE')
    expect(byId.get(p2.id)).toContain(p2.id.slice(0, 8))
  })

  it('refreshImages updates properties.images, sets a refresh marker, and skips repeated refreshes for small galleries', async () => {
    const property = makePropertyInsert({
      images: ['https://example.com/seed.jpg'],
    })
    createdPropertyIds.push(property.id)

    await supabaseAdmin.from('properties').upsert([property])

    const fetched = [
      'https://maps.googleapis.com/maps/api/streetview?size=400x400&location=1,1',
      ...Array.from(
        { length: 11 },
        (_, idx) => `https://photos.zillowstatic.com/fp/${idx}.jpg`
      ),
    ]

    const mockService = new MockVibesService()
    let fetchCalls = 0

    const result = await backfillVibes(
      {
        limit: 10,
        batchSize: 10,
        delayMs: 0,
        force: true,
        propertyIds: [property.id],
        refreshImages: true,
        forceImages: false,
        minImages: 10,
        imageDelayMs: 0,
      },
      {
        supabase: supabaseAdmin,
        vibesService: mockService,
        rapidApiKey: 'test',
        rapidApiHost: 'us-housing-market-data1.p.rapidapi.com',
        fetchZillowImageUrls: async () => {
          fetchCalls++
          return fetched
        },
        logger: silentLogger,
      }
    )

    expect(result.success).toBe(1)
    expect(mockService.calls).toHaveLength(1)
    expect(mockService.calls[0].imageCount).toBe(11)
    expect(fetchCalls).toBe(1)

    const { data: refreshed, error: refreshedError } = await supabaseAdmin
      .from('properties')
      .select(
        'images, zillow_images_refreshed_at, zillow_images_refreshed_count, zillow_images_refresh_status'
      )
      .eq('id', property.id)
      .single()

    if (refreshedError) throw refreshedError
    expect(refreshed.images).toHaveLength(11)
    expect(
      refreshed.images?.every((u) => {
        try {
          return new URL(u).hostname === 'photos.zillowstatic.com'
        } catch {
          return false
        }
      })
    ).toBe(true)
    expect(refreshed.zillow_images_refreshed_at).toBeTruthy()
    expect(refreshed.zillow_images_refreshed_count).toBe(11)
    expect(refreshed.zillow_images_refresh_status).toBe('ok')

    // Run again with a higher minImages threshold; marker should prevent repeated RapidAPI refresh.
    await backfillVibes(
      {
        limit: 10,
        batchSize: 10,
        delayMs: 0,
        force: true,
        propertyIds: [property.id],
        refreshImages: true,
        forceImages: false,
        minImages: 50,
        imageDelayMs: 0,
      },
      {
        supabase: supabaseAdmin,
        vibesService: mockService,
        rapidApiKey: 'test',
        rapidApiHost: 'us-housing-market-data1.p.rapidapi.com',
        fetchZillowImageUrls: async () => {
          fetchCalls++
          return fetched
        },
        logger: silentLogger,
      }
    )

    expect(fetchCalls).toBe(1)
  })

  it('refreshImages does not regenerate vibes when images are unchanged and hash matches (force=false)', async () => {
    const property = makePropertyInsert({
      images: Array.from(
        { length: 11 },
        (_, idx) => `https://photos.zillowstatic.com/fp/${idx}.jpg`
      ),
    })
    createdPropertyIds.push(property.id)

    await supabaseAdmin.from('properties').upsert([property])

    const { data: inserted, error: readError } = await supabaseAdmin
      .from('properties')
      .select('*')
      .eq('id', property.id)
      .single()

    if (readError) throw readError

    const matchingHash = VibesService.generateSourceHash(inserted as any)

    await supabaseAdmin.from('property_vibes').insert({
      property_id: property.id,
      tagline: 'OLD TAGLINE',
      vibe_statement: 'Old statement for refreshImages skip coverage.',
      model_used: 'test',
      source_data_hash: matchingHash,
    })

    const mockService = new MockVibesService()
    let fetchCalls = 0

    const result = await backfillVibes(
      {
        limit: 10,
        batchSize: 10,
        delayMs: 0,
        force: false,
        propertyIds: [property.id],
        refreshImages: true,
        forceImages: false,
        minImages: 10,
        imageDelayMs: 0,
      },
      {
        supabase: supabaseAdmin,
        vibesService: mockService,
        rapidApiKey: 'test',
        rapidApiHost: 'us-housing-market-data1.p.rapidapi.com',
        fetchZillowImageUrls: async () => {
          fetchCalls++
          return []
        },
        logger: silentLogger,
      }
    )

    expect(result.attempted).toBe(1)
    expect(result.success).toBe(0)
    expect(result.failed).toBe(0)
    expect(result.skipped).toBe(1)
    expect(mockService.calls).toHaveLength(0)
    expect(fetchCalls).toBe(0)
  })

  it('records failures and does not upsert vibes for failed properties', async () => {
    const property = makePropertyInsert({
      images: ['https://example.com/0.jpg'],
    })
    createdPropertyIds.push(property.id)
    await supabaseAdmin.from('properties').upsert([property])

    const mockService = new MockVibesService()
    mockService.failures.set(property.id, { error: 'boom', code: 'Error' })

    const result = await backfillVibes(
      {
        limit: 10,
        batchSize: 10,
        delayMs: 0,
        force: true,
        propertyIds: [property.id],
        refreshImages: false,
        forceImages: false,
        minImages: 10,
        imageDelayMs: 0,
      },
      {
        supabase: supabaseAdmin,
        vibesService: mockService,
        logger: silentLogger,
      }
    )

    expect(result.attempted).toBe(1)
    expect(result.failed).toBe(1)
    expect(result.failures).toHaveLength(1)
    expect(result.failures[0].propertyId).toBe(property.id)

    const { data: rows, error: vibesError } = await supabaseAdmin
      .from('property_vibes')
      .select('property_id')
      .eq('property_id', property.id)

    if (vibesError) throw vibesError
    expect(rows).toHaveLength(0)
  })
})
