/** @jest-environment node */

import {
  normalizeStatus,
  normalizePropertyType,
  mapPropertyType,
  parseAddress,
  computePropertyHash,
  computeSourceDataHash,
  computeFreshness,
  mapSearchItemToProperty,
  collectZipFallbacks,
} from '@/lib/providers/zillow/transform'
import type { ZillowSearchItem } from '@/lib/providers/zillow/types'

// ── normalizeStatus ──────────────────────────────────────────────────

describe('normalizeStatus', () => {
  test('returns active for ForSale', () => {
    expect(normalizeStatus('ForSale')).toBe('active')
  })

  test('returns active for Active', () => {
    expect(normalizeStatus('Active')).toBe('active')
  })

  test('returns sold for Sold', () => {
    expect(normalizeStatus('Sold')).toBe('sold')
  })

  test('returns pending for Pending', () => {
    expect(normalizeStatus('Pending')).toBe('pending')
  })

  test('returns active for unknown status', () => {
    expect(normalizeStatus('Unknown')).toBe('active')
  })

  test('returns active for undefined', () => {
    expect(normalizeStatus(undefined)).toBe('active')
  })

  test('returns active for empty string', () => {
    expect(normalizeStatus('')).toBe('active')
  })

  test('case-insensitive matching', () => {
    expect(normalizeStatus('FORSALE')).toBe('active')
    expect(normalizeStatus('SOLD')).toBe('sold')
    expect(normalizeStatus('PENDING')).toBe('pending')
  })
})

// ── normalizePropertyType ────────────────────────────────────────────

describe('normalizePropertyType', () => {
  test('passes through canonical types', () => {
    expect(normalizePropertyType('single_family')).toBe('single_family')
    expect(normalizePropertyType('condo')).toBe('condo')
    expect(normalizePropertyType('townhome')).toBe('townhome')
    expect(normalizePropertyType('multi_family')).toBe('multi_family')
    expect(normalizePropertyType('manufactured')).toBe('manufactured')
    expect(normalizePropertyType('land')).toBe('land')
    expect(normalizePropertyType('other')).toBe('other')
  })

  test('maps house to single_family', () => {
    expect(normalizePropertyType('house')).toBe('single_family')
    expect(normalizePropertyType('singlefamily')).toBe('single_family')
  })

  test('maps townhouse to townhome', () => {
    expect(normalizePropertyType('townhouse')).toBe('townhome')
  })

  test('maps apartment/duplex/triplex to multi_family', () => {
    expect(normalizePropertyType('apartment')).toBe('multi_family')
    expect(normalizePropertyType('duplex')).toBe('multi_family')
    expect(normalizePropertyType('triplex')).toBe('multi_family')
    expect(normalizePropertyType('multifamily')).toBe('multi_family')
  })

  test('maps mobile to manufactured', () => {
    expect(normalizePropertyType('mobile')).toBe('manufactured')
  })

  test('maps lot to land', () => {
    expect(normalizePropertyType('lot')).toBe('land')
  })

  test('maps unknown to other', () => {
    expect(normalizePropertyType('unknown_type')).toBe('other')
  })

  test('handles null/undefined', () => {
    expect(normalizePropertyType(null)).toBe('other')
    expect(normalizePropertyType(undefined)).toBe('other')
  })

  test('case insensitive', () => {
    expect(normalizePropertyType('HOUSE')).toBe('single_family')
    expect(normalizePropertyType('CONDO')).toBe('condo')
    expect(normalizePropertyType('APARTMENT')).toBe('multi_family')
  })
})

// ── mapPropertyType ──────────────────────────────────────────────────

