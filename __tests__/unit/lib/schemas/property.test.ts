import {
  neighborhoodInsertSchema,
  neighborhoodSchema,
  neighborhoodUpdateSchema,
  PROPERTY_TYPE_VALUES,
  propertyFiltersSchema,
  propertyInsertSchema,
  propertyPaginationSchema,
  propertySchema,
  propertySearchSchema,
  propertySortSchema,
  propertyUpdateSchema,
  propertyWithNeighborhoodSchema,
} from '@/lib/schemas/property'

const VALID_UUID = '11111111-1111-1111-1111-111111111111'
const VALID_TS = '2024-01-01T00:00:00.000Z'

const baseProperty = {
  id: VALID_UUID,
  zpid: '12345',
  address: '123 Main St',
  city: 'Oakland',
  state: 'CA',
  zip_code: '94601',
  price: 500000,
  bedrooms: 3,
  bathrooms: 2,
  square_feet: 1500,
  property_type: 'single_family' as const,
  images: ['https://cdn.example.com/img1.jpg', '/local/img2.jpg'],
  description: 'Lovely',
  coordinates: { lat: 37.7, lng: -122.2 },
  neighborhood_id: VALID_UUID,
  amenities: ['pool', 'gym'],
  year_built: 2000,
  lot_size_sqft: 5000,
  parking_spots: 2,
  listing_status: 'active' as const,
  property_hash: 'abc',
  is_active: true,
  created_at: VALID_TS,
  updated_at: VALID_TS,
}

