/**
 * Properties Service Module Entry Point
 * 
 * Provides both the full facade and individual specialized services.
 * Maintains backward compatibility with existing PropertyService imports.
 */

export { PropertyCrudService } from './crud'
export { PropertyServiceFacade as PropertyService, createPropertyService } from './facade'

// Re-export types for convenience
export type { 
  IPropertyCrudService,
  IPropertySearchService,
  INeighborhoodService,
  PropertySearchResult
} from '@/lib/services/interfaces'