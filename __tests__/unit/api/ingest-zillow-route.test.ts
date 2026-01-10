/** @jest-environment node */

import { POST } from '@/app/api/admin/ingest/zillow/route'
import { ingestZillowLocations } from '@/lib/ingestion/zillow'
import { createStandaloneClient } from '@/lib/supabase/standalone'

jest.mock('@/lib/ingestion/zillow')
jest.mock('@/lib/supabase/standalone')

const mockIngest = jest.mocked(ingestZillowLocations)
const mockCreateClient = jest.mocked(createStandaloneClient)

describe('POST /api/admin/ingest/zillow', () => {
  beforeEach(() => {
    jest.resetAllMocks()
    process.env.ZILLOW_CRON_SECRET = 'secret'
    process.env.RAPIDAPI_KEY = 'key'
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
    mockCreateClient.mockReturnValue({ from: jest.fn() })
    mockIngest.mockResolvedValue({ totals: { attempted: 1 } })

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
    mockCreateClient.mockReturnValue({ from: jest.fn() })
    mockIngest.mockResolvedValue({ totals: { attempted: 1 } })

    const res = await POST(
      new Request(
        'http://localhost/api/admin/ingest/zillow?cron_secret=secret',
        {
          method: 'POST',
        }
      )
    )

    expect(res.status).toBe(200)
  })
})
