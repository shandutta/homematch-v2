import {
  householdInsertSchema,
  householdSchema,
  householdUpdateSchema,
  savedSearchInsertSchema,
  savedSearchSchema,
  savedSearchUpdateSchema,
  scoreDataSchema,
  searchFiltersSchema,
  userPreferencesSchema,
  userProfileInsertSchema,
  userProfileSchema,
  userProfileUpdateSchema,
  userPropertyInteractionInsertSchema,
  userPropertyInteractionSchema,
  userPropertyInteractionUpdateSchema,
} from '@/lib/schemas/user'

const VALID_UUID = '11111111-1111-1111-1111-111111111111'
const VALID_TS = '2024-01-01T00:00:00.000Z'

describe('user schemas', () => {
  describe('userPreferencesSchema', () => {
    it('accepts an empty object', () => {
      expect(userPreferencesSchema.safeParse({}).success).toBe(true)
    })

    it('accepts a fully populated preferences object', () => {
      const result = userPreferencesSchema.safeParse({
        search_preferences: {
          price_min: 200000,
          price_max: 800000,
          bedrooms_min: 2,
          bedrooms_max: 4,
          property_types: ['single_family', 'condo'],
          neighborhoods: [VALID_UUID],
          amenities: ['pool'],
        },
        ml_model_weights: { price: 0.5, location: 0.8 },
        notification_settings: {
          email_enabled: true,
          push_enabled: false,
          frequency: 'daily',
        },
        ui_preferences: { theme: 'dark', cards_per_view: 10 },
      })
      expect(result.success).toBe(true)
    })

    it('rejects ml_model_weights values outside 0..1', () => {
      const result = userPreferencesSchema.safeParse({
        ml_model_weights: { price: 1.5 },
      })
      expect(result.success).toBe(false)
    })

    it('rejects invalid notification frequency', () => {
      const result = userPreferencesSchema.safeParse({
        notification_settings: { frequency: 'monthly' },
      })
      expect(result.success).toBe(false)
    })

    it('rejects invalid theme', () => {
      const result = userPreferencesSchema.safeParse({
        ui_preferences: { theme: 'cosmic' },
      })
      expect(result.success).toBe(false)
    })

    it('rejects invalid property_type in search_preferences', () => {
      const result = userPreferencesSchema.safeParse({
        search_preferences: { property_types: ['castle'] },
      })
      expect(result.success).toBe(false)
    })
  })

  describe('userProfileSchema', () => {
    const baseProfile = {
      id: VALID_UUID,
      household_id: VALID_UUID,
      onboarding_completed: true,
      preferences: { ui_preferences: { theme: 'light' } },
      created_at: VALID_TS,
      updated_at: VALID_TS,
    }

    it('accepts a valid profile', () => {
      expect(userProfileSchema.safeParse(baseProfile).success).toBe(true)
    })

    it('accepts null household_id and preferences', () => {
      const result = userProfileSchema.safeParse({
        ...baseProfile,
        household_id: null,
        preferences: null,
      })
      expect(result.success).toBe(true)
    })

    it('rejects invalid uuid', () => {
      expect(
        userProfileSchema.safeParse({ ...baseProfile, id: 'not-uuid' }).success
      ).toBe(false)
    })

    it('insert schema accepts profile without timestamps', () => {
      const result = userProfileInsertSchema.safeParse({ id: VALID_UUID })
      expect(result.success).toBe(true)
    })

    it('update schema accepts empty object', () => {
      expect(userProfileUpdateSchema.safeParse({}).success).toBe(true)
    })
  })

  describe('householdSchema', () => {
    const baseHousehold = {
      id: VALID_UUID,
      name: 'My House',
      collaboration_mode: 'shared' as const,
      created_at: VALID_TS,
      updated_at: VALID_TS,
    }

    it('accepts a valid household', () => {
      expect(householdSchema.safeParse(baseHousehold).success).toBe(true)
    })

    it('accepts null collaboration_mode', () => {
      const result = householdSchema.safeParse({
        ...baseHousehold,
        collaboration_mode: null,
      })
      expect(result.success).toBe(true)
    })

    it('rejects invalid collaboration_mode', () => {
      expect(
        householdSchema.safeParse({
          ...baseHousehold,
          collaboration_mode: 'mystery',
        }).success
      ).toBe(false)
    })

    it('rejects empty name', () => {
      expect(
        householdSchema.safeParse({ ...baseHousehold, name: '' }).success
      ).toBe(false)
    })

    it('insert schema accepts minimal payload', () => {
      expect(householdInsertSchema.safeParse({ name: 'Home' }).success).toBe(
        true
      )
    })

    it('update schema accepts empty object', () => {
      expect(householdUpdateSchema.safeParse({}).success).toBe(true)
    })
  })

  describe('scoreDataSchema', () => {
    it('accepts an empty score data', () => {
      expect(scoreDataSchema.safeParse({}).success).toBe(true)
    })

    it('rejects ml_score outside 0..1', () => {
      expect(scoreDataSchema.safeParse({ ml_score: 1.5 }).success).toBe(false)
      expect(scoreDataSchema.safeParse({ ml_score: -0.1 }).success).toBe(false)
    })

    it('accepts feature_importance map', () => {
      const result = scoreDataSchema.safeParse({
        feature_importance: { price: 0.3, location: 0.7 },
      })
      expect(result.success).toBe(true)
    })
  })

  describe('userPropertyInteractionSchema', () => {
    const baseInteraction = {
      id: VALID_UUID,
      user_id: VALID_UUID,
      property_id: VALID_UUID,
      household_id: null,
      interaction_type: 'like' as const,
      score_data: null,
      created_at: VALID_TS,
    }

    it('accepts a valid interaction', () => {
      expect(
        userPropertyInteractionSchema.safeParse(baseInteraction).success
      ).toBe(true)
    })

    it('rejects unknown interaction_type', () => {
      expect(
        userPropertyInteractionSchema.safeParse({
          ...baseInteraction,
          interaction_type: 'love',
        }).success
      ).toBe(false)
    })

    it('insert schema works without id and timestamp', () => {
      const result = userPropertyInteractionInsertSchema.safeParse({
        user_id: VALID_UUID,
        property_id: VALID_UUID,
        interaction_type: 'view',
      })
      expect(result.success).toBe(true)
    })

    it('update schema accepts empty object', () => {
      expect(userPropertyInteractionUpdateSchema.safeParse({}).success).toBe(
        true
      )
    })
  })

  describe('searchFiltersSchema and savedSearchSchema', () => {
    it('searchFilters accepts empty', () => {
      expect(searchFiltersSchema.safeParse({}).success).toBe(true)
    })

    it('savedSearch accepts a valid record', () => {
      const result = savedSearchSchema.safeParse({
        id: VALID_UUID,
        user_id: VALID_UUID,
        household_id: null,
        name: 'My Search',
        filters: { price_min: 100, property_types: ['condo'] },
        is_active: true,
        created_at: VALID_TS,
      })
      expect(result.success).toBe(true)
    })

    it('savedSearch rejects empty name', () => {
      expect(
        savedSearchSchema.safeParse({
          id: VALID_UUID,
          user_id: VALID_UUID,
          household_id: null,
          name: '',
          filters: {},
          is_active: true,
          created_at: VALID_TS,
        }).success
      ).toBe(false)
    })

    it('savedSearchInsertSchema accepts minimal payload', () => {
      const result = savedSearchInsertSchema.safeParse({
        user_id: VALID_UUID,
        name: 'Search',
        filters: {},
      })
      expect(result.success).toBe(true)
    })

    it('savedSearchUpdateSchema accepts empty object', () => {
      expect(savedSearchUpdateSchema.safeParse({}).success).toBe(true)
    })
  })
})
