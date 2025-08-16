/**
 * Real Integration Tests for Couples Activity API
 * Uses actual database connections instead of mocks
 */
import { describe, test, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { createClient } from '@/lib/supabase/standalone'
import { TestDataFactory, cleanupAllTestData } from '../../utils/test-data-factory'
import { TestDatabaseQueries, TestDatabaseAssertions, waitForDatabase } from '../../utils/db-test-helpers'

// Use real API endpoint via Next.js test server
const API_BASE = process.env.TEST_API_URL || 'http://localhost:3000'

describe('Real Integration: Couples Activity API', () => {
  let factory: TestDataFactory
  let queries: TestDatabaseQueries
  let assertions: TestDatabaseAssertions
  let _testScenario: any
  let authToken: string

  beforeAll(async () => {
    // Initialize test utilities
    const client = createClient()
    factory = new TestDataFactory(client)
    queries = new TestDatabaseQueries(client)
    assertions = new TestDatabaseAssertions(client)

    // Create test scenario once for all tests
    _testScenario = await factory.createCouplesScenario()
    
    // In a real app, you'd generate a JWT for the test user
    // For now, we'll use a mock token or skip auth in test environment
    authToken = process.env.TEST_AUTH_TOKEN || 'test-token'
  })

  afterAll(async () => {
    // Clean up all test data
    await cleanupAllTestData()
  })

  beforeEach(async () => {
    // Wait for any database operations to settle
    await waitForDatabase(50)
  })

  describe('Activity Retrieval', () => {
    test('should return household activity for authenticated user', async () => {
      // Create fresh test data for this test
      const scenario = await factory.createCouplesScenario()
      
      try {
        // Make real API call
        const response = await fetch(`${API_BASE}/api/couples/activity?limit=10`, {
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'x-test-user-id': scenario.users[0].id, // Test header to override auth in test mode
          },
        })

        // Verify response
        expect(response.status).toBe(200)
        
        const data = await response.json()
        expect(data).toHaveProperty('activity')
        expect(Array.isArray(data.activity)).toBe(true)
        
        // Verify activity includes interactions from both users
        const userIds = data.activity.map((a: any) => a.user_id)
        expect(userIds).toContain(scenario.users[0].id)
        expect(userIds).toContain(scenario.users[1].id)
      } finally {
        // Clean up test data
        await factory.cleanup()
      }
    })

    test('should respect pagination parameters', async () => {
      // Create properties and interactions
      const user = await factory.createUser()
      const properties = await Promise.all(
        Array.from({ length: 15 }, () => factory.createProperty())
      )
      
      // Create interactions for pagination testing
      for (const property of properties) {
        await factory.createInteraction(user.id, property.id, 'like')
      }

      try {
        // First page
        const page1Response = await fetch(
          `${API_BASE}/api/couples/activity?limit=5&offset=0`,
          {
            headers: {
              'x-test-user-id': user.id,
            },
          }
        )
        const page1Data = await page1Response.json()
        expect(page1Data.activity).toHaveLength(5)

        // Second page
        const page2Response = await fetch(
          `${API_BASE}/api/couples/activity?limit=5&offset=5`,
          {
            headers: {
              'x-test-user-id': user.id,
            },
          }
        )
        const page2Data = await page2Response.json()
        expect(page2Data.activity).toHaveLength(5)

        // Verify no overlap between pages
        const page1Ids = page1Data.activity.map((a: any) => a.id)
        const page2Ids = page2Data.activity.map((a: any) => a.id)
        const overlap = page1Ids.filter((id: string) => page2Ids.includes(id))
        expect(overlap).toHaveLength(0)
      } finally {
        await factory.cleanup()
      }
    })

    test('should return empty array when no activity exists', async () => {
      // Create user with no interactions
      const lonelyUser = await factory.createUser()

      try {
        const response = await fetch(`${API_BASE}/api/couples/activity`, {
          headers: {
            'x-test-user-id': lonelyUser.id,
          },
        })

        const data = await response.json()
        expect(response.status).toBe(200)
        expect(data.activity).toEqual([])
      } finally {
        await factory.cleanup()
      }
    })
  })

  describe('Mutual Likes Detection', () => {
    test('should identify mutual likes in activity', async () => {
      // Create specific mutual like scenario
      const user1 = await factory.createUser()
      const user2 = await factory.createUser()
      const _household = await factory.createHousehold([user1.id, user2.id])
      const property = await factory.createProperty()

      // Both users like the same property
      await factory.createInteraction(user1.id, property.id, 'like')
      await factory.createInteraction(user2.id, property.id, 'like')

      try {
        const response = await fetch(`${API_BASE}/api/couples/activity`, {
          headers: {
            'x-test-user-id': user1.id,
          },
        })

        const data = await response.json()
        
        // Find the mutual like activity
        const mutualLikeActivity = data.activity.find(
          (a: any) => a.property_id === property.id
        )
        
        expect(mutualLikeActivity).toBeDefined()
        expect(mutualLikeActivity.is_mutual_like).toBe(true)
        expect(mutualLikeActivity.liked_by_count).toBe(2)
      } finally {
        await factory.cleanup()
      }
    })
  })

  describe('Error Handling', () => {
    test('should return 401 for unauthenticated requests', async () => {
      const response = await fetch(`${API_BASE}/api/couples/activity`)
      
      expect(response.status).toBe(401)
      const data = await response.json()
      expect(data.error).toBeDefined()
    })

    test('should return 405 for non-GET methods', async () => {
      const methods = ['POST', 'PUT', 'DELETE', 'PATCH']
      
      for (const method of methods) {
        const response = await fetch(`${API_BASE}/api/couples/activity`, {
          method,
          headers: {
            'Content-Type': 'application/json',
          },
        })
        
        expect(response.status).toBe(405)
      }
    })

    test('should handle invalid query parameters gracefully', async () => {
      const user = await factory.createUser()

      try {
        // Invalid limit
        const response1 = await fetch(
          `${API_BASE}/api/couples/activity?limit=invalid`,
          {
            headers: {
              'x-test-user-id': user.id,
            },
          }
        )
        expect(response1.status).toBe(200) // Should use default limit
        
        // Negative offset
        const response2 = await fetch(
          `${API_BASE}/api/couples/activity?offset=-10`,
          {
            headers: {
              'x-test-user-id': user.id,
            },
          }
        )
        expect(response2.status).toBe(200) // Should use 0 offset
      } finally {
        await factory.cleanup()
      }
    })
  })

  describe('Performance Metrics', () => {
    test('should include performance metrics in response', async () => {
      const user = await factory.createUser()

      try {
        const response = await fetch(`${API_BASE}/api/couples/activity`, {
          headers: {
            'x-test-user-id': user.id,
          },
        })

        const data = await response.json()
        
        // Should include performance metadata
        expect(data.metadata).toBeDefined()
        expect(data.metadata.timestamp).toBeDefined()
        expect(data.metadata.duration_ms).toBeGreaterThanOrEqual(0)
        expect(data.metadata.from_cache).toBeDefined()
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
          fetch(`${API_BASE}/api/couples/activity`, {
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
          expect(d.metadata.duration_ms).toBeLessThan(1000) // Should be under 1 second
        })
      } finally {
        await factory.cleanup()
      }
    })
  })

  describe('Database Consistency', () => {
    test('should maintain referential integrity', async () => {
      // Verify no orphaned records after operations
      const violations = await queries.verifyConstraints()
      expect(violations).toHaveLength(0)
    })

    test('should properly cascade deletes', async () => {
      const user = await factory.createUser()
      const property = await factory.createProperty()
      await factory.createInteraction(user.id, property.id, 'like')

      // Delete property and verify interaction is also deleted
      const client = createClient()
      await client.from('properties').delete().eq('id', property.id)

      // Verify interaction was cascade deleted
      await assertions.assertNotExists('user_interactions', {
        property_id: property.id,
      })
    })
  })
})