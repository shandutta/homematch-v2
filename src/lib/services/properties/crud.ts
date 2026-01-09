/**
 * Property CRUD Service
 *
 * Handles basic Create, Read, Update, Delete operations for properties.
 * Separated from search and analytics functionality for better maintainability.
 */

import type {
  Property,
  PropertyInsert,
  PropertyUpdate,
  PropertyWithNeighborhood,
} from '@/types/database'
import { BaseService } from '@/lib/services/base'
import type { ISupabaseClientFactory } from '@/lib/services/interfaces'
import { DatabaseError, NotFoundError } from '@/lib/services/errors'

export class PropertyCrudService extends BaseService {
  constructor(clientFactory?: ISupabaseClientFactory) {
    super(clientFactory)
  }

  async getProperty(propertyId: string): Promise<Property | null> {
    this.validateRequired({ propertyId })

    return this.executeQuery('getProperty', async (supabase) => {
      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .eq('id', propertyId)
        .eq('is_active', true)
        .single()

      if (error) {
        throw new DatabaseError('Failed to fetch property', {
          propertyId,
          error,
        })
      }

      return data
    })
  }

  async getPropertyWithNeighborhood(
    propertyId: string
  ): Promise<PropertyWithNeighborhood | null> {
    this.validateRequired({ propertyId })

    return this.executeQuery(
      'getPropertyWithNeighborhood',
      async (supabase) => {
        const { data, error } = await supabase
          .from('properties')
          .select(
            `
            *,
            neighborhood:neighborhoods(*)
          `
          )
          .eq('id', propertyId)
          .eq('is_active', true)
          .single()

        if (error) {
          throw new DatabaseError(
            'Failed to fetch property with neighborhood',
            { propertyId, error }
          )
        }

        return data
      }
    )
  }

  async createProperty(property: PropertyInsert): Promise<Property | null> {
    this.validateRequired({ property })
    this.validatePropertyData(property)

    return this.executeQuery('createProperty', async (supabase) => {
      const sanitizedProperty = this.sanitizeInput<PropertyInsert>(property)

      const { data, error } = await supabase
        .from('properties')
        .insert(sanitizedProperty)
        .select()
        .single()

      if (error) {
        throw new DatabaseError('Failed to create property', {
          property,
          error,
        })
      }

      return data
    })
  }

  async updateProperty(
    propertyId: string,
    updates: PropertyUpdate
  ): Promise<Property | null> {
    this.validateRequired({ propertyId, updates })

    return this.executeQuery('updateProperty', async (supabase) => {
      const sanitizedUpdates = this.sanitizeInput(updates)

      // Add updated_at timestamp
      const updatesWithTimestamp = {
        ...sanitizedUpdates,
        updated_at: new Date().toISOString(),
      }

      const { data, error } = await supabase
        .from('properties')
        .update(updatesWithTimestamp)
        .eq('id', propertyId)
        .select()
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          throw new NotFoundError('Property not found', { propertyId })
        }
        throw new DatabaseError('Failed to update property', {
          propertyId,
          updates,
          error,
        })
      }

      return data
    })
  }

  async deleteProperty(propertyId: string): Promise<boolean> {
    this.validateRequired({ propertyId })

    return this.executeBooleanQuery('deleteProperty', async (supabase) => {
      // Soft delete by setting is_active to false
      const { error } = await supabase
        .from('properties')
        .update({
          is_active: false,
          updated_at: new Date().toISOString(),
        })
        .eq('id', propertyId)

      if (error) {
        if (error.code === 'PGRST116') {
          throw new NotFoundError('Property not found', { propertyId })
        }
        throw new DatabaseError('Failed to delete property', {
          propertyId,
          error,
        })
      }

      return true
    })
  }

  async getPropertiesByZpid(zpid: string): Promise<Property | null> {
    this.validateRequired({ zpid })

    return this.executeQuery('getPropertiesByZpid', async (supabase) => {
      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .eq('zpid', zpid)
        .eq('is_active', true)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          return null // Not found is not an error for this method
        }
        throw new DatabaseError('Failed to fetch property by ZPID', {
          zpid,
          error,
        })
      }

      return data
    })
  }

  async getPropertiesByHash(hash: string): Promise<Property | null> {
    this.validateRequired({ hash })

    return this.executeQuery('getPropertiesByHash', async (supabase) => {
      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .eq('property_hash', hash)
        .eq('is_active', true)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          return null // Not found is not an error for this method
        }
        throw new DatabaseError('Failed to fetch property by hash', {
          hash,
          error,
        })
      }

      return data
    })
  }

  /**
   * Validates property data before create/update operations
   */
  private validatePropertyData(
    property: PropertyInsert | PropertyUpdate
  ): void {
    if ('price' in property && property.price !== undefined) {
      if (property.price < 0) {
        throw new Error('Property price cannot be negative')
      }
    }

    if ('bedrooms' in property && property.bedrooms !== undefined) {
      if (property.bedrooms < 0 || property.bedrooms > 20) {
        throw new Error('Bedrooms must be between 0 and 20')
      }
    }

    if ('bathrooms' in property && property.bathrooms !== undefined) {
      if (property.bathrooms < 0 || property.bathrooms > 20) {
        throw new Error('Bathrooms must be between 0 and 20')
      }
    }

    if (
      'square_feet' in property &&
      property.square_feet !== undefined &&
      property.square_feet !== null
    ) {
      if (property.square_feet < 0) {
        throw new Error('Square feet cannot be negative')
      }
    }
  }
}

// ============================================================================
// FACTORY FUNCTION FOR DEPENDENCY INJECTION
// ============================================================================

/**
 * Creates a PropertyCrudService with optional client factory injection
 */
export function createPropertyCrudService(
  clientFactory?: ISupabaseClientFactory
): PropertyCrudService {
  return new PropertyCrudService(clientFactory)
}

// ============================================================================
// BACKWARD COMPATIBILITY UTILITIES
// ============================================================================

/**
 * Legacy function wrapper for existing consumers
 * Allows gradual migration from old PropertyService usage
 */
export class PropertyCrudLegacyAdapter {
  private service: PropertyCrudService

  constructor(clientFactory?: ISupabaseClientFactory) {
    this.service = new PropertyCrudService(clientFactory)
  }

  // Mirror the exact method signatures from original PropertyService
  async getProperty(propertyId: string): Promise<Property | null> {
    return this.service.getProperty(propertyId)
  }

  async getPropertyWithNeighborhood(
    propertyId: string
  ): Promise<PropertyWithNeighborhood | null> {
    return this.service.getPropertyWithNeighborhood(propertyId)
  }

  async createProperty(property: PropertyInsert): Promise<Property | null> {
    return this.service.createProperty(property)
  }

  async updateProperty(
    propertyId: string,
    updates: PropertyUpdate
  ): Promise<Property | null> {
    return this.service.updateProperty(propertyId, updates)
  }

  async deleteProperty(propertyId: string): Promise<boolean> {
    return this.service.deleteProperty(propertyId)
  }

  async getPropertiesByZpid(zpid: string): Promise<Property | null> {
    return this.service.getPropertiesByZpid(zpid)
  }

  async getPropertiesByHash(hash: string): Promise<Property | null> {
    return this.service.getPropertiesByHash(hash)
  }
}
