/**
 * Test performance monitoring and metrics collection for E2E tests
 * Tracks test execution times, resource usage, and identifies performance bottlenecks
 */

import { Page } from '@playwright/test'
import { writeFileSync, existsSync, readFileSync } from 'fs'
import { join } from 'path'

export interface PerformanceMetrics {
  testName: string
  workerIndex: number
  startTime: number
  endTime: number
  duration: number
  browserMetrics?: BrowserMetrics
  networkMetrics?: NetworkMetrics
  memoryMetrics?: MemoryMetrics
}

export interface BrowserMetrics {
  navigationTime: number
  loadTime: number
  domContentLoadedTime: number
  firstContentfulPaint: number
  timeToInteractive: number
}

export interface NetworkMetrics {
  totalRequests: number
  failedRequests: number
  averageResponseTime: number
  totalDataTransferred: number
}

export interface MemoryMetrics {
  heapUsed: number
  heapTotal: number
  external: number
}

export interface TestPerformanceMonitor {
  startMonitoring(testName: string, testInfo: any): void
  recordBrowserMetrics(page: Page): Promise<void>
  recordNetworkMetrics(page: Page): Promise<void>
  stopMonitoring(): PerformanceMetrics
  saveMetrics(metrics: PerformanceMetrics): void
  generateReport(): PerformanceReport
}

export interface PerformanceReport {
  totalTests: number
  averageDuration: number
  slowestTests: { testName: string; duration: number }[]
  fastestTests: { testName: string; duration: number }[]
  workerPerformance: Record<
    number,
    { averageDuration: number; testCount: number }
  >
  performanceTrends: { date: string; averageDuration: number }[]
}

/**
 * Performance thresholds for different test types
 */
const PERFORMANCE_THRESHOLDS = {
  auth: 5000, // Authentication tests: 5s
  navigation: 3000, // Navigation tests: 3s
  interaction: 2000, // UI interaction tests: 2s
  api: 1000, // API tests: 1s
  default: 10000, // Default threshold: 10s
}

/**
 * Create performance monitor instance
 */
