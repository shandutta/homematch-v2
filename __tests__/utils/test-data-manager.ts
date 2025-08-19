/**
 * Centralized test data management for E2E tests
 * Provides consistent, worker-isolated test data across all test scenarios
 */

import { TestUser } from '../types/fixtures'

export interface TestDataManager {
  getWorkerUser(workerIndex: number): TestUser
  getFreshUser(workerIndex: number): TestUser
  getHouseholdData(workerIndex: number): any
  getPropertyData(workerIndex: number): any
}

/**
 * Create worker-specific test data to prevent conflicts
 */
export function createTestDataManager(): TestDataManager {
  return {
    /**
     * Get main test user for worker with household
     */
    getWorkerUser(workerIndex: number): TestUser {
      return {
        email: `test-worker-${workerIndex}@example.com`,
        password: 'testpassword123',
      }
    },

    /**
     * Get fresh user for worker without existing data
     */
    getFreshUser(workerIndex: number): TestUser {
      return {
        email: `fresh-worker-${workerIndex}@example.com`,
        password: 'testpassword123',
      }
    },

    /**
     * Get household test data for worker
     */
    getHouseholdData(workerIndex: number) {
      return {
        id: `test-household-worker-${workerIndex}`,
        name: `Test Household Worker ${workerIndex}`,
        collaboration_mode: 'shared',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
    },

    /**
     * Get property test data for worker
     */
    getPropertyData(workerIndex: number) {
      return {
        id: `test-property-worker-${workerIndex}`,
        address: `${100 + workerIndex} Test Street, Test City, TS 12345`,
        price: 250000 + workerIndex * 10000,
        bedrooms: 2 + (workerIndex % 3),
        bathrooms: 1 + (workerIndex % 2),
        square_feet: 1000 + workerIndex * 100,
        listing_url: `https://example.com/property-worker-${workerIndex}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
    },
  }
}

/**
 * Singleton instance for consistent data access
 */
export const testDataManager = createTestDataManager()

/**
 * Helper to get worker index from Playwright testInfo
 */
export function getWorkerIndex(testInfo: any): number {
  return testInfo.workerIndex || 0
}

/**
 * Convenience functions for common patterns
 */
export function getWorkerTestUser(testInfo: any): TestUser {
  return testDataManager.getWorkerUser(getWorkerIndex(testInfo))
}

export function getFreshTestUser(testInfo: any): TestUser {
  return testDataManager.getFreshUser(getWorkerIndex(testInfo))
}

export function getWorkerHousehold(testInfo: any) {
  return testDataManager.getHouseholdData(getWorkerIndex(testInfo))
}

export function getWorkerProperty(testInfo: any) {
  return testDataManager.getPropertyData(getWorkerIndex(testInfo))
}
