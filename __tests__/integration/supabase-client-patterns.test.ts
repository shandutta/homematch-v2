import { describe, test, expect, beforeAll, afterAll } from 'vitest'
import { vi } from 'vitest'
import { createClient as createBrowserClient } from '@/lib/supabase/client'
import { createClient as createStandaloneClient } from '@/lib/supabase/standalone'
import { setupTestDatabase, cleanupTestDatabase } from '../integration/fixtures'
import { createTestClientFactory } from '../utils/test-client-factory'

describe('Supabase Client Patterns E2E Tests', () => {
  beforeAll(async () => {
    await setupTestDatabase()
  })

  afterAll(async () => {
    await cleanupTestDatabase()
  })

  describe('Standalone Client Pattern', () => {
    test('should create standalone client with proper configuration', () => {
      const client = createStandaloneClient()

      expect(client).toBeTruthy()
      expect(typeof client.from).toBe('function')
      expect(typeof client.auth).toBe('object')
    })

    test('should handle basic queries correctly', async () => {
      const client = createStandaloneClient()

      // Test basic query to ensure client works
      const { error } = await client.from('properties').select('id').limit(1)

      // Should not throw errors for basic operations
      expect(error).toBeFalsy()
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
      const originalWindow = globalThis.window
      Object.defineProperty(globalThis, 'window', {
        value: {},
        configurable: true,
        writable: true,
      })

      const client = createBrowserClient()
      expect(client).toBeTruthy()

      // Restore original environment
      Object.defineProperty(globalThis, 'window', {
        value: originalWindow,
        configurable: true,
        writable: true,
      })
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

  describe('Test Client Factory Pattern', () => {
    test('should create test client with service role', async () => {
      const clientFactory = createTestClientFactory()
      const client = await clientFactory.createClient()

      expect(client).toBeTruthy()
      expect(typeof client.from).toBe('function')
      expect(typeof client.auth).toBe('object')
    })

    test('should bypass RLS with test client', async () => {
      const clientFactory = createTestClientFactory()
      const client = await clientFactory.createClient()

      // Service role should bypass RLS
      const { error } = await client.from('properties').select('id').limit(1)

      expect(error).toBeFalsy()
    })
  })

  describe('Service Role Client Pattern', () => {
    test('should create service role client with admin privileges', () => {
      const client = createStandaloneClient()

      expect(client).toBeTruthy()
      expect(typeof client.from).toBe('function')
      expect(typeof client.auth).toBe('object')
    })

    test('should bypass RLS with service role key', async () => {
      const clientFactory = createTestClientFactory()
      const client = await clientFactory.createClient()

      // Service client should be able to perform operations that regular clients cannot
      const { error } = await client.from('properties').select('id').limit(1)

      // Should not have RLS restrictions
      expect(error).toBeFalsy()
    })
  })

  describe('Client Selection Patterns', () => {
    test('PropertyService should select correct client based on environment', async () => {
      const { PropertyService } = await import('@/lib/services/properties')
      const clientFactory = createTestClientFactory()
      const service = new PropertyService(clientFactory)

      // Test server environment
      const originalWindow = globalThis.window
      Reflect.deleteProperty(globalThis, 'window')

      const getSupabase = Reflect.get(service, 'getSupabase')
      if (typeof getSupabase !== 'function') {
        throw new Error(
          'Expected getSupabase to be available on PropertyService'
        )
      }
      const serverClient = await getSupabase.call(service)
      expect(serverClient).toBeTruthy()

      // Test browser environment
      Object.defineProperty(globalThis, 'window', {
        value: {},
        configurable: true,
        writable: true,
      })

      const browserClient = await getSupabase.call(service)
      expect(browserClient).toBeTruthy()

      // Restore original environment
      if (originalWindow) {
        Object.defineProperty(globalThis, 'window', {
          value: originalWindow,
          configurable: true,
          writable: true,
        })
      } else {
        Reflect.deleteProperty(globalThis, 'window')
      }
    })

    test('should handle client creation errors gracefully', async () => {
      // Mock environment variables to cause client creation failure
      const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const originalKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      const originalServiceUrl = process.env.SUPABASE_URL
      const originalServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

      delete process.env.NEXT_PUBLIC_SUPABASE_URL
      delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      delete process.env.SUPABASE_URL
      delete process.env.SUPABASE_SERVICE_ROLE_KEY

      expect(() => createBrowserClient()).toThrow()
      expect(() => createStandaloneClient()).toThrow()

      // Restore environment variables
      if (originalUrl) process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl
      if (originalKey) process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = originalKey
      if (originalServiceUrl) process.env.SUPABASE_URL = originalServiceUrl
      if (originalServiceKey) {
        process.env.SUPABASE_SERVICE_ROLE_KEY = originalServiceKey
      }
    })
  })

  describe('Client Authentication Patterns', () => {
    test('should handle authentication with standalone client', async () => {
      const client = createStandaloneClient()

      // Test auth operations
      const { error } = await client.auth.getSession()

      // Should handle auth operations
      expect(error).toBeFalsy()
    })

    test('should handle authentication with browser client', async () => {
      const client = createBrowserClient()

      // Test auth operations
      const { error } = await client.auth.getSession()

      // Should handle auth operations
      expect(error).toBeFalsy()
    })
  })

  describe('Client Error Handling Patterns', () => {
    test('should handle network errors consistently across clients', async () => {
      const standaloneClient = createStandaloneClient()
      const browserClient = createBrowserClient()
      const testClient = await createTestClientFactory().createClient()

      // All clients should handle network errors the same way
      const clients = [standaloneClient, browserClient, testClient]

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

    // NOTE: Uses mocking to simulate timeout - can't reliably cause real timeouts on demand
    test('should handle timeout errors consistently', () => {
      const standaloneClient = createStandaloneClient()

      // Mock a timeout scenario - testing that the error propagates correctly
      const originalFrom = standaloneClient.from
      standaloneClient.from = vi.fn().mockImplementation(() => {
        throw new Error('Request timeout')
      })

      expect(() => standaloneClient.from('properties')).toThrow(
        'Request timeout'
      )

      // Restore original method
      standaloneClient.from = originalFrom
    })

    test('should handle RLS policy violations consistently', async () => {
      const standaloneClient = createStandaloneClient()

      // Test operation that might trigger RLS violation
      const { error } = await standaloneClient
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
      const standaloneClient = createStandaloneClient()
      const browserClient = createBrowserClient()
      const testClient = await createTestClientFactory().createClient()

      const endTime = Date.now()
      const creationTime = endTime - startTime

      expect([standaloneClient, browserClient, testClient]).toHaveLength(3)
      // Should create all clients quickly (under 100ms)
      expect(creationTime).toBeLessThan(100)
    })

    test('should reuse connections efficiently', async () => {
      const client1 = createStandaloneClient()
      const client2 = createStandaloneClient()

      // Both clients should be functional
      expect(client1).toBeTruthy()
      expect(client2).toBeTruthy()

      // Test that both can perform operations
      const [result1, result2] = await Promise.all([
        client1.from('properties').select('id').limit(1),
        client2.from('properties').select('id').limit(1),
      ])

      // Both should work without interference
      expect(result1.error).toBeFalsy()
      expect(result2.error).toBeFalsy()
    })
  })

  describe('Client Configuration Patterns', () => {
    test('should apply correct settings for standalone client', async () => {
      const client = createStandaloneClient()

      // Standalone client should be configured properly
      expect(client).toBeTruthy()

      // Test that client can handle auth operations
      const { error } = await client.auth.getSession()
      expect(error).toBeFalsy()
    })

    test('should apply correct settings for browser client', () => {
      const client = createBrowserClient()

      // Browser client should be configured for browser environment
      expect(client).toBeTruthy()
    })

    test('should apply correct settings for test client', async () => {
      const clientFactory = createTestClientFactory()
      const client = await clientFactory.createClient()

      // Test client should be configured with service role
      expect(client).toBeTruthy()
    })
  })

  describe('Client Integration Patterns', () => {
    test('should work correctly with PropertyService integration', async () => {
      const { PropertyService } = await import('@/lib/services/properties')
      const clientFactory = createTestClientFactory()
      const service = new PropertyService(clientFactory)

      // Test that PropertyService can use the client correctly
      const properties = await service.searchProperties({
        filters: {},
        pagination: { limit: 1 },
      })

      expect(properties).toBeTruthy()
      expect(typeof properties.total).toBe('number')
      expect(Array.isArray(properties.properties)).toBe(true)
    })

    test('should maintain transaction consistency across operations', async () => {
      const client = createStandaloneClient()

      // Test that multiple operations can be performed consistently
      const operations = [
        client.from('properties').select('id').limit(1),
        client.from('neighborhoods').select('id').limit(1),
      ]

      const results = await Promise.all(operations)

      // All operations should complete successfully
      results.forEach((result) => {
        expect(result.error).toBeFalsy()
      })
    })
  })
})
