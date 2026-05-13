/**
 * Anti-redundancy guard for INGEST-001.
 *
 * The original prod audit found `description: null` and `amenities: null`
 * hardcoded in both the strict (`DataTransformer`) and relaxed
 * (`RelaxedPropertyTransformer`) migration paths despite the raw source
 * carrying both fields. PR #38 fixed the bug, but nothing in the test
 * suite prevented a future contributor from "simplifying" the
 * preservation logic back to a hardcoded null and re-introducing the
 * 13K-row hallucination class.
 *
 * These fixtures assert the contract directly: given a raw record with
 * `description` and `amenities`, the transformer must propagate them.
 * Given an absent field, the transformer must default to null without
 * inventing values.
 */
import { DataTransformer } from '@/lib/migration/data-transformer'
import { RelaxedPropertyTransformer } from '@/lib/migration/relaxed-property-transformer'

const baseRaw = {
  id: 'p-1',
  zpid: '12345',
  address: '100 Test St',
  city: 'Testville',
  state: 'CA',
  zip_code: '94100',
  price: 750000,
  bedrooms: 3,
  bathrooms: 2,
  square_feet: 1800,
  year_built: 1995,
  lot_size: 5000,
  property_type: 'single_family',
  listing_status: 'active',
  images: ['https://img.example/a.jpg', 'https://img.example/b.jpg'],
  latitude: 37.7,
  longitude: -122.4,
}

describe('DataTransformer.transformProperty — description + amenities (INGEST-001 guard)', () => {
  const transformer = new DataTransformer()

  test('preserves description and amenities when both are present', () => {
    const result = transformer.transformProperty({
      ...baseRaw,
      description: '  Bright corner unit with bay views.  ',
      amenities: ['kitchen island', 'two-car garage', 'central air'],
    })
    expect(result.success).toBe(true)
    expect(result.data?.description).toBe('Bright corner unit with bay views.')
    expect(result.data?.amenities).toEqual([
      'kitchen island',
      'two-car garage',
      'central air',
    ])
  })

  test('returns null when description is absent', () => {
    const result = transformer.transformProperty({
      ...baseRaw,
      amenities: ['pool'],
    })
    expect(result.success).toBe(true)
    expect(result.data?.description).toBeNull()
    expect(result.data?.amenities).toEqual(['pool'])
  })

  test('returns null when amenities is absent', () => {
    const result = transformer.transformProperty({
      ...baseRaw,
      description: 'Cozy bungalow',
    })
    expect(result.success).toBe(true)
    expect(result.data?.description).toBe('Cozy bungalow')
    expect(result.data?.amenities).toBeNull()
  })

  test('returns null when both fields are empty strings / arrays', () => {
    const result = transformer.transformProperty({
      ...baseRaw,
      description: '   ',
      amenities: [],
    })
    expect(result.success).toBe(true)
    expect(result.data?.description).toBeNull()
    expect(result.data?.amenities).toBeNull()
  })

  test('filters non-string entries out of amenities', () => {
    const result = transformer.transformProperty({
      ...baseRaw,
      amenities: [
        'pool',
        '',
        // @ts-expect-error -- runtime input may contain a non-string number
        123,
        // @ts-expect-error -- runtime input may contain null entries
        null,
        'fireplace',
      ],
    })
    expect(result.success).toBe(true)
    expect(result.data?.amenities).toEqual(['pool', 'fireplace'])
  })
})

describe('RelaxedPropertyTransformer.transformProperty — description + amenities (INGEST-001 guard)', () => {
  const transformer = new RelaxedPropertyTransformer()

  test('preserves description and amenities when both are present', () => {
    const result = transformer.transformProperty({
      ...baseRaw,
      description: 'Updated kitchen with quartz counters',
      amenities: ['hardwood floors', 'central air'],
    })
    expect(result.success).toBe(true)
    expect(result.data?.description).toBe(
      'Updated kitchen with quartz counters'
    )
    expect(result.data?.amenities).toEqual(['hardwood floors', 'central air'])
  })

  test('returns null when both fields are absent', () => {
    const result = transformer.transformProperty(baseRaw)
    expect(result.success).toBe(true)
    expect(result.data?.description).toBeNull()
    expect(result.data?.amenities).toBeNull()
  })
})
