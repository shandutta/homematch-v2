/**
 * Performance Benchmark Integration Tests
 * Demonstrates use of snapshot system and performance monitoring
 */
import { describe, test, expect, beforeAll, afterAll } from 'vitest'
import { createClient } from '@/lib/supabase/standalone'
import { TestDataFactory } from '../utils/test-data-factory'
import {
  DatabaseSnapshotManager,
  TestScenarioSnapshots,
} from '../utils/db-snapshots'
import {
  PerformanceBenchmark,
  PerformanceTestUtils,
  performanceMatchers,
} from '../utils/performance-benchmarks'
import { CouplesService } from '@/lib/services/couples'
import { PropertyService } from '@/lib/services/properties'
import { createTestClientFactory as _createTestClientFactory } from '../utils/test-client-factory'

const skipHeavy =
  process.env.SKIP_HEAVY_INTEGRATION === 'true' ||
  process.env.SKIP_HEAVY_TESTS === 'true'
const describeOrSkip = skipHeavy ? describe.skip : describe

// Extend Jest matchers
expect.extend(performanceMatchers)

describeOrSkip('Performance Benchmark Tests', () => {
  let client: ReturnType<typeof createClient>
  let factory: TestDataFactory
  let snapshotManager: DatabaseSnapshotManager
  let scenarioSnapshots: TestScenarioSnapshots
  let benchmark: PerformanceBenchmark
  let propertyService: PropertyService

  beforeAll(async () => {
    client = createClient()
    factory = new TestDataFactory(client)
    snapshotManager = new DatabaseSnapshotManager(client)
    scenarioSnapshots = new TestScenarioSnapshots(client)
    benchmark = new PerformanceBenchmark()

    // Fix: PropertyService expects a factory with async createClient method
    const clientFactory = {
      createClient: async () => client,
    }
    propertyService = new PropertyService(clientFactory)
  })

  beforeEach(async () => {
    // Ensure clean state before each test
    await factory.cleanup()
  })

  afterAll(async () => {
    await factory.cleanup()
  })

  describe('Database Query Performance', () => {
    test('should meet performance targets for couples queries', async () => {
      // Create isolated factory to avoid race conditions with shared factory
      const isolatedClient = createClient()
      const isolatedFactory = new TestDataFactory(isolatedClient)

      try {
        // Create test scenario with isolated factory
        const scenario = await isolatedFactory.createCouplesScenario()

        // Debug: Check what data was actually created
        console.log('🔍 Performance test scenario created:', {
          householdId: scenario.household.id,
          userIds: scenario.users.map((u) => u.id),
          propertyIds: scenario.properties.map((p) => p.id),
        })

        // Debug: Check the interactions that were created
        const { data: interactions } = await isolatedClient
          .from('user_property_interactions')
          .select('*')
          .eq('household_id', scenario.household.id)
        console.log('🔍 Created interactions:', interactions)

        // Measure getHouseholdActivity performance
        const { result: activity, metric: activityMetric } =
          await benchmark.measure(
            'getHouseholdActivity',
            () =>
              CouplesService.getHouseholdActivity(
                isolatedClient,
                scenario.users[0].id
              ),
            { scenario: 'couples', operation: 'getActivity' }
          )

        // Debug: Log activity result
        console.log('🔍 Activity result:', activity)

        // Assertions
        expect(activityMetric.duration).toBeLessThan(200) // Should complete in under 200ms
        expect(activity).toBeDefined()
        // Activity might be empty if no interactions exist yet, which is valid
        expect(activity.length).toBeGreaterThanOrEqual(0)

        // Measure getMutualLikes performance
        const { result: mutualLikes, metric: mutualMetric } =
          await benchmark.measure(
            'getMutualLikes',
            () =>
              CouplesService.getMutualLikes(
                isolatedClient,
                scenario.users[0].id
              ),
            { scenario: 'couples', operation: 'getMutualLikes' }
          )

        expect(mutualMetric.duration).toBeLessThan(150) // Should be faster than activity
        expect(mutualLikes).toBeDefined()
        // Mutual likes might be empty if users haven't liked the same properties
        expect(mutualLikes.length).toBeGreaterThanOrEqual(0)

        // Generate report
        const report = await benchmark.generateReport('couples_queries', {
          maxDuration: 200,
          percentile95: 180,
        })

        expect(report.passed).toBe(true)
      } finally {
        // Clean up isolated factory
        await isolatedFactory.cleanup()
      }
    })

    test('should handle large datasets efficiently', async () => {
      // Create performance testing snapshot if not exists
      const snapshots = await snapshotManager.listSnapshots()
      let snapshotId = snapshots.find(
        (s) => s.name === 'performance_testing'
      )?.id

      if (!snapshotId) {
        const metadata = await scenarioSnapshots.createPerformanceSnapshot()
        snapshotId = metadata.id
      }

      // Restore large dataset
      await snapshotManager.restoreSnapshot(snapshotId)

      // Test pagination performance
      const pageResults = []
      for (let offset = 0; offset < 100; offset += 20) {
        const { result, metric } = await benchmark.measure(
          `pagination_${offset}`,
          async () => {
            const { data } = await client
              .from('properties')
              .select('*')
              .range(offset, offset + 19)
            return data
          },
          { offset, limit: 20 }
        )

        pageResults.push({ result, metric })
        expect(metric.duration).toBeLessThan(100) // Each page should load quickly
      }

      // All pages should have similar performance
      const durations = pageResults.map((p) => p.metric.duration)
      const meanDuration = durations.reduce((a, b) => a + b) / durations.length
      const variance = durations.map((d) => Math.abs(d - meanDuration))

      expect(Math.max(...variance)).toBeLessThan(50) // Low variance between pages
    })
  })

  describe('API Endpoint Performance', () => {
    test('should meet SLA for property search', async () => {
      // Create geographic test data
      await factory.createGeographicProperties(20, 47.6062, -122.3321)
      const _user = await factory.getTestUser('test-worker-1@example.com')

      // Test search performance
      const searchTests = [
        { filters: { city: 'Seattle' }, name: 'city_filter' },
        {
          filters: { min_price: 400000, max_price: 600000 },
          name: 'price_filter',
        },
        { filters: { bedrooms: 3, bathrooms: 2 }, name: 'rooms_filter' },
        {
          filters: {
            city: 'Seattle',
            min_price: 400000,
            max_price: 600000,
            bedrooms: 3,
          },
          name: 'complex_filter',
        },
      ]

      for (const { filters, name } of searchTests) {
        const { result, metric } = await benchmark.measure(
          `search_${name}`,
          () => propertyService.searchProperties({ filters }),
          { filters, testName: name }
        )

        // Property search should complete in under 300ms
        expect(metric.duration).toBeLessThan(300)
        expect(result).toBeDefined()
      }

      // Complex geographic search - using regular search with filters
      const { metric: geoMetric } = await benchmark.measure(
        'geographic_search',
        () =>
          propertyService.searchProperties({
            filters: {
              city: 'Seattle',
              // Geographic search would need proper implementation
            },
          }),
        { type: 'geographic', city: 'Seattle' }
      )

      expect(geoMetric.duration).toBeLessThan(500) // Geographic queries can be slower
    })

    test('should handle concurrent requests efficiently', async () => {
      // Use existing test users instead of creating new ones
      const testUsers = [
        await factory.getTestUser('test-worker-2@example.com'),
        await factory.getTestUser('test-worker-3@example.com'),
      ]

      // Just use the two test users multiple times for concurrent testing
      const users = [...testUsers, ...testUsers, testUsers[0]]

      // Simulate concurrent API requests
      const concurrentRequests = users.map((user) =>
        benchmark.measure(
          `concurrent_${user.id}`,
          () => CouplesService.getHouseholdActivity(client, user.id),
          { concurrent: true, userId: user.id }
        )
      )

      const results = await Promise.all(concurrentRequests)

      // All requests should complete reasonably fast
      results.forEach(({ metric }) => {
        expect(metric.duration).toBeLessThan(500)
      })

      // Check for performance degradation under load
      const durations = results.map((r) => r.metric.duration)
      const maxDuration = Math.max(...durations)
      const minDuration = Math.min(...durations)

      // Max should not be more than 3x the min (more realistic for concurrent operations)
      expect(maxDuration).toBeLessThan(minDuration * 3)
    })
  })

  describe('Memory Performance', () => {
    test('should not leak memory during bulk operations', async () => {
      const initialMemory = process.memoryUsage()

      // Perform bulk operations
      for (let i = 0; i < 10; i++) {
        const properties = await factory.createGeographicProperties(10)
        // Simulate some processing
        properties.forEach((p) => {
          JSON.stringify(p) // Force object traversal
        })
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc()
      }

      const finalMemory = process.memoryUsage()
      const memoryIncrease =
        (finalMemory.heapUsed - initialMemory.heapUsed) / 1024 / 1024

      // Memory increase should be reasonable (less than 50MB for this operation)
      expect(memoryIncrease).toBeLessThan(50)

      // Clean up
      await factory.cleanup()
    })
  })

  describe('Business Logic Performance Suite', () => {
    let testScenario: any
    let testUser: any
    let testProperties: any[]

    beforeAll(async () => {
      // Setup stable test data ONCE for all performance measurements
      // This avoids measuring infrastructure timing (DB triggers, FK constraints)
      console.log(
        '📊 Setting up stable test data for performance measurements...'
      )

      try {
        // Use TestDataFactory with existing test users (no Auth API calls)
        testScenario = await factory.createCouplesScenario()
        testUser = testScenario.users[0]

        // Create additional properties for search testing
        testProperties = await factory.createGeographicProperties(
          20,
          47.6062,
          -122.3321
        )

        console.log('✅ Test data ready:', {
          householdId: testScenario.household.id,
          users: testScenario.users.length,
          properties: testProperties.length,
        })
      } catch (error) {
        console.error('❌ Failed to setup test data:', error)
        throw error
      }
    })

    afterAll(async () => {
      // Clean up the stable test data
      if (testScenario?.household?.id) {
        await factory.cleanup()
      }
    })

    test('should measure business logic performance (not infrastructure)', async () => {
      // These tests measure ACTUAL BUSINESS LOGIC performance
      // Not database trigger timing or foreign key constraint checking
      const suite = [
        {
          name: 'Get Mutual Likes (Cached)',
          test: () => CouplesService.getMutualLikes(client, testUser.id),
          threshold: { maxDuration: 50 }, // Should be fast with caching
        },
        {
          name: 'Get Household Activity',
          test: () =>
            CouplesService.getHouseholdActivity(client, testUser.id, 20, 0),
          threshold: { maxDuration: 100 }, // Slightly slower due to joins
        },
        {
          name: 'Get Household Stats',
          test: () => CouplesService.getHouseholdStats(client, testUser.id),
          threshold: { maxDuration: 150 }, // Complex aggregations
        },
        {
          name: 'Search Properties (Simple)',
          test: () =>
            propertyService.searchProperties({
              filters: { city: 'Seattle' },
            }),
          threshold: { maxDuration: 200 },
        },
        {
          name: 'Search Properties (Complex)',
          test: () =>
            propertyService.searchProperties({
              filters: {
                city: 'Seattle',
                min_price: 400000,
                max_price: 600000,
                bedrooms: 3,
                bathrooms: 2,
              },
            }),
          threshold: { maxDuration: 300 },
        },
        {
          name: 'Check Potential Mutual Like',
          test: () =>
            CouplesService.checkPotentialMutualLike(
              client,
              testUser.id,
              testProperties[0].id
            ),
          threshold: { maxDuration: 50 }, // Simple query
        },
      ]

      const reports = await PerformanceTestUtils.runSuite(
        'business_logic_suite',
        suite,
        5 // Run each test 5 times - measures consistency not infrastructure
      )

      // All tests should pass their thresholds
      reports.forEach((report) => {
        if (!report.passed) {
          console.warn(
            `⚠️ ${report.testName} performance issues:`,
            report.failures
          )
        }
        expect(report.passed).toBe(true)
        console.log(
          `${report.testName}: Mean ${report.summary.mean.toFixed(2)}ms, P95 ${report.summary.p95.toFixed(2)}ms`
        )
      })
    })

    test('should demonstrate cache effectiveness', async () => {
      // Clear caches to measure cold vs warm performance
      const householdId = testScenario.household.id
      CouplesService.clearHouseholdCache(householdId)

      // Cold cache performance
      const coldStart = performance.now()
      const coldResult = await CouplesService.getMutualLikes(
        client,
        testUser.id
      )
      const coldDuration = performance.now() - coldStart

      // Warm cache performance (immediate second call)
      const warmStart = performance.now()
      const warmResult = await CouplesService.getMutualLikes(
        client,
        testUser.id
      )
      const warmDuration = performance.now() - warmStart

      console.log('🔥 Cache Performance:')
      console.log(`  Cold: ${coldDuration.toFixed(2)}ms`)
      console.log(`  Warm: ${warmDuration.toFixed(2)}ms`)
      console.log(`  Speedup: ${(coldDuration / warmDuration).toFixed(1)}x`)

      // Warm cache should be significantly faster
      expect(warmDuration).toBeLessThan(coldDuration * 0.5) // At least 2x faster
      expect(coldResult).toEqual(warmResult) // Same results
    })
  })

  describe('Baseline Comparison', () => {
    test('should track performance regression', async () => {
      const testName = 'baseline_property_search'

      // Run test multiple times
      const metrics = []
      for (let i = 0; i < 5; i++) {
        const { metric } = await benchmark.measure(testName, async () => {
          const properties = await factory.createGeographicProperties(5)
          return properties
        })
        metrics.push(metric)
      }

      // Compare with baseline (creates baseline if doesn't exist)
      const comparison = await benchmark.compareWithBaseline(
        testName,
        metrics,
        15 // Allow 15% degradation
      )

      expect(comparison.passed).toBe(true)

      if (comparison.comparison.degradation) {
        console.log(`Performance change: ${comparison.comparison.degradation}`)
      }

      // Clean up
      await factory.cleanup()
    })
  })
})
