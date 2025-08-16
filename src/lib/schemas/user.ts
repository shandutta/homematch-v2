import { z } from 'zod'

// User Profile Schemas
export const userPreferencesSchema = z.object({
  search_preferences: z
    .object({
      price_min: z.number().min(0).optional(),
      price_max: z.number().min(0).optional(),
      bedrooms_min: z.number().min(0).max(10).optional(),
      bedrooms_max: z.number().min(0).max(10).optional(),
      bathrooms_min: z.number().min(0).max(10).optional(),
      bathrooms_max: z.number().min(0).max(10).optional(),
      square_feet_min: z.number().min(0).optional(),
      square_feet_max: z.number().min(0).optional(),
      property_types: z
        .array(z.enum(['single_family', 'condo', 'townhome', 'multi_family', 'manufactured', 'land', 'other']))
        .optional(),
      neighborhoods: z.array(z.string().uuid()).optional(),
      amenities: z.array(z.string()).optional(),
    })
    .optional(),
  ml_model_weights: z.record(z.string(), z.number().min(0).max(1)).optional(),
  notification_settings: z
    .object({
      email_enabled: z.boolean().optional(),
      push_enabled: z.boolean().optional(),
      frequency: z.enum(['immediate', 'daily', 'weekly']).optional(),
    })
    .optional(),
  ui_preferences: z
    .object({
      theme: z.enum(['light', 'dark', 'system']).optional(),
      cards_per_view: z.number().min(1).max(50).optional(),
    })
    .optional(),
})

export const userProfileSchema = z.object({
  id: z.string().uuid(),
  household_id: z.string().uuid().nullable(),
  onboarding_completed: z.boolean().nullable(),
  preferences: userPreferencesSchema.nullable(),
  created_at: z.string().datetime().nullable(),
  updated_at: z.string().datetime().nullable(),
})

export const userProfileInsertSchema = userProfileSchema
  .omit({
    created_at: true,
    updated_at: true,
  })
  .partial({
    household_id: true,
    onboarding_completed: true,
    preferences: true,
  })

export const userProfileUpdateSchema = userProfileSchema
  .omit({
    id: true,
    created_at: true,
  })
  .partial()

// Household Schemas
export const householdSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100),
  collaboration_mode: z.enum(['independent', 'shared', 'weighted']).nullable(),
  created_at: z.string().datetime().nullable(),
  updated_at: z.string().datetime().nullable(),
})

export const householdInsertSchema = householdSchema
  .omit({
    id: true,
    created_at: true,
    updated_at: true,
  })
  .partial({
    collaboration_mode: true,
  })

export const householdUpdateSchema = householdSchema
  .omit({
    id: true,
    created_at: true,
  })
  .partial()

// User Property Interaction Schemas
export const scoreDataSchema = z.object({
  ml_score: z.number().min(0).max(1).optional(),
  cold_start_score: z.number().min(0).max(1).optional(),
  online_lr_score: z.number().min(0).max(1).optional(),
  lightgbm_score: z.number().min(0).max(1).optional(),
  feature_importance: z.record(z.string(), z.number()).optional(),
  model_version: z.string().optional(),
  created_at: z.string().datetime().optional(),
})

export const userPropertyInteractionSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  property_id: z.string().uuid(),
  household_id: z.string().uuid().nullable(),
  interaction_type: z.enum(['like', 'dislike', 'skip', 'view']),
  score_data: scoreDataSchema.nullable(),
  created_at: z.string().datetime().nullable(),
})

export const userPropertyInteractionInsertSchema = userPropertyInteractionSchema
  .omit({
    id: true,
    created_at: true,
  })
  .partial({
    household_id: true,
    score_data: true,
  })

export const userPropertyInteractionUpdateSchema = userPropertyInteractionSchema
  .omit({
    id: true,
    user_id: true,
    property_id: true,
    created_at: true,
  })
  .partial()

// Saved Search Schemas
export const searchFiltersSchema = z.object({
  price_min: z.number().min(0).optional(),
  price_max: z.number().min(0).optional(),
  bedrooms_min: z.number().min(0).max(10).optional(),
  bedrooms_max: z.number().min(0).max(10).optional(),
  bathrooms_min: z.number().min(0).max(10).optional(),
  bathrooms_max: z.number().min(0).max(10).optional(),
  square_feet_min: z.number().min(0).optional(),
  square_feet_max: z.number().min(0).optional(),
  property_types: z
    .array(z.enum(['single_family', 'condo', 'townhome', 'multi_family', 'manufactured', 'land', 'other']))
    .optional(),
  neighborhoods: z.array(z.string().uuid()).optional(),
  amenities: z.array(z.string()).optional(),
})

export const savedSearchSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  household_id: z.string().uuid().nullable(),
  name: z.string().min(1).max(100),
  filters: searchFiltersSchema,
  is_active: z.boolean().nullable(),
  created_at: z.string().datetime().nullable(),
})

export const savedSearchInsertSchema = savedSearchSchema
  .omit({
    id: true,
    created_at: true,
  })
  .partial({
    household_id: true,
    is_active: true,
  })

export const savedSearchUpdateSchema = savedSearchSchema
  .omit({
    id: true,
    user_id: true,
    created_at: true,
  })
  .partial()

// Export types for use in other files
export type UserPreferences = z.infer<typeof userPreferencesSchema>
export type UserProfile = z.infer<typeof userProfileSchema>
export type UserProfileInsert = z.infer<typeof userProfileInsertSchema>
export type UserProfileUpdate = z.infer<typeof userProfileUpdateSchema>

export type Household = z.infer<typeof householdSchema>
export type HouseholdInsert = z.infer<typeof householdInsertSchema>
export type HouseholdUpdate = z.infer<typeof householdUpdateSchema>

export type ScoreData = z.infer<typeof scoreDataSchema>
export type UserPropertyInteraction = z.infer<
  typeof userPropertyInteractionSchema
>
export type UserPropertyInteractionInsert = z.infer<
  typeof userPropertyInteractionInsertSchema
>
export type UserPropertyInteractionUpdate = z.infer<
  typeof userPropertyInteractionUpdateSchema
>

export type SearchFilters = z.infer<typeof searchFiltersSchema>
export type SavedSearch = z.infer<typeof savedSearchSchema>
export type SavedSearchInsert = z.infer<typeof savedSearchInsertSchema>
export type SavedSearchUpdate = z.infer<typeof savedSearchUpdateSchema>
