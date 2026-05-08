import {
  describe,
  test,
  expect,
  beforeEach,
  afterEach,
  jest,
} from '@jest/globals'

const mockCreateApiClient = jest.fn()
const mockRequireUserFromRequest = jest.fn()
jest.mock('@/lib/supabase/server', () => ({
  createApiClient: mockCreateApiClient,
}))
jest.mock('@/lib/api/auth', () => ({
  requireUserFromRequest: mockRequireUserFromRequest,
}))

jest.mock('next/server', () => ({
  NextResponse: {
    json: (body: unknown, init?: ResponseInit) =>
      new Response(JSON.stringify(body), {
        ...init,
        headers: {
          'content-type': 'application/json',
          ...init?.headers,
        },
      }),
  },
}))

import { POST } from '@/app/api/maps/places/autocomplete/route'

const originalEnv = process.env
const originalFetch = global.fetch
let fetchedUrls: string[] = []

describe('places autocomplete API route', () => {
  test('rejects unauthenticated requests before calling Google', async () => {
    mockRequireUserFromRequest.mockResolvedValue({
      user: null,
      response: new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
      }),
    })

    const response = await POST(
      new Request('https://homematch.test/api/maps/places/autocomplete', {
        method: 'POST',
        body: JSON.stringify({ input: 'Oakland' }),
      })
    )

    expect(response.status).toBe(401)
    expect(fetchedUrls).toHaveLength(0)
  })

  beforeEach(() => {
    fetchedUrls = []
    process.env = {
      ...originalEnv,
      NODE_ENV: 'test',
      GOOGLE_MAPS_SERVER_API_KEY: 'test-server-key',
    }
    mockCreateApiClient.mockReturnValue({ auth: { getUser: jest.fn() } })
    mockRequireUserFromRequest.mockResolvedValue({
      user: { id: 'user-1' },
      response: null,
    })
    global.fetch = async (input) => {
      fetchedUrls.push(String(input))
      return new Response(
        JSON.stringify({
          status: 'OK',
          predictions: [
            {
              description: 'Oakland, CA, USA',
              place_id: 'place-1',
              types: ['locality', 'political'],
              matched_substrings: [{ length: 3, offset: 0 }],
              structured_formatting: {
                main_text: 'Oakland',
                secondary_text: 'CA, USA',
              },
            },
          ],
        })
      )
    }
  })

  afterEach(() => {
    process.env = originalEnv
    global.fetch = originalFetch
  })

  test('rejects invalid location coordinates before calling Google', async () => {
    const response = await POST(
      new Request('https://homematch.test/api/maps/places/autocomplete', {
        method: 'POST',
        body: JSON.stringify({
          input: 'Oakland',
          location: { lat: 999, lng: -122.2712 },
        }),
      })
    )

    expect(response.status).toBe(400)
    expect(fetchedUrls).toHaveLength(0)
    await expect(response.json()).resolves.toMatchObject({
      error: 'Validation failed',
    })
  })

  test('returns sanitized predictions without exposing the server API key', async () => {
    const response = await POST(
      new Request('https://homematch.test/api/maps/places/autocomplete', {
        method: 'POST',
        body: JSON.stringify({
          input: 'Oakland',
          location: { lat: 37.8044, lng: -122.2712 },
          radius: 5000,
        }),
      })
    )

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body).toEqual({
      predictions: [
        {
          description: 'Oakland, CA, USA',
          place_id: 'place-1',
          types: ['locality', 'political'],
          matched_substrings: [{ length: 3, offset: 0 }],
          structured_formatting: {
            main_text: 'Oakland',
            secondary_text: 'CA, USA',
          },
        },
      ],
    })
    expect(JSON.stringify(body)).not.toContain('test-server-key')
    expect(fetchedUrls).toHaveLength(1)
    expect(fetchedUrls[0]).toContain('place/autocomplete/json?')
  })
})