describe('property schemas', () => {
  describe('PROPERTY_TYPE_VALUES', () => {
    it('contains the canonical property types', () => {
      expect(PROPERTY_TYPE_VALUES).toEqual([
        'single_family',
        'condo',
        'townhome',
        'multi_family',
        'manufactured',
        'land',
        'other',
      ])
    })
  })

  describe('propertySchema', () => {
    it('accepts a complete valid property', () => {
      const result = propertySchema.safeParse(baseProperty)
      expect(result.success).toBe(true)
    })

    it('rejects invalid uuid', () => {
      expect(
        propertySchema.safeParse({ ...baseProperty, id: 'not-a-uuid' }).success
      ).toBe(false)
    })

    it('rejects state with wrong length', () => {
      expect(
        propertySchema.safeParse({ ...baseProperty, state: 'California' })
          .success
      ).toBe(false)
    })

    it('rejects negative price', () => {
      expect(
        propertySchema.safeParse({ ...baseProperty, price: -1 }).success
      ).toBe(false)
    })

    it('coerces stringified numeric fields', () => {
      const result = propertySchema.safeParse({
        ...baseProperty,
        price: '500000',
        bedrooms: '3',
        bathrooms: '2',
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.price).toBe(500000)
        expect(result.data.bedrooms).toBe(3)
      }
    })

    it('rejects bedrooms over 20', () => {
      expect(
        propertySchema.safeParse({ ...baseProperty, bedrooms: 25 }).success
      ).toBe(false)
    })

    it('accepts 0 bedrooms (studio)', () => {
      const result = propertySchema.safeParse({ ...baseProperty, bedrooms: 0 })
      expect(result.success).toBe(true)
    })

    it('rejects zip codes shorter than 5 chars', () => {
      expect(
        propertySchema.safeParse({ ...baseProperty, zip_code: '123' }).success
      ).toBe(false)
    })

    it('accepts coordinates as a GeoJSON Point', () => {
      const result = propertySchema.safeParse({
        ...baseProperty,
        coordinates: { type: 'Point', coordinates: [-122.2, 37.7] },
      })
      expect(result.success).toBe(true)
    })

    it('accepts null coordinates', () => {
      const result = propertySchema.safeParse({
        ...baseProperty,
        coordinates: null,
      })
      expect(result.success).toBe(true)
    })

    it('rejects invalid property_type literal', () => {
      expect(
        propertySchema.safeParse({
          ...baseProperty,
          property_type: 'castle',
        }).success
      ).toBe(false)
    })

    it('rejects invalid listing_status', () => {
      expect(
        propertySchema.safeParse({
          ...baseProperty,
          listing_status: 'unknown',
        }).success
      ).toBe(false)
    })

    it('rejects year_built earlier than 1800', () => {
      expect(
        propertySchema.safeParse({ ...baseProperty, year_built: 1500 }).success
      ).toBe(false)
    })

    it('accepts URL or path image entries', () => {
      const result = propertySchema.safeParse({
        ...baseProperty,
        images: ['https://x.com/y.png', '/foo/bar.png'],
      })
      expect(result.success).toBe(true)
    })

    it('rejects non-URL non-path image entries', () => {
      expect(
        propertySchema.safeParse({
          ...baseProperty,
          images: ['not-a-url-or-path'],
        }).success
      ).toBe(false)
    })
  })

  describe('propertyInsertSchema', () => {
    it('accepts a payload without id/created_at/updated_at', () => {
      const { id: _id, created_at: _c, updated_at: _u, ...rest } = baseProperty
      const result = propertyInsertSchema.safeParse(rest)
      expect(result.success).toBe(true)
    })

    it('allows omitting optional fields', () => {
      const result = propertyInsertSchema.safeParse({
        address: '1 Way',
        city: 'Oakland',
        state: 'CA',
        zip_code: '94601',
        price: 100,
        bedrooms: 1,
        bathrooms: 1,
      })
      expect(result.success).toBe(true)
    })
  })

  describe('propertyUpdateSchema', () => {
    it('accepts an empty update object', () => {
      const result = propertyUpdateSchema.safeParse({})
      expect(result.success).toBe(true)
    })

    it('accepts partial updates', () => {
      const result = propertyUpdateSchema.safeParse({ price: 999 })
      expect(result.success).toBe(true)
    })
  })

  describe('neighborhoodSchema', () => {
    const baseNeighborhood = {
      id: VALID_UUID,
      name: 'Rockridge',
      city: 'Oakland',
      state: 'CA',
      metro_area: 'Bay Area',
      bounds: null,
      median_price: 750000,
      walk_score: 90,
      transit_score: 85,
      created_at: VALID_TS,
    }

    it('accepts a valid neighborhood', () => {
      expect(neighborhoodSchema.safeParse(baseNeighborhood).success).toBe(true)
    })

    it('rejects walk_score over 100', () => {
      expect(
        neighborhoodSchema.safeParse({ ...baseNeighborhood, walk_score: 150 })
          .success
      ).toBe(false)
    })

    it('rejects negative median_price', () => {
      expect(
        neighborhoodSchema.safeParse({
          ...baseNeighborhood,
          median_price: -1,
        }).success
      ).toBe(false)
    })

    it('accepts a GeoJSON polygon for bounds', () => {
      const result = neighborhoodSchema.safeParse({
        ...baseNeighborhood,
        bounds: {
          type: 'Polygon',
          coordinates: [
            [
              [-122, 37],
              [-122, 38],
              [-121, 38],
              [-122, 37],
            ],
          ],
        },
      })
      expect(result.success).toBe(true)
    })
  })

  describe('neighborhoodInsertSchema and updateSchema', () => {
    it('insert allows omitting optional fields', () => {
      const result = neighborhoodInsertSchema.safeParse({
        name: 'Rockridge',
        city: 'Oakland',
        state: 'CA',
      })
      expect(result.success).toBe(true)
    })

    it('update accepts empty object', () => {
      expect(neighborhoodUpdateSchema.safeParse({}).success).toBe(true)
    })
  })

  describe('propertyFiltersSchema', () => {
    it('accepts an empty filter object', () => {
      expect(propertyFiltersSchema.safeParse({}).success).toBe(true)
    })

    it('accepts a complex filter', () => {
      const result = propertyFiltersSchema.safeParse({
        price_min: 100,
        price_max: 1000,
        bedrooms_min: 1,
        bedrooms_max: 5,
        property_types: ['condo', 'townhome'],
        cities: [{ city: 'Oakland', state: 'CA' }],
        within_radius: { center: [-122, 37], radius_km: 10 },
      })
      expect(result.success).toBe(true)
    })

    it('rejects within_radius radius_km > 100', () => {
      expect(
        propertyFiltersSchema.safeParse({
          within_radius: { center: [-122, 37], radius_km: 999 },
        }).success
      ).toBe(false)
    })

    it('rejects invalid city state pair (state too long)', () => {
      expect(
        propertyFiltersSchema.safeParse({
          cities: [{ city: 'Oakland', state: 'CAL' }],
        }).success
      ).toBe(false)
    })
  })

  describe('propertySortSchema', () => {
    it('defaults direction to asc', () => {
      const result = propertySortSchema.safeParse({ field: 'price' })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.direction).toBe('asc')
      }
    })

    it('rejects invalid sort field', () => {
      expect(
        propertySortSchema.safeParse({ field: 'random' }).success
      ).toBe(false)
    })
  })

  describe('propertyPaginationSchema', () => {
    it('applies defaults when fields omitted', () => {
      const result = propertyPaginationSchema.safeParse({})
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.page).toBe(1)
        expect(result.data.limit).toBe(20)
      }
    })

    it('rejects limit > 100', () => {
      expect(
        propertyPaginationSchema.safeParse({ page: 1, limit: 500 }).success
      ).toBe(false)
    })

    it('rejects page < 1', () => {
      expect(
        propertyPaginationSchema.safeParse({ page: 0, limit: 10 }).success
      ).toBe(false)
    })
  })

  describe('propertySearchSchema and propertyWithNeighborhoodSchema', () => {
    it('accepts an empty search', () => {
      expect(propertySearchSchema.safeParse({}).success).toBe(true)
    })

    it('property + neighborhood with null neighborhood', () => {
      const result = propertyWithNeighborhoodSchema.safeParse({
        ...baseProperty,
        neighborhood: null,
      })
      expect(result.success).toBe(true)
    })
  })
})
