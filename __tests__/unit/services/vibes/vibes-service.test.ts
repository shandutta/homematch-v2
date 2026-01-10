/** @jest-environment node */

import { describe, test, expect, jest } from '@jest/globals'
import {
  VibesService,
  type VibesGenerationResult,
} from '@/lib/services/vibes/vibes-service'
import type { Property } from '@/lib/schemas/property'
import type { LLMVibesOutput } from '@/lib/schemas/property-vibes'
import type {
  CompletionResponse,
  UsageInfo,
} from '@/lib/services/vibes/openrouter-client'

const mockProperty = (overrides?: Partial<Property>): Property => ({
  id: 'prop-1',
  zpid: null,
  address: '1 Test St',
  city: 'Testville',
  state: 'TS',
  zip_code: '12345',
  price: 500000,
  bedrooms: 3,
  bathrooms: 2,
  square_feet: 1500,
  property_type: 'single_family',
  images: [
    'https://example.com/0.jpg',
    'https://example.com/1.jpg',
    'https://example.com/2.jpg',
  ],
  description: 'Nice home',
  coordinates: null,
  neighborhood_id: null,
  amenities: ['kitchen island'],
  year_built: 2000,
  lot_size_sqft: 5000,
  parking_spots: 2,
  listing_status: 'active',
  property_hash: null,
  is_active: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
})

const validVibesOutput: LLMVibesOutput = {
  tagline: 'Industrial Bones, Warm Soul',
  vibeStatement: 'A bright, practical layout with room to breathe.',
  primaryVibes: [
    { name: 'Gallery-Ready Walls', intensity: 0.9, source: 'interior' },
    { name: 'Porch Life Central', intensity: 0.7, source: 'exterior' },
  ],
  lifestyleFits: [
    {
      category: 'Remote Work Ready',
      score: 0.8,
      reason: 'Third bedroom fits a desk and door closes.',
    },
    {
      category: 'Growing Family',
      score: 0.6,
      reason: 'Open living space plus yard.',
    },
  ],
  notableFeatures: [
    {
      feature: 'Large kitchen island',
      location: 'kitchen',
      appealFactor: 'Easy prep and hangout zone.',
    },
    {
      feature: 'Covered front porch',
      location: 'front',
      appealFactor: 'Extra outdoor living.',
    },
  ],
  aesthetics: {
    lightingQuality: 'natural_abundant',
    colorPalette: ['warm gray', 'honey oak'],
    architecturalStyle: 'Updated ranch',
    overallCondition: 'well_maintained',
  },
  emotionalHooks: ['Mudroom makes daily life easier.'],
  suggestedTags: [
    'Ranch Style',
    "Chef's Kitchen",
    'Remote Work Ready',
    'Natural Light Filled',
  ],
}

type VibesClient = NonNullable<ConstructorParameters<typeof VibesService>[0]>
type CreateVisionMessage = VibesClient['createVisionMessage']
type ChatCompletion = VibesClient['chatCompletion']

const createVisionMessageMock = (): jest.MockedFunction<CreateVisionMessage> =>
  jest.fn<CreateVisionMessage>((prompt) => ({
    role: 'user',
    content: [{ type: 'text', text: prompt }],
  }))

const buildCompletionPayload = (
  content: string
): { response: CompletionResponse; usage: UsageInfo } => ({
  response: {
    id: 'r1',
    model: 'test',
    choices: [
      {
        index: 0,
        message: {
          role: 'assistant',
          content,
        },
        finish_reason: 'stop',
      },
    ],
    usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
  },
  usage: {
    promptTokens: 1,
    completionTokens: 1,
    totalTokens: 2,
    estimatedCostUsd: 0.001,
  },
})

const createChatCompletionMock = (payload: {
  response: CompletionResponse
  usage: UsageInfo
}): jest.MockedFunction<ChatCompletion> =>
  jest.fn<ChatCompletion>().mockResolvedValue(payload)

const createMockClient = (content: string): VibesClient => ({
  createVisionMessage: createVisionMessageMock(),
  chatCompletion: createChatCompletionMock(buildCompletionPayload(content)),
})

