/**
 * Service Interface Contracts for HomeMatch v2 Backend Refactoring
 *
 * These interfaces define the contracts for the decomposed PropertyService
 * ensuring backward compatibility and clear separation of concerns.
 */

import {
  Property,
  PropertyInsert,
  PropertyUpdate,
  PropertyWithNeighborhood,
  Neighborhood,
  NeighborhoodInsert,
  NeighborhoodUpdate,
} from '@/types/database'
import { PropertySearch } from '@/lib/schemas/property'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { NextRequest } from 'next/server'

// ============================================================================
// CORE SERVICE INTERFACES
// ============================================================================

/**
 * Basic CRUD operations for properties
 * Handles: create, read, update, delete operations
 */
export interface IPropertyCrudService {
  getProperty(id: string): Promise<Property | null>
  getPropertyWithNeighborhood(
    id: string
  ): Promise<PropertyWithNeighborhood | null>
  createProperty(property: PropertyInsert): Promise<Property | null>
  updateProperty(id: string, updates: PropertyUpdate): Promise<Property | null>
  deleteProperty(id: string): Promise<boolean>
  getPropertiesByZpid(zpid: string): Promise<Property | null>
  getPropertiesByHash(hash: string): Promise<Property | null>
}

/**
 * Search and filtering operations for properties
 * Handles: complex queries, filtering, pagination
 */
export interface IPropertySearchService {
  searchProperties(
    params: PropertySearch,
    options?: {
      select?: string
      includeCount?: boolean
      includeNeighborhoods?: boolean
    }
  ): Promise<PropertySearchResult>
  getPropertiesByNeighborhood(
    neighborhoodId: string,
    limit?: number
  ): Promise<Property[]>
  getPropertyStats(): Promise<PropertyStats>
}

/**
 * Neighborhood management operations
 * Handles: neighborhood CRUD, geographic queries
 */
export interface INeighborhoodService {
  getNeighborhood(id: string): Promise<Neighborhood | null>
  createNeighborhood(
    neighborhood: NeighborhoodInsert
  ): Promise<Neighborhood | null>
  updateNeighborhood(
    id: string,
    updates: NeighborhoodUpdate
  ): Promise<Neighborhood | null>
  getNeighborhoodsByCity(city: string, state: string): Promise<Neighborhood[]>
  getNeighborhoodsByMetroArea(metroArea: string): Promise<Neighborhood[]>
  searchNeighborhoods(searchTerm: string): Promise<Neighborhood[]>
}

/**
 * Basic statistics operations (lightweight replacement for analytics)
 */
export interface IPropertyStatsService {
  getPropertyStats(): Promise<PropertyStats>
}

/**
 * Geographic and spatial operations
 * Handles: PostGIS queries, radius searches, spatial relationships
 */
export interface IGeographicService {
  getPropertiesWithinRadius(
    lat: number,
    lng: number,
    radiusKm: number,
    limit?: number
  ): Promise<Property[]>
  getPropertiesInBounds(
    bounds: BoundingBox,
    limit?: number
  ): Promise<Property[]>
  getPropertiesNearAddress(
    address: string,
    radiusKm: number
  ): Promise<Property[]>
  calculateDistance(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number
  ): Promise<number>
  getPropertiesAlongRoute(
    waypoints: Array<{ lat: number; lng: number }>,
    corridorWidth: number
  ): Promise<Property[]>
  getGeographicDensity(
    bounds: BoundingBox,
    gridSize: number
  ): Promise<GeographicStats>
  getCommuteAnalysis(
    propertyId: string,
    destinations: Array<{ lat: number; lng: number }>
  ): Promise<Record<string, unknown> | null>
  getWalkabilityScore(lat: number, lng: number): Promise<number>
  getTransitScore(lat: number, lng: number): Promise<number>
}

export interface BoundingBox {
  northEast: { lat: number; lng: number }
  southWest: { lat: number; lng: number }
}

export interface GeographicStats {
  total_properties: number
  avg_price: number
  price_density: Array<{
    lat: number
    lng: number
    price: number
    density_score: number
  }>
}

// ============================================================================
// SUPPORT TYPES
// ============================================================================

export interface PropertySearchResult {
  properties: PropertyWithNeighborhood[]
  total: number
  page: number
  limit: number
}

