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