export function createTestPerformanceMonitor(): TestPerformanceMonitor {
  let currentTest: {
    testName: string
    workerIndex: number
    startTime: number
    browserMetrics?: BrowserMetrics
    networkMetrics?: NetworkMetrics
  } | null = null

  return {
    /**
     * Start monitoring a test
     */
    startMonitoring(testName: string, testInfo: any): void {
      currentTest = {
        testName,
        workerIndex: testInfo.workerIndex || 0,
        startTime: Date.now(),
      }
    },

    /**
     * Record browser performance metrics
     */
    async recordBrowserMetrics(page: Page): Promise<void> {
      if (!currentTest) return

      try {
        const navigationTiming = await page.evaluate(() => {
          const timing = performance.getEntriesByType(
            'navigation'
          )[0] as PerformanceNavigationTiming
          return {
            navigationTime: timing.loadEventEnd - timing.fetchStart,
            loadTime: timing.loadEventEnd - timing.loadEventStart,
            domContentLoadedTime:
              timing.domContentLoadedEventEnd - timing.fetchStart,
            firstContentfulPaint: 0, // Would need specific metrics API
            timeToInteractive: 0, // Would need specific metrics API
          }
        })

        currentTest.browserMetrics = navigationTiming
      } catch (error) {
        console.warn('Failed to collect browser metrics:', error)
      }
    },

    /**
     * Record network performance metrics
     */
    async recordNetworkMetrics(page: Page): Promise<void> {
      if (!currentTest) return

      try {
        const resourceMetrics = await page.evaluate(() => {
          const resources = performance.getEntriesByType('resource')
          const totalRequests = resources.length
          const failedRequests = resources.filter(
            (r) => r.name.includes('4') || r.name.includes('5')
          ).length

          const responseTimes = resources
            .map((r) => r.duration)
            .filter((d) => d > 0)
          const averageResponseTime =
            responseTimes.length > 0
              ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
              : 0

          const totalDataTransferred = resources.reduce((total, resource) => {
            return total + (resource.transferSize || 0)
          }, 0)

          return {
            totalRequests,
            failedRequests,
            averageResponseTime,
            totalDataTransferred,
          }
        })

        currentTest.networkMetrics = resourceMetrics
      } catch (error) {
        console.warn('Failed to collect network metrics:', error)
      }
    },

    /**
     * Stop monitoring and return metrics
     */
    stopMonitoring(): PerformanceMetrics {
      if (!currentTest) {
        throw new Error('No test currently being monitored')
      }

      const endTime = Date.now()
      const duration = endTime - currentTest.startTime

      // Get memory metrics
      const memoryMetrics: MemoryMetrics = {
        heapUsed: process.memoryUsage().heapUsed,
        heapTotal: process.memoryUsage().heapTotal,
        external: process.memoryUsage().external,
      }

      const metrics: PerformanceMetrics = {
        testName: currentTest.testName,
        workerIndex: currentTest.workerIndex,
        startTime: currentTest.startTime,
        endTime,
        duration,
        browserMetrics: currentTest.browserMetrics,
        networkMetrics: currentTest.networkMetrics,
        memoryMetrics,
      }

      currentTest = null
      return metrics
    },

    /**
     * Save metrics to file
     */
    saveMetrics(metrics: PerformanceMetrics): void {
      const metricsFile = join(
        process.cwd(),
        '.bus',
        'performance-metrics.json'
      )

      let existingMetrics: PerformanceMetrics[] = []
      if (existsSync(metricsFile)) {
        try {
          const content = readFileSync(metricsFile, 'utf-8')
          existingMetrics = JSON.parse(content)
        } catch (error) {
          console.warn('Failed to read existing metrics:', error)
        }
      }

      existingMetrics.push(metrics)

      // Keep only last 1000 entries to prevent file from growing too large
      if (existingMetrics.length > 1000) {
        existingMetrics = existingMetrics.slice(-1000)
      }

      try {
        writeFileSync(metricsFile, JSON.stringify(existingMetrics, null, 2))
      } catch (error) {
        console.warn('Failed to save metrics:', error)
      }
    },

    /**
     * Generate performance report
     */
    generateReport(): PerformanceReport {
      const metricsFile = join(
        process.cwd(),
        '.bus',
        'performance-metrics.json'
      )

      if (!existsSync(metricsFile)) {
        return {
          totalTests: 0,
          averageDuration: 0,
          slowestTests: [],
          fastestTests: [],
          workerPerformance: {},
          performanceTrends: [],
        }
      }

      let metrics: PerformanceMetrics[] = []
      try {
        const content = readFileSync(metricsFile, 'utf-8')
        metrics = JSON.parse(content)
      } catch (error) {
        console.error('Failed to read metrics file:', error)
        return {
          totalTests: 0,
          averageDuration: 0,
          slowestTests: [],
          fastestTests: [],
          workerPerformance: {},
          performanceTrends: [],
        }
      }

      const totalTests = metrics.length
      const averageDuration =
        metrics.reduce((sum, m) => sum + m.duration, 0) / totalTests

      // Get slowest and fastest tests
      const sortedByDuration = [...metrics].sort(
        (a, b) => b.duration - a.duration
      )
      const slowestTests = sortedByDuration.slice(0, 10).map((m) => ({
        testName: m.testName,
        duration: m.duration,
      }))
      const fastestTests = sortedByDuration
        .slice(-10)
        .reverse()
        .map((m) => ({
          testName: m.testName,
          duration: m.duration,
        }))

      // Worker performance analysis
      const workerPerformance: Record<
        number,
        { averageDuration: number; testCount: number }
      > = {}
      metrics.forEach((m) => {
        if (!workerPerformance[m.workerIndex]) {
          workerPerformance[m.workerIndex] = {
            averageDuration: 0,
            testCount: 0,
          }
        }
        workerPerformance[m.workerIndex].testCount++
      })

      Object.keys(workerPerformance).forEach((workerIndex) => {
        const worker = parseInt(workerIndex)
        const workerMetrics = metrics.filter((m) => m.workerIndex === worker)
        workerPerformance[worker].averageDuration =
          workerMetrics.reduce((sum, m) => sum + m.duration, 0) /
          workerMetrics.length
      })

      // Performance trends (last 30 days)
      const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000
      const recentMetrics = metrics.filter((m) => m.startTime > thirtyDaysAgo)

      const performanceTrends: { date: string; averageDuration: number }[] = []
      const dailyMetrics: Record<string, PerformanceMetrics[]> = {}

      recentMetrics.forEach((m) => {
        const date = new Date(m.startTime).toISOString().split('T')[0]
        if (!dailyMetrics[date]) {
          dailyMetrics[date] = []
        }
        dailyMetrics[date].push(m)
      })

      Object.keys(dailyMetrics)
        .sort()
        .forEach((date) => {
          const dayMetrics = dailyMetrics[date]
          const dayAverage =
            dayMetrics.reduce((sum, m) => sum + m.duration, 0) /
            dayMetrics.length
          performanceTrends.push({ date, averageDuration: dayAverage })
        })

      return {
        totalTests,
        averageDuration,
        slowestTests,
        fastestTests,
        workerPerformance,
        performanceTrends,
      }
    },
  }
}

