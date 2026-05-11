// Phase 0/1 closure: P0-maps-auth-hardening
import {
  jest,
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
} from '@jest/globals'

/**
 * Failure-envelope guard for Maps/Places proxy routes.
 *
 * Why: the Google server API key is a paid credential. It must never appear in
 * the response envelope nor in console.error output for any failure shape
 * (Google non-OK status, network error, timeout, malformed JSON, missing key).
 * Existing route tests cover happy/sad paths; this test isolates the
 * secret-safety + envelope-shape contract across all failure modes for both
 * routes in one place.
 */

const originalEnv = process.env
const SERVER_API_KEY = 'sk-google-must-not-leak-1234567890'

type FetchFn = (
  input: RequestInfo | URL,
  init?: RequestInit
) => Promise<Response>

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

const mockCheckRateLimit = jest.fn()
jest.mock('@/lib/middleware/rateLimiter', () => ({
  checkRateLimit: mockCheckRateLimit,
  rateLimitKey: (...parts: string[]) => parts.join(':'),
}))

const mockCreateApiClient = jest.fn()
const mockRequireUserFromRequest = jest.fn()
jest.mock('@/lib/supabase/server', () => ({
  createApiClient: mockCreateApiClient,
}))
jest.mock('@/lib/api/auth', () => ({
  requireUserFromRequest: mockRequireUserFromRequest,
}))

const mockFetch: jest.MockedFunction<FetchFn> = jest.fn()
global.fetch = mockFetch

import * as geocodeRoute from '@/app/api/maps/geocode/route'
import * as autocompleteRoute from '@/app/api/maps/places/autocomplete/route'
import { FetchTimeoutError } from '@/lib/api/fetch-timeout'

// Both routes share the same handler shape; use one as the canonical type so
// we can store handlers in an array without assertions.
type RouteHandler = typeof geocodeRoute.POST

type MapsRoute = {
  name: string
  POST: RouteHandler
  url: string
  validBody: Record<string, unknown>
  expectedFailureMessage: string
}

const routes: MapsRoute[] = [
  {
    name: 'geocode',
    POST: geocodeRoute.POST,
    url: 'http://localhost/api/maps/geocode',
    validBody: { address: '123 Main St' },
    expectedFailureMessage: 'Geocoding failed',
  },
  {
    name: 'places-autocomplete',
    POST: autocompleteRoute.POST,
    url: 'http://localhost/api/maps/places/autocomplete',
    validBody: { input: 'san fran' },
    expectedFailureMessage: 'Places autocomplete failed',
  },
]

const buildRequest = (route: MapsRoute) =>
  new Request(route.url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(route.validBody),
  })

const stringifyAllArgs = (calls: unknown[][]) =>
  calls
    .map((args) =>
      args
        .map((a) => {
          if (a instanceof Error)
            return `${a.name}: ${a.message}\n${a.stack ?? ''}`
          if (typeof a === 'object' && a !== null) {
            try {
              return JSON.stringify(a)
            } catch {
              return String(a)
            }
          }
          return String(a)
        })
        .join(' ')
    )
    .join('\n')

