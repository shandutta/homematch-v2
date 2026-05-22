/**
 * Unit tests for discover.ts pure helpers. propertyExtendedSearch returns no
 * separate city/zip fields — only a full address string — so parseAddress is
 * what decides which city (and therefore which neighborhood pool) a discovered
 * listing lands in. These lock in that parsing + the status/type mappings.
 */
import {
  parseAddress,
  normalizeHomeType,
  normalizeListingStatus,
  isBayAreaCity,
  toPositiveInt,
  toNonNegativeInt,
  toBathrooms,
  toYearBuilt,
} from '@/lib/ingestion/discover'

describe('parseAddress', () => {
  it('parses the standard "Street, City, ST ZIP" shape', () => {
    expect(parseAddress('50 Cascade Walk, San Francisco, CA 94116')).toEqual({
      city: 'San Francisco',
      state: 'CA',
      zip: '94116',
    })
  })

  it('handles a unit number in the street segment', () => {
    expect(parseAddress('123 Main St #4, Oakland, CA 94601')).toEqual({
      city: 'Oakland',
      state: 'CA',
      zip: '94601',
    })
  })

  it('handles an extra comma segment (city stays second-to-last)', () => {
    const r = parseAddress('1 A St, Unit B, San Jose, CA 95112')
    expect(r.city).toBe('San Jose')
    expect(r.state).toBe('CA')
    expect(r.zip).toBe('95112')
  })

  it('returns empties for undefined / empty input', () => {
    expect(parseAddress(undefined)).toEqual({ city: '', state: '', zip: '' })
    expect(parseAddress('')).toEqual({ city: '', state: '', zip: '' })
  })
})

describe('normalizeHomeType (discover)', () => {
  it('maps Zillow result home types into the property_type enum', () => {
    expect(normalizeHomeType('SINGLE_FAMILY')).toBe('single_family')
    expect(normalizeHomeType('TOWNHOUSE')).toBe('townhome')
    expect(normalizeHomeType('CONDO')).toBe('condo')
    expect(normalizeHomeType('APARTMENT')).toBe('condo')
    expect(normalizeHomeType('MULTI_FAMILY')).toBe('multi_family')
    expect(normalizeHomeType('LOT')).toBe('land')
    expect(normalizeHomeType(undefined)).toBe('single_family')
  })
})

describe('normalizeListingStatus (discover)', () => {
  it('emits only active|pending|sold (DB CHECK + Zod enum intersection)', () => {
    expect(normalizeListingStatus('FOR_SALE')).toBe('active')
    expect(normalizeListingStatus('Pending')).toBe('pending')
    expect(normalizeListingStatus('SOLD')).toBe('sold')
    expect(normalizeListingStatus('off market')).toBe('sold')
    expect(normalizeListingStatus(undefined)).toBe('active')
  })
})

describe('isBayAreaCity', () => {
  it('matches the allowlist case-insensitively, rejects others', () => {
    expect(isBayAreaCity('San Francisco')).toBe(true)
    expect(isBayAreaCity('OAKLAND')).toBe(true)
    expect(isBayAreaCity('san jose')).toBe(true)
    expect(isBayAreaCity('Fresno')).toBe(false)
    expect(isBayAreaCity('')).toBe(false)
  })
})

describe('numeric coercion (discover thin-insert column/CHECK safety)', () => {
  it('toPositiveInt rounds floats and nulls non-positive / out-of-range', () => {
    expect(toPositiveInt(8276.4)).toBe(8276) // sqft float -> int
    expect(toPositiveInt(1500)).toBe(1500)
    expect(toPositiveInt(0.25)).toBeNull() // acres round to 0 -> null
    expect(toPositiveInt(0)).toBeNull()
    expect(toPositiveInt(-5)).toBeNull()
    expect(toPositiveInt(undefined)).toBeNull()
    expect(toPositiveInt(null)).toBeNull()
    expect(toPositiveInt(3_000_000_000)).toBeNull() // > int4 max
  })

  it('toNonNegativeInt coerces null/negative to 0 (bedrooms is NOT NULL)', () => {
    expect(toNonNegativeInt(3)).toBe(3)
    expect(toNonNegativeInt(2.9)).toBe(3)
    expect(toNonNegativeInt(0)).toBe(0)
    expect(toNonNegativeInt(null)).toBe(0)
    expect(toNonNegativeInt(undefined)).toBe(0)
    expect(toNonNegativeInt(-4)).toBe(0)
  })

  it('toBathrooms keeps 0..9.9 at one decimal, nulls >=10 (numeric(2,1))', () => {
    expect(toBathrooms(2.5)).toBe(2.5)
    expect(toBathrooms(0)).toBe(0)
    expect(toBathrooms(12)).toBeNull() // multifamily overflow
    expect(toBathrooms(10)).toBeNull()
    expect(toBathrooms(-1)).toBeNull()
    expect(toBathrooms(null)).toBeNull()
  })

  it('toYearBuilt enforces the 1700..2100 CHECK window', () => {
    expect(toYearBuilt(1990)).toBe(1990)
    expect(toYearBuilt(1700)).toBe(1700)
    expect(toYearBuilt(2100)).toBe(2100)
    expect(toYearBuilt(1600)).toBeNull()
    expect(toYearBuilt(2200)).toBeNull()
    expect(toYearBuilt(null)).toBeNull()
  })
})