describe('mapPropertyType', () => {
  test('maps SINGLE_FAMILY', () => {
    expect(mapPropertyType('SINGLE_FAMILY')).toBe('single_family')
    expect(mapPropertyType('HOUSE')).toBe('single_family')
  })

  test('maps CONDO', () => {
    expect(mapPropertyType('CONDO')).toBe('condo')
    expect(mapPropertyType('CONDOMINIUM')).toBe('condo')
  })

  test('maps TOWNHOUSE', () => {
    expect(mapPropertyType('TOWNHOUSE')).toBe('townhome')
    expect(mapPropertyType('TOWNHOME')).toBe('townhome')
  })

  test('maps APARTMENT/MULTI_FAMILY/DUPLEX/TRIPLEX', () => {
    expect(mapPropertyType('APARTMENT')).toBe('multi_family')
    expect(mapPropertyType('MULTI_FAMILY')).toBe('multi_family')
    expect(mapPropertyType('DUPLEX')).toBe('multi_family')
    expect(mapPropertyType('TRIPLEX')).toBe('multi_family')
  })

  test('maps MANUFACTURED/MOBILE', () => {
    expect(mapPropertyType('MANUFACTURED')).toBe('manufactured')
    expect(mapPropertyType('MOBILE')).toBe('manufactured')
  })

  test('maps LOT/LAND', () => {
    expect(mapPropertyType('LOT')).toBe('land')
    expect(mapPropertyType('LAND')).toBe('land')
  })

  test('defaults to single_family for unknown', () => {
    expect(mapPropertyType('BUNGALOW')).toBe('single_family')
  })

  test('case insensitive', () => {
    expect(mapPropertyType('single_family')).toBe('single_family')
  })
})

// ── parseAddress ─────────────────────────────────────────────────────

describe('parseAddress', () => {
  test('parses comma-separated address with city, state, zip', () => {
    const item: ZillowSearchItem = {
      zpid: '123',
      address: '123 Main St, San Francisco, CA 94105',
    }
    const result = parseAddress(item)
    expect(result).not.toBeNull()
    expect(result!.address).toBe('123 Main St')
    expect(result!.city).toBe('San Francisco')
    expect(result!.state).toBe('CA')
    expect(result!.zip).toBe('94105')
  })

  test('uses separate city/state/zipcode fields when address lacks them', () => {
    const item: ZillowSearchItem = {
      zpid: '123',
      address: '123 Main St',
      city: 'San Francisco',
      state: 'CA',
      zipcode: '94105',
    }
    const result = parseAddress(item)
    expect(result).not.toBeNull()
    expect(result!.address).toBe('123 Main St')
    expect(result!.city).toBe('San Francisco')
    expect(result!.state).toBe('CA')
    expect(result!.zip).toBe('94105')
  })

  test('uses streetAddress field', () => {
    const item: ZillowSearchItem = {
      zpid: '123',
      streetAddress: '456 Oak Ave',
      city: 'Oakland',
      state: 'CA',
      zipcode: '94607',
    }
    const result = parseAddress(item)
    expect(result).not.toBeNull()
    expect(result!.address).toBe('456 Oak Ave')
    expect(result!.city).toBe('Oakland')
    expect(result!.state).toBe('CA')
    expect(result!.zip).toBe('94607')
  })

  test('returns null when no address or streetAddress', () => {
    const item: ZillowSearchItem = { zpid: '123' }
    const result = parseAddress(item)
    expect(result).toBeNull()
  })

  test('returns null when no city and state', () => {
    const item: ZillowSearchItem = {
      zpid: '123',
      address: '123 Main St',
    }
    const result = parseAddress(item)
    expect(result).toBeNull()
  })

  test('uses fallbackLocation when city or state missing', () => {
    const item: ZillowSearchItem = {
      zpid: '123',
      address: '123 Main St',
    }
    const result = parseAddress(item, 'San Francisco, CA')
    expect(result).not.toBeNull()
    expect(result!.city).toBe('San Francisco')
    expect(result!.state).toBe('CA')
  })

  test('trims zipcode to 5 digits', () => {
    const item: ZillowSearchItem = {
      zpid: '123',
      address: '123 Main St',
      city: 'SF',
      state: 'CA',
      zipcode: '94105-1234',
    }
    const result = parseAddress(item)
    expect(result).not.toBeNull()
    expect(result!.zip).toBe('94105')
  })

  test('parses state-zip from comma-separated address', () => {
    const item: ZillowSearchItem = {
      zpid: '123',
      address: '123 Main St, San Francisco, CA 94105',
    }
    const result = parseAddress(item)
    expect(result).not.toBeNull()
    expect(result!.state).toBe('CA')
    expect(result!.zip).toBe('94105')
  })

  test('handles numeric zipcode', () => {
    const item: ZillowSearchItem = {
      zpid: '123',
      address: '123 Main St',
      city: 'SF',
      state: 'CA',
      zipcode: 94105,
    }
    const result = parseAddress(item)
    expect(result).not.toBeNull()
    expect(result!.zip).toBe('94105')
  })
})

