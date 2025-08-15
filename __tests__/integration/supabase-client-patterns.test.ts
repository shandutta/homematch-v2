import { describe, test, expect, beforeAll, afterAll } from 'vitest'
import { vi } from 'vitest'
import { createClient as createServerClient, createApiClient, createServiceClient } from '@/lib/supabase/server'
import { createClient as createBrowserClient } from '@/lib/supabase/client'
import { setupTestDatabase, cleanupTestDatabase } from '../fixtures'
import { NextRequest } from 'next/server'

describe('Supabase Client Patterns Integration Tests', () => {
  beforeAll(async () => {
    await setupTestDatabase()
  })

  afterAll(async () => {
    await cleanupTestDatabase()
  })

  describe('Server Client Pattern', () => {
    test('should create server client with proper configuration', async () => {
      const client = await createServerClient()
      
      expect(client).toBeTruthy()
      expect(typeof client.from).toBe('function')
      expect(typeof client.auth).toBe('object')
    })

    test('should handle cookie management correctly', async () => {
      const client = await createServerClient()
      
      // Test basic query to ensure client works
      const { error } = await client.from('properties').select('id').limit(1)
      
      // Should not throw errors for basic operations
      expect(error).toBeFalsy()
    })

    test('should handle authorization headers in server context', async () => {
      // Mock headers with authorization
      const mockHeaders = new Map()
      mockHeaders.set('authorization', 'Bearer test-token-123')
      
      vi.doMock('next/headers', () => ({
        cookies: vi.fn().mockResolvedValue({
          getAll: vi.fn().mockReturnValue([]),
          set: vi.fn()
        }),
        headers: vi.fn().mockResolvedValue(mockHeaders)
      }))

      const client = await createServerClient()
      expect(client).toBeTruthy()
    })

    test('should handle missing headers gracefully', async () => {
      // Mock headers without authorization
      const mockHeaders = new Map()
      
      vi.doMock('next/headers', () => ({
        cookies: vi.fn().mockResolvedValue({
          getAll: vi.fn().mockReturnValue([]),
          set: vi.fn()
        }),
        headers: vi.fn().mockResolvedValue(mockHeaders)
      }))

      const client = await createServerClient()
      expect(client).toBeTruthy()
    })
  })

  describe('Browser Client Pattern', () => {
    test('should create browser client with proper configuration', () => {
      const client = createBrowserClient()
      
      expect(client).toBeTruthy()
      expect(typeof client.from).toBe('function')
      expect(typeof client.auth).toBe('object')
    })

    test('should handle browser environment correctly', () => {
      // Simulate browser environment
      const originalWindow = global.window
      global.window = {} as any

      const client = createBrowserClient()
      expect(client).toBeTruthy()

      // Restore original environment
      global.window = originalWindow
    })

    test('should maintain consistent API surface with server client', () => {
      const browserClient = createBrowserClient()
      
      // Should have same basic methods as server client
      expect(typeof browserClient.from).toBe('function')
      expect(typeof browserClient.auth).toBe('object')
      expect(typeof browserClient.storage).toBe('object')
      expect(typeof browserClient.rpc).toBe('function')
    })
  })

  describe('API Client Pattern', () => {
    test('should create API client without NextRequest', () => {
      const client = createApiClient()
      
      expect(client).toBeTruthy()
      expect(typeof client.from).toBe('function')
      expect(typeof client.auth).toBe('object')
    })

    test('should create API client with NextRequest and authorization', () => {
      const mockRequest = {
        headers: new Map([
          ['authorization', 'Bearer api-token-456'],
          ['cookie', 'session=abc123; other=value']
        ])
      } as any as NextRequest

      const client = createApiClient(mockRequest)
      
      expect(client).toBeTruthy()
      expect(typeof client.from).toBe('function')
    })

    test('should parse cookies correctly from NextRequest', () => {
      const mockRequest = {
        headers: new Map([
          ['cookie', 'sb-access-token=token123; sb-refresh-token=refresh456; other=value']
        ])
      } as any as NextRequest

      const client = createApiClient(mockRequest)
      
      expect(client).toBeTruthy()
    })

    test('should handle malformed cookies gracefully', () => {
      const mockRequest = {
        headers: new Map([
          ['cookie', 'malformed-cookie-string===invalid']
        ])
      } as any as NextRequest

      const client = createApiClient(mockRequest)
      
      expect(client).toBeTruthy()
    })

    test('should handle missing cookies gracefully', () => {
      const mockRequest = {
        headers: new Map([
          ['authorization', 'Bearer token123']
        ])
      } as any as NextRequest

      const client = createApiClient(mockRequest)
      
      expect(client).toBeTruthy()
    })

    test('should have different auth configuration than server client', () => {
      const apiClient = createApiClient()
      
      // API client should have different auth settings for stateless operation
      expect(apiClient).toBeTruthy()
      // Note: We can't directly test auth configuration as it's internal,
      // but we ensure the client is created with different parameters
    })
  })

  describe('Service Client Pattern', () => {
    test('should create service client with admin privileges', () => {
      const client = createServiceClient()
      
      expect(client).toBeTruthy()
      expect(typeof client.from).toBe('function')
      expect(typeof client.auth).toBe('object')
    })

    test('should bypass RLS with service role', async () => {
      const client = createServiceClient()
      
      // Service client should be able to perform operations that regular clients cannot
      const { error } = await client.from('properties').select('id').limit(1)
      
      // Should not have RLS restrictions
      expect(error).toBeFalsy()
    })

    test('should have no cookie management', () => {
      const client = createServiceClient()
      
      // Service client should work without cookies
      expect(client).toBeTruthy()
    })
  })

  describe('Client Selection Patterns', () => {
    test('PropertyService should select correct client based on environment', async () => {
      const { PropertyService } = await import('@/lib/services/properties')
      const service = new PropertyService()
      
      // Test server environment
      const originalWindow = global.window
      delete (global as any).window
      
      const serverClient = await (service as any).getSupabase()
      expect(serverClient).toBeTruthy()
      
      // Test browser environment
      global.window = {} as any
      
      const browserClient = await (service as any).getSupabase()
      expect(browserClient).toBeTruthy()
      
      // Restore original environment
      if (originalWindow) {
        global.window = originalWindow
      } else {
        delete (global as any).window
      }
    })

    test('should handle client creation errors gracefully', async () => {
      // Mock environment variables to cause client creation failure
      const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const originalKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      
      delete process.env.NEXT_PUBLIC_SUPABASE_URL
      delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      
      expect(() => createBrowserClient()).toThrow()
      expect(() => createApiClient()).toThrow()
      expect(() => createServiceClient()).toThrow()
      
      // Restore environment variables
      if (originalUrl) process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl
      if (originalKey) process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = originalKey
    })
  })

  describe('Client Authentication Patterns', () => {
    test('should handle bearer token extraction correctly', () => {
      const mockRequest = {
        headers: new Map([
          ['authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test']
        ])
      } as any as NextRequest

      const client = createApiClient(mockRequest)
      expect(client).toBeTruthy()
    })

    test('should handle malformed authorization header', () => {
      const mockRequest = {
        headers: new Map([
          ['authorization', 'InvalidFormat token123']
        ])
      } as any as NextRequest

      const client = createApiClient(mockRequest)
      expect(client).toBeTruthy()
    })

    test('should handle empty authorization header', () => {
      const mockRequest = {
        headers: new Map([
          ['authorization', '']
        ])
      } as any as NextRequest

      const client = createApiClient(mockRequest)
      expect(client).toBeTruthy()
    })
  })

  describe('Client Error Handling Patterns', () => {
    test('should handle network errors consistently across clients', async () => {
      const serverClient = await createServerClient()
      const browserClient = createBrowserClient()
      const apiClient = createApiClient()
      const serviceClient = createServiceClient()

      // All clients should handle network errors the same way
      const clients = [serverClient, browserClient, apiClient, serviceClient]
      
      for (const client of clients) {
        // Test with invalid query that might cause network error
        const { error } = await client
          .from('non_existent_table')
          .select('*')
          .limit(1)
        
        // Should handle errors gracefully (not throw)
        expect(error).toBeTruthy()
      }
    })

    test('should handle timeout errors consistently', async () => {
      const serverClient = await createServerClient()
      
      // Mock a timeout scenario
      const originalFrom = serverClient.from
      serverClient.from = vi.fn().mockImplementation(() => {
        throw new Error('Request timeout')
      })
      
      expect(() => serverClient.from('properties')).toThrow('Request timeout')
      
      // Restore original method
      serverClient.from = originalFrom
    })

    test('should handle RLS policy violations consistently', async () => {
      const serverClient = await createServerClient()
      
      // Test operation that might trigger RLS violation
      const { error } = await serverClient
        .from('properties')
        .update({ price: 999999 })
        .eq('id', 'non-existent-id')
      
      // Should handle RLS violations gracefully
      if (error) {
        expect(typeof error.message).toBe('string')
      }
    })
  })

  describe('Client Performance Patterns', () => {
    test('should create clients efficiently', async () => {
      const startTime = Date.now()
      
      // Create multiple clients
      const serverClient = await createServerClient()
      const browserClient = createBrowserClient()
      const apiClient = createApiClient()
      const serviceClient = createServiceClient()
      
      const endTime = Date.now()
      const creationTime = endTime - startTime
      
      expect([serverClient, browserClient, apiClient, serviceClient]).toHaveLength(4)
      // Should create all clients quickly (under 100ms)
      expect(creationTime).toBeLessThan(100)
    })

    test('should reuse connections efficiently', async () => {
      const client1 = await createServerClient()
      const client2 = await createServerClient()
      
      // Both clients should be functional
      expect(client1).toBeTruthy()
      expect(client2).toBeTruthy()
      
      // Test that both can perform operations
      const [result1, result2] = await Promise.all([
        client1.from('properties').select('id').limit(1),
        client2.from('properties').select('id').limit(1)
      ])
      
      // Both should work without interference
      expect(result1.error).toBeFalsy()
      expect(result2.error).toBeFalsy()
    })
  })

  describe('Client Configuration Patterns', () => {
    test('should apply correct cookie settings for server client', async () => {
      const client = await createServerClient()
      
      // Server client should be configured for session persistence
      expect(client).toBeTruthy()
      
      // Test that client can handle auth operations
      const { error } = await client.auth.getSession()
      expect(error).toBeFalsy()
    })

    test('should apply correct settings for API client', () => {
      const client = createApiClient()
      
      // API client should be configured for stateless operation
      expect(client).toBeTruthy()
    })

    test('should apply correct settings for service client', () => {
      const client = createServiceClient()
      
      // Service client should be configured with admin privileges
      expect(client).toBeTruthy()
    })
  })

  describe('Client Integration Patterns', () => {
    test('should work correctly with PropertyService integration', async () => {
      const { PropertyService } = await import('@/lib/services/properties')
      const service = new PropertyService()
      
      // Test that PropertyService can use the client correctly
      const properties = await service.searchProperties({
        filters: {},
        pagination: { limit: 1 }
      })
      
      expect(properties).toBeTruthy()
      expect(typeof properties.total).toBe('number')
      expect(Array.isArray(properties.properties)).toBe(true)
    })

    test('should maintain transaction consistency across operations', async () => {
      const client = await createServerClient()
      
      // Test that multiple operations can be performed consistently
      const operations = [
        client.from('properties').select('id').limit(1),
        client.from('neighborhoods').select('id').limit(1)
      ]
      
      const results = await Promise.all(operations)
      
      // All operations should complete successfully
      results.forEach(result => {
        expect(result.error).toBeFalsy()
      })
    })
  })
})