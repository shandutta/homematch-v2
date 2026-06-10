/**
 * @jest-environment node
 *
 * Regression test for Clawpatch finding #1 (backfill TOCTOU overwrite).
 *
 * /api/admin/backfill-zillow-fields selects rows whose description/amenities
 * are NULL, then — minutes later, after a RapidAPI fetch — writes the fetched
 * values back. The write previously filtered only by `id`, so a curated value
 * written between selection and update would be clobbered.
 *
 * The fix re-checks NULL at write time: each column is updated independently
 * with an `.is(column, null)` filter. This test drives the route with a row
 * that is NULL on both columns and asserts both updates carry their IS NULL
 * guard.
 */
import {
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
  jest,
} from '@jest/globals'

// Captures every `.is(column, value)` filter applied to the mock client.
// Must be `mock`-prefixed so the jest.mock factory below may reference it.
const mockIsCalls: Array<[unknown, unknown]> = []

jest.mock('@/lib/supabase/standalone', () => {
  // A chainable, awaitable Supabase query-builder stub. A chain containing
  // `update` resolves to the affected row; any other (the select in
  // loadPageOfTargets) resolves to one target NULL on both columns.
  const makeBuilder = () => {
    const chain: string[] = []
    const builder: Record<string, unknown> = {}
    for (const method of [
      'select',
      'not',
      'or',
      'order',
      'range',
      'update',
      'eq',
      'is',
    ]) {
      builder[method] = (...args: unknown[]) => {
        chain.push(method)
        if (method === 'is') mockIsCalls.push([args[0], args[1]])
        return builder
      }
    }
    builder.then = (
      onFulfilled: (value: { data: unknown; error: unknown }) => unknown,
      onRejected?: (reason: unknown) => unknown
    ) => {
      const result = chain.includes('update')
        ? { data: [{ id: 'prop-1' }], error: null }
        : {
            data: [
              {
                id: 'prop-1',
                zpid: 'zpid-1',
                description: null,
                amenities: null,
              },
            ],
            error: null,
          }
      return Promise.resolve(result).then(onFulfilled, onRejected)
    }
    return builder
  }
  return {
    __esModule: true,
    createStandaloneClient: () => ({ from: () => makeBuilder() }),
  }
})

const mockRateLimit = jest.fn()
jest.mock('@/lib/api/admin-rate-limit', () => ({
  __esModule: true,
  rateLimitAdminRoute: (...args: unknown[]) => mockRateLimit(...args),
}))

const mockFetchWithTimeout = jest.fn()
jest.mock('@/lib/api/fetch-timeout', () => ({
  __esModule: true,
  FetchTimeoutError: class FetchTimeoutError extends Error {},
  fetchWithTimeout: (...args: unknown[]) => mockFetchWithTimeout(...args),
}))

// Stub the cross-route import so the LLM/vibes stack is never loaded.
jest.mock('@/app/api/admin/generate-vibes-zillow/extract-amenities', () => ({
  __esModule: true,
  extractAmenities: () => ['pool'],
}))

const CRON_SECRET = 'test-cron-secret'

describe('POST /api/admin/backfill-zillow-fields — NULL-guarded writes', () => {
  let route: typeof import('@/app/api/admin/backfill-zillow-fields/route')

  beforeAll(async () => {
    process.env.CRON_SECRET = CRON_SECRET
    process.env.RAPIDAPI_KEY = 'test-rapid-key'
    process.env.HOMEMATCH_ALLOW_PAID_RAPIDAPI = 'true'
    route = await import('@/app/api/admin/backfill-zillow-fields/route')
  })

  beforeEach(() => {
    mockIsCalls.length = 0
    mockRateLimit.mockReset()
    mockRateLimit.mockResolvedValue(null)
    mockFetchWithTimeout.mockReset()
    mockFetchWithTimeout.mockResolvedValue({
      ok: true,
      json: async () => ({ description: 'Fresh Zillow description' }),
    })
  })

  test('each column update carries an IS NULL guard', async () => {
    const res = await route.POST(
      new Request(
        'http://localhost/api/admin/backfill-zillow-fields?delayMs=0&limit=1',
        { method: 'POST', headers: { 'x-cron-secret': CRON_SECRET } }
      )
    )

    expect(res.status).toBe(200)
    const body: { summary?: { updated?: number } } = await res.json()
    expect(body.summary?.updated).toBe(1)

    // Both backfilled columns were written with an IS NULL guard so a
    // value curated since target selection cannot be overwritten.
    expect(mockIsCalls).toContainEqual(['description', null])
    expect(mockIsCalls).toContainEqual(['amenities', null])
  })
})
