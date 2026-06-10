/**
 * @jest-environment node
 *
 * Regression test for Clawpatch finding #3 (numeric zpid crash).
 *
 * POST /api/admin/generate-vibes-zillow advertises accepting `zpid`. A JSON
 * body of {"zpid": 12345678} sends zpid as a number; the handler used to
 * assign it straight to a string-typed variable and pass it to extractZpid(),
 * which calls .trim() — crashing with a TypeError instead of accepting the
 * zpid or returning a 400.
 *
 * The fix coerces string|number zpids to a string and rejects other types
 * with a 400. This test locks that in.
 */
import {
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
  jest,
} from '@jest/globals'

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

// Keep the LLM stack out of the test — the upstream Zillow fetch fails
// before any vibes generation runs.
jest.mock('@/lib/services/vibes', () => ({
  __esModule: true,
  createVibesService: () => ({}),
}))

const CRON_SECRET = 'test-cron-secret'

describe('POST /api/admin/generate-vibes-zillow — zpid body parsing', () => {
  let route: typeof import('@/app/api/admin/generate-vibes-zillow/route')

  beforeAll(async () => {
    process.env.VIBES_CRON_SECRET = CRON_SECRET
    process.env.RAPIDAPI_KEY = 'test-rapid-key'
    process.env.OPENROUTER_API_KEY = 'test-openrouter-key'
    process.env.HOMEMATCH_ALLOW_PAID_RAPIDAPI = 'true'
    route = await import('@/app/api/admin/generate-vibes-zillow/route')
  })

  beforeEach(() => {
    mockRateLimit.mockReset()
    mockRateLimit.mockResolvedValue(null)
    mockFetchWithTimeout.mockReset()
    // Fail the upstream fetch fast: the test only asserts how far the
    // request travelled (the coerced zpid reaching the fetch URL), not
    // the success path.
    mockFetchWithTimeout.mockRejectedValue(
      new Error('network disabled in test')
    )
  })

  const postWith = (body: unknown) =>
    route.POST(
      new Request('http://localhost/api/admin/generate-vibes-zillow', {
        method: 'POST',
        headers: {
          'x-cron-secret': CRON_SECRET,
          'content-type': 'application/json',
        },
        body: JSON.stringify(body),
      })
    )

  const fetchedUrls = () =>
    mockFetchWithTimeout.mock.calls.map((call) => String(call[0]))

  test('numeric zpid is coerced to a string and reaches the Zillow fetch', async () => {
    const res = await postWith({ zpid: 12345678 })

    // Not rejected as an invalid body — the numeric zpid was accepted.
    expect(res.status).not.toBe(400)
    // The coerced zpid flowed through to the upstream request URL.
    expect(fetchedUrls().some((url) => url.includes('zpid=12345678'))).toBe(
      true
    )
  })

  test('string zpid still works', async () => {
    const res = await postWith({ zpid: '87654321' })

    expect(res.status).not.toBe(400)
    expect(fetchedUrls().some((url) => url.includes('zpid=87654321'))).toBe(
      true
    )
  })

  test('non-string/non-number zpid yields a 400 without crashing', async () => {
    const res = await postWith({ zpid: { nested: true } })

    expect(res.status).toBe(400)
    const body: { error?: string } = await res.json()
    expect(body.error).toMatch(/zillowUrl or zpid must be a string or number/i)
    // The handler never reached the upstream fetch.
    expect(mockFetchWithTimeout).not.toHaveBeenCalled()
  })

  test('missing both zillowUrl and zpid yields a 400', async () => {
    const res = await postWith({})

    expect(res.status).toBe(400)
    expect(mockFetchWithTimeout).not.toHaveBeenCalled()
  })
})
