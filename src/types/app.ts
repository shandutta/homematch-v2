/**
 * Global app-level types and shared interfaces.
 * Extend this file carefully and keep it free of runtime imports.
 * Adheres to project STYLE_GUIDE.md and strict TypeScript mode.
 */

import { Property } from '@/lib/schemas/property'
import { UserPreferences } from '@/lib/schemas/user'

/**
 * Interaction types used in the UI layer (e.g., query params, hooks, components).
 * Convert to DB values via lib/utils/interaction-type helpers before persisting.
 */
export type InteractionType = 'viewed' | 'liked' | 'skip'

/**
 * Raw interaction values stored in user_property_interactions.
 */
export type DbInteractionType = 'view' | 'like' | 'skip' | 'dislike'

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

/**
 * Type for a complete dashboard data payload
 */
export interface DashboardData {
  properties: Property[]
}

/**
 * Type for user preferences (extends the Zod schema)
 */
export interface UserPreferencesExtended extends UserPreferences {
  max_price?: number
  min_bedrooms?: number
  min_bathrooms?: number
  property_types?: string[]
  neighborhoods?: string[]
}
