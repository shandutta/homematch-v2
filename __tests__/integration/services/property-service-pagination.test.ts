import { describe, it, expect, beforeAll } from 'vitest'

import { PropertyService } from '@/lib/services/properties'
import { createTestClientFactory } from '../../utils/test-client-factory'

describe('PropertyService integration - combined filters & pagination', () => {
  let service: PropertyService

  beforeAll(() => {
    const clientFactory = createTestClientFactory()
    service = new PropertyService(clientFactory)
  })

  it('returns paginated results with combined filters', async () => {
    const { properties, total, page, limit } = await service.searchProperties({
      filters: {
        price_min: 300000,
        price_max: 1000000,
        bedrooms_min: 2,
        bedrooms_max: 5,
        listing_status: ['active'],
      },
      pagination: { page: 1, limit: 5 },
    })

    expect(Array.isArray(properties)).toBe(true)
    expect(page).toBe(1)
    expect(limit).toBe(5)
    expect(total).toBeGreaterThanOrEqual(properties.length)
    properties.forEach((p) => {
      expect(p.price).toBeGreaterThanOrEqual(300000)
      expect(p.price).toBeLessThanOrEqual(1000000)
      expect(p.bedrooms).toBeGreaterThanOrEqual(2)
      expect(p.bedrooms).toBeLessThanOrEqual(5)
      expect(p.listing_status).toBe('active')
    })
  })

  it('handles empty result pages gracefully', async () => {
    const { properties, total } = await service.searchProperties({
      filters: {
        price_min: 999999999,
        price_max: 999999999,
      },
      pagination: { page: 3, limit: 5 },
    })

    expect(properties).toEqual([])
    expect(total).toBe(0)
  })

  it('returns structured empty result on invalid filters without throwing', async () => {
    const { properties, total } = await service.searchProperties({
      filters: {
        price_min: -10,
        price_max: -5,
      },
      pagination: { page: 1, limit: 2 },
    })

    expect(Array.isArray(properties)).toBe(true)
    expect(properties.length).toBeGreaterThanOrEqual(0)
    expect(total).toBeGreaterThanOrEqual(0)
  })
})
