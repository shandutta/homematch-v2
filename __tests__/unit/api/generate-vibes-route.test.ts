/** @jest-environment node */

import { describe, test, expect, jest, beforeEach } from '@jest/globals'
import { POST } from '@/app/api/admin/generate-vibes/route'
import { createStandaloneClient } from '@/lib/supabase/standalone'
import { createVibesService, VibesService } from '@/lib/services/vibes'
import type { Property } from '@/lib/schemas/property'

jest.mock('@/lib/supabase/standalone')
jest.mock('@/lib/services/vibes', () => {
  const actual = jest.requireActual('@/lib/services/vibes')
  return {
    ...actual,
    createVibesService: jest.fn(),
  }
})

const mockCreateClient = jest.mocked(createStandaloneClient)
const mockCreateVibesService = jest.mocked(createVibesService)

const mockProperty: Property = {
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
  images: ['https://example.com/0.jpg'],
  description: null,
  coordinates: null,
  neighborhood_id: null,
  amenities: [],
  year_built: 2000,
  lot_size_sqft: 5000,
  parking_spots: 2,
  listing_status: 'active',
  property_hash: null,
  is_active: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
}

const makeReq = (
  url: string,
  body?: unknown,
  headers?: Record<string, string>
) =>
  new Request(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(headers || {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })

describe('POST /api/admin/generate-vibes', () => {
  beforeEach(() => {
    jest.resetAllMocks()
    process.env.VIBES_CRON_SECRET = 'secret'
    process.env.OPENROUTER_API_KEY = 'test-key'
  })

  test('rejects missing or invalid secret', async () => {
    const res = await POST(makeReq('http://localhost/api/admin/generate-vibes'))
    expect(res.status).toBe(401)
  })

  test('skips generation when source hash unchanged', async () => {
    const existingHash = VibesService.generateSourceHash(mockProperty)

    const propertiesOverrideMock = jest.fn().mockResolvedValue({
      data: [mockProperty],
      error: null,
    })
    const propertiesInMock = jest.fn(() => ({
      overrideTypes: propertiesOverrideMock,
    }))
    const propertiesSelectMock = jest.fn(() => ({ in: propertiesInMock }))

    const vibesInMock = jest.fn().mockResolvedValue({
      data: [{ property_id: mockProperty.id, source_data_hash: existingHash }],
      error: null,
    })
    const vibesSelectMock = jest.fn(() => ({ in: vibesInMock }))
    const vibesUpsertSelectMock = jest.fn().mockResolvedValue({
      data: [],
      error: null,
    })
    const vibesUpsertMock = jest.fn(() => ({ select: vibesUpsertSelectMock }))

    const fromMock = jest.fn((table: string) => {
      if (table === 'properties') {
        return { select: propertiesSelectMock }
      }
      if (table === 'property_vibes') {
        return { select: vibesSelectMock, upsert: vibesUpsertMock }
      }
      return { select: jest.fn() }
    })

    mockCreateClient.mockReturnValue({ from: fromMock })

    const res = await POST(
      makeReq('http://localhost/api/admin/generate-vibes?cron_secret=secret', {
        propertyIds: [mockProperty.id],
      })
    )

    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.summary.skipped).toBe(1)
    expect(mockCreateVibesService).not.toHaveBeenCalled()
  })

  test('forces regeneration when force=true', async () => {
    const existingHash = VibesService.generateSourceHash(mockProperty)

    const propertiesOverrideMock = jest.fn().mockResolvedValue({
      data: [mockProperty],
      error: null,
    })
    const propertiesInMock = jest.fn(() => ({
      overrideTypes: propertiesOverrideMock,
    }))
    const propertiesSelectMock = jest.fn(() => ({ in: propertiesInMock }))

    const vibesInMock = jest.fn().mockResolvedValue({
      data: [{ property_id: mockProperty.id, source_data_hash: existingHash }],
      error: null,
    })
    const vibesSelectMock = jest.fn(() => ({ in: vibesInMock }))
    const vibesUpsertSelectMock = jest.fn().mockResolvedValue({
      data: [{ id: 'v1' }],
      error: null,
    })
    const vibesUpsertMock = jest.fn(() => ({ select: vibesUpsertSelectMock }))

    const fromMock = jest.fn((table: string) => {
      if (table === 'properties') {
        return { select: propertiesSelectMock }
      }
      if (table === 'property_vibes') {
        return { select: vibesSelectMock, upsert: vibesUpsertMock }
      }
      return { select: jest.fn() }
    })

    mockCreateClient.mockReturnValue({ from: fromMock })

    mockCreateVibesService.mockReturnValue({
      generateVibesBatch: jest.fn().mockResolvedValue({
        success: [
          {
            propertyId: mockProperty.id,
            vibes: {
              tagline: 't',
              vibeStatement: 'v',
              primaryVibes: [
                { name: 'x', intensity: 0.9, source: 'both' },
                { name: 'y', intensity: 0.7, source: 'interior' },
              ],
              lifestyleFits: [
                { category: 'Remote Work Ready', score: 0.9, reason: 'r' },
                { category: 'Growing Family', score: 0.6, reason: 'r2' },
              ],
              notableFeatures: [
                { feature: 'f', location: 'k', appealFactor: 'a' },
                { feature: 'f2', location: 'b', appealFactor: 'a2' },
              ],
              aesthetics: {
                lightingQuality: 'natural_abundant',
                colorPalette: ['white'],
                architecturalStyle: 'modern',
                overallCondition: 'well_maintained',
              },
              emotionalHooks: ['h'],
              suggestedTags: ['Remote Work Ready'],
            },
            images: {
              selectedImages: [
                { url: mockProperty.images![0], category: 'hero', index: 0 },
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
            processingTimeMs: 10,
            rawOutput: JSON.stringify({ ok: true }),
            repairApplied: false,
          },
        ],
        failed: [],
        totalCostUsd: 0.001,
        totalTimeMs: 10,
      }),
    })

    const res = await POST(
      makeReq(
        'http://localhost/api/admin/generate-vibes?cron_secret=secret&force=true',
        { propertyIds: [mockProperty.id], force: true },
        { 'x-cron-secret': 'secret' }
      )
    )

    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.summary.skipped).toBe(0)
    expect(body.summary.success).toBe(1)
    expect(mockCreateVibesService).toHaveBeenCalled()
  })
})
