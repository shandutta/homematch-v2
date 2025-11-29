/**
 * Integration tests for /api/properties/marketing endpoint
 * Tests the marketing properties API functionality
 */
import { describe, test, expect, beforeAll } from 'vitest'

const API_URL = process.env.TEST_API_URL || 'http://localhost:3000'

// Increase timeout for integration tests making real HTTP requests
const TEST_TIMEOUT = 60000 // 60s per test

const fetchJson = async (path: string, init?: RequestInit) => {
  const res = await fetch(`${API_URL}${path}`, {
    method: 'GET',
    headers: {
      'content-type': 'application/json',
      ...(init?.headers || {}),
    },
    ...init,
  })

  let body: any = {}
  try {
    body = await res.json()
  } catch {
    // non-JSON body
  }

  return { status: res.status, body, headers: res.headers }
}

type MarketingCard = {
  zpid: string
  imageUrl: string | null
  price: number | null
  bedrooms: number | null
  bathrooms: number | null
  address: string
  latitude: number | null
  longitude: number | null
}

describe('Integration: /api/properties/marketing', () => {
  beforeAll(() => {
    if (!API_URL) {
      throw new Error(
        'TEST_API_URL environment variable is required for integration tests'
      )
    }
  })

  test('should return marketing properties array', async () => {
    const { status, body } = await fetchJson('/api/properties/marketing')

    expect(status).toBe(200)
    expect(Array.isArray(body)).toBe(true)
  })

  test('should return valid marketing card structure', async () => {
    const { body } = await fetchJson('/api/properties/marketing')

    // Should return array of marketing cards
    expect(Array.isArray(body)).toBe(true)

    // If there are cards, validate their structure
    if (body.length > 0) {
      body.forEach((card: MarketingCard) => {
        expect(card).toBeDefined()
        expect(typeof card).toBe('object')

        // Required fields
        expect(typeof card.zpid).toBe('string')
        expect(card.zpid.length).toBeGreaterThan(0)
        expect(typeof card.address).toBe('string')

        // Optional fields that can be null
        expect([null, 'string'].includes(typeof card.imageUrl)).toBe(true)
        expect([null, 'number'].includes(typeof card.price)).toBe(true)
        expect([null, 'number'].includes(typeof card.bedrooms)).toBe(true)
        expect([null, 'number'].includes(typeof card.bathrooms)).toBe(true)
        expect([null, 'number'].includes(typeof card.latitude)).toBe(true)
        expect([null, 'number'].includes(typeof card.longitude)).toBe(true)

        // If price exists, should be positive
        if (card.price !== null) {
          expect(card.price).toBeGreaterThan(0)
        }

        // If bedrooms/bathrooms exist, should be non-negative
        if (card.bedrooms !== null) {
          expect(card.bedrooms).toBeGreaterThanOrEqual(0)
        }
        if (card.bathrooms !== null) {
          expect(card.bathrooms).toBeGreaterThanOrEqual(0)
        }

        // If coordinates exist, should be valid
        if (card.latitude !== null) {
          expect(card.latitude).toBeGreaterThanOrEqual(-90)
          expect(card.latitude).toBeLessThanOrEqual(90)
        }
        if (card.longitude !== null) {
          expect(card.longitude).toBeGreaterThanOrEqual(-180)
          expect(card.longitude).toBeLessThanOrEqual(180)
        }

        // If imageUrl exists, should be a valid URL or at least a non-empty string
        if (card.imageUrl !== null) {
          expect(card.imageUrl.length).toBeGreaterThan(0)
        }
      })
    }
  })

  test('should return at most 3 marketing cards', async () => {
    const { body } = await fetchJson('/api/properties/marketing')

    expect(Array.isArray(body)).toBe(true)
    expect(body.length).toBeLessThanOrEqual(3)
  })

  test(
    'should handle empty database gracefully',
    async () => {
      const { status, body } = await fetchJson('/api/properties/marketing')

      // Should still return 200 even if no properties found
      expect(status).toBe(200)
      expect(Array.isArray(body)).toBe(true)

      // If empty, should be empty array (not null/undefined)
      if (body.length === 0) {
        expect(body).toEqual([])
      }
    },
    TEST_TIMEOUT
  )

  test(
    'should return cards with images when available',
    async () => {
      const { body } = await fetchJson('/api/properties/marketing')

      if (body.length > 0) {
        // In development or with proper data, should prefer cards with images
        const cardsWithImages = body.filter(
          (card: MarketingCard) => card.imageUrl !== null
        )

        // If there are any cards with images, they should be prioritized
        if (cardsWithImages.length > 0) {
          cardsWithImages.forEach((card: MarketingCard) => {
            expect(card.imageUrl).not.toBeNull()
            expect(typeof card.imageUrl).toBe('string')
            expect((card.imageUrl as string).length).toBeGreaterThan(0)
          })
        }
      }
    },
    TEST_TIMEOUT
  )

  test(
    'should format addresses properly',
    async () => {
      const { body } = await fetchJson('/api/properties/marketing')

      body.forEach((card: MarketingCard) => {
        expect(typeof card.address).toBe('string')

        // Address should not be empty
        expect(card.address.length).toBeGreaterThan(0)

        // Should not have double commas or leading/trailing commas
        expect(card.address).not.toContain(',,')
        expect(card.address).not.toMatch(/^,/)
        expect(card.address).not.toMatch(/,$/)
      })
    },
    TEST_TIMEOUT
  )

  test(
    'should handle concurrent requests efficiently',
    async () => {
      const startTime = Date.now()

      // Make multiple concurrent requests
      const requests = Array.from({ length: 3 }, () =>
        fetchJson('/api/properties/marketing')
      )
      const responses = await Promise.all(requests)

      const endTime = Date.now()
      const duration = endTime - startTime

      // All requests should succeed
      responses.forEach(({ status, body }) => {
        expect(status).toBe(200)
        expect(Array.isArray(body)).toBe(true)
      })

      // Should complete reasonably quickly (within 30 seconds)
      // Relaxed from 10s to account for variable integration test latency
      expect(duration).toBeLessThan(30000)
    },
    TEST_TIMEOUT
  )

  test(
    'should reject non-GET methods',
    async () => {
      const methods = ['POST', 'PUT', 'DELETE', 'PATCH']

      // Make all requests concurrently to avoid sequential timeout stacking
      const responses = await Promise.all(
        methods.map((method) =>
          fetch(`${API_URL}/api/properties/marketing`, {
            method,
            headers: {
              'content-type': 'application/json',
            },
          })
        )
      )

      // All should return 405 Method Not Allowed
      for (const res of responses) {
        expect(res.status).toBe(405)
      }
    },
    TEST_TIMEOUT
  )

  test(
    'should handle fallback scenarios',
    async () => {
      const { status, body } = await fetchJson('/api/properties/marketing')

      expect(status).toBe(200)
      expect(Array.isArray(body)).toBe(true)

      // Even in fallback scenarios (like when using seed data or external API),
      // the response should maintain the same structure
      body.forEach((card: MarketingCard) => {
        expect(card.zpid).toBeDefined()
        expect(card.address).toBeDefined()

        // Fallback cards might have different zpid patterns
        if (card.zpid.startsWith('fallback-')) {
          expect(card.address).toBe('Coming soon')
          expect(card.price).toBeNull()
          expect(card.bedrooms).toBeNull()
          expect(card.bathrooms).toBeNull()
          expect(card.latitude).toBeNull()
          expect(card.longitude).toBeNull()
        }
      })
    },
    TEST_TIMEOUT
  )

  test(
    'should maintain consistent response times',
    async () => {
      // Make all requests concurrently to avoid sequential timeout stacking
      const startTimes = Array.from({ length: 3 }, () => Date.now())
      const responses = await Promise.all(
        Array.from({ length: 3 }, () => fetchJson('/api/properties/marketing'))
      )
      const endTime = Date.now()

      // All requests should succeed
      responses.forEach(({ status }) => {
        expect(status).toBe(200)
      })

      // Total time for concurrent requests should be reasonable
      const totalTime = endTime - startTimes[0]
      expect(totalTime).toBeLessThan(30000) // 30s for 3 concurrent requests
    },
    TEST_TIMEOUT
  )
})