describe('VibesService', () => {
  test('generateSourceHash is stable and changes on input differences', () => {
    const base = mockProperty()
    const h1 = VibesService.generateSourceHash(base)
    const h2 = VibesService.generateSourceHash(base)
    expect(h1).toBe(h2)

    const changed = mockProperty({ price: 510000 })
    const h3 = VibesService.generateSourceHash(changed)
    expect(h3).not.toBe(h1)
  })

  test('generateVibes parses and validates LLM output', async () => {
    const mockClient = createMockClient(JSON.stringify(validVibesOutput))

    const service = new VibesService(mockClient)
    const result = await service.generateVibes(mockProperty())

    expect(result.vibes.tagline).toBe(validVibesOutput.tagline)
    expect(result.images.selectedImages.length).toBeGreaterThan(0)
    expect(mockClient.chatCompletion).toHaveBeenCalled()
  })

  test('generateVibes repairs minor schema violations', async () => {
    const needsRepair = {
      ...validVibesOutput,
      primaryVibes: [
        ...validVibesOutput.primaryVibes,
        {
          name: 'X'.repeat(120),
          intensity: '1.5',
          source: 'maybe',
        },
        {
          name: 'Another',
          intensity: '-0.25',
          source: 'interior',
        },
      ],
      aesthetics: {
        ...validVibesOutput.aesthetics,
        lightingQuality: 'weird',
        architecturalStyle:
          'Modernized Victorian with clean lines and updated finishes that keeps going',
      },
      suggestedTags: Array.from({ length: 12 }, (_, i) => `tag-${i}`),
    }

    const mockClient = createMockClient(JSON.stringify(needsRepair))

    const service = new VibesService(mockClient)
    const result = await service.generateVibes(mockProperty())

    expect(result.repairApplied).toBe(true)
    expect(result.vibes.primaryVibes).toHaveLength(4)
    expect(result.vibes.primaryVibes[2].intensity).toBe(1)
    expect(result.vibes.primaryVibes[2].source).toBe('both')
    expect(
      result.vibes.aesthetics.architecturalStyle.length
    ).toBeLessThanOrEqual(80)
    expect(result.vibes.aesthetics.lightingQuality).toBe('mixed')
    expect(result.vibes.suggestedTags.length).toBeGreaterThanOrEqual(4)
    expect(result.vibes.suggestedTags.length).toBeLessThanOrEqual(8)
    expect(result.vibes.suggestedTags).toEqual(
      expect.arrayContaining([
        'Remote Work Ready',
        'Growing Family',
        "Chef's Kitchen",
        'Porch Life Central',
      ])
    )
  })

  test('generateVibes normalizes suggestedTags to canonical tags', async () => {
    const needsRepair = {
      ...validVibesOutput,
      suggestedTags: [
        'Commute Friendly',
        'Outdoor Living',
        'Rooftop Living',
        'City Skyline Perch',
        'Modern Minimalist',
        "Chef's Kitchen",
      ],
    }

    const mockClient = createMockClient(JSON.stringify(needsRepair))

    const service = new VibesService(mockClient)
    const result = await service.generateVibes(mockProperty())

    expect(result.repairApplied).toBe(true)
    expect(result.vibes.suggestedTags).toEqual(
      expect.arrayContaining([
        'Commuter Friendly',
        'Indoor-Outdoor Flow',
        'Urban Rooftop',
        'City Skyline',
        'Minimalist Living',
        "Chef's Kitchen",
      ])
    )
  })

  test('toInsertRecord stores suggested tags as-is', () => {
    const property = mockProperty()
    const result: VibesGenerationResult = {
      propertyId: property.id,
      vibes: validVibesOutput,
      images: {
        selectedImages: [
          { url: 'https://example.com/0.jpg', category: 'exterior', index: 0 },
        ],
        strategy: 'single',
        totalAvailable: 1,
      },
      usage: {
        promptTokens: 1,
        completionTokens: 1,
        totalTokens: 2,
        estimatedCostUsd: 0.001,
      },
      processingTimeMs: 1,
      rawOutput: JSON.stringify(validVibesOutput),
      repairApplied: false,
    }

    const insert = VibesService.toInsertRecord(
      result,
      property,
      result.rawOutput
    )
    expect(insert.suggested_tags).toEqual(validVibesOutput.suggestedTags)
  })

  test('generateVibes throws on invalid JSON', async () => {
    const mockClient = createMockClient('{not-json')

    const service = new VibesService(mockClient)
    await expect(service.generateVibes(mockProperty())).rejects.toThrow(
      /Failed to parse LLM response/
    )
  })

  test('generateVibesBatch runs beforeEach and uses prepared property', async () => {
    const mockClient: VibesClient = {
      createVisionMessage: createVisionMessageMock(),
      chatCompletion: createChatCompletionMock(
        buildCompletionPayload(JSON.stringify(validVibesOutput))
      ),
    }

    const service = new VibesService(mockClient)

    const generateSpy = jest.spyOn(service, 'generateVibes').mockImplementation(
      async (property: Property): Promise<VibesGenerationResult> => ({
        propertyId: property.id,
        vibes: validVibesOutput,
        images: { selectedImages: [], strategy: 'single', totalAvailable: 0 },
        usage: {
          promptTokens: 0,
          completionTokens: 0,
          totalTokens: 0,
          estimatedCostUsd: 0,
        },
        processingTimeMs: 1,
        rawOutput: JSON.stringify(validVibesOutput),
        repairApplied: false,
      })
    )

    const beforeEachHook = jest.fn(
      async (property: Property, _index: number, _total: number) => ({
        ...property,
        images: ['https://example.com/prepared.jpg'],
      })
    )

    const result = await service.generateVibesBatch(
      [mockProperty({ id: 'prop-a' }), mockProperty({ id: 'prop-b' })],
      { delayMs: 0, beforeEach: beforeEachHook }
    )

    expect(beforeEachHook).toHaveBeenCalledTimes(2)
    expect(generateSpy).toHaveBeenCalledTimes(2)
    expect(generateSpy).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        id: 'prop-a',
        images: ['https://example.com/prepared.jpg'],
      })
    )
    expect(result.success).toHaveLength(2)
    expect(result.failed).toHaveLength(0)
  })

  test('generateVibesBatch records failure when beforeEach throws', async () => {
    const mockClient: VibesClient = {
      createVisionMessage: createVisionMessageMock(),
      chatCompletion: createChatCompletionMock(
        buildCompletionPayload(JSON.stringify(validVibesOutput))
      ),
    }

    const service = new VibesService(mockClient)
    const generateSpy = jest.spyOn(service, 'generateVibes')

    const beforeEachHook = jest.fn(async () => {
      throw new Error('boom')
    })

    const result = await service.generateVibesBatch([mockProperty()], {
      delayMs: 0,
      beforeEach: beforeEachHook,
    })

    expect(generateSpy).not.toHaveBeenCalled()
    expect(result.success).toHaveLength(0)
    expect(result.failed).toHaveLength(1)
    expect(result.failed[0].error).toContain('boom')
  })
})
