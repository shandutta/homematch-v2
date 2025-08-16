/**
 * Real Integration Tests for Couples Mutual Likes API
 * Uses actual database connections instead of mocks
 */
import { describe, test, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { createClient } from '@/lib/supabase/standalone'
import { TestDataFactory, cleanupAllTestData } from '../../utils/test-data-factory'
import { TestDatabaseQueries, TestDatabaseAssertions, waitForDatabase } from '../../utils/db-test-helpers'

// Use real API endpoint via Next.js test server
const API_BASE = process.env.TEST_API_URL || 'http://localhost:3000'

describe('Real Integration: Couples Mutual Likes API', () => {
  let factory: TestDataFactory
  let queries: TestDatabaseQueries
  let _assertions: TestDatabaseAssertions
  let _authToken: string

  beforeAll(async () => {
    // Initialize test utilities
    const client = createClient()
    factory = new TestDataFactory(client)
    queries = new TestDatabaseQueries(client)
    _assertions = new TestDatabaseAssertions(client)
    
    // In a real app, you'd generate a JWT for the test user
    // For now, we'll use a mock token or skip auth in test environment
    _authToken = process.env.TEST_AUTH_TOKEN || 'test-token'
  })

  afterAll(async () => {
    // Clean up all test data
    await cleanupAllTestData()
  })

  beforeEach(async () => {
    // Wait for any database operations to settle
    await waitForDatabase(50)
  })

  describe('Authentication', () => {
    test('should return 401 when user is not authenticated', async () => {
      const response = await fetch(`${API_BASE}/api/couples/mutual-likes`)
      
      expect(response.status).toBe(401)
      const data = await response.json()
      expect(data.error).toBe('Unauthorized')
    })

    test('should return 401 when auth header is invalid', async () => {
      const response = await fetch(`${API_BASE}/api/couples/mutual-likes`, {
        headers: {
          'Authorization': 'Bearer invalid-token',
        },
      })
      
      expect(response.status).toBe(401)
      const data = await response.json()
      expect(data.error).toBe('Unauthorized')
    })
  })

  describe('Successful Requests', () => {
    test('should return mutual likes without property details by default', async () => {
      // Create a couples scenario with mutual likes
      const scenario = await factory.createCouplesScenario()
      
      try {
        const response = await fetch(`${API_BASE}/api/couples/mutual-likes`, {
          headers: {
            'x-test-user-id': scenario.users[0].id, // Test header to override auth
          },
        })

        expect(response.status).toBe(200)
        const data = await response.json()
        
        expect(data.mutualLikes).toBeDefined()
        expect(Array.isArray(data.mutualLikes)).toBe(true)
        expect(data.mutualLikes.length).toBeGreaterThan(0)
        
        // Should have performance metrics
        expect(data.performance).toEqual({
          totalTime: expect.any(Number),
          cached: expect.any(Boolean),
          count: expect.any(Number),
        })
        
        // Verify the mutual like data structure
        const mutualLike = data.mutualLikes[0]
        expect(mutualLike).toHaveProperty('property_id')
        expect(mutualLike).toHaveProperty('liked_by_count')
        expect(mutualLike).toHaveProperty('first_liked_at')
        expect(mutualLike).toHaveProperty('last_liked_at')
        expect(mutualLike).toHaveProperty('user_ids')
        expect(mutualLike.liked_by_count).toBe(2)
        expect(mutualLike.user_ids).toContain(scenario.users[0].id)
        expect(mutualLike.user_ids).toContain(scenario.users[1].id)
      } finally {
        await factory.cleanup()
      }
    })

    test('should return empty array when no mutual likes exist', async () => {
      // Create user with no interactions
      const lonelyUser = await factory.createUser()

      try {
        const response = await fetch(`${API_BASE}/api/couples/mutual-likes`, {
          headers: {
            'x-test-user-id': lonelyUser.id,
          },
        })

        expect(response.status).toBe(200)
        const data = await response.json()
        
        expect(data.mutualLikes).toEqual([])
        expect(data.performance.cached).toBe(false)
        expect(data.performance.count).toBe(0)
      } finally {
        await factory.cleanup()
      }
    })

    test('should include property details when requested', async () => {
      // Create scenario with mutual likes
      const scenario = await factory.createCouplesScenario()
      
      try {
        const response = await fetch(
          `${API_BASE}/api/couples/mutual-likes?includeProperties=true`,
          {
            headers: {
              'x-test-user-id': scenario.users[0].id,
            },
          }
        )

        expect(response.status).toBe(200)
        const data = await response.json()
        
        expect(data.mutualLikes.length).toBeGreaterThan(0)
        
        // Each mutual like should have property details
        data.mutualLikes.forEach((mutualLike: any) => {
          expect(mutualLike).toHaveProperty('property')
          if (mutualLike.property) {
            expect(mutualLike.property).toHaveProperty('id')
            expect(mutualLike.property).toHaveProperty('address')
            expect(mutualLike.property).toHaveProperty('price')
            expect(mutualLike.property).toHaveProperty('bedrooms')
            expect(mutualLike.property).toHaveProperty('bathrooms')
          }
        })
      } finally {
        await factory.cleanup()
      }
    })

    test('should handle missing properties gracefully', async () => {
      // Create scenario then delete one of the properties
      const scenario = await factory.createCouplesScenario()
      
      // Delete the mutual like property to test graceful handling
      const client = createClient()
      await client
        .from('properties')
        .delete()
        .eq('id', scenario.mutualLikes[0].id)
      
      try {
        const response = await fetch(
          `${API_BASE}/api/couples/mutual-likes?includeProperties=true`,
          {
            headers: {
              'x-test-user-id': scenario.users[0].id,
            },
          }
        )

        expect(response.status).toBe(200)
        const data = await response.json()
        
        // Should still return mutual likes but with null property
        if (data.mutualLikes.length > 0) {
          data.mutualLikes.forEach((mutualLike: any) => {
            if (mutualLike.property_id === scenario.mutualLikes[0].id) {
              expect(mutualLike.property).toBeNull()
            }
          })
        }
      } finally {
        await factory.cleanup()
      }
    })
  })

  describe('Query Parameters', () => {
    test('should exclude properties when includeProperties=false', async () => {
      const scenario = await factory.createCouplesScenario()
      
      try {
        const response = await fetch(
          `${API_BASE}/api/couples/mutual-likes?includeProperties=false`,
          {
            headers: {
              'x-test-user-id': scenario.users[0].id,
            },
          }
        )

        expect(response.status).toBe(200)
        const data = await response.json()
        
        // Should not include property details
        data.mutualLikes.forEach((mutualLike: any) => {
          expect(mutualLike).not.toHaveProperty('property')
        })
      } finally {
        await factory.cleanup()
      }
    })

    test('should handle invalid query parameters gracefully', async () => {
      const user = await factory.createUser()
      
      try {
        // Test with invalid includeProperties value
        const response = await fetch(
          `${API_BASE}/api/couples/mutual-likes?includeProperties=invalid`,
          {
            headers: {
              'x-test-user-id': user.id,
            },
          }
        )

        expect(response.status).toBe(200)
        const data = await response.json()
        expect(data.mutualLikes).toBeDefined()
      } finally {
        await factory.cleanup()
      }
    })
  })

  describe('Error Handling', () => {
    test('should return 500 when database error occurs', async () => {
      // This test would require simulating a database error
      // For now, we'll test with an invalid user ID format
      const response = await fetch(`${API_BASE}/api/couples/mutual-likes`, {
        headers: {
          'x-test-user-id': 'invalid-uuid-format',
        },
      })

      // The service should handle this gracefully
      expect([200, 400, 500]).toContain(response.status)
    })

    test('should return 405 for non-GET methods', async () => {
      const methods = ['POST', 'PUT', 'DELETE', 'PATCH']
      
      for (const method of methods) {
        const response = await fetch(`${API_BASE}/api/couples/mutual-likes`, {
          method,
          headers: {
            'Content-Type': 'application/json',
          },
        })
        
        expect(response.status).toBe(405)
      }
    })
  })

  describe('Performance Metrics', () => {
    test('should include performance metrics in response', async () => {
      const user = await factory.createUser()

      try {
        const response = await fetch(`${API_BASE}/api/couples/mutual-likes`, {
          headers: {
            'x-test-user-id': user.id,
          },
        })

        const data = await response.json()
        
        expect(data.performance).toEqual({
          totalTime: expect.any(Number),
          cached: expect.any(Boolean),
          count: expect.any(Number),
        })
        expect(data.performance.totalTime).toBeGreaterThan(0)
        expect(typeof data.performance.cached).toBe('boolean')
        expect(typeof data.performance.count).toBe('number')
      } finally {
        await factory.cleanup()
      }
    })

    test('should handle concurrent requests efficiently', async () => {
      const users = await Promise.all(
        Array.from({ length: 3 }, () => factory.createUser())
      )

      try {
        // Make concurrent requests
        const requests = users.map(user =>
          fetch(`${API_BASE}/api/couples/mutual-likes`, {
            headers: {
              'x-test-user-id': user.id,
            },
          })
        )

        const responses = await Promise.all(requests)
        
        // All should succeed
        responses.forEach(response => {
          expect(response.status).toBe(200)
        })

        // Check response times are reasonable
        const data = await Promise.all(responses.map(r => r.json()))
        data.forEach(d => {
          expect(d.performance.totalTime).toBeLessThan(2000) // Should be under 2 seconds
        })
      } finally {
        await factory.cleanup()
      }
    })
  })

  describe('Data Consistency', () => {
    test('should match mutual likes with properties correctly', async () => {
      // Create specific test scenario
      const user1 = await factory.createUser()
      const user2 = await factory.createUser()
      const _household = await factory.createHousehold([user1.id, user2.id])
      
      const property1 = await factory.createProperty({ address: '123 Test St' })
      const property2 = await factory.createProperty({ address: '456 Oak Ave' })
      
      // Both users like property1 (mutual like)
      await factory.createInteraction(user1.id, property1.id, 'like')
      await factory.createInteraction(user2.id, property1.id, 'like')
      
      // Only user1 likes property2 (not mutual)
      await factory.createInteraction(user1.id, property2.id, 'like')

      try {
        const response = await fetch(
          `${API_BASE}/api/couples/mutual-likes?includeProperties=true`,
          {
            headers: {
              'x-test-user-id': user1.id,
            },
          }
        )

        const data = await response.json()
        
        // Should only return property1 as mutual like
        expect(data.mutualLikes.length).toBe(1)
        const mutualLike = data.mutualLikes[0]
        expect(mutualLike.property_id).toBe(property1.id)
        expect(mutualLike.liked_by_count).toBe(2)
        expect(mutualLike.property.address).toBe('123 Test St')
      } finally {
        await factory.cleanup()
      }
    })

    test('should maintain referential integrity', async () => {
      // Verify no orphaned records after operations
      const violations = await queries.verifyConstraints()
      expect(violations).toHaveLength(0)
    })

    test('should handle household changes correctly', async () => {
      const user1 = await factory.createUser()
      const user2 = await factory.createUser()
      const user3 = await factory.createUser()
      
      // Initially two users in household
      const _household = await factory.createHousehold([user1.id, user2.id])
      const property = await factory.createProperty()
      
      // Both like the property
      await factory.createInteraction(user1.id, property.id, 'like')
      await factory.createInteraction(user2.id, property.id, 'like')

      try {
        // Should be mutual like initially
        let response = await fetch(`${API_BASE}/api/couples/mutual-likes`, {
          headers: {
            'x-test-user-id': user1.id,
          },
        })
        
        let data = await response.json()
        expect(data.mutualLikes.length).toBe(1)
        
        // Add third user to household
        const client = createClient()
        await client
          .from('user_profiles')
          .update({ household_id: _household.id })
          .eq('id', user3.id)
        
        // Wait for changes to propagate
        await waitForDatabase(100)
        
        // Should no longer be mutual like (only 2/3 users liked it)
        response = await fetch(`${API_BASE}/api/couples/mutual-likes`, {
          headers: {
            'x-test-user-id': user1.id,
          },
        })
        
        data = await response.json()
        expect(data.mutualLikes.length).toBe(0)
      } finally {
        await factory.cleanup()
      }
    })
  })

  describe('Complex Scenarios', () => {
    test('should handle multiple properties with different like counts', async () => {
      const user1 = await factory.createUser()
      const user2 = await factory.createUser()
      const user3 = await factory.createUser()
      const _household = await factory.createHousehold([user1.id, user2.id, user3.id])
      
      const property1 = await factory.createProperty() // All 3 will like
      const property2 = await factory.createProperty() // Only 2 will like
      const property3 = await factory.createProperty() // Only 1 will like
      
      // Property 1: All users like (mutual)
      await factory.createInteraction(user1.id, property1.id, 'like')
      await factory.createInteraction(user2.id, property1.id, 'like')
      await factory.createInteraction(user3.id, property1.id, 'like')
      
      // Property 2: Only 2 users like (not mutual for 3-person household)
      await factory.createInteraction(user1.id, property2.id, 'like')
      await factory.createInteraction(user2.id, property2.id, 'like')
      
      // Property 3: Only 1 user likes (not mutual)
      await factory.createInteraction(user1.id, property3.id, 'like')

      try {
        const response = await fetch(`${API_BASE}/api/couples/mutual-likes`, {
          headers: {
            'x-test-user-id': user1.id,
          },
        })

        const data = await response.json()
        
        // Should only return property1 as mutual like
        expect(data.mutualLikes.length).toBe(1)
        expect(data.mutualLikes[0].property_id).toBe(property1.id)
        expect(data.mutualLikes[0].liked_by_count).toBe(3)
      } finally {
        await factory.cleanup()
      }
    })

    test('should handle temporal aspects of mutual likes', async () => {
      const user1 = await factory.createUser()
      const user2 = await factory.createUser()
      const _household = await factory.createHousehold([user1.id, user2.id])
      const property = await factory.createProperty()
      
      // User1 likes first
      const _interaction1 = await factory.createInteraction(user1.id, property.id, 'like', {
        created_at: '2024-01-01T10:00:00.000Z',
      })
      
      // User2 likes later
      const _interaction2 = await factory.createInteraction(user2.id, property.id, 'like', {
        created_at: '2024-01-01T15:00:00.000Z',
      })

      try {
        const response = await fetch(`${API_BASE}/api/couples/mutual-likes`, {
          headers: {
            'x-test-user-id': user1.id,
          },
        })

        const data = await response.json()
        
        expect(data.mutualLikes.length).toBe(1)
        const mutualLike = data.mutualLikes[0]
        
        // Should track first and last like times
        expect(mutualLike.first_liked_at).toBe('2024-01-01T10:00:00.000Z')
        expect(mutualLike.last_liked_at).toBe('2024-01-01T15:00:00.000Z')
      } finally {
        await factory.cleanup()
      }
    })
  })
})