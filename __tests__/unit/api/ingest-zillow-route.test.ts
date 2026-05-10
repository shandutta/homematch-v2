// Phase 0/1 closure: M8-external-timeouts
/** @jest-environment node */

// Phase 0/1 closure: M8-external-timeouts
import { POST } from '@/app/api/admin/ingest/zillow/route'
import {
  ingestZillowLocations,
  discoverLocations,
} from '@/lib/providers/zillow/ingest'
import { createStandaloneClient } from '@/lib/supabase/standalone'

jest.mock('@/lib/providers/zillow/ingest')
jest.mock('@/lib/supabase/standalone')

const mockIngest = jest.mocked(ingestZillowLocations)
const mockDiscover = jest.mocked(discoverLocations)
const mockCreateClient = jest.mocked(createStandaloneClient)

describe('POST /api/admin/ingest/zillow', () => {
  beforeEach(() => {
    jest.resetAllMocks()
    process.env.ZILLOW_CRON_SECRET = 'secret'
    process.env.RAPIDAPI_KEY = 'key'
    process.env.HOMEMATCH_ALLOW_PAID_RAPIDAPI = 'true'
    process.env.RAPIDAPI_HOST = 'us-housing-market-data1.p.rapidapi.com'
  })

  test('rejects missing or invalid secret', async () => {
    const res = await POST(
      new Request('http://localhost/api/admin/ingest/zillow', {
        method: 'POST',
      })
    )
    expect(res.status).toBe(401)
  })

  test('invokes ingestion when authorized', async () => {
    mockCreateClient.mockReturnValue({ from: jest.fn() } as any)
    mockIngest.mockResolvedValue({
      totals: { attempted: 1, transformed: 0, insertedOrUpdated: 0, skipped: 0 },
      locations: [],
      propertyTypes: {},
    })

    const res = await POST(
      new Request('http://localhost/api/admin/ingest/zillow', {
        method: 'POST',
        headers: { 'x-cron-secret': 'secret' },
      })
    )

    expect(res.status).toBe(200)
    expect(mockIngest).toHaveBeenCalled()
    const body = await res.json()
    expect(body.ok).toBe(true)
  })

  test('accepts cron_secret query param', async () => {
    mockCreateClient.mockReturnValue({ from: jest.fn() } as any)
    mockIngest.mockResolvedValue({
      totals: { attempted: 1, transformed: 0, insertedOrUpdated: 0, skipped: 0 },
      locations: [],
      propertyTypes: {},
    })

    const res = await POST(
      new Request(
        'http://localhost/api/admin/ingest/zillow?cron_secret=secret',
        { method: 'POST' }
      )
    )

    expect(res.status).toBe(200)
  })

  test('dryRun mode returns estimates without calling ingestZillowLocations', async () => {
    mockCreateClient.mockReturnValue({ from: jest.fn() } as any)
    mockDiscover.mockResolvedValue([
      {
        location: 'San Francisco, CA',
        items: [
          { zpid: '123', address: '123 Main St, San Francisco, CA 94105', price: 500000, bedrooms: 3, bathrooms: 2 },
        ],
      },
    ])

    const res = await POST(
      new Request(
        'http://localhost/api/admin/ingest/zillow?cron_secret=secret&dryRun=true',
        { method: 'POST' }
      )
    )

    expect(res.status).toBe(200)
    // dryRun=true should NOT call the full ingest pipeline
    expect(mockIngest).not.toHaveBeenCalled()
    const body = await res.json()
    expect(body.dryRun).toBe(true)
    expect(body.locations).toBeGreaterThan(0)
    expect(body.estimatedRequests).toBeGreaterThan(0)
  })

  test('accepts sort, minPrice, maxPrice, maxPages params', async () => {
    mockCreateClient.mockReturnValue({ from: jest.fn() } as any)
    mockIngest.mockResolvedValue({
      totals: { attempted: 5, transformed: 0, insertedOrUpdated: 0, skipped: 0 },
      locations: [],
      propertyTypes: {},
    })

    const res = await POST(
      new Request(
        'http://localhost/api/admin/ingest/zillow?cron_secret=secret&sort=Price_High_Low&minPrice=500000&maxPrice=2000000&maxPages=5',
        { method: 'POST' }
      )
    )

    expect(res.status).toBe(200)
  })
})
