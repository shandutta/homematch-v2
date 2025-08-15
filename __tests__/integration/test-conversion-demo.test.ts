/**
 * Demo Test: Conversion from Mock-Heavy to Real Data Patterns
 * 
 * This test demonstrates the conversion approach by showing:
 * 1. Original mock-heavy pattern (commented out)
 * 2. New TestDataFactory pattern (working implementation)
 * 3. Benefits of the real data approach
 */
import { describe, test, expect, beforeEach, afterEach } from 'vitest'

// Simulate a service that processes couples data
class MockCouplesService {
  static async getMutualLikes(userId: string, householdMembers: any[], interactions: any[]) {
    // Find properties liked by all household members
    const propertyLikes = new Map<string, Set<string>>()
    
    interactions
      .filter(i => i.interaction_type === 'like')
      .forEach(interaction => {
        if (!propertyLikes.has(interaction.property_id)) {
          propertyLikes.set(interaction.property_id, new Set())
        }
        propertyLikes.get(interaction.property_id)!.add(interaction.user_id)
      })

    // Return only properties liked by ALL household members
    const mutualLikes = []
    for (const [propertyId, likedByUsers] of propertyLikes) {
      if (likedByUsers.size === householdMembers.length) {
        const propertyInteractions = interactions.filter(i => i.property_id === propertyId)
        mutualLikes.push({
          property_id: propertyId,
          liked_by_count: likedByUsers.size,
          user_ids: Array.from(likedByUsers),
          first_liked_at: Math.min(...propertyInteractions.map(i => new Date(i.created_at).getTime())),
          last_liked_at: Math.max(...propertyInteractions.map(i => new Date(i.created_at).getTime())),
        })
      }
    }

    return mutualLikes
  }
}

// Simulate TestDataFactory pattern
class TestDataFactory {
  private data = {
    users: new Map(),
    households: new Map(),
    properties: new Map(),
    interactions: new Map(),
    householdMembers: new Map(),
  }

  createUser(overrides: any = {}) {
    const user = {
      id: `user-${Date.now()}-${Math.random()}`,
      email: `test-${Date.now()}@example.com`,
      first_name: 'Test',
      last_name: 'User',
      created_at: new Date().toISOString(),
      ...overrides,
    }
    this.data.users.set(user.id, user)
    return user
  }

  createHousehold(memberIds: string[], overrides: any = {}) {
    const household = {
      id: `household-${Date.now()}-${Math.random()}`,
      name: 'Test Household',
      created_at: new Date().toISOString(),
      ...overrides,
    }
    this.data.households.set(household.id, household)
    
    // Add members
    memberIds.forEach(userId => {
      this.data.householdMembers.set(`${household.id}-${userId}`, {
        household_id: household.id,
        user_id: userId,
      })
    })

    return household
  }

  createProperty(overrides: any = {}) {
    const property = {
      id: `prop-${Date.now()}-${Math.random()}`,
      address: `${Math.floor(Math.random() * 9999)} Test St`,
      city: 'Test City',
      price: Math.floor(Math.random() * 500000) + 200000,
      bedrooms: Math.floor(Math.random() * 4) + 1,
      bathrooms: Math.floor(Math.random() * 3) + 1,
      created_at: new Date().toISOString(),
      ...overrides,
    }
    this.data.properties.set(property.id, property)
    return property
  }

  createInteraction(userId: string, propertyId: string, type: 'like' | 'dislike', overrides: any = {}) {
    const interaction = {
      id: `int-${Date.now()}-${Math.random()}`,
      user_id: userId,
      property_id: propertyId,
      interaction_type: type,
      created_at: new Date().toISOString(),
      ...overrides,
    }
    this.data.interactions.set(interaction.id, interaction)
    return interaction
  }

  createCouplesScenario() {
    // Create two users
    const user1 = this.createUser({ first_name: 'John', last_name: 'Doe' })
    const user2 = this.createUser({ first_name: 'Jane', last_name: 'Smith' })

    // Create household with both users
    const household = this.createHousehold([user1.id, user2.id])

    // Create properties
    const property1 = this.createProperty({ address: '123 Mutual St' })
    const property2 = this.createProperty({ address: '456 Individual Ave' })
    const property3 = this.createProperty({ address: '789 Another St' })

    // Create mutual like (both users like property1)
    this.createInteraction(user1.id, property1.id, 'like', { created_at: '2024-01-01T10:00:00Z' })
    this.createInteraction(user2.id, property1.id, 'like', { created_at: '2024-01-01T15:00:00Z' })

    // Create individual likes
    this.createInteraction(user1.id, property2.id, 'like')
    this.createInteraction(user2.id, property3.id, 'like')

    return {
      users: [user1, user2],
      household,
      properties: [property1, property2, property3],
      mutualLikes: [property1],
      interactions: Array.from(this.data.interactions.values()),
      householdMembers: Array.from(this.data.householdMembers.values())
        .filter((m: any) => m.household_id === household.id),
    }
  }

