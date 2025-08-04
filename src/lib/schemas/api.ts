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
export const interactionTypeSchema = z.enum(['like', 'dislike', 'skip', 'view'])

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
export type ApiSuccess = z.infer<typeof apiSuccessSchema>
export type ApiError = z.infer<typeof apiErrorSchema>
export type ApiResponse = z.infer<typeof apiResponseSchema>

export type PaginationQuery = z.infer<typeof paginationQuerySchema>
export type PaginatedResponse = z.infer<typeof paginatedResponseSchema>

export type InteractionType = z.infer<typeof interactionTypeSchema>
export type CreateInteractionRequest = z.infer<
  typeof createInteractionRequestSchema
>
export type InteractionSummary = z.infer<typeof interactionSummarySchema>
export type InteractionListResponse = z.infer<
  typeof interactionListResponseSchema
>

export type PropertySearchQuery = z.infer<typeof propertySearchQuerySchema>
export type MarketingProperty = z.infer<typeof marketingPropertySchema>
export type MarketingPropertiesResponse = z.infer<
  typeof marketingPropertiesResponseSchema
>

export type UpdateProfileRequest = z.infer<typeof updateProfileRequestSchema>
export type SupabaseWebhook = z.infer<typeof supabaseWebhookSchema>
