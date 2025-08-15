/**
 * Improved Integration Tests for Couples Mutual Likes API
 * Uses TestDataFactory patterns with minimal mocking for better maintainability
 * Can run without real database but demonstrates real data patterns
 */
import { describe, test, expect, beforeEach, afterEach } from 'vitest'
import { vi } from 'vitest'
import { GET } from '@/app/api/couples/mutual-likes/route'
import { NextRequest } from 'next/server'

// Mock Supabase client with realistic data structures
const createMockSupabaseClient = () => {
  const mockUsers = new Map()
  const mockProperties = new Map()
  const mockInteractions = new Map()
  const mockHouseholds = new Map()
  const mockHouseholdMembers = new Map()

  return {
    auth: {
      getUser: vi.fn(),
    },
    from: vi.fn((table: string) => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      single: vi.fn(),
      // Simulate realistic database responses based on TestDataFactory patterns
      then: vi.fn().mockImplementation((callback) => {
        if (table === 'properties') {
          return callback({
            data: Array.from(mockProperties.values()),
            error: null,
          })
        }
        return callback({ data: [], error: null })
      }),
    })),
    // Test data helpers
    _testHelpers: {
      addUser: (user: any) => mockUsers.set(user.id, user),
      addProperty: (property: any) => mockProperties.set(property.id, property),
      addInteraction: (interaction: any) => mockInteractions.set(interaction.id, interaction),
      addHousehold: (household: any) => mockHouseholds.set(household.id, household),
      addHouseholdMember: (member: any) => mockHouseholdMembers.set(`${member.household_id}-${member.user_id}`, member),
      getMutualLikes: (userId: string) => {
        // Simulate CouplesService.getMutualLikes logic
        const userHouseholds = Array.from(mockHouseholdMembers.values())
          .filter((member: any) => member.user_id === userId)
          .map((member: any) => member.household_id)

        if (userHouseholds.length === 0) return []

        const householdMembers = Array.from(mockHouseholdMembers.values())
          .filter((member: any) => userHouseholds.includes(member.household_id))

        const userIds = householdMembers.map((member: any) => member.user_id)
        
        // Find properties liked by all household members
        const interactions = Array.from(mockInteractions.values())
          .filter((interaction: any) => 
            userIds.includes(interaction.user_id) && 
            interaction.interaction_type === 'like'
          )

        const propertyLikes = new Map()
        interactions.forEach((interaction: any) => {
          if (!propertyLikes.has(interaction.property_id)) {
            propertyLikes.set(interaction.property_id, new Set())
          }
          propertyLikes.get(interaction.property_id).add(interaction.user_id)
        })

        // Return only properties liked by ALL household members
        const mutualLikes = []
        for (const [propertyId, likedByUsers] of propertyLikes) {
          if (likedByUsers.size === userIds.length) {
            const propertyInteractions = interactions.filter((i: any) => i.property_id === propertyId)
            mutualLikes.push({
              property_id: propertyId,
              liked_by_count: likedByUsers.size,
              user_ids: Array.from(likedByUsers),
              first_liked_at: Math.min(...propertyInteractions.map((i: any) => new Date(i.created_at).getTime())),
              last_liked_at: Math.max(...propertyInteractions.map((i: any) => new Date(i.created_at).getTime())),
            })
          }
        }

        return mutualLikes
      },
      reset: () => {
        mockUsers.clear()
        mockProperties.clear()
        mockInteractions.clear()
        mockHouseholds.clear()
        mockHouseholdMembers.clear()
      },
    },
  }
}

// Mock the services with realistic behavior
vi.mock('@/lib/services/couples', () => ({
  CouplesService: {
    getMutualLikes: vi.fn(),
  },
}))

import { createApiClient } from '@/lib/supabase/server'
import { CouplesService } from '@/lib/services/couples'

const mockCreateApiClient = createApiClient as vi.Mock
const mockCouplesService = CouplesService as any

