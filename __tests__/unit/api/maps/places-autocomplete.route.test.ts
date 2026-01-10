import { jest, describe, it, expect, beforeEach } from '@jest/globals'

// Store original env
const originalEnv = process.env

// Mock next/server before imports
jest.mock('next/server', () => {
  const makeResponse = (body: unknown, init?: { status?: number }) => {
    const status = init?.status ?? 200
    return {
      status,
      json: async () => (typeof body === 'string' ? JSON.parse(body) : body),
      headers: new Map([['content-type', 'application/json']]),
    }
  }

  return {
    NextResponse: {
      json: (body: unknown, init?: { status?: number }) =>
        makeResponse(body, init),
    },
  }
})

// Mock rate limiter - create mock function first (Jest hoisting compatible)
const mockRateLimiterCheck = jest.fn()
jest.mock('@/lib/utils/rate-limit', () => ({
  apiRateLimiter: {
    check: mockRateLimiterCheck,
  },
}))

// Mock fetch globally
const mockFetch: jest.Mock<
  Promise<Response>,
  [RequestInfo | URL, RequestInit?]
> = jest.fn()
global.fetch = mockFetch

// Import after mocks
import * as autocompleteRoute from '@/app/api/maps/places/autocomplete/route'
import { getRequestUrl } from '@/__tests__/utils/http-helpers'