// ── computePropertyHash ──────────────────────────────────────────────

describe('computePropertyHash', () => {
  test('produces deterministic SHA-256 hex', () => {
    const h1 = computePropertyHash('123', '456 Main St', 3, 2, 500000)
    const h2 = computePropertyHash('123', '456 Main St', 3, 2, 500000)
    expect(h1).toBe(h2)
    expect(h1).toHaveLength(64) // SHA-256 hex is 64 chars
    expect(/^[a-f0-9]{64}$/.test(h1)).toBe(true)
  })

  test('different inputs produce different hashes', () => {
    const h1 = computePropertyHash('123', '456 Main St', 3, 2, 500000)
    const h2 = computePropertyHash('456', '789 Oak Ave', 4, 3, 800000)
    expect(h1).not.toBe(h2)
  })

  test('zpid change produces different hash', () => {
    const h1 = computePropertyHash('123', 'Main St', 3, 2, 500000)
    const h2 = computePropertyHash('124', 'Main St', 3, 2, 500000)
    expect(h1).not.toBe(h2)
  })

  test('price change produces different hash', () => {
    const h1 = computePropertyHash('123', 'Main St', 3, 2, 500000)
    const h2 = computePropertyHash('123', 'Main St', 3, 2, 600000)
    expect(h1).not.toBe(h2)
  })

  test('case insensitive', () => {
    const h1 = computePropertyHash('123', 'Main St', 3, 2, 500000)
    const h2 = computePropertyHash('123', 'MAIN ST', 3, 2, 500000)
    expect(h1).toBe(h2)
  })
})

// ── computeSourceDataHash ─────────────────────────────────────────────

describe('computeSourceDataHash', () => {
  test('produces deterministic SHA-256 hex from payload', () => {
    const payload = { zpid: '123', address: '456 Main St', price: 500000 }
    const h1 = computeSourceDataHash(payload)
    const h2 = computeSourceDataHash(payload)
    expect(h1).toBe(h2)
    expect(h1).toHaveLength(64)
    expect(/^[a-f0-9]{64}$/.test(h1)).toBe(true)
  })

  test('different payloads produce different hashes', () => {
    const h1 = computeSourceDataHash({ zpid: '123', price: 500000 })
    const h2 = computeSourceDataHash({ zpid: '123', price: 600000 })
    expect(h1).not.toBe(h2)
  })

  test('key order does not matter (canonical sort)', () => {
    const h1 = computeSourceDataHash({ a: 1, b: 2 })
    const h2 = computeSourceDataHash({ b: 2, a: 1 })
    expect(h1).toBe(h2)
  })
})

// ── computeFreshness ─────────────────────────────────────────────────

