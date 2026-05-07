import {
  describe,
  test,
  expect,
  beforeEach,
  afterEach,
  jest,
} from '@jest/globals'
import { POST } from '@/app/api/maps/places/autocomplete/route'

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

const originalEnv = process.env
const originalFetch = global.fetch
let fetchedUrls: string[] = []

describe('places autocomplete API route', () => {
  beforeEach(() => {
    fetchedUrls = []
    process.env = {
      ...originalEnv,
      NODE_ENV: 'test',
      GOOGLE_MAPS_SERVER_API_KEY: 'test-server-key',
    }
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
      error: 'Invalid request parameters',
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
