/**
 * Unit tests for the /property metadata mapping — the logic that decides a
 * listing's status, type, and the rich enrichment fields on re-ingest. Locks
 * in the invariants the geo/ingest audit relied on:
 *  - listing_status only ever emits values valid in BOTH the DB CHECK and the
 *    Zod enum (active|pending|sold)
 *  - property_type aliases Zillow's homeType variants (TOWNHOUSE -> townhome)
 *  - extractPropertyMetadata pulls inline schools/price/tax/zestimate +
 *    derives days-on-market, and never throws on a sparse payload
 */
import {
  mapHomeStatusToListingStatus,
  normalizePropertyType,
  extractPropertyMetadata,
} from '@/lib/ingestion/zillow-property'

describe('mapHomeStatusToListingStatus', () => {
  it('FOR_SALE / COMING_SOON / unknown / empty -> active', () => {
    expect(mapHomeStatusToListingStatus('FOR_SALE')).toBe('active')
    expect(mapHomeStatusToListingStatus('COMING_SOON')).toBe('active')
    expect(mapHomeStatusToListingStatus(undefined)).toBe('active')
    expect(mapHomeStatusToListingStatus('')).toBe('active')
  })

  it('pending variants -> pending', () => {
    expect(mapHomeStatusToListingStatus('PENDING')).toBe('pending')
    expect(mapHomeStatusToListingStatus('CONTINGENT')).toBe('pending')
    expect(mapHomeStatusToListingStatus('UNDER_CONTRACT')).toBe('pending')
  })

  it('sold / off-market / withdrawn / foreclosed -> sold', () => {
    expect(mapHomeStatusToListingStatus('SOLD')).toBe('sold')
    expect(mapHomeStatusToListingStatus('RECENTLY_SOLD')).toBe('sold')
    expect(mapHomeStatusToListingStatus('OFF_MARKET')).toBe('sold')
    expect(mapHomeStatusToListingStatus('FORECLOSED')).toBe('sold')
    expect(mapHomeStatusToListingStatus('WITHDRAWN')).toBe('sold')
  })

  it('NEVER emits a value outside active|pending|sold (DB CHECK + Zod enum intersection)', () => {
    const allowed = new Set(['active', 'pending', 'sold'])
    const inputs = [
      'FOR_SALE',
      'PENDING',
      'SOLD',
      'OFF_MARKET',
      'REMOVED',
      'NEW_LISTING',
      'OTHER',
      'EXPIRED',
      'whatever',
      '',
    ]
    for (const s of inputs) {
      expect(allowed.has(mapHomeStatusToListingStatus(s))).toBe(true)
    }
  })
})

describe('normalizePropertyType', () => {
  it('passes through valid enum values (any case / spacing)', () => {
    expect(normalizePropertyType('SINGLE_FAMILY')).toBe('single_family')
    expect(normalizePropertyType('Single Family')).toBe('single_family')
    expect(normalizePropertyType('CONDO')).toBe('condo')
    expect(normalizePropertyType('MULTI_FAMILY')).toBe('multi_family')
    expect(normalizePropertyType('manufactured')).toBe('manufactured')
  })

  it('aliases Zillow homeType variants to the enum', () => {
    expect(normalizePropertyType('TOWNHOUSE')).toBe('townhome')
    expect(normalizePropertyType('APARTMENT')).toBe('condo')
    expect(normalizePropertyType('LOT')).toBe('land')
    expect(normalizePropertyType('MOBILE')).toBe('manufactured')
  })

  it('falls back to single_family for unknown / empty', () => {
    expect(normalizePropertyType(undefined)).toBe('single_family')
    expect(normalizePropertyType(null)).toBe('single_family')
    expect(normalizePropertyType('castle')).toBe('single_family')
  })
})

describe('extractPropertyMetadata', () => {
  it('reads inline enrichment fields + derives days_on_market', () => {
    const listedDaysAgo = 12
    const out = extractPropertyMetadata({
      bedrooms: 3,
      bathrooms: 2,
      livingArea: 1500,
      yearBuilt: 1990,
      price: 1_200_000,
      homeType: 'TOWNHOUSE',
      homeStatus: 'FOR_SALE',
      address: {
        streetAddress: '1 Main St',
        city: 'San Francisco',
        state: 'CA',
        zipcode: '94110',
      },
      zestimate: 1_250_000,
      rentZestimate: 4200,
      schools: [{ name: 'Lincoln', rating: 9 }],
      priceHistory: [{ event: 'Listed for sale', price: 1_200_000 }],
      taxHistory: [{ taxPaid: 14000 }],
      datePosted: new Date(Date.now() - listedDaysAgo * 86_400_000)
        .toISOString()
        .slice(0, 10),
    })
    expect(out.property_type).toBe('townhome') // aliased, not single_family
    expect(out.listing_status).toBe('active')
    expect(out.city).toBe('San Francisco')
    expect(out.zestimate).toBe(1_250_000)
    expect(out.rent_zestimate).toBe(4200)
    expect(out.schools).toHaveLength(1)
    expect(out.price_history).toHaveLength(1)
    expect(out.tax_history).toHaveLength(1)
    expect(out.days_on_market).toBeGreaterThanOrEqual(listedDaysAgo - 1)
  })

  it('returns nulls (never throws) on a sparse/empty payload', () => {
    const out = extractPropertyMetadata({})
    expect(out.price).toBeNull()
    expect(out.bedrooms).toBeNull()
    expect(out.schools).toBeNull()
    expect(out.price_history).toBeNull()
    expect(out.days_on_market).toBeNull()
    expect(out.hoa_fee).toBeNull()
    expect(out.property_type).toBe('single_family')
    expect(out.listing_status).toBe('active')
  })

  it('parses HOA from a string or resoFacts number', () => {
    expect(extractPropertyMetadata({ monthlyHoaFee: 250 }).hoa_fee).toBe(250)
    expect(
      extractPropertyMetadata({ resoFacts: { hoaFee: '$425/mo' } }).hoa_fee
    ).toBe(425)
  })
})
