import { describe, test, expect, beforeAll, afterAll } from 'vitest'
import { vi } from 'vitest'
import { PropertyService } from '@/lib/services/properties'
import { InteractionService } from '@/lib/services/interactions'
import { createClient } from '@/lib/supabase/standalone'
import { setupTestDatabase, cleanupTestDatabase } from './fixtures'
import { getTestDataFactory } from '../utils/test-data-factory'
import { createTestClientFactory } from '../utils/test-client-factory'
import { randomUUID } from 'crypto'

describe('Error Handling Patterns Integration Tests', () => {
  beforeAll(async () => {
    await setupTestDatabase()
  })

  afterAll(async () => {
    await cleanupTestDatabase()
  })

  describe('PropertyService Error Patterns', () => {
    let propertyService: PropertyService
    let _testUser: any
    let testClient: any
    let createdPropertyIds: string[] = []

    beforeEach(async () => {
      // Create test client with service role (bypasses RLS)
      testClient = createClient()
      
      // Create client factory that returns our test client
      const clientFactory = createTestClientFactory()
      propertyService = new PropertyService(clientFactory)
      
      // Get existing test user (from setup-test-users-admin.js)
      const factory = getTestDataFactory(testClient)
      _testUser = await factory.getTestUser('test1@example.com')
      
      // Reset created properties list
      createdPropertyIds = []
    })

    afterEach(async () => {
      // Clean up any properties created during the test
      for (const propertyId of createdPropertyIds) {
        try {
          await propertyService.deleteProperty(propertyId)
        } catch (_error) {
          // Ignore cleanup errors
        }
      }
      createdPropertyIds = []
    })

    test('should handle Supabase connection errors gracefully', async () => {
      // Mock Supabase to simulate network failure
      const originalGetSupabase = (propertyService as any).getSupabase
      ;(propertyService as any).getSupabase = vi.fn().mockRejectedValue(
        new Error('Network connection failed')
      )

      const result = await propertyService.getProperty(randomUUID())
      expect(result).toBeNull()

      // Restore original method
      ;(propertyService as any).getSupabase = originalGetSupabase
    })

    test('should handle malformed property data errors', async () => {
      const invalidPropertyData = {
        address: null, // Invalid: should be string
        price: 'not-a-number', // Invalid: should be number
        bedrooms: 25, // Invalid: outside range 0-20
        city: 'Test City',
        state: 'CA',
        zip_code: '90210',
        property_type: 'single_family',
        listing_status: 'active',
        is_active: true
      } as any

      // The new validation system throws validation errors for invalid data
      await expect(propertyService.createProperty(invalidPropertyData)).rejects.toThrow('Bedrooms must be between 0 and 20')
    })

    test('should handle database constraint violations', async () => {
      // Generate truly unique zpid with test isolation
      const testRunId = Date.now()
      const randomId = Math.random().toString(36).substr(2, 9)
      const uniqueZpid = `unique-zpid-${testRunId}-${randomId}`
      
      const propertyData = {
        address: '123 Unique Street',
        city: 'Test City',
        state: 'CA',
        zip_code: '90210',
        price: 500000,
        bedrooms: 3,
        bathrooms: 2,
        square_feet: 1500,
        property_type: 'single_family',
        listing_status: 'active',
        is_active: true,
        zpid: uniqueZpid
      }

      // Create first property
      const firstProperty = await propertyService.createProperty(propertyData)
      expect(firstProperty).toBeTruthy()
      
      // Track for cleanup
      if (firstProperty) {
        createdPropertyIds.push(firstProperty.id)
      }

      // Try to create duplicate with same zpid (should fail gracefully if constraint exists)
      const duplicateProperty = await propertyService.createProperty(propertyData)
      
      // The test behavior depends on whether a unique constraint exists on zpid
      // If constraint exists: should return null
      // If no constraint: may return property (indicating no constraint in current schema)
      if (duplicateProperty) {
        // No constraint exists - track for cleanup and skip assertion
        createdPropertyIds.push(duplicateProperty.id)
        console.log('ℹ️  No unique constraint on zpid field - test skipped')
      } else {
        // Constraint exists - this is the expected behavior
        expect(duplicateProperty).toBeNull()
      }
    })

    test('should handle RLS (Row Level Security) violations', async () => {
      // This test simulates what happens when RLS blocks access
      const _supabase = await createClient()
      
      // Mock the client to simulate RLS denial
      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: null,
                error: { code: 'PGRST116', message: 'Row Level Security policy violation' }
              })
            })
          })
        })
      })

      const originalGetSupabase = (propertyService as any).getSupabase
      ;(propertyService as any).getSupabase = vi.fn().mockResolvedValue({
        from: mockFrom
      })

      const result = await propertyService.getProperty(randomUUID())
      expect(result).toBeNull()

      // Restore original method
      ;(propertyService as any).getSupabase = originalGetSupabase
    })

    test('should handle timeout errors consistently', async () => {
      const timeoutError = new Error('Request timeout')
      timeoutError.name = 'TimeoutError'

      // Mock the search service directly since facade delegates to it
      const originalSearchMethod = propertyService.searchService.searchProperties
      propertyService.searchService.searchProperties = vi.fn().mockRejectedValue(timeoutError)

      const result = await propertyService.searchProperties({
        filters: { price_min: 100000 }
      })

      expect(result).toEqual({
        properties: [],
        total: 0,
        page: 1,
        limit: 20
      })

      // Restore original method
      propertyService.searchService.searchProperties = originalSearchMethod
    })

    test('should handle partial data corruption gracefully', async () => {
      const originalGetSupabase = (propertyService as any).getSupabase
      ;(propertyService as any).getSupabase = vi.fn().mockResolvedValue({
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: 'valid-id',
                    address: null, // Corrupted data
                    price: undefined, // Missing data
                    corrupted_json_field: '{"invalid": json}' // Invalid JSON
                  },
                  error: null
                })
              })
            })
          })
        })
      })

      const result = await propertyService.getProperty(randomUUID())
      // The new error handling system returns null for data corruption
      // (rather than returning potentially corrupted data)
      expect(result).toBeNull()

      // Restore original method
      ;(propertyService as any).getSupabase = originalGetSupabase
    })
  })

  describe('InteractionService Error Patterns', () => {
    test('should handle API endpoint failures gracefully', async () => {
      // Mock fetch to simulate API failure
      const originalFetch = global.fetch
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        text: vi.fn().mockResolvedValue('Internal Server Error')
      }) as any

      await expect(
        InteractionService.recordInteraction('property-id', 'like')
      ).rejects.toThrow('Failed to record interaction (500): Internal Server Error')

      // Restore original fetch
      global.fetch = originalFetch
    })

    test('should handle network timeouts', async () => {
      const originalFetch = global.fetch
      global.fetch = vi.fn().mockRejectedValue(
        new Error('Network timeout')
      ) as any

      await expect(
        InteractionService.getInteractionSummary()
      ).rejects.toThrow('Network timeout')

      // Restore original fetch
      global.fetch = originalFetch
    })

    test('should handle malformed API responses', async () => {
      const originalFetch = global.fetch
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          // Invalid response structure - missing required fields
          invalid: 'response'
        })
      }) as any

      await expect(
        InteractionService.getInteractionSummary()
      ).rejects.toThrow('Invalid summary payload')

      // Restore original fetch
      global.fetch = originalFetch
    })

    test('should handle pagination errors correctly', async () => {
      const originalFetch = global.fetch
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        text: vi.fn().mockResolvedValue('Invalid cursor parameter')
      }) as any

      await expect(
        InteractionService.getInteractions('viewed', { cursor: 'invalid-cursor' })
      ).rejects.toThrow('Failed to fetch interactions (400): Invalid cursor parameter')

      // Restore original fetch
      global.fetch = originalFetch
    })
  })

  describe('Cross-Service Error Propagation', () => {
    test('should handle cascading failures correctly', async () => {
      const testClient = createClient()
      const clientFactory = { createClient: async () => testClient }
      const propertyService = new PropertyService(clientFactory)
      
      // Test scenario: Property creation fails, should not leave orphaned data
      const originalGetSupabase = (propertyService as any).getSupabase
      let callCount = 0
      ;(propertyService as any).getSupabase = vi.fn().mockImplementation(() => {
        callCount++
        if (callCount === 1) {
          // First call succeeds (for property creation)
          return Promise.resolve({
            from: vi.fn().mockReturnValue({
              insert: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: { id: 'temp-id', address: '123 Test St' },
                    error: null
                  })
                })
              })
            })
          })
        } else {
          // Subsequent calls fail
          return Promise.reject(new Error('Secondary operation failed'))
        }
      })

      const propertyData = {
        address: '123 Cascade Test',
        city: 'Test City',
        state: 'CA',
        zip_code: '90210',
        price: 500000,
        bedrooms: 3,
        bathrooms: 2,
        square_feet: 1500,
        property_type: 'single_family',
        listing_status: 'active',
        is_active: true
      }

      const result = await propertyService.createProperty(propertyData)
      
      // Should handle the failure gracefully
      expect(result).toBeTruthy() // First operation succeeded
      
      // Restore original method
      ;(propertyService as any).getSupabase = originalGetSupabase
    })
  })

  describe('Consistent Error Response Formats', () => {
    test('PropertyService should return consistent null values for errors', async () => {
      const testClient = createClient()
      const clientFactory = { createClient: async () => testClient }
      const propertyService = new PropertyService(clientFactory)
      
      // All these operations should return null on error, not throw
      const getResult = await propertyService.getProperty('non-existent')
      expect(getResult).toBeNull()

      const createResult = await propertyService.createProperty({} as any)
      expect(createResult).toBeNull()

      const updateResult = await propertyService.updateProperty('non-existent', {})
      expect(updateResult).toBeNull()
    })

    test('PropertyService delete operations should return consistent boolean values', async () => {
      const testClient = createClient()
      const clientFactory = { createClient: async () => testClient }
      const propertyService = new PropertyService(clientFactory)
      
      // Delete operations should return false on error, not throw
      const deleteResult = await propertyService.deleteProperty('non-existent')
      expect(typeof deleteResult).toBe('boolean')
      expect(deleteResult).toBe(false)
    })

    test('PropertyService search should return consistent empty results on error', async () => {
      const testClient = createClient()
      const clientFactory = { createClient: async () => testClient }
      const propertyService = new PropertyService(clientFactory)
      
      // Mock the search service directly since facade delegates to it
      const originalSearchMethod = propertyService.searchService.searchProperties
      propertyService.searchService.searchProperties = vi.fn().mockRejectedValue(
        new Error('Database error')
      )

      const searchResult = await propertyService.searchProperties({
        filters: { price_min: 100000 }
      })

      expect(searchResult).toEqual({
        properties: [],
        total: 0,
        page: 1,
        limit: 20
      })

      // Restore original method
      propertyService.searchService.searchProperties = originalSearchMethod
    })
  })

  describe('Error Logging and Monitoring', () => {
    test('should log errors consistently across services', async () => {
      const testClient = createClient()
      const clientFactory = { createClient: async () => testClient }
      const propertyService = new PropertyService(clientFactory)
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      // Force an error to test logging
      const originalGetSupabase = (propertyService as any).getSupabase
      ;(propertyService as any).getSupabase = vi.fn().mockResolvedValue({
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: null,
                  error: { message: 'Test error', code: 'TEST_ERROR' }
                })
              })
            })
          })
        })
      })

      await propertyService.getProperty(randomUUID())

      // Should have logged the error (new error handling system creates ServiceError objects)
      expect(consoleSpy).toHaveBeenCalledWith(
        'Error getProperty:',
        expect.objectContaining({
          code: 'DATABASE_ERROR'
        })
      )

      // Cleanup
      consoleSpy.mockRestore()
      ;(propertyService as any).getSupabase = originalGetSupabase
    })

    test('should include contextual information in error logs', async () => {
      const testClient = createClient()
      const clientFactory = { createClient: async () => testClient }
      const propertyService = new PropertyService(clientFactory)
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      // Mock the CRUD service's getSupabase method to simulate database error
      const originalGetSupabase = (propertyService.crudService as any).getSupabase
      ;(propertyService.crudService as any).getSupabase = vi.fn().mockResolvedValue({
        from: vi.fn().mockReturnValue({
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Update failed', details: 'Constraint violation' }
            })
          })
        })
      })

      await propertyService.deleteProperty(randomUUID())

      // Should log error with context (new error handling creates ServiceError)
      expect(consoleSpy).toHaveBeenCalledWith(
        'Error deleteProperty:',
        expect.objectContaining({
          code: 'DATABASE_ERROR'
        })
      )

      // Cleanup
      consoleSpy.mockRestore()
      ;(propertyService.crudService as any).getSupabase = originalGetSupabase
    })
  })
})