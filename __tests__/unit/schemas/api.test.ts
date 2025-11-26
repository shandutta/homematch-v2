import {
  apiSuccessSchema,
  apiErrorSchema,
  apiResponseSchema,
  paginationQuerySchema,
  paginatedResponseSchema,
  interactionTypeSchema,
  createInteractionRequestSchema,
  interactionSummarySchema,
  interactionListResponseSchema,
  interactionDeleteRequestSchema,
  propertySearchQuerySchema,
  marketingPropertySchema,
  marketingPropertiesResponseSchema,
  updateProfileRequestSchema,
  supabaseWebhookSchema,
} from '@/lib/schemas/api'

describe('API Schema Validation', () => {
  describe('apiSuccessSchema', () => {
    test('should validate successful API response', () => {
      const result = apiSuccessSchema.safeParse({
        success: true,
        data: { id: '123', name: 'Test' },
      })
      expect(result.success).toBe(true)
    })

    test('should reject response with success: false', () => {
      const result = apiSuccessSchema.safeParse({
        success: false,
        data: {},
      })
      expect(result.success).toBe(false)
    })

    test('should accept any data type', () => {
      const testCases = [
        { success: true, data: null },
        { success: true, data: [] },
        { success: true, data: 'string' },
        { success: true, data: 123 },
      ]

      testCases.forEach((testCase) => {
        const result = apiSuccessSchema.safeParse(testCase)
        expect(result.success).toBe(true)
      })
    })
  })

  describe('apiErrorSchema', () => {
    test('should validate error response with message', () => {
      const result = apiErrorSchema.safeParse({
        success: false,
        error: { message: 'Something went wrong' },
      })
      expect(result.success).toBe(true)
    })

    test('should validate error response with code and details', () => {
      const result = apiErrorSchema.safeParse({
        success: false,
        error: {
          message: 'Validation failed',
          code: 'VALIDATION_ERROR',
          details: [{ field: 'email', message: 'Invalid format' }],
        },
      })
      expect(result.success).toBe(true)
    })

    test('should reject response with success: true', () => {
      const result = apiErrorSchema.safeParse({
        success: true,
        error: { message: 'Error' },
      })
      expect(result.success).toBe(false)
    })

    test('should require error message', () => {
      const result = apiErrorSchema.safeParse({
        success: false,
        error: {},
      })
      expect(result.success).toBe(false)
    })
  })

  describe('apiResponseSchema', () => {
    test('should validate both success and error responses', () => {
      const successResult = apiResponseSchema.safeParse({
        success: true,
        data: { test: 'data' },
      })
      expect(successResult.success).toBe(true)

      const errorResult = apiResponseSchema.safeParse({
        success: false,
        error: { message: 'Error message' },
      })
      expect(errorResult.success).toBe(true)
    })
  })

  describe('paginationQuerySchema', () => {
    test('should transform string values to numbers', () => {
      const result = paginationQuerySchema.safeParse({
        page: '2',
        limit: '25',
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.page).toBe(2)
        expect(result.data.limit).toBe(25)
      }
    })

    test('should use defaults when values not provided', () => {
      const result = paginationQuerySchema.safeParse({})
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.page).toBe(1)
        expect(result.data.limit).toBe(20)
      }
    })

    test('should handle cursor parameter', () => {
      const result = paginationQuerySchema.safeParse({
        cursor: 'abc123',
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.cursor).toBe('abc123')
      }
    })
  })

  describe('paginatedResponseSchema', () => {
    test('should validate paginated response', () => {
      const result = paginatedResponseSchema.safeParse({
        data: [{ id: 1 }, { id: 2 }],
        pagination: {
          page: 1,
          limit: 20,
          total: 100,
          totalPages: 5,
          hasNext: true,
          hasPrev: false,
        },
      })
      expect(result.success).toBe(true)
    })

    test('should accept optional nextCursor', () => {
      const result = paginatedResponseSchema.safeParse({
        data: [],
        pagination: {
          page: 1,
          limit: 20,
          total: 0,
          totalPages: 0,
          hasNext: false,
          hasPrev: false,
          nextCursor: 'cursor123',
        },
      })
      expect(result.success).toBe(true)
    })

    test('should accept null nextCursor', () => {
      const result = paginatedResponseSchema.safeParse({
        data: [],
        pagination: {
          page: 1,
          limit: 20,
          total: 0,
          totalPages: 0,
          hasNext: false,
          hasPrev: false,
          nextCursor: null,
        },
      })
      expect(result.success).toBe(true)
    })
  })

  describe('interactionTypeSchema', () => {
    test('should validate database interaction types', () => {
      const dbTypes = ['like', 'dislike', 'skip', 'view']

      dbTypes.forEach((type) => {
        const result = interactionTypeSchema.safeParse(type)
        expect(result.success).toBe(true)
      })
    })

    test('should validate UI interaction types', () => {
      const uiTypes = ['liked', 'viewed', 'skip']

      uiTypes.forEach((type) => {
        const result = interactionTypeSchema.safeParse(type)
        expect(result.success).toBe(true)
      })
    })

    test('should reject invalid interaction types', () => {
      const result = interactionTypeSchema.safeParse('favorite')
      expect(result.success).toBe(false)
    })
  })

  describe('createInteractionRequestSchema', () => {
    test('should validate valid interaction request', () => {
      const result = createInteractionRequestSchema.safeParse({
        propertyId: '550e8400-e29b-41d4-a716-446655440000',
        type: 'like',
      })
      expect(result.success).toBe(true)
    })

    test('should validate with optional householdId', () => {
      const result = createInteractionRequestSchema.safeParse({
        propertyId: '550e8400-e29b-41d4-a716-446655440000',
        type: 'liked',
        householdId: '660e8400-e29b-41d4-a716-446655440001',
      })
      expect(result.success).toBe(true)
    })

    test('should reject invalid UUID for propertyId', () => {
      const result = createInteractionRequestSchema.safeParse({
        propertyId: 'not-a-uuid',
        type: 'like',
      })
      expect(result.success).toBe(false)
    })
  })

  describe('interactionSummarySchema', () => {
    test('should validate interaction summary', () => {
      const result = interactionSummarySchema.safeParse({
        viewed: 100,
        liked: 25,
        passed: 50,
      })
      expect(result.success).toBe(true)
    })

    test('should reject negative values', () => {
      const result = interactionSummarySchema.safeParse({
        viewed: -1,
        liked: 25,
        passed: 50,
      })
      expect(result.success).toBe(false)
    })
  })

  describe('interactionListResponseSchema', () => {
    test('should validate interaction list', () => {
      const result = interactionListResponseSchema.safeParse({
        items: [
          {
            id: '550e8400-e29b-41d4-a716-446655440000',
            property_id: '660e8400-e29b-41d4-a716-446655440001',
            interaction_type: 'like',
            created_at: '2024-01-15T12:00:00Z',
          },
        ],
        nextCursor: null,
      })
      expect(result.success).toBe(true)
    })

    test('should validate interaction with property details', () => {
      const result = interactionListResponseSchema.safeParse({
        items: [
          {
            id: '550e8400-e29b-41d4-a716-446655440000',
            property_id: '660e8400-e29b-41d4-a716-446655440001',
            interaction_type: 'liked',
            created_at: '2024-01-15T12:00:00Z',
            property: {
              address: '123 Main St',
              city: 'San Francisco',
              state: 'CA',
              price: 500000,
              images: ['https://example.com/img.jpg'],
            },
          },
        ],
        nextCursor: 'abc123',
      })
      expect(result.success).toBe(true)
    })

    test('should accept null images in property', () => {
      const result = interactionListResponseSchema.safeParse({
        items: [
          {
            id: '550e8400-e29b-41d4-a716-446655440000',
            property_id: '660e8400-e29b-41d4-a716-446655440001',
            interaction_type: 'view',
            created_at: '2024-01-15T12:00:00Z',
            property: {
              address: '123 Main St',
              city: 'San Francisco',
              state: 'CA',
              price: 500000,
              images: null,
            },
          },
        ],
        nextCursor: null,
      })
      expect(result.success).toBe(true)
    })
  })

  describe('interactionDeleteRequestSchema', () => {
    test('should validate delete request', () => {
      const result = interactionDeleteRequestSchema.safeParse({
        propertyId: '550e8400-e29b-41d4-a716-446655440000',
      })
      expect(result.success).toBe(true)
    })

    test('should reject invalid UUID', () => {
      const result = interactionDeleteRequestSchema.safeParse({
        propertyId: 'invalid',
      })
      expect(result.success).toBe(false)
    })
  })

  describe('propertySearchQuerySchema', () => {
    test('should transform string query params to numbers', () => {
      const result = propertySearchQuerySchema.safeParse({
        price_min: '300000',
        price_max: '800000',
        bedrooms_min: '2',
        bedrooms_max: '4',
        bathrooms_min: '1.5',
        bathrooms_max: '3',
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.price_min).toBe(300000)
        expect(result.data.price_max).toBe(800000)
        expect(result.data.bedrooms_min).toBe(2)
        expect(result.data.bedrooms_max).toBe(4)
        expect(result.data.bathrooms_min).toBe(1.5)
        expect(result.data.bathrooms_max).toBe(3)
      }
    })

    test('should split comma-separated property_types', () => {
      const result = propertySearchQuerySchema.safeParse({
        property_types: 'single_family,condo,townhome',
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.property_types).toEqual([
          'single_family',
          'condo',
          'townhome',
        ])
      }
    })

    test('should split comma-separated neighborhoods', () => {
      const result = propertySearchQuerySchema.safeParse({
        neighborhoods: 'uuid1,uuid2,uuid3',
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.neighborhoods).toEqual(['uuid1', 'uuid2', 'uuid3'])
      }
    })

    test('should handle undefined values', () => {
      const result = propertySearchQuerySchema.safeParse({})
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.price_min).toBeUndefined()
        expect(result.data.property_types).toBeUndefined()
      }
    })
  })

  describe('marketingPropertySchema', () => {
    test('should validate marketing property', () => {
      const result = marketingPropertySchema.safeParse({
        zpid: 'zpid-123',
        imageUrl: 'https://example.com/image.jpg',
        price: 500000,
        bedrooms: 3,
        bathrooms: 2,
        address: '123 Main St',
        latitude: 37.7749,
        longitude: -122.4194,
      })
      expect(result.success).toBe(true)
    })

    test('should accept null values for optional fields', () => {
      const result = marketingPropertySchema.safeParse({
        zpid: 'zpid-123',
        imageUrl: null,
        price: null,
        bedrooms: null,
        bathrooms: null,
        address: '123 Main St',
        latitude: null,
        longitude: null,
      })
      expect(result.success).toBe(true)
    })

    test('should reject invalid image URL', () => {
      const result = marketingPropertySchema.safeParse({
        zpid: 'zpid-123',
        imageUrl: 'not-a-url',
        price: 500000,
        bedrooms: 3,
        bathrooms: 2,
        address: '123 Main St',
        latitude: 37.7749,
        longitude: -122.4194,
      })
      expect(result.success).toBe(false)
    })
  })

  describe('marketingPropertiesResponseSchema', () => {
    test('should validate array of marketing properties', () => {
      const result = marketingPropertiesResponseSchema.safeParse([
        {
          zpid: 'zpid-1',
          imageUrl: 'https://example.com/1.jpg',
          price: 500000,
          bedrooms: 3,
          bathrooms: 2,
          address: '123 Main St',
          latitude: 37.7749,
          longitude: -122.4194,
        },
        {
          zpid: 'zpid-2',
          imageUrl: 'https://example.com/2.jpg',
          price: 600000,
          bedrooms: 4,
          bathrooms: 3,
          address: '456 Oak Ave',
          latitude: 37.785,
          longitude: -122.4294,
        },
      ])
      expect(result.success).toBe(true)
    })

    test('should validate empty array', () => {
      const result = marketingPropertiesResponseSchema.safeParse([])
      expect(result.success).toBe(true)
    })
  })

  describe('updateProfileRequestSchema', () => {
    test('should validate profile update request', () => {
      const result = updateProfileRequestSchema.safeParse({
        preferences: { theme: 'dark' },
        onboarding_completed: true,
      })
      expect(result.success).toBe(true)
    })

    test('should accept partial updates', () => {
      const result = updateProfileRequestSchema.safeParse({
        onboarding_completed: true,
      })
      expect(result.success).toBe(true)
    })

    test('should accept empty update', () => {
      const result = updateProfileRequestSchema.safeParse({})
      expect(result.success).toBe(true)
    })
  })

  describe('supabaseWebhookSchema', () => {
    test('should validate INSERT webhook', () => {
      const result = supabaseWebhookSchema.safeParse({
        type: 'INSERT',
        table: 'properties',
        record: { id: '123', address: '123 Main St' },
        schema: 'public',
      })
      expect(result.success).toBe(true)
    })

    test('should validate UPDATE webhook with old_record', () => {
      const result = supabaseWebhookSchema.safeParse({
        type: 'UPDATE',
        table: 'properties',
        record: { id: '123', address: '456 Oak Ave' },
        old_record: { id: '123', address: '123 Main St' },
        schema: 'public',
      })
      expect(result.success).toBe(true)
    })

    test('should validate DELETE webhook', () => {
      const result = supabaseWebhookSchema.safeParse({
        type: 'DELETE',
        table: 'properties',
        record: { id: '123' },
        schema: 'public',
      })
      expect(result.success).toBe(true)
    })

    test('should reject invalid webhook type', () => {
      const result = supabaseWebhookSchema.safeParse({
        type: 'UPSERT',
        table: 'properties',
        record: {},
        schema: 'public',
      })
      expect(result.success).toBe(false)
    })
  })
})