/**
 * Global performance monitor instance
 */
export const performanceMonitor = createTestPerformanceMonitor()

/**
 * Decorator for automatic performance monitoring
 */
export function withPerformanceMonitoring<T extends any[], R>(
  testName: string,
  testFunction: (...args: T) => Promise<R>
) {
  return async (...args: T): Promise<R> => {
    const testInfo = args[args.length - 1] // Assume testInfo is last parameter

    performanceMonitor.startMonitoring(testName, testInfo)

    try {
      const result = await testFunction(...args)
      const metrics = performanceMonitor.stopMonitoring()

      // Check if test exceeded threshold
      const threshold = getThresholdForTest(testName)
      if (metrics.duration > threshold) {
        console.warn(
          `⚠️ Performance Warning: ${testName} took ${metrics.duration}ms ` +
            `(threshold: ${threshold}ms)`
        )
      }

      performanceMonitor.saveMetrics(metrics)
      return result
    } catch (error) {
      // Still save metrics even if test failed
      try {
        const metrics = performanceMonitor.stopMonitoring()
        performanceMonitor.saveMetrics(metrics)
      } catch {
        // Intentionally empty - performance metrics cleanup
      }
      throw error
    }
  }
}

/**
 * Get performance threshold for a test based on its name
 */
function getThresholdForTest(testName: string): number {
  const name = testName.toLowerCase()

  if (
    name.includes('auth') ||
    name.includes('login') ||
    name.includes('signup')
  ) {
    return PERFORMANCE_THRESHOLDS.auth
  }
  if (
    name.includes('navigate') ||
    name.includes('page') ||
    name.includes('route')
  ) {
    return PERFORMANCE_THRESHOLDS.navigation
  }
  if (
    name.includes('click') ||
    name.includes('fill') ||
    name.includes('interaction')
  ) {
    return PERFORMANCE_THRESHOLDS.interaction
  }
  if (
    name.includes('api') ||
    name.includes('request') ||
    name.includes('fetch')
  ) {
    return PERFORMANCE_THRESHOLDS.api
  }

  return PERFORMANCE_THRESHOLDS.default
}

/**
 * Generate and save performance report
 */
export function generatePerformanceReport(): void {
  const report = performanceMonitor.generateReport()
  const reportFile = join(process.cwd(), '.bus', 'performance-report.json')

  try {
    writeFileSync(reportFile, JSON.stringify(report, null, 2))
    console.log(`📊 Performance report generated: ${reportFile}`)

    // Log summary
    console.log(`
📈 Performance Summary:
- Total tests: ${report.totalTests}
- Average duration: ${Math.round(report.averageDuration)}ms
- Slowest test: ${report.slowestTests[0]?.testName} (${report.slowestTests[0]?.duration}ms)
- Fastest test: ${report.fastestTests[0]?.testName} (${report.fastestTests[0]?.duration}ms)
- Active workers: ${Object.keys(report.workerPerformance).length}
    `)
  } catch (error) {
    console.error('Failed to generate performance report:', error)
  }
}