export interface PropertyStats {
  total_properties: number
  avg_price: number
  median_price: number
  avg_bedrooms: number
  avg_bathrooms: number
  avg_square_feet: number
  property_type_distribution: Record<string, number>
}

// ============================================================================
// CLIENT FACTORY INTERFACES
// ============================================================================

export enum ClientContext {
  BROWSER = 'browser',
  SERVER = 'server',
  API = 'api',
  SERVICE = 'service',
}

export interface ClientConfig {
  context?: ClientContext
  request?: NextRequest
  authToken?: string
  customOptions?: Record<string, unknown>
}

export interface ISupabaseClientFactory {
  createClient(config?: ClientConfig): SupabaseClient
  getInstance(): ISupabaseClientFactory
}

// ============================================================================
// ERROR HANDLING INTERFACES
// ============================================================================

export interface ServiceError {
  code: string
  message: string
  details?: Record<string, unknown>
  context?: {
    service: string
    method: string
    timestamp: string
    userId?: string
    args?: unknown[]
  }
}

export interface ServiceResponse<T> {
  data: T | null
  error: ServiceError | null
  success: boolean
}

export interface IErrorHandler {
  handleError(
    error: unknown,
    serviceName: string,
    methodName: string,
    args?: unknown[]
  ): ServiceError

  getDefaultReturn<T>(expectedType?: T): T
}

// ============================================================================
// BASE SERVICE INTERFACE
// ============================================================================

export interface IBaseService {
  getSupabase(config?: ClientConfig): Promise<SupabaseClient>
}

// ============================================================================
// MAIN PROPERTY SERVICE INTERFACE (Facade)
// ============================================================================

/**
 * Main PropertyService interface that combines all specialized services
 * This maintains backward compatibility with the existing PropertyService
 */
export interface IPropertyService
  extends IPropertyCrudService,
    IPropertySearchService,
    INeighborhoodService,
    IPropertyStatsService,
    IGeographicService {
  // Additional facade-specific methods if needed
  readonly crudService: IPropertyCrudService
  readonly searchService: IPropertySearchService
  readonly neighborhoodService: INeighborhoodService
  readonly statsService: IPropertyStatsService
  readonly geographicService: IGeographicService
}

// ============================================================================
// SERVICE FACTORY INTERFACE
// ============================================================================

export interface IServiceFactory {
  createPropertyService(
    clientFactory?: ISupabaseClientFactory
  ): IPropertyService
  createPropertyCrudService(
    clientFactory?: ISupabaseClientFactory
  ): IPropertyCrudService
  createPropertySearchService(
    clientFactory?: ISupabaseClientFactory
  ): IPropertySearchService
  createNeighborhoodService(
    clientFactory?: ISupabaseClientFactory
  ): INeighborhoodService
  createGeographicService(
    clientFactory?: ISupabaseClientFactory
  ): IGeographicService
}

// ============================================================================
// MIGRATION HELPERS
// ============================================================================

export interface MigrationFlags {
  useNewPropertyService?: boolean
  useUnifiedClientFactory?: boolean
  useNewErrorHandling?: boolean
  useSpecializedServices?: boolean
}

export interface MigrationConfig {
  flags: MigrationFlags
  rollbackStrategy: 'immediate' | 'gradual' | 'scheduled'
  validateCompatibility: boolean
}

// ============================================================================
// FILTER BUILDER INTERFACES
// ============================================================================

export interface FilterConfig {
  field: string
  operator: 'eq' | 'gte' | 'lte' | 'in' | 'contains' | 'ilike'
  value: unknown
  condition?: 'AND' | 'OR'
}

export interface IFilterBuilder {
  applyFilters<T>(query: T, filters: FilterConfig[]): T
  buildFilterFromSearch(searchParams: PropertySearch): FilterConfig[]
}

// ============================================================================
// TESTING INTERFACES
// ============================================================================

export interface ServiceTestConfig {
  mockSupabaseClient?: boolean
  mockResponses?: Record<string, unknown>
  enableLogging?: boolean
  validateContracts?: boolean
}

export interface ITestableService {
  configure(config: ServiceTestConfig): void
  resetMocks(): void
  getMockCallHistory(): Array<{
    method: string
    args: unknown[]
    result: unknown
  }>
}
