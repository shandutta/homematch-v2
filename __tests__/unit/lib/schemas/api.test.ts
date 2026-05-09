import {
  apiErrorSchema,
  apiResponseSchema,
  apiSuccessSchema,
  createInteractionRequestSchema,
  interactionDeleteRequestSchema,
  interactionListResponseSchema,
  interactionSummarySchema,
  interactionTypeSchema,
  marketingPropertiesResponseSchema,
  marketingPropertySchema,
  paginatedResponseSchema,
  paginationQuerySchema,
  propertySearchQuerySchema,
  supabaseWebhookSchema,
  updateProfileRequestSchema,
} from '@/lib/schemas/api'

const VALID_UUID = '11111111-1111-1111-1111-111111111111'

describe('api schemas', () => {
  describe('apiSuccessSchema and apiErrorSchema', () => {
    it('accepts success response', () => {
      const result = apiSuccessSchema.safeParse({
        success: true,
        data: { foo: 'bar' },
      })
      expect(result.success).toBe(true)
    })

    it('rejects success with success=false', () => {
      expect(
        apiSuccessSchema.safeParse({ success: false, data: {} }).success
      ).toBe(false)
    })

    it('accepts error response with code and details', () => {
      const result = apiErrorSchema.safeParse({
        success: false,
        error: { message: 'fail', code: 'X1', details: { hint: 'retry' } },
      })
      expect(result.success).toBe(true)
    })

    it('accepts error without optional fields', () => {
      const result = apiErrorSchema.safeParse({
        success: false,
        error: { message: 'fail' },
      })
      expect(result.success).toBe(true)
    })

    it('apiResponseSchema accepts either union member', () => {
      expect(
        apiResponseSchema.safeParse({ success: true, data: 1 }).success
      ).toBe(true)
      expect(
        apiResponseSchema.safeParse({
          success: false,
          error: { message: 'no' },
        }).success
      ).toBe(true)
    })
  })

  describe('paginationQuerySchema', () => {
    it('coerces string values into numbers', () => {
      const result = paginationQuerySchema.safeParse({
        page: '3',
        limit: '50',
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.page).toBe(3)
        expect(result.data.limit).toBe(50)
      }
    })

    it('uses defaults when fields are omitted', () => {
      const result = paginationQuerySchema.safeParse({})
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.page).toBe(1)
        expect(result.data.limit).toBe(20)
      }
    })

    it('accepts a cursor', () => {
      const result = paginationQuerySchema.safeParse({
        cursor: 'abc-123',
      })
      expect(result.success).toBe(true)
    })
  })

  describe('paginatedResponseSchema', () => {
    it('accepts a paginated response payload', () => {
      const result = paginatedResponseSchema.safeParse({
        data: [1, 2, 3],
        pagination: {
          page: 1,
          limit: 10,
          total: 100,
          totalPages: 10,
          hasNext: true,
          hasPrev: false,
        },
      })
      expect(result.success).toBe(true)
    })

    it('rejects when pagination fields missing', () => {
      expect(
        paginatedResponseSchema.safeParse({
          data: [],
          pagination: { page: 1 },
        }).success
      ).toBe(false)
    })
  })

  describe('interaction schemas', () => {
    it('interactionTypeSchema accepts both ui and db values', () => {
      expect(interactionTypeSchema.safeParse('like').success).toBe(true)
      expect(interactionTypeSchema.safeParse('liked').success).toBe(true)
      expect(interactionTypeSchema.safeParse('view').success).toBe(true)
      expect(interactionTypeSchema.safeParse('viewed').success).toBe(true)
      expect(interactionTypeSchema.safeParse('skip').success).toBe(true)
      expect(interactionTypeSchema.safeParse('dislike').success).toBe(true)
    })

    it('interactionTypeSchema rejects unknown values', () => {
      expect(interactionTypeSchema.safeParse('love').success).toBe(false)
    })

    it('createInteractionRequestSchema validates the request', () => {
      const result = createInteractionRequestSchema.safeParse({
        propertyId: VALID_UUID,
        type: 'liked',
        householdId: VALID_UUID,
      })
      expect(result.success).toBe(true)
    })

    it('createInteractionRequestSchema rejects bad uuid', () => {
      expect(
        createInteractionRequestSchema.safeParse({
          propertyId: 'no',
          type: 'liked',
        }).success
      ).toBe(false)
    })

    it('interactionSummarySchema rejects negative counts', () => {
      expect(
        interactionSummarySchema.safeParse({
          viewed: -1,
          liked: 0,
          passed: 0,
        }).success
      ).toBe(false)
    })

    it('interactionListResponseSchema accepts items with property', () => {
      const result = interactionListResponseSchema.safeParse({
        items: [
          {
            id: VALID_UUID,
            property_id: VALID_UUID,
            interaction_type: 'like',
            created_at: '2024-01-01T00:00:00.000Z',
            property: {
              address: '1 Main',
              city: 'Oakland',
              state: 'CA',
              price: 500,
              images: null,
            },
          },
        ],
        nextCursor: null,
      })
      expect(result.success).toBe(true)
    })

    it('interactionDeleteRequestSchema validates', () => {
      expect(
        interactionDeleteRequestSchema.safeParse({ propertyId: VALID_UUID })
          .success
      ).toBe(true)
      expect(
        interactionDeleteRequestSchema.safeParse({ propertyId: 'no' }).success
      ).toBe(false)
    })
  })

  describe('propertySearchQuerySchema', () => {
    it('coerces numeric ranges from strings', () => {
      const result = propertySearchQuerySchema.safeParse({
        price_min: '100',
        price_max: '1000',
        bedrooms_min: '1',
        bathrooms_max: '2.5',
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.price_min).toBe(100)
        expect(result.data.price_max).toBe(1000)
        expect(result.data.bedrooms_min).toBe(1)
        expect(result.data.bathrooms_max).toBe(2.5)
      }
    })

    it('splits comma-separated lists', () => {
      const result = propertySearchQuerySchema.safeParse({
        property_types: 'condo,townhome',
        neighborhoods: 'a,b,c',
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.property_types).toEqual(['condo', 'townhome'])
        expect(result.data.neighborhoods).toEqual(['a', 'b', 'c'])
      }
    })

    it('returns undefined for omitted fields', () => {
      const result = propertySearchQuerySchema.safeParse({})
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.price_min).toBeUndefined()
        expect(result.data.property_types).toBeUndefined()
      }
    })
  })

  describe('marketingPropertySchema', () => {
    it('accepts a valid marketing property', () => {
      const result = marketingPropertySchema.safeParse({
        zpid: '12345',
        imageUrl: 'https://cdn.example.com/x.jpg',
        price: 500000,
        bedrooms: 3,
        bathrooms: 2,
        address: '1 Main',
        latitude: 37.7,
        longitude: -122.2,
      })
      expect(result.success).toBe(true)
    })

    it('accepts null numeric fields', () => {
      const result = marketingPropertySchema.safeParse({
        zpid: '12345',
        imageUrl: null,
        price: null,
        bedrooms: null,
        bathrooms: null,
        address: '1 Main',
        latitude: null,
        longitude: null,
      })
      expect(result.success).toBe(true)
    })

    it('rejects non-URL imageUrl', () => {
      expect(
        marketingPropertySchema.safeParse({
          zpid: '12345',
          imageUrl: 'not-a-url',
          price: null,
          bedrooms: null,
          bathrooms: null,
          address: '',
          latitude: null,
          longitude: null,
        }).success
      ).toBe(false)
    })

    it('marketingPropertiesResponseSchema accepts an empty array', () => {
      expect(marketingPropertiesResponseSchema.safeParse([]).success).toBe(true)
    })
  })

  describe('updateProfileRequestSchema', () => {
    it('accepts a partial update', () => {
      expect(
        updateProfileRequestSchema.safeParse({
          onboarding_completed: true,
        }).success
      ).toBe(true)
    })

    it('accepts an empty update', () => {
      expect(updateProfileRequestSchema.safeParse({}).success).toBe(true)
    })
  })

  describe('supabaseWebhookSchema', () => {
    it('accepts a valid webhook payload', () => {
      const result = supabaseWebhookSchema.safeParse({
        type: 'INSERT',
        table: 'users',
        record: { id: 1 },
        old_record: { id: 0 },
        schema: 'public',
      })
      expect(result.success).toBe(true)
    })

    it('rejects invalid type literal', () => {
      expect(
        supabaseWebhookSchema.safeParse({
          type: 'PATCH',
          table: 'users',
          record: {},
          schema: 'public',
        }).success
      ).toBe(false)
    })
  })
})
