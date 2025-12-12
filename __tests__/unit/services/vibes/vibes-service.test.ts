/** @jest-environment node */

import { describe, test, expect, jest } from '@jest/globals'
import { VibesService } from '@/lib/services/vibes/vibes-service'
import type { Property } from '@/lib/schemas/property'

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

const validVibesOutput = {
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
  suggestedTags: ['Ranch Style', "Chef's Kitchen", 'Remote Work Ready'],
}

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
    const mockClient = {
      createVisionMessage: jest.fn((_prompt, _urls) => ({
        role: 'user',
        content: [{ type: 'text', text: 'x' }],
      })),
      chatCompletion: jest.fn().mockResolvedValue({
        response: {
          id: 'r1',
          model: 'test',
          choices: [
            {
              index: 0,
              message: {
                role: 'assistant',
                content: JSON.stringify(validVibesOutput),
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
      }),
    } as any

    const service = new VibesService(mockClient)
    const result = await service.generateVibes(mockProperty())

    expect(result.vibes.tagline).toBe(validVibesOutput.tagline)
    expect(result.images.selectedImages.length).toBeGreaterThan(0)
    expect(mockClient.chatCompletion).toHaveBeenCalled()
  })

  test('generateVibes throws on invalid JSON', async () => {
    const mockClient = {
      createVisionMessage: jest.fn((_prompt, _urls) => ({
        role: 'user',
        content: [{ type: 'text', text: 'x' }],
      })),
      chatCompletion: jest.fn().mockResolvedValue({
        response: {
          id: 'r1',
          model: 'test',
          choices: [
            {
              index: 0,
              message: { role: 'assistant', content: '{not-json' },
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
      }),
    } as any

    const service = new VibesService(mockClient)
    await expect(service.generateVibes(mockProperty())).rejects.toThrow(
      /Failed to parse LLM response/
    )
  })
})