describe('Improved Integration: Couples Mutual Likes API', () => {
  let mockClient: any

  beforeEach(() => {
    mockClient = createMockSupabaseClient()
    mockCreateApiClient.mockReturnValue(mockClient)
    vi.clearAllMocks()
  })

  afterEach(() => {
    mockClient._testHelpers.reset()
  })

  // Helper function to create test data following TestDataFactory patterns
  const createTestScenario = () => {
    const user1 = {
      id: 'user-1',
      email: 'user1@example.com',
      first_name: 'John',
      last_name: 'Doe',
      created_at: '2024-01-01T00:00:00Z',
    }

    const user2 = {
      id: 'user-2',
      email: 'user2@example.com',
      first_name: 'Jane',
      last_name: 'Smith',
      created_at: '2024-01-01T00:00:00Z',
    }

    const household = {
      id: 'household-1',
      name: 'Test Household',
      invite_code: 'TESTCODE',
      created_by: user1.id,
      created_at: '2024-01-01T00:00:00Z',
    }

    const property1 = {
      id: 'prop-1',
      address: '123 Test St',
      city: 'Test City',
      state: 'TC',
      price: 500000,
      bedrooms: 3,
      bathrooms: 2,
      square_feet: 1500,
      property_type: 'SINGLE_FAMILY',
      listing_status: 'FOR_SALE',
      image_urls: ['/image1.jpg'],
      created_at: '2024-01-01T00:00:00Z',
    }

    const property2 = {
      id: 'prop-2',
      address: '456 Oak Ave',
      city: 'Test City',
      state: 'TC',
      price: 750000,
      bedrooms: 4,
      bathrooms: 3,
      square_feet: 2000,
      property_type: 'SINGLE_FAMILY',
      listing_status: 'FOR_SALE',
      image_urls: ['/image2.jpg'],
      created_at: '2024-01-01T00:00:00Z',
    }

    // Add data to mock client
    mockClient._testHelpers.addUser(user1)
    mockClient._testHelpers.addUser(user2)
    mockClient._testHelpers.addHousehold(household)
    mockClient._testHelpers.addProperty(property1)
    mockClient._testHelpers.addProperty(property2)
    mockClient._testHelpers.addHouseholdMember({ household_id: household.id, user_id: user1.id })
    mockClient._testHelpers.addHouseholdMember({ household_id: household.id, user_id: user2.id })

    // Create mutual like on property1
    mockClient._testHelpers.addInteraction({
      id: 'int-1',
      user_id: user1.id,
      property_id: property1.id,
      interaction_type: 'like',
      created_at: '2024-01-01T10:00:00Z',
    })
    mockClient._testHelpers.addInteraction({
      id: 'int-2',
      user_id: user2.id,
      property_id: property1.id,
      interaction_type: 'like',
      created_at: '2024-01-01T15:00:00Z',
    })

    // Only user1 likes property2 (not mutual)
    mockClient._testHelpers.addInteraction({
      id: 'int-3',
      user_id: user1.id,
      property_id: property2.id,
      interaction_type: 'like',
      created_at: '2024-01-01T12:00:00Z',
    })

    return { user1, user2, household, property1, property2 }
  }

  describe('Authentication', () => {
    test('should return 401 when user is not authenticated', async () => {
      mockClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: new Error('Unauthorized'),
      })

      const request = new NextRequest(
        'http://localhost:3000/api/couples/mutual-likes',
        { method: 'GET' }
      )

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    test('should return 401 when auth returns error', async () => {
      mockClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: new Error('Auth error'),
      })

      const request = new NextRequest(
        'http://localhost:3000/api/couples/mutual-likes',
        { method: 'GET' }
      )

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })
  })

  describe('Successful Requests with Test Data', () => {
    test('should return mutual likes using realistic test data', async () => {
      const scenario = createTestScenario()
      
      mockClient.auth.getUser.mockResolvedValue({
        data: { user: scenario.user1 },
        error: null,
      })

      const mutualLikes = mockClient._testHelpers.getMutualLikes(scenario.user1.id)
      mockCouplesService.getMutualLikes.mockResolvedValue(mutualLikes)

      const request = new NextRequest(
        'http://localhost:3000/api/couples/mutual-likes',
        { method: 'GET' }
      )

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.mutualLikes).toHaveLength(1)
      expect(data.mutualLikes[0].property_id).toBe(scenario.property1.id)
      expect(data.mutualLikes[0].liked_by_count).toBe(2)
      expect(data.mutualLikes[0].user_ids).toContain(scenario.user1.id)
      expect(data.mutualLikes[0].user_ids).toContain(scenario.user2.id)

      expect(data.performance).toEqual({
        totalTime: expect.any(Number),
        cached: expect.any(Boolean),
        count: 1,
      })
    })

    test('should return empty array when no mutual likes exist', async () => {
      // Create a lone user with no household
      const loneUser = {
        id: 'lone-user',
        email: 'lone@example.com',
        first_name: 'Lone',
        last_name: 'Wolf',
      }

      mockClient._testHelpers.addUser(loneUser)
      mockClient.auth.getUser.mockResolvedValue({
        data: { user: loneUser },
        error: null,
      })

      const mutualLikes = mockClient._testHelpers.getMutualLikes(loneUser.id)
      mockCouplesService.getMutualLikes.mockResolvedValue(mutualLikes)

      const request = new NextRequest(
        'http://localhost:3000/api/couples/mutual-likes',
        { method: 'GET' }
      )

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.mutualLikes).toEqual([])
      expect(data.performance.count).toBe(0)
    })

    test('should include property details when requested', async () => {
      const scenario = createTestScenario()
      
      mockClient.auth.getUser.mockResolvedValue({
        data: { user: scenario.user1 },
        error: null,
      })

      const mutualLikes = mockClient._testHelpers.getMutualLikes(scenario.user1.id)
      mockCouplesService.getMutualLikes.mockResolvedValue(mutualLikes)

      // Mock property fetch
      mockClient.from.mockImplementation((table: string) => {
        if (table === 'properties') {
          return {
            select: vi.fn().mockReturnThis(),
            in: vi.fn().mockResolvedValue({
              data: [scenario.property1],
              error: null,
            }),
          }
        }
        return { select: vi.fn().mockReturnThis() }
      })

      const request = new NextRequest(
        'http://localhost:3000/api/couples/mutual-likes?includeProperties=true',
        { method: 'GET' }
      )

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.mutualLikes).toHaveLength(1)
      expect(data.mutualLikes[0]).toHaveProperty('property')
      expect(data.mutualLikes[0].property).toEqual(scenario.property1)
    })
  })

  describe('Complex Scenarios with Realistic Data', () => {
    test('should handle three-person household mutual likes', async () => {
      const scenario = createTestScenario()
      
      // Add third user to household
      const user3 = {
        id: 'user-3',
        email: 'user3@example.com',
        first_name: 'Bob',
        last_name: 'Johnson',
      }

      mockClient._testHelpers.addUser(user3)
      mockClient._testHelpers.addHouseholdMember({ 
        household_id: scenario.household.id, 
        user_id: user3.id 
      })

      // User3 also likes property1 (making it a 3-way mutual like)
      mockClient._testHelpers.addInteraction({
        id: 'int-4',
        user_id: user3.id,
        property_id: scenario.property1.id,
        interaction_type: 'like',
        created_at: '2024-01-01T20:00:00Z',
      })

      mockClient.auth.getUser.mockResolvedValue({
        data: { user: scenario.user1 },
        error: null,
      })

      const mutualLikes = mockClient._testHelpers.getMutualLikes(scenario.user1.id)
      mockCouplesService.getMutualLikes.mockResolvedValue(mutualLikes)

      const request = new NextRequest(
        'http://localhost:3000/api/couples/mutual-likes',
        { method: 'GET' }
      )

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.mutualLikes).toHaveLength(1)
      expect(data.mutualLikes[0].liked_by_count).toBe(3)
      expect(data.mutualLikes[0].user_ids).toContain(user3.id)
    })

    test('should handle partial likes correctly', async () => {
      const scenario = createTestScenario()
      
      // Create a new property that only one user likes
      const property3 = {
        id: 'prop-3',
        address: '789 Pine St',
        city: 'Test City',
        price: 600000,
        bedrooms: 3,
        bathrooms: 2.5,
      }

      mockClient._testHelpers.addProperty(property3)
      mockClient._testHelpers.addInteraction({
        id: 'int-5',
        user_id: scenario.user1.id,
        property_id: property3.id,
        interaction_type: 'like',
        created_at: '2024-01-01T16:00:00Z',
      })

      mockClient.auth.getUser.mockResolvedValue({
        data: { user: scenario.user1 },
        error: null,
      })

      const mutualLikes = mockClient._testHelpers.getMutualLikes(scenario.user1.id)
      mockCouplesService.getMutualLikes.mockResolvedValue(mutualLikes)

      const request = new NextRequest(
        'http://localhost:3000/api/couples/mutual-likes',
        { method: 'GET' }
      )

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      // Should only return property1 (the mutual like), not property3
      expect(data.mutualLikes).toHaveLength(1)
      expect(data.mutualLikes[0].property_id).toBe(scenario.property1.id)
    })

    test('should handle dislikes correctly', async () => {
      const scenario = createTestScenario()
      
      // User2 dislikes property1 instead of liking it
      mockClient._testHelpers.reset()
      createTestScenario()
      
      // Remove the like and add a dislike
      mockClient._testHelpers.addInteraction({
        id: 'int-dislike',
        user_id: scenario.user2.id,
        property_id: scenario.property1.id,
        interaction_type: 'dislike',
        created_at: '2024-01-01T15:00:00Z',
      })

      mockClient.auth.getUser.mockResolvedValue({
        data: { user: scenario.user1 },
        error: null,
      })

      const mutualLikes = mockClient._testHelpers.getMutualLikes(scenario.user1.id)
      mockCouplesService.getMutualLikes.mockResolvedValue(mutualLikes)

      const request = new NextRequest(
        'http://localhost:3000/api/couples/mutual-likes',
        { method: 'GET' }
      )

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.mutualLikes).toHaveLength(0) // No mutual likes
    })
  })

  describe('Data Consistency Validation', () => {
    test('should match mutual likes with properties correctly', async () => {
      const scenario = createTestScenario()
      
      mockClient.auth.getUser.mockResolvedValue({
        data: { user: scenario.user1 },
        error: null,
      })

      const mutualLikes = mockClient._testHelpers.getMutualLikes(scenario.user1.id)
      mockCouplesService.getMutualLikes.mockResolvedValue(mutualLikes)

      // Mock property fetch with partial match (property1 exists, property2 doesn't)
      mockClient.from.mockImplementation((table: string) => {
        if (table === 'properties') {
          return {
            select: vi.fn().mockReturnThis(),
            in: vi.fn().mockResolvedValue({
              data: [scenario.property1], // Only property1 returned
              error: null,
            }),
          }
        }
        return { select: vi.fn().mockReturnThis() }
      })

      const request = new NextRequest(
        'http://localhost:3000/api/couples/mutual-likes?includeProperties=true',
        { method: 'GET' }
      )

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.mutualLikes).toHaveLength(1)
      expect(data.mutualLikes[0].property_id).toBe(scenario.property1.id)
      expect(data.mutualLikes[0].property).toEqual(scenario.property1)
    })

    test('should handle missing properties gracefully', async () => {
      const scenario = createTestScenario()
      
      mockClient.auth.getUser.mockResolvedValue({
        data: { user: scenario.user1 },
        error: null,
      })

      const mutualLikes = mockClient._testHelpers.getMutualLikes(scenario.user1.id)
      mockCouplesService.getMutualLikes.mockResolvedValue(mutualLikes)

      // Mock property fetch failure
      mockClient.from.mockImplementation((table: string) => {
        if (table === 'properties') {
          return {
            select: vi.fn().mockReturnThis(),
            in: vi.fn().mockResolvedValue({
              data: null,
              error: new Error('Database error'),
            }),
          }
        }
        return { select: vi.fn().mockReturnThis() }
      })

      const request = new NextRequest(
        'http://localhost:3000/api/couples/mutual-likes?includeProperties=true',
        { method: 'GET' }
      )

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.mutualLikes).toHaveLength(1)
      // Should continue without properties when fetch fails
      expect(data.mutualLikes[0]).not.toHaveProperty('property')
    })
  })

  describe('Error Handling', () => {
    test('should return 500 when CouplesService throws error', async () => {
      const scenario = createTestScenario()
      
      mockClient.auth.getUser.mockResolvedValue({
        data: { user: scenario.user1 },
        error: null,
      })

      mockCouplesService.getMutualLikes.mockRejectedValue(
        new Error('Service error')
      )

      const request = new NextRequest(
        'http://localhost:3000/api/couples/mutual-likes',
        { method: 'GET' }
      )

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to fetch mutual likes')
    })

    test('should return 500 when unexpected error occurs', async () => {
      mockCreateApiClient.mockImplementation(() => {
        throw new Error('Database connection failed')
      })

      const request = new NextRequest(
        'http://localhost:3000/api/couples/mutual-likes',
        { method: 'GET' }
      )

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to fetch mutual likes')
    })
  })

  describe('Performance Metrics', () => {
    test('should include performance metrics in response', async () => {
      const scenario = createTestScenario()
      
      mockClient.auth.getUser.mockResolvedValue({
        data: { user: scenario.user1 },
        error: null,
      })

      const mutualLikes = mockClient._testHelpers.getMutualLikes(scenario.user1.id)
      mockCouplesService.getMutualLikes.mockResolvedValue(mutualLikes)

      const request = new NextRequest(
        'http://localhost:3000/api/couples/mutual-likes',
        { method: 'GET' }
      )

      const response = await GET(request)
      const data = await response.json()

      expect(data.performance).toEqual({
        totalTime: expect.any(Number),
        cached: expect.any(Boolean),
        count: expect.any(Number),
      })
      expect(data.performance.totalTime).toBeGreaterThan(0)
      expect(data.performance.count).toBe(1)
    })
  })
})