describe('/api/maps/places/autocomplete route', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    process.env = { ...originalEnv, GOOGLE_MAPS_SERVER_API_KEY: 'test-api-key' }
    mockRateLimiterCheck.mockResolvedValue({ success: true })
  })

  afterAll(() => {
    process.env = originalEnv
  })

  const createRequest = (
    body: Record<string, unknown>,
    headers: Record<string, string> = {}
  ) =>
    new Request('http://localhost/api/maps/places/autocomplete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: JSON.stringify(body),
    })

  describe('POST', () => {
    it('returns 429 when rate limited', async () => {
      mockRateLimiterCheck.mockResolvedValue({ success: false })

      const request = createRequest({ input: 'san fran' })
      const response = await autocompleteRoute.POST(request)

      expect(response.status).toBe(429)
      const body = await response.json()
      expect(body.error).toBe('Too many requests. Please try again later.')
    })

    it('returns 503 when API key is not configured', async () => {
      delete process.env.GOOGLE_MAPS_SERVER_API_KEY

      const request = createRequest({ input: 'san fran' })
      const response = await autocompleteRoute.POST(request)

      expect(response.status).toBe(503)
      const body = await response.json()
      expect(body.error).toBe('Places service unavailable')
    })

    it('returns 400 for invalid request (missing input)', async () => {
      const request = createRequest({})
      const response = await autocompleteRoute.POST(request)

      expect(response.status).toBe(400)
      const body = await response.json()
      expect(body.error).toBe('Invalid request parameters')
    })

    it('returns 400 for input too short', async () => {
      const request = createRequest({ input: '' })
      const response = await autocompleteRoute.POST(request)

      expect(response.status).toBe(400)
    })

    it('returns 400 for input too long (> 100 chars)', async () => {
      const request = createRequest({ input: 'A'.repeat(101) })
      const response = await autocompleteRoute.POST(request)

      expect(response.status).toBe(400)
    })

    it('successfully returns autocomplete predictions', async () => {
      const mockGoogleResponse = {
        status: 'OK',
        predictions: [
          {
            description: 'San Francisco, CA, USA',
            place_id: 'ChIJIQBpAG2ahYAR_6128GcTUEo',
            types: ['locality', 'political'],
            matched_substrings: [{ length: 8, offset: 0 }],
            structured_formatting: {
              main_text: 'San Francisco',
              secondary_text: 'CA, USA',
            },
          },
          {
            description: 'San Francisco International Airport',
            place_id: 'ChIJVVVVVYx3j4AR1yqQnAAAAA',
            types: ['airport', 'establishment'],
            matched_substrings: [{ length: 8, offset: 0 }],
            structured_formatting: {
              main_text: 'San Francisco International Airport',
              secondary_text: 'San Francisco, CA',
            },
          },
        ],
      }

      mockFetch.mockResolvedValue({
        json: () => Promise.resolve(mockGoogleResponse),
      })

      const request = createRequest({ input: 'san fran' })
      const response = await autocompleteRoute.POST(request)

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.predictions).toHaveLength(2)
      expect(body.predictions[0].description).toBe('San Francisco, CA, USA')
      expect(body.predictions[0].place_id).toBe('ChIJIQBpAG2ahYAR_6128GcTUEo')
    })

    it('returns empty predictions for ZERO_RESULTS', async () => {
      mockFetch.mockResolvedValue({
        json: () => Promise.resolve({ status: 'ZERO_RESULTS' }),
      })

      const request = createRequest({ input: 'xyznonexistent' })
      const response = await autocompleteRoute.POST(request)

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.predictions).toEqual([])
    })

    it('returns 400 when Google API returns error status', async () => {
      mockFetch.mockResolvedValue({
        json: () => Promise.resolve({ status: 'OVER_QUERY_LIMIT' }),
      })

      const request = createRequest({ input: 'san fran' })
      const response = await autocompleteRoute.POST(request)

      expect(response.status).toBe(400)
      const body = await response.json()
      expect(body.error).toBe('Places autocomplete failed')
      expect(body.status).toBe('OVER_QUERY_LIMIT')
    })

    it('includes location in Google API request when provided', async () => {
      const mockGoogleResponse = {
        status: 'OK',
        predictions: [],
      }

      mockFetch.mockResolvedValue({
        json: () => Promise.resolve(mockGoogleResponse),
      })

      const request = createRequest({
        input: 'coffee',
        location: { lat: 37.7749, lng: -122.4194 },
      })

      await autocompleteRoute.POST(request)

      expect(mockFetch).toHaveBeenCalled()
      const fetchUrl = getRequestUrl(mockFetch.mock.calls[0]?.[0])
      // URL encodes the comma as %2C
      expect(decodeURIComponent(fetchUrl)).toContain(
        'location=37.7749,-122.4194'
      )
    })

    it('includes radius in Google API request when provided', async () => {
      mockFetch.mockResolvedValue({
        json: () => Promise.resolve({ status: 'OK', predictions: [] }),
      })

      const request = createRequest({
        input: 'coffee',
        radius: 5000,
      })

      await autocompleteRoute.POST(request)

      const fetchUrl = getRequestUrl(mockFetch.mock.calls[0]?.[0])
      expect(fetchUrl).toContain('radius=5000')
    })

    it('validates radius range (1-50000)', async () => {
      // Test radius too small
      const request1 = createRequest({ input: 'coffee', radius: 0 })
      const response1 = await autocompleteRoute.POST(request1)
      expect(response1.status).toBe(400)

      // Test radius too large
      const request2 = createRequest({ input: 'coffee', radius: 50001 })
      const response2 = await autocompleteRoute.POST(request2)
      expect(response2.status).toBe(400)
    })

    it('includes types in Google API request when provided', async () => {
      mockFetch.mockResolvedValue({
        json: () => Promise.resolve({ status: 'OK', predictions: [] }),
      })

      const request = createRequest({
        input: 'coffee',
        types: ['establishment', 'geocode'],
      })

      await autocompleteRoute.POST(request)

      const fetchUrl = getRequestUrl(mockFetch.mock.calls[0]?.[0])
      // URL encodes the pipe as %7C
      expect(decodeURIComponent(fetchUrl)).toContain(
        'types=establishment|geocode'
      )
    })

    it('includes strictbounds in Google API request when true', async () => {
      mockFetch.mockResolvedValue({
        json: () => Promise.resolve({ status: 'OK', predictions: [] }),
      })

      const request = createRequest({
        input: 'coffee',
        strictbounds: true,
      })

      await autocompleteRoute.POST(request)

      const fetchUrl = getRequestUrl(mockFetch.mock.calls[0]?.[0])
      expect(fetchUrl).toContain('strictbounds=true')
    })

    it('handles missing structured_formatting gracefully', async () => {
      const mockGoogleResponse = {
        status: 'OK',
        predictions: [
          {
            description: 'Some Place',
            place_id: 'test-id',
            types: ['locality'],
            matched_substrings: [],
            // No structured_formatting
          },
        ],
      }

      mockFetch.mockResolvedValue({
        json: () => Promise.resolve(mockGoogleResponse),
      })

      const request = createRequest({ input: 'test' })
      const response = await autocompleteRoute.POST(request)

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.predictions[0].structured_formatting.main_text).toBe('')
    })

    it('returns 500 on fetch error', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'))

      const request = createRequest({ input: 'san fran' })
      const response = await autocompleteRoute.POST(request)

      expect(response.status).toBe(500)
      const body = await response.json()
      expect(body.error).toBe('Internal server error')
    })

    it('uses client IP for rate limiting', async () => {
      mockFetch.mockResolvedValue({
        json: () => Promise.resolve({ status: 'OK', predictions: [] }),
      })

      const request = createRequest(
        { input: 'test' },
        { 'x-forwarded-for': '10.0.0.1' }
      )

      await autocompleteRoute.POST(request)

      expect(mockRateLimiterCheck).toHaveBeenCalledWith('10.0.0.1')
    })
  })
})
