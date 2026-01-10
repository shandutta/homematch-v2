import { jest, describe, it, expect, beforeEach } from '@jest/globals'

// Store original env
const originalEnv = process.env

type FetchFn = (
  input: RequestInfo | URL,
  init?: RequestInit
) => Promise<Response>

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
const mockFetch: jest.MockedFunction<FetchFn> = jest.fn()
global.fetch = mockFetch

// Import after mocks
import * as geocodeRoute from '@/app/api/maps/geocode/route'
import { getRequestUrl } from '@/__tests__/utils/http-helpers'

describe('/api/maps/geocode route', () => {
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
    new Request('http://localhost/api/maps/geocode', {
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

      const request = createRequest({ address: '123 Main St' })
      const response = await geocodeRoute.POST(request)

      expect(response.status).toBe(429)
      const body = await response.json()
      expect(body.error).toBe('Too many requests. Please try again later.')
    })

    it('returns 503 when API key is not configured', async () => {
      delete process.env.GOOGLE_MAPS_SERVER_API_KEY

      const request = createRequest({ address: '123 Main St' })
      const response = await geocodeRoute.POST(request)

      expect(response.status).toBe(503)
      const body = await response.json()
      expect(body.error).toBe('Geocoding service unavailable')
    })

    it('returns 400 for invalid request (missing address)', async () => {
      const request = createRequest({})
      const response = await geocodeRoute.POST(request)

      expect(response.status).toBe(400)
      const body = await response.json()
      expect(body.error).toBe('Invalid request parameters')
    })

    it('returns 400 for address too short', async () => {
      const request = createRequest({ address: '' })
      const response = await geocodeRoute.POST(request)

      expect(response.status).toBe(400)
    })

    it('returns 400 for address too long (> 200 chars)', async () => {
      const request = createRequest({ address: 'A'.repeat(201) })
      const response = await geocodeRoute.POST(request)

      expect(response.status).toBe(400)
    })

    it('successfully geocodes a valid address', async () => {
      const mockGoogleResponse = {
        status: 'OK',
        results: [
          {
            formatted_address: '123 Main St, San Francisco, CA 94102, USA',
            geometry: {
              location: { lat: 37.7749, lng: -122.4194 },
              location_type: 'ROOFTOP',
            },
            place_id: 'ChIJIQBpAG2ahYAR_6128GcTUEo',
            types: ['street_address'],
          },
        ],
      }

      mockFetch.mockResolvedValue({
        json: () => Promise.resolve(mockGoogleResponse),
      })

      const request = createRequest({
        address: '123 Main St, San Francisco, CA',
      })
      const response = await geocodeRoute.POST(request)

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.results).toHaveLength(1)
      expect(body.results[0].formatted_address).toBe(
        '123 Main St, San Francisco, CA 94102, USA'
      )
      expect(body.results[0].geometry.location.lat).toBe(37.7749)
    })

    it('returns 400 when Google API returns non-OK status', async () => {
      mockFetch.mockResolvedValue({
        json: () => Promise.resolve({ status: 'REQUEST_DENIED' }),
      })

      const request = createRequest({ address: '123 Main St' })
      const response = await geocodeRoute.POST(request)

      expect(response.status).toBe(400)
      const body = await response.json()
      expect(body.error).toBe('Geocoding failed')
      expect(body.status).toBe('REQUEST_DENIED')
    })

    it('filters out results with invalid coordinates', async () => {
      const mockGoogleResponse = {
        status: 'OK',
        results: [
          {
            formatted_address: 'Valid Address',
            geometry: {
              location: { lat: 37.7749, lng: -122.4194 },
              location_type: 'ROOFTOP',
            },
            place_id: 'valid-id',
            types: ['street_address'],
          },
          {
            formatted_address: 'Invalid Address',
            geometry: {
              location: { lat: 100, lng: 200 }, // Invalid coordinates
              location_type: 'ROOFTOP',
            },
            place_id: 'invalid-id',
            types: ['street_address'],
          },
        ],
      }

      mockFetch.mockResolvedValue({
        json: () => Promise.resolve(mockGoogleResponse),
      })

      const request = createRequest({ address: '123 Main St' })
      const response = await geocodeRoute.POST(request)

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.results).toHaveLength(1)
      expect(body.results[0].formatted_address).toBe('Valid Address')
    })

    it('includes bounds in Google API request when provided', async () => {
      const mockGoogleResponse = {
        status: 'OK',
        results: [
          {
            formatted_address: '123 Main St',
            geometry: {
              location: { lat: 37.7749, lng: -122.4194 },
              location_type: 'ROOFTOP',
            },
            place_id: 'test-id',
            types: ['street_address'],
          },
        ],
      }

      mockFetch.mockResolvedValue({
        json: () => Promise.resolve(mockGoogleResponse),
      })

      const request = createRequest({
        address: '123 Main St',
        bounds: {
          south: 37.7,
          west: -122.5,
          north: 37.8,
          east: -122.3,
        },
      })

      await geocodeRoute.POST(request)

      expect(mockFetch).toHaveBeenCalled()
      const fetchUrl = getRequestUrl(mockFetch.mock.calls[0]?.[0])
      expect(fetchUrl).toContain('bounds=')
      // URL encodes the comma as %2C
      expect(decodeURIComponent(fetchUrl)).toContain('37.7,-122.5')
      expect(decodeURIComponent(fetchUrl)).toContain('37.8,-122.3')
    })

    it('returns 500 on fetch error', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'))

      const request = createRequest({ address: '123 Main St' })
      const response = await geocodeRoute.POST(request)

      expect(response.status).toBe(500)
      const body = await response.json()
      expect(body.error).toBe('Internal server error')
    })

    it('uses client IP for rate limiting', async () => {
      mockFetch.mockResolvedValue({
        json: () => Promise.resolve({ status: 'OK', results: [] }),
      })

      const request = createRequest(
        { address: '123 Main St' },
        { 'x-forwarded-for': '192.168.1.100' }
      )

      await geocodeRoute.POST(request)

      expect(mockRateLimiterCheck).toHaveBeenCalledWith('192.168.1.100')
    })

    it('uses "unknown" for rate limiting when no IP header', async () => {
      mockFetch.mockResolvedValue({
        json: () => Promise.resolve({ status: 'OK', results: [] }),
      })

      const request = createRequest({ address: '123 Main St' })

      await geocodeRoute.POST(request)

      expect(mockRateLimiterCheck).toHaveBeenCalledWith('unknown')
    })
  })
})
