import { z } from 'zod'

// Common API response schemas
export const apiSuccessSchema = z.object({
  success: z.literal(true),
  data: z.unknown(),
})

export const apiErrorSchema = z.object({
  success: z.literal(false),
  error: z.object({
    message: z.string(),
    code: z.string().optional(),
    details: z.unknown().optional(),
  }),
})

export const apiResponseSchema = z.union([apiSuccessSchema, apiErrorSchema])

// Pagination schemas
export const paginationQuerySchema = z.object({
  page: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 1)),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 20)),
  cursor: z.string().optional(),
})

export const paginatedResponseSchema = z.object({
  data: z.array(z.unknown()),
  pagination: z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
    totalPages: z.number(),
    hasNext: z.boolean(),
    hasPrev: z.boolean(),
    nextCursor: z.string().nullable().optional(),
  }),
})

// Interaction API schemas
const dbInteractionTypeSchema = z.enum(['like', 'dislike', 'skip', 'view'])
const uiInteractionTypeSchema = z.enum(['liked', 'viewed', 'skip'])

export const interactionTypeSchema = z.union([
  dbInteractionTypeSchema,
  uiInteractionTypeSchema,
])

export const createInteractionRequestSchema = z.object({
  propertyId: z.string().uuid(),
  type: interactionTypeSchema,
  householdId: z.string().uuid().optional(),
})

export const interactionSummarySchema = z.object({
  viewed: z.number().min(0),
  liked: z.number().min(0),
  passed: z.number().min(0),
})

export const interactionListResponseSchema = z.object({
  items: z.array(
    z.object({
      id: z.string().uuid(),
      property_id: z.string().uuid(),
      interaction_type: interactionTypeSchema,
      created_at: z.string().datetime(),
      property: z
        .object({
          address: z.string(),
          city: z.string(),
          state: z.string(),
          price: z.number(),
          images: z.array(z.string()).nullable(),
        })
        .optional(),
    })
  ),
  nextCursor: z.string().nullable(),
})

export const interactionDeleteRequestSchema = z.object({
  propertyId: z.string().uuid(),
})

// Property API schemas
export const propertySearchQuerySchema = z.object({
  price_min: z
    .string()
    .optional()
    .transform((val) => (val ? parseFloat(val) : undefined)),
  price_max: z
    .string()
    .optional()
    .transform((val) => (val ? parseFloat(val) : undefined)),
  bedrooms_min: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : undefined)),
  bedrooms_max: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : undefined)),
  bathrooms_min: z
    .string()
    .optional()
    .transform((val) => (val ? parseFloat(val) : undefined)),
  bathrooms_max: z
    .string()
    .optional()
    .transform((val) => (val ? parseFloat(val) : undefined)),
  property_types: z
    .string()
    .optional()
    .transform((val) => (val ? val.split(',') : undefined)),
  neighborhoods: z
    .string()
    .optional()
    .transform((val) => (val ? val.split(',') : undefined)),
})

export const marketingPropertySchema = z.object({
  zpid: z.string(),
  imageUrl: z.string().url().nullable(),
  price: z.number().nullable(),
  bedrooms: z.number().nullable(),
  bathrooms: z.number().nullable(),
  address: z.string(),
  latitude: z.number().nullable(),
  longitude: z.number().nullable(),
})

export const marketingPropertiesResponseSchema = z.array(
  marketingPropertySchema
)

// User profile API schemas
export const updateProfileRequestSchema = z.object({
  preferences: z.record(z.unknown()).optional(),
  onboarding_completed: z.boolean().optional(),
})

// Webhook schemas
export const supabaseWebhookSchema = z.object({
  type: z.enum(['INSERT', 'UPDATE', 'DELETE']),
  table: z.string(),
  record: z.record(z.unknown()),
  old_record: z.record(z.unknown()).optional(),
  schema: z.string(),
})

// Export types
type _ApiSuccess = z.infer<typeof apiSuccessSchema>
type _ApiError = z.infer<typeof apiErrorSchema>
type _ApiResponse = z.infer<typeof apiResponseSchema>

type _PaginationQuery = z.infer<typeof paginationQuerySchema>
type _PaginatedResponse = z.infer<typeof paginatedResponseSchema>

type _InteractionType = z.infer<typeof interactionTypeSchema>
type _CreateInteractionRequest = z.infer<typeof createInteractionRequestSchema>
type _InteractionSummary = z.infer<typeof interactionSummarySchema>
type _InteractionListResponse = z.infer<typeof interactionListResponseSchema>
type _DeleteInteractionRequest = z.infer<typeof interactionDeleteRequestSchema>

type _PropertySearchQuery = z.infer<typeof propertySearchQuerySchema>
type _MarketingProperty = z.infer<typeof marketingPropertySchema>
type _MarketingPropertiesResponse = z.infer<
  typeof marketingPropertiesResponseSchema
>

type _UpdateProfileRequest = z.infer<typeof updateProfileRequestSchema>
type _SupabaseWebhook = z.infer<typeof supabaseWebhookSchema>