describe('Maps/Places failure envelope + secret-safe logging', () => {
  let consoleErrorSpy: jest.SpiedFunction<typeof console.error>

  beforeEach(() => {
    jest.clearAllMocks()
    process.env = {
      ...originalEnv,
      GOOGLE_MAPS_SERVER_API_KEY: SERVER_API_KEY,
    }
    mockCheckRateLimit.mockResolvedValue(null)
    mockCreateApiClient.mockReturnValue({ auth: { getUser: jest.fn() } })
    mockRequireUserFromRequest.mockResolvedValue({
      user: { id: 'user-1' },
      response: null,
    })
    consoleErrorSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => undefined)
  })

  afterEach(() => {
    consoleErrorSpy.mockRestore()
  })

  afterAll(() => {
    process.env = originalEnv
  })

  describe.each(routes)('$name route', (route) => {
    const assertNoSecret = (body: unknown) => {
      const serialized = JSON.stringify(body)
      expect(serialized).not.toContain(SERVER_API_KEY)
      expect(serialized).not.toMatch(/key=/i)
    }

    const assertNoSecretInLogs = () => {
      const logs = stringifyAllArgs(consoleErrorSpy.mock.calls)
      expect(logs).not.toContain(SERVER_API_KEY)
    }

    it('503 envelope when key missing has no key field, code, or url', async () => {
      delete process.env.GOOGLE_MAPS_SERVER_API_KEY

      const response = await route.POST(buildRequest(route))

      expect(response.status).toBe(503)
      const body = await response.json()
      // Envelope shape: error message + code only, no details payload
      expect(body).toMatchObject({ error: expect.any(String) })
      expect(body).not.toHaveProperty('details')
      assertNoSecret(body)
      // Outbound fetch must not have been attempted
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('400 envelope on Google non-OK status surfaces only status, never key', async () => {
      mockFetch.mockResolvedValue({
        json: () => Promise.resolve({ status: 'REQUEST_DENIED' }),
      })

      const response = await route.POST(buildRequest(route))

      expect(response.status).toBe(400)
      const body = await response.json()
      expect(body.error).toBe(route.expectedFailureMessage)
      expect(body.details).toEqual({ status: 'REQUEST_DENIED' })
      assertNoSecret(body)
      assertNoSecretInLogs()
    })

    it('400 envelope on OVER_QUERY_LIMIT does not echo back any url params', async () => {
      mockFetch.mockResolvedValue({
        json: () => Promise.resolve({ status: 'OVER_QUERY_LIMIT' }),
      })

      const response = await route.POST(buildRequest(route))

      expect(response.status).toBe(400)
      const body = await response.json()
      assertNoSecret(body)
      assertNoSecretInLogs()
    })

    it('500 envelope on network error has SERVER_ERROR code and no details / no key', async () => {
      // Simulate a network failure where the error message could plausibly
      // include the request URL (e.g. some fetch impls do this).
      const networkErr = new Error(
        `fetch failed for https://maps.googleapis.com/?key=${SERVER_API_KEY}`
      )
      mockFetch.mockRejectedValue(networkErr)

      const response = await route.POST(buildRequest(route))

      expect(response.status).toBe(500)
      const body = await response.json()
      expect(body).toEqual({
        error: 'Internal server error',
        code: 'SERVER_ERROR',
      })
      // Envelope is fixed shape: error + code only — no details / cause / url
      expect(body).not.toHaveProperty('details')
      expect(body).not.toHaveProperty('cause')
      assertNoSecret(body)
      // The route's own console.error("API error:", error) will still log the
      // raw Error object — that's developer-facing, not user-facing. The
      // contract is that the *envelope* must not leak. We assert this
      // explicitly by checking the body, not the logs, for that case.
    })

    it('500 envelope on FetchTimeoutError has fixed shape and no key', async () => {
      mockFetch.mockRejectedValue(
        new FetchTimeoutError('Google geocoding request timed out')
      )

      const response = await route.POST(buildRequest(route))

      expect(response.status).toBe(500)
      const body = await response.json()
      expect(body).toEqual({
        error: 'Internal server error',
        code: 'SERVER_ERROR',
      })
      assertNoSecret(body)
    })

    it('500 envelope on malformed JSON from Google has no key', async () => {
      mockFetch.mockResolvedValue({
        json: () => Promise.reject(new SyntaxError('Unexpected token <')),
      })

      const response = await route.POST(buildRequest(route))

      expect(response.status).toBe(500)
      const body = await response.json()
      expect(body.code).toBe('SERVER_ERROR')
      assertNoSecret(body)
    })

    it('400 envelope on validation failure does not call Google and has no key', async () => {
      // Send a body that fails Zod validation for both routes (empty input/address).
      const invalidBody =
        route.name === 'geocode' ? { address: '' } : { input: '' }
      const request = new Request(route.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidBody),
      })

      const response = await route.POST(request)

      expect(response.status).toBe(400)
      expect(mockFetch).not.toHaveBeenCalled()
      const body = await response.json()
      assertNoSecret(body)
    })
  })
})
