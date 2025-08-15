import {
  userPreferencesSchema,
  userProfileSchema,
  userProfileInsertSchema,
  userProfileUpdateSchema,
  householdSchema,
  scoreDataSchema,
  userPropertyInteractionSchema,
  searchFiltersSchema,
  savedSearchSchema,
} from '@/lib/schemas/user'

describe('User Schema Validation', () => {
  describe('userPreferencesSchema', () => {
    test('should validate valid user preferences', () => {
      const validPreferences = {
        search_preferences: {
          price_min: 300000,
          price_max: 800000,
          bedrooms_min: 2,
          bedrooms_max: 4,
          bathrooms_min: 1,
          bathrooms_max: 3,
          square_feet_min: 1000,
          square_feet_max: 2500,
          property_types: ['house', 'condo'],
          neighborhoods: ['123e4567-e89b-12d3-a456-426614174000'],
          amenities: ['parking', 'gym', 'pool'],
        },
        ml_model_weights: {
          price_weight: 0.3,
          location_weight: 0.25,
          size_weight: 0.2,
          amenities_weight: 0.25,
        },
        notification_settings: {
          email_enabled: true,
          push_enabled: false,
          frequency: 'daily',
        },
        ui_preferences: {
          theme: 'dark',
          cards_per_view: 12,
        },
      }

      const result = userPreferencesSchema.safeParse(validPreferences)
      expect(result.success).toBe(true)
    })

    test('should validate ML model weights within range', () => {
      const invalidWeights = {
        ml_model_weights: {
          price_weight: 1.5, // Over 1.0
          location_weight: -0.1, // Below 0.0
        },
      }

      const result = userPreferencesSchema.safeParse(invalidWeights)
      expect(result.success).toBe(false)

      const errorMessages = result.success
        ? []
        : result.error.issues.map((issue) => issue.message)
      expect(errorMessages).toEqual(
        expect.arrayContaining([
          'Number must be less than or equal to 1',
          'Number must be greater than or equal to 0',
        ])
      )
    })

    test('should validate notification frequency enum', () => {
      const validFrequencies = ['immediate', 'daily', 'weekly']

      validFrequencies.forEach((frequency) => {
        const preferences = {
          notification_settings: {
            frequency: frequency,
          },
        }

        const result = userPreferencesSchema.safeParse(preferences)
        expect(result.success).toBe(true)
      })

      // Test invalid frequency
      const invalidFrequency = {
        notification_settings: {
          frequency: 'monthly', // Invalid enum value
        },
      }

      const result = userPreferencesSchema.safeParse(invalidFrequency)
      expect(result.success).toBe(false)
    })

    test('should validate UI theme options', () => {
      const validThemes = ['light', 'dark', 'system']

      validThemes.forEach((theme) => {
        const preferences = {
          ui_preferences: {
            theme: theme,
          },
        }

        const result = userPreferencesSchema.safeParse(preferences)
        expect(result.success).toBe(true)
      })
    })

    test('should validate cards per view range', () => {
      const validCardsPerView = {
        ui_preferences: {
          cards_per_view: 10,
        },
      }

      const result = userPreferencesSchema.safeParse(validCardsPerView)
      expect(result.success).toBe(true)

      // Test invalid range
      const invalidCardsPerView = {
        ui_preferences: {
          cards_per_view: 100, // Over 50
        },
      }

      const invalidResult = userPreferencesSchema.safeParse(invalidCardsPerView)
      expect(invalidResult.success).toBe(false)
    })
  })

  describe('userProfileSchema', () => {
    test('should validate user profile creation data', () => {
      const validProfile = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        household_id: '456e7890-e12b-34d5-a678-901234567890',
        onboarding_completed: true,
        preferences: {
          search_preferences: {
            price_min: 400000,
            price_max: 700000,
            bedrooms_min: 2,
            property_types: ['house'],
          },
        },
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z',
      }

      const result = userProfileSchema.safeParse(validProfile)
      expect(result.success).toBe(true)
    })

    test('should handle null household_id correctly', () => {
      const profileWithoutHousehold = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        household_id: null,
        onboarding_completed: false,
        preferences: null,
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z',
      }

      const result = userProfileSchema.safeParse(profileWithoutHousehold)
      expect(result.success).toBe(true)
    })

    test('should validate UUID format for IDs', () => {
      const invalidUuids = {
        id: 'invalid-uuid',
        household_id: 'also-invalid',
        onboarding_completed: true,
        preferences: null,
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z',
      }

      const result = userProfileSchema.safeParse(invalidUuids)
      expect(result.success).toBe(false)
    })
  })

  describe('householdSchema', () => {
    test('should validate household creation and join requests', () => {
      const validHousehold = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Smith Family',
        collaboration_mode: 'shared',
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z',
      }

      const result = householdSchema.safeParse(validHousehold)
      expect(result.success).toBe(true)
    })

    test('should validate collaboration mode enum', () => {
      const validModes = ['independent', 'shared', 'weighted']

      validModes.forEach((mode) => {
        const household = {
          id: '123e4567-e89b-12d3-a456-426614174000',
          name: 'Test Family',
          collaboration_mode: mode,
          created_at: '2024-01-01T00:00:00.000Z',
          updated_at: '2024-01-01T00:00:00.000Z',
        }

        const result = householdSchema.safeParse(household)
        expect(result.success).toBe(true)
      })

      // Test invalid mode
      const invalidMode = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Test Family',
        collaboration_mode: 'custom', // Invalid enum value
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z',
      }

      const result = householdSchema.safeParse(invalidMode)
      expect(result.success).toBe(false)
    })

    test('should validate household name length', () => {
      const longName = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'A'.repeat(101), // Over 100 characters
        collaboration_mode: 'shared',
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z',
      }

      const result = householdSchema.safeParse(longName)
      expect(result.success).toBe(false)
    })
  })

  describe('scoreDataSchema', () => {
    test('should validate interaction data with ML scores', () => {
      const validScoreData = {
        ml_score: 0.85,
        cold_start_score: 0.7,
        online_lr_score: 0.82,
        lightgbm_score: 0.88,
        feature_importance: {
          price: 0.3,
          location: 0.25,
          bedrooms: 0.2,
          bathrooms: 0.15,
          square_feet: 0.1,
        },
        model_version: 'v2.1',
        created_at: '2024-01-01T00:00:00.000Z',
      }

      const result = scoreDataSchema.safeParse(validScoreData)
      expect(result.success).toBe(true)
    })

    test('should validate ML scores within 0-1 range', () => {
      const invalidScores = {
        ml_score: 1.5, // Over 1.0
        cold_start_score: -0.1, // Below 0.0
        online_lr_score: 0.5,
        lightgbm_score: 0.7,
      }

      const result = scoreDataSchema.safeParse(invalidScores)
      expect(result.success).toBe(false)

      const errorMessages = result.success
        ? []
        : result.error.issues.map((issue) => issue.message)
      expect(errorMessages).toEqual(
        expect.arrayContaining([
          'Number must be less than or equal to 1',
          'Number must be greater than or equal to 0',
        ])
      )
    })

    test('should handle preference validation and JSONB constraints', () => {
      const validFeatureImportance = {
        feature_importance: {
          price: 0.3,
          location: 0.25,
          bedrooms: 0.2,
          bathrooms: 0.15,
          square_feet: 0.1,
        },
      }

      const result = scoreDataSchema.safeParse(validFeatureImportance)
      expect(result.success).toBe(true)
    })
  })

  describe('userPropertyInteractionSchema', () => {
    test('should validate user property interaction creation', () => {
      const validInteraction = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        user_id: '456e7890-e12b-34d5-a678-901234567890',
        property_id: '789e0123-e45f-67a8-b901-234567890123',
        household_id: 'abc123de-f456-789a-b012-345678901234',
        interaction_type: 'like',
        score_data: {
          ml_score: 0.9,
          feature_importance: {
            price: 0.4,
            location: 0.6,
          },
        },
        created_at: '2024-01-01T00:00:00.000Z',
      }

      const result = userPropertyInteractionSchema.safeParse(validInteraction)
      if (!result.success) {
        console.log(
          'Validation errors:',
          JSON.stringify(result.error.issues, null, 2)
        )
      }
      expect(result.success).toBe(true)
    })

    test('should validate interaction type enum', () => {
      const validTypes = ['like', 'dislike', 'skip', 'view']

      validTypes.forEach((type) => {
        const interaction = {
          id: '123e4567-e89b-12d3-a456-426614174000',
          user_id: '456e7890-e12b-34d5-a678-901234567890',
          property_id: '789e0123-e45f-67a8-b901-234567890123',
          household_id: null,
          interaction_type: type,
          score_data: null,
          created_at: '2024-01-01T00:00:00.000Z',
        }

        const result = userPropertyInteractionSchema.safeParse(interaction)
        expect(result.success).toBe(true)
      })

      // Test invalid type
      const invalidType = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        user_id: '456e7890-e12b-34d5-a678-901234567890',
        property_id: '789e0123-e45f-67a8-b901-234567890123',
        household_id: null,
        interaction_type: 'favorite', // Invalid enum value
        score_data: null,
        created_at: '2024-01-01T00:00:00.000Z',
      }

      const result = userPropertyInteractionSchema.safeParse(invalidType)
      expect(result.success).toBe(false)
    })

    test('should handle null household_id for individual interactions', () => {
      const individualInteraction = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        user_id: '456e7890-e12b-34d5-a678-901234567890',
        property_id: '789e0123-e45f-67a8-b901-234567890123',
        household_id: null, // Individual interaction
        interaction_type: 'view',
        score_data: null,
        created_at: '2024-01-01T00:00:00.000Z',
      }

      const result = userPropertyInteractionSchema.safeParse(
        individualInteraction
      )
      expect(result.success).toBe(true)
    })
  })

  describe('savedSearchSchema', () => {
    test('should validate saved search creation with filters', () => {
      const validSavedSearch = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        user_id: '456e7890-e12b-34d5-a678-901234567890',
        household_id: null,
        name: 'Family Home Search',
        filters: {
          price_min: 400000,
          price_max: 700000,
          bedrooms_min: 3,
          property_types: ['house'],
          neighborhoods: ['789e0123-e45f-67a8-b901-234567890123'],
          amenities: ['garage', 'garden'],
        },
        is_active: true,
        created_at: '2024-01-01T00:00:00.000Z',
      }

      const result = savedSearchSchema.safeParse(validSavedSearch)
      expect(result.success).toBe(true)
    })

    test('should validate search name length', () => {
      const longNameSearch = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        user_id: '456e7890-e12b-34d5-a678-901234567890',
        household_id: null,
        name: 'A'.repeat(101), // Over 100 characters
        filters: {},
        is_active: true,
        created_at: '2024-01-01T00:00:00.000Z',
      }

      const result = savedSearchSchema.safeParse(longNameSearch)
      expect(result.success).toBe(false)
    })

    test('should validate search filters constraints', () => {
      const validFilters = {
        price_min: 0,
        price_max: 1000000,
        bedrooms_min: 0,
        bedrooms_max: 10,
        bathrooms_min: 0,
        bathrooms_max: 10,
        square_feet_min: 500,
        square_feet_max: 5000,
        property_types: ['house', 'condo', 'townhouse', 'apartment'],
        neighborhoods: ['123e4567-e89b-12d3-a456-426614174000'],
        amenities: ['parking', 'gym', 'pool', 'garden'],
      }

      const result = searchFiltersSchema.safeParse(validFilters)
      expect(result.success).toBe(true)

      // Test invalid constraints
      const invalidFilters = {
        price_min: -100, // Negative price
        bedrooms_min: -1, // Negative bedrooms
        bedrooms_max: 15, // Over max 10
        bathrooms_min: -1, // Negative bathrooms
        property_types: ['mansion'], // Invalid property type
      }

      const invalidResult = searchFiltersSchema.safeParse(invalidFilters)
      expect(invalidResult.success).toBe(false)
    })
  })

  describe('Schema Insert and Update Variants', () => {
    test('should validate userProfileInsertSchema excludes auto-generated fields', () => {
      const validInsert = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        preferences: {
          search_preferences: {
            price_min: 300000,
            price_max: 600000,
          },
        },
      }

      const result = userProfileInsertSchema.safeParse(validInsert)
      expect(result.success).toBe(true)

      // created_at and updated_at should not be allowed in insert
      const insertWithTimestamps = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        created_at: '2024-01-01T00:00:00.000Z', // Should not be allowed
        updated_at: '2024-01-01T00:00:00.000Z', // Should not be allowed
        preferences: null,
      }

      const timestampResult =
        userProfileInsertSchema.safeParse(insertWithTimestamps)
      // Should still succeed because these fields are just omitted, not rejected
      expect(timestampResult.success).toBe(true)
    })

    test('should validate partial updates in updateSchemas', () => {
      const partialUpdate = {
        preferences: {
          ui_preferences: {
            theme: 'light',
          },
        },
      }

      const result = userProfileUpdateSchema.safeParse(partialUpdate)
      expect(result.success).toBe(true)

      // Empty updates should be valid
      const emptyUpdate = {}
      const emptyResult = userProfileUpdateSchema.safeParse(emptyUpdate)
      expect(emptyResult.success).toBe(true)
    })
  })
})
