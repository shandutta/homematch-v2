/**
 * Service Interfaces and Contracts
 *
 * Provides type definitions and contracts for all service layer components.
 * Enables dependency injection and testing.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  Property,
  PropertyInsert,
  PropertyUpdate,
  PropertyWithNeighborhood,
  Neighborhood,
  NeighborhoodInsert,
  NeighborhoodUpdate,
  UserProfile,
  UserProfileInsert,
  UserProfileUpdate,
  Household,
  HouseholdInsert,
  HouseholdUpdate,
  UserPropertyInteraction,
  UserPropertyInteractionInsert,
  SavedSearch,
  SavedSearchInsert,
  SavedSearchUpdate,
} from '@/types/database'
import type { PropertySearch } from '@/lib/schemas/property'
import type { Database } from '@/types/database'
import type { NextRequest } from 'next/server'

/**
 * Factory interface for creating Supabase clients
 * Enables dependency injection and testing
 */
export interface ISupabaseClientFactory {
  createClient(config?: ClientConfig): Promise<SupabaseClient<Database>>
}

/**
 * Base interface for all service classes
 */
export interface IBaseService {
  /**
   * Validates that required parameters are provided
   */
  validateRequired(params: Record<string, unknown>): void

  /**
   * Sanitizes input data to prevent injection attacks
   */
  sanitizeInput<T>(input: T): T

  /**
   * Executes a database query with standardized error handling
   */
  executeQuery<T>(
    operation: string,
    queryFn: (supabase: SupabaseClient<Database>) => Promise<T>
  ): Promise<T>
}

/**
 * Property CRUD operations interface
 */
export interface IPropertyCrudService extends IBaseService {
  getProperty(propertyId: string): Promise<Property | null>
  getPropertyWithNeighborhood(
    propertyId: string
  ): Promise<PropertyWithNeighborhood | null>
  createProperty(property: PropertyInsert): Promise<Property | null>
  updateProperty(
    propertyId: string,
    updates: PropertyUpdate
  ): Promise<Property | null>
  deleteProperty(propertyId: string): Promise<boolean>
  getPropertiesByZpid(zpid: string): Promise<Property | null>
  getPropertiesByHash(hash: string): Promise<Property | null>
}

/**
 * Property search result interface
 */
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

/**
 * Property search and analytics interface
 */
export interface IPropertySearchService extends IBaseService {
  searchProperties(
    searchParams: PropertySearch,
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
  getPropertiesWithinRadius(
    latitude: number,
    longitude: number,
    radiusKm: number
  ): Promise<Property[]>
  getPropertiesInNeighborhood(
    neighborhoodName: string,
    city: string,
    state: string
  ): Promise<Property[]>
  getPropertyStats(): Promise<PropertyStats>
}

/**
 * Neighborhood management interface
 */
export interface INeighborhoodService extends IBaseService {
  getNeighborhood(neighborhoodId: string): Promise<Neighborhood | null>
  createNeighborhood(
    neighborhood: NeighborhoodInsert
  ): Promise<Neighborhood | null>
  updateNeighborhood(
    neighborhoodId: string,
    updates: NeighborhoodUpdate
  ): Promise<Neighborhood | null>
  getNeighborhoodsByCity(city: string, state: string): Promise<Neighborhood[]>
  getNeighborhoodsByMetroArea(metroArea: string): Promise<Neighborhood[]>
  searchNeighborhoods(query: string): Promise<Neighborhood[]>
}

/**
 * User profile management interface
 */
export interface IUserService extends IBaseService {
  getUserProfile(userId: string): Promise<UserProfile | null>
  createUserProfile(profile: UserProfileInsert): Promise<UserProfile | null>
  updateUserProfile(
    userId: string,
    updates: UserProfileUpdate
  ): Promise<UserProfile | null>
  getUserProfileWithHousehold(
    userId: string
  ): Promise<UserProfile & { household?: Household | null }>
}

/**
 * Household management interface
 */
export interface IHouseholdService extends IBaseService {
  createHousehold(household: HouseholdInsert): Promise<Household | null>
  getHousehold(householdId: string): Promise<Household | null>
  updateHousehold(
    householdId: string,
    updates: HouseholdUpdate
  ): Promise<Household | null>
  getHouseholdMembers(householdId: string): Promise<UserProfile[]>
}

/**
 * User interactions interface
 */
export interface IInteractionService extends IBaseService {
  recordInteraction(
    interaction: UserPropertyInteractionInsert
  ): Promise<UserPropertyInteraction | null>
  getUserPropertyInteractions(
    userId: string,
    limit?: number
  ): Promise<UserPropertyInteraction[]>
  getPropertyInteractions(
    propertyId: string
  ): Promise<UserPropertyInteraction[]>
  getUserPropertyInteractionsByType(
    userId: string,
    interactionType: string
  ): Promise<UserPropertyInteraction[]>
}

/**
 * Saved searches interface
 */
export interface ISavedSearchService extends IBaseService {
  createSavedSearch(search: SavedSearchInsert): Promise<SavedSearch | null>
  getSavedSearches(userId: string): Promise<SavedSearch[]>
  updateSavedSearch(
    searchId: string,
    updates: SavedSearchUpdate
  ): Promise<SavedSearch | null>
  deleteSavedSearch(searchId: string): Promise<boolean>
}

/**
 * Comprehensive property service interface (facade pattern)
 */
export interface IPropertyService
  extends IPropertyCrudService,
    IPropertySearchService,
    INeighborhoodService {
  // Inherits all methods from the component interfaces
}

/**
 * Comprehensive user service interface
 */
export interface IUserServiceFull
  extends IUserService,
    IHouseholdService,
    IInteractionService,
    ISavedSearchService {
  // Inherits all methods from the component interfaces
}

/**
 * Service method context for error tracking
 */
export interface IServiceMethodContext {
  serviceName: string
  methodName: string
  params: Record<string, unknown>
  startTime: Date
  userId?: string
  requestId?: string
}

/**
 * Service metrics interface for monitoring
 */
export interface IServiceMetrics {
  recordMethodCall(context: IServiceMethodContext): void
  recordMethodSuccess(context: IServiceMethodContext, duration: number): void
  recordMethodError(
    context: IServiceMethodContext,
    error: Error,
    duration: number
  ): void
}

/**
 * Cache interface for service layer caching
 */
export interface IServiceCache {
  get<T>(key: string): Promise<T | null>
  set<T>(key: string, value: T, ttlSeconds?: number): Promise<void>
  delete(key: string): Promise<void>
  clear(): Promise<void>
}

/**
 * Feature flag interface for gradual rollouts
 */
export interface IFeatureFlags {
  isEnabled(flag: string, userId?: string): Promise<boolean>
  getValue<T>(flag: string, defaultValue: T, userId?: string): Promise<T>
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
