/**
 * Test Suite Manager
 *
 * Coordinates test suite execution with optimized database management.
 * Implements suite-level optimizations to minimize expensive operations.
 */

import { optimizedDbHelper } from './optimized-db-helper'

export class TestSuiteManager {
  private static instance: TestSuiteManager
  private suiteInitialized = false
  private testCount = 0

  private constructor() {}

  static getInstance(): TestSuiteManager {
    if (!TestSuiteManager.instance) {
      TestSuiteManager.instance = new TestSuiteManager()
    }
    return TestSuiteManager.instance
  }

  /**
   * Initialize test suite - call once per test file/suite
   */
  async initializeSuite(): Promise<void> {
    if (this.suiteInitialized) {
      return // Already initialized
    }

    console.log('🔧 Initializing optimized test suite...')

    // Initialize optimized database session
    await optimizedDbHelper.initializeSession()

    this.suiteInitialized = true
    console.log('✅ Test suite initialized with optimized database session')
  }

  /**
   * Setup for individual test - call in beforeEach
   */
  async setupTest(): Promise<void> {
    if (!this.suiteInitialized) {
      await this.initializeSuite()
    }

    this.testCount++

    // No expensive operations needed per test
    // Database connections are pooled and reused
  }

  /**
   * Cleanup after individual test - call in afterEach
   */
  async cleanupTest(): Promise<void> {
    // Only clean test data, not connections
    await optimizedDbHelper.cleanupTestData()
  }

  /**
   * Cleanup after test suite - call in afterAll
   */
  async cleanupSuite(): Promise<void> {
    if (!this.suiteInitialized) {
      return
    }

    console.log(`🧹 Cleaning up test suite after ${this.testCount} tests...`)

    // Final cleanup and close connections
    await optimizedDbHelper.closeSession()

    this.suiteInitialized = false
    this.testCount = 0

    console.log('✅ Test suite cleanup complete')
  }

  /**
   * Get database helper instance
   */
  getDbHelper() {
    return optimizedDbHelper
  }

  /**
   * Check if suite is initialized
   */
  isInitialized(): boolean {
    return this.suiteInitialized
  }

  /**
   * Get test count for current suite
   */
  getTestCount(): number {
    return this.testCount
  }
}

// Export singleton instance
export const testSuiteManager = TestSuiteManager.getInstance()

/**
 * Convenience functions for easy integration in test files
 */

export async function setupOptimizedTestSuite() {
  return await testSuiteManager.initializeSuite()
}

export async function setupOptimizedTest() {
  return await testSuiteManager.setupTest()
}

export async function cleanupOptimizedTest() {
  return await testSuiteManager.cleanupTest()
}

export async function cleanupOptimizedTestSuite() {
  return await testSuiteManager.cleanupSuite()
}