  cleanup() {
    this.data.users.clear()
    this.data.households.clear()
    this.data.properties.clear()
    this.data.interactions.clear()
    this.data.householdMembers.clear()
  }
}

describe('Test Conversion Demo: Mock-Heavy vs Real Data Patterns', () => {
  let factory: TestDataFactory

  beforeEach(() => {
    factory = new TestDataFactory()
  })

  afterEach(() => {
    factory.cleanup()
  })

  describe('BEFORE: Mock-Heavy Approach (Maintenance Nightmare)', () => {
    test('requires extensive mock setup and hard-coded data', async () => {
      /* 
      // This is what the OLD tests looked like:
      
      const mockMutualLikes = [
        {
          property_id: 'prop-1',
          liked_by_count: 2,
          first_liked_at: '2024-01-01T00:00:00.000Z',
          last_liked_at: '2024-01-02T00:00:00.000Z',
          user_ids: ['user-123', 'user-456'],
        }
      ]

      const mockSupabaseClient = {
        auth: { getUser: jest.fn() },
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        // ... 20+ more mock methods
      }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } }
      })

      mockCouplesService.getMutualLikes.mockResolvedValue(mockMutualLikes)
      
      // Problems with this approach:
      // 1. Hard-coded IDs that don't relate to anything real
      // 2. Static data that doesn't test edge cases
      // 3. Extensive mock setup for every test
      // 4. Mock behavior doesn't match real service behavior
      // 5. Changes to real service break tests in unexpected ways
      */

      // Simulate the old approach with static data
      const staticMutualLikes = [
        {
          property_id: 'prop-1', // Hard-coded, meaningless ID
          liked_by_count: 2,     // Static number
          user_ids: ['user-123', 'user-456'], // Hard-coded IDs
        }
      ]

      expect(staticMutualLikes).toHaveLength(1)
      expect(staticMutualLikes[0].property_id).toBe('prop-1') // Not meaningful
    })
  })

  describe('AFTER: TestDataFactory Approach (Maintainable & Realistic)', () => {
    test('creates realistic test scenarios with proper relationships', async () => {
      // Simple, clean setup
      const scenario = factory.createCouplesScenario()

      // Verify the scenario was created correctly
      expect(scenario.users).toHaveLength(2)
      expect(scenario.household).toBeDefined()
      expect(scenario.properties).toHaveLength(3)
      expect(scenario.mutualLikes).toHaveLength(1)

      // Test the actual service logic with real data
      const mutualLikes = await MockCouplesService.getMutualLikes(
        scenario.users[0].id,
        scenario.householdMembers,
        scenario.interactions
      )

      // Verify realistic behavior
      expect(mutualLikes).toHaveLength(1)
      expect(mutualLikes[0].property_id).toBe(scenario.mutualLikes[0].id)
      expect(mutualLikes[0].liked_by_count).toBe(2)
      expect(mutualLikes[0].user_ids).toContain(scenario.users[0].id)
      expect(mutualLikes[0].user_ids).toContain(scenario.users[1].id)

      // Benefits of this approach:
      // 1. Realistic data with proper relationships
      // 2. Tests actual service logic
      // 3. Easy to create complex scenarios
      // 4. Self-documenting test data
      // 5. Catches real bugs in service logic
    })

    test('handles edge cases with realistic data variations', async () => {
      // Create scenario with no mutual likes
      const user1 = factory.createUser()
      const user2 = factory.createUser()
      const household = factory.createHousehold([user1.id, user2.id])
      const property1 = factory.createProperty()
      const property2 = factory.createProperty()

      // Only individual likes, no mutual
      factory.createInteraction(user1.id, property1.id, 'like')
      factory.createInteraction(user2.id, property2.id, 'like')

      const householdMembers = [
        { household_id: household.id, user_id: user1.id },
        { household_id: household.id, user_id: user2.id },
      ]

      const interactions = [
        { user_id: user1.id, property_id: property1.id, interaction_type: 'like', created_at: new Date().toISOString() },
        { user_id: user2.id, property_id: property2.id, interaction_type: 'like', created_at: new Date().toISOString() },
      ]

      const mutualLikes = await MockCouplesService.getMutualLikes(
        user1.id,
        householdMembers,
        interactions
      )

      expect(mutualLikes).toHaveLength(0)
    })

    test('handles three-person household dynamics correctly', async () => {
      // Create realistic three-person scenario
      const user1 = factory.createUser()
      const user2 = factory.createUser()
      const user3 = factory.createUser()
      const household = factory.createHousehold([user1.id, user2.id, user3.id])
      const property = factory.createProperty()

      // All three users like the same property
      factory.createInteraction(user1.id, property.id, 'like')
      factory.createInteraction(user2.id, property.id, 'like')
      factory.createInteraction(user3.id, property.id, 'like')

      const householdMembers = [
        { household_id: household.id, user_id: user1.id },
        { household_id: household.id, user_id: user2.id },
        { household_id: household.id, user_id: user3.id },
      ]

      const interactions = [
        { user_id: user1.id, property_id: property.id, interaction_type: 'like', created_at: '2024-01-01T10:00:00Z' },
        { user_id: user2.id, property_id: property.id, interaction_type: 'like', created_at: '2024-01-01T11:00:00Z' },
        { user_id: user3.id, property_id: property.id, interaction_type: 'like', created_at: '2024-01-01T12:00:00Z' },
      ]

      const mutualLikes = await MockCouplesService.getMutualLikes(
        user1.id,
        householdMembers,
        interactions
      )

      expect(mutualLikes).toHaveLength(1)
      expect(mutualLikes[0].liked_by_count).toBe(3)
      expect(mutualLikes[0].user_ids).toHaveLength(3)
    })

    test('handles partial likes correctly (only 2 of 3 users like property)', async () => {
      const user1 = factory.createUser()
      const user2 = factory.createUser()
      const user3 = factory.createUser()
      const household = factory.createHousehold([user1.id, user2.id, user3.id])
      const property = factory.createProperty()

      // Only 2 of 3 users like the property (not mutual for 3-person household)
      factory.createInteraction(user1.id, property.id, 'like')
      factory.createInteraction(user2.id, property.id, 'like')
      // user3 doesn't like it

      const householdMembers = [
        { household_id: household.id, user_id: user1.id },
        { household_id: household.id, user_id: user2.id },
        { household_id: household.id, user_id: user3.id },
      ]

      const interactions = [
        { user_id: user1.id, property_id: property.id, interaction_type: 'like', created_at: new Date().toISOString() },
        { user_id: user2.id, property_id: property.id, interaction_type: 'like', created_at: new Date().toISOString() },
      ]

      const mutualLikes = await MockCouplesService.getMutualLikes(
        user1.id,
        householdMembers,
        interactions
      )

      expect(mutualLikes).toHaveLength(0) // Not mutual since only 2/3 liked it
    })

    test('handles temporal aspects of likes', async () => {
      const scenario = factory.createCouplesScenario()

      // Add specific timestamps
      const interactions = [
        {
          user_id: scenario.users[0].id,
          property_id: scenario.mutualLikes[0].id,
          interaction_type: 'like',
          created_at: '2024-01-01T10:00:00Z', // First like
        },
        {
          user_id: scenario.users[1].id,
          property_id: scenario.mutualLikes[0].id,
          interaction_type: 'like',
          created_at: '2024-01-01T15:00:00Z', // Second like
        },
      ]

      const mutualLikes = await MockCouplesService.getMutualLikes(
        scenario.users[0].id,
        scenario.householdMembers,
        interactions
      )

      expect(mutualLikes).toHaveLength(1)
      expect(mutualLikes[0].first_liked_at).toBeLessThan(mutualLikes[0].last_liked_at)
    })
  })

  describe('Benefits Comparison', () => {
    test('demonstrates improved maintainability', () => {
      // Old approach: ~50 lines of mock setup per test
      // New approach: ~5 lines to create realistic scenario
      
      const scenario = factory.createCouplesScenario() // 1 line!
      
      // Automatically creates:
      // - 2 users with realistic data
      // - 1 household with proper relationships
      // - 3 properties with realistic attributes
      // - Mutual and individual interactions
      // - Proper foreign key relationships

      expect(scenario.users).toHaveLength(2)
      expect(scenario.properties).toHaveLength(3)
      expect(scenario.mutualLikes).toHaveLength(1)

      // Each test is now self-documenting
      expect(scenario.users[0].first_name).toBe('John')
      expect(scenario.users[1].first_name).toBe('Jane')
      expect(scenario.mutualLikes[0].address).toBe('123 Mutual St')
    })

    test('demonstrates better error detection', async () => {
      // The new approach catches real logic errors
      const scenario = factory.createCouplesScenario()

      // This tests the actual business logic
      const mutualLikes = await MockCouplesService.getMutualLikes(
        scenario.users[0].id,
        scenario.householdMembers,
        scenario.interactions
      )

      // If the service logic is wrong, this test will catch it
      expect(mutualLikes).toHaveLength(1)
      
      // Old mock-based tests would pass even if service logic was broken
      // because they only tested the mocks, not the real logic
    })

    test('demonstrates easier debugging', () => {
      const scenario = factory.createCouplesScenario()

      // When tests fail, you can inspect real data
      console.log('Created users:', scenario.users.map(u => ({ id: u.id, name: `${u.first_name} ${u.last_name}` })))
      console.log('Created household:', { id: scenario.household.id, name: scenario.household.name })
      console.log('Mutual like property:', { id: scenario.mutualLikes[0].id, address: scenario.mutualLikes[0].address })

      // Much easier to debug than mock objects!
      expect(scenario.users[0].email).toContain('@example.com')
      expect(scenario.properties[0].price).toBeGreaterThan(0)
    })
  })
})