describe('computeFreshness', () => {
  test('returns expired for null/undefined lastVerifiedAt', () => {
    expect(computeFreshness(null).tier).toBe('expired')
    expect(computeFreshness(undefined).tier).toBe('expired')
    expect(computeFreshness(null).ageMs).toBeNull()
  })

  test('returns expired for invalid date', () => {
    expect(computeFreshness('not-a-date').tier).toBe('expired')
  })

  test('returns fresh for recent verification', () => {
    const recent = new Date(Date.now() - 1000 * 60 * 5).toISOString() // 5 min ago
    expect(computeFreshness(recent).tier).toBe('fresh')
  })

  test('returns stale between staleAfter and expireAfter', () => {
    const stale = new Date(Date.now() - 1000 * 60 * 60 * 13).toISOString() // 13h ago (> 12h stale, < 7d expire)
    expect(computeFreshness(stale).tier).toBe('stale')
  })

  test('returns expired after expireAfter', () => {
    const expired = new Date(Date.now() - 1000 * 60 * 60 * 24 * 8).toISOString() // 8d ago
    expect(computeFreshness(expired).tier).toBe('expired')
  })

  test('custom thresholds', () => {
    const recent = new Date(Date.now() - 1000 * 60 * 30).toISOString() // 30 min ago
    // staleAfterMs = 15min, expireAfterMs = 1hr
    const result = computeFreshness(recent, 15 * 60 * 1000, 60 * 60 * 1000)
    expect(result.tier).toBe('stale')
  })

  test('ageMs tracks elapsed time', () => {
    const oneHourAgo = new Date(Date.now() - 3600 * 1000).toISOString()
    const result = computeFreshness(oneHourAgo)
    expect(result.ageMs).not.toBeNull()
    expect(result.ageMs!).toBeGreaterThan(3500 * 1000) // > ~58 min (account for test lag)
    expect(result.ageMs!).toBeLessThan(3700 * 1000)
  })
})

// ── mapSearchItemToProperty ──────────────────────────────────────────

describe('mapSearchItemToProperty', () => {
  test('returns null for item without zpid', () => {
    const item: ZillowSearchItem = {}
    const result = mapSearchItemToProperty(item)
    expect(result).toBeNull()
  })

  test('maps a complete ZillowSearchItem', () => {
    const item: ZillowSearchItem = {
      zpid: '12345',
      address: '500 Howard St, San Francisco, CA 94105',
      price: 1200000,
      bedrooms: 3,
      bathrooms: 2,
      livingArea: 1500,
      propertyType: 'SINGLE_FAMILY',
      statusType: 'ForSale',
      images: ['http://example.com/img1.jpg', 'http://example.com/img2.jpg'],
      latitude: 37.78,
      longitude: -122.40,
      yearBuilt: 1990,
      lotAreaValue: 5000,
    }

    const result = mapSearchItemToProperty(item, 'San Francisco, CA')
    expect(result).not.toBeNull()

    expect(result!.zpid).toBe('12345')
    expect(result!.address).toBe('500 Howard St')
    expect(result!.city).toBe('San Francisco')
    expect(result!.state).toBe('CA')
    expect(result!.zip_code).toBe('94105')
    expect(result!.price).toBe(1200000)
    expect(result!.bedrooms).toBe(3)
    expect(result!.bathrooms).toBe(2)
    expect(result!.square_feet).toBe(1500)
    expect(result!.property_type).toBe('single_family')
    expect(result!.listing_status).toBe('active')
    expect(result!.images).toEqual(['http://example.com/img1.jpg', 'http://example.com/img2.jpg'])
    expect(result!.latitude).toBe(37.78)
    expect(result!.longitude).toBe(-122.40)
    expect(result!.year_built).toBe(1990)
    expect(result!.lot_size).toBe(5000)
    expect(result!.property_hash).toBeDefined()
    expect(result!.property_hash).toHaveLength(64)
    expect(result!.source_data_hash).toBeDefined()
    expect(result!.source_data_hash).toHaveLength(64)
  })

  test('falls back to imgSrc when images array is empty', () => {
    const item: ZillowSearchItem = {
      zpid: '12345',
      address: '123 Main St, San Francisco, CA 94105',
      price: 500000,
      bedrooms: 2,
      bathrooms: 1,
      propertyType: 'CONDO',
      imgSrc: 'http://example.com/fallback.jpg',
      images: [],
    }

    const result = mapSearchItemToProperty(item)
    expect(result).not.toBeNull()
    expect(result!.images).toEqual(['http://example.com/fallback.jpg'])
  })

  test('falls back to imgSrc when no images array', () => {
    const item: ZillowSearchItem = {
      zpid: '12345',
      address: '123 Main St, San Francisco, CA 94105',
      price: 500000,
      bedrooms: 2,
      bathrooms: 1,
      propertyType: 'CONDO',
      imgSrc: 'http://example.com/solo.jpg',
    }

    const result = mapSearchItemToProperty(item)
    expect(result).not.toBeNull()
    expect(result!.images).toEqual(['http://example.com/solo.jpg'])
  })

  test('clamps price to MAX_INT_SAFE', () => {
    const item: ZillowSearchItem = {
      zpid: '12345',
      address: '123 Main St, San Francisco, CA 94105',
      price: 3_000_000_000, // exceeds MAX_INT_SAFE (2_000_000_000)
      bedrooms: 2,
      bathrooms: 1,
      propertyType: 'SINGLE_FAMILY',
    }
    const result = mapSearchItemToProperty(item)
    expect(result).not.toBeNull()
    expect(result!.price).toBe(2_000_000_000)
  })

  test('normalizes status from statusType', () => {
    const item: ZillowSearchItem = {
      zpid: '12345',
      address: '123 Main St, San Francisco, CA 94105',
      price: 500000,
      bedrooms: 2,
      bathrooms: 1,
      propertyType: 'SINGLE_FAMILY',
      statusType: 'Sold',
    }
    const result = mapSearchItemToProperty(item)
    expect(result).not.toBeNull()
    expect(result!.listing_status).toBe('sold')
  })

  test('returns null for unparseable address', () => {
    const item: ZillowSearchItem = {
      zpid: '12345',
      address: 'NoCityNoState',
    }
    const result = mapSearchItemToProperty(item)
    expect(result).toBeNull()
  })
})

