/**
 * Global app-level types and shared interfaces.
 * Extend this file carefully and keep it free of runtime imports.
 * Adheres to project STYLE_GUIDE.md and strict TypeScript mode.
 */

/**
 * Interaction types aligned to DB: user_property_interactions.interaction_type
 * UI "pass" maps to "skip" in DB.
 */
export type InteractionType = 'viewed' | 'liked' | 'skip'

/**
 * Represents a user interaction with a property.
 * Mirrors user_property_interactions table columns (client-facing shape).
 */
export interface Interaction {
  userId: string
  propertyId: string
  type: InteractionType
  createdAt: string
  updatedAt: string
}

/**
 * Aggregate counters for dashboard tiles.
 * passed = count of 'skip' interactions.
 */
export interface InteractionSummary {
  viewed: number
  liked: number
  passed: number
}

/**
 * Standard cursor pagination request.
 */
export interface PageRequest {
  cursor?: string
  limit?: number
}

/**
 * Standard cursor pagination response.
 */
export interface PageResponse<T> {
  items: T[]
  nextCursor?: string | null
}
