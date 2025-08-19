/**
 * Legacy PropertyService export for backward compatibility
 *
 * This file maintains existing import paths while delegating to the new
 * facade-based implementation. All functionality has been moved to
 * specialized services under src/lib/services/properties/
 */

// Export everything from the new facade implementation
export * from './properties/index'

// Re-export types that might be imported from here
export type {
  Property,
  PropertyInsert,
  PropertyUpdate,
  PropertyWithNeighborhood,
  Neighborhood,
  NeighborhoodInsert,
  NeighborhoodUpdate,
} from '@/types/database'

export type { PropertySearch } from '@/lib/schemas/property'