// ── collectZipFallbacks ──────────────────────────────────────────────

describe('collectZipFallbacks', () => {
  test('collects zip codes by city|state key', () => {
    const items: ZillowSearchItem[] = [
      { zpid: '1', city: 'San Francisco', state: 'CA', zipcode: '94105' },
      { zpid: '2', city: 'San Francisco', state: 'CA', zipcode: '94105' },
      { zpid: '3', city: 'Oakland', state: 'CA', zipcode: '94607' },
    ]
    const fallbacks = new Map<string, Map<string, number>>()

    collectZipFallbacks(items, fallbacks)

    const sfKey = 'SAN FRANCISCO|CA'
    const oakKey = 'OAKLAND|CA'
    expect(fallbacks.has(sfKey)).toBe(true)
    expect(fallbacks.has(oakKey)).toBe(true)
    expect(fallbacks.get(sfKey)!.get('94105')).toBe(2)
    expect(fallbacks.get(oakKey)!.get('94607')).toBe(1)
  })

  test('skips items without zipcode', () => {
    const items: ZillowSearchItem[] = [
      { zpid: '1', city: 'SF', state: 'CA' },
    ]
    const fallbacks = new Map<string, Map<string, number>>()

    collectZipFallbacks(items, fallbacks)

    expect(fallbacks.size).toBe(0)
  })

  test('applies fallbackLocation when city/state missing', () => {
    const items: ZillowSearchItem[] = [
      { zpid: '1', zipcode: '94105' },
    ]
    const fallbacks = new Map<string, Map<string, number>>()

    collectZipFallbacks(items, fallbacks, 'San Francisco, CA')

    expect(fallbacks.has('SAN FRANCISCO|CA')).toBe(true)
    expect(fallbacks.get('SAN FRANCISCO|CA')!.get('94105')).toBe(1)
  })
})
