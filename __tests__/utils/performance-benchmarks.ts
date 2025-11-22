/**
 * Performance Benchmarking for Integration Tests
 * Tracks and validates performance metrics across test runs
 */
import { performance } from 'perf_hooks'
import fs from 'fs/promises'
import path from 'path'

export interface PerformanceMetric {
  name: string
  duration: number
  timestamp: string
  memory: NodeJS.MemoryUsage
  metadata?: Record<string, any>
}

export interface PerformanceThresholds {
  maxDuration?: number // Maximum allowed duration in ms
  maxMemory?: number // Maximum memory usage in MB
  percentile95?: number // 95th percentile target
  degradationThreshold?: number // Allowed performance degradation %
}

export interface BenchmarkReport {
  testName: string
  metrics: PerformanceMetric[]
  summary: {
    mean: number
    median: number
    min: number
    max: number
    p95: number
    p99: number
    memoryPeak: number
  }
  thresholds: PerformanceThresholds
  passed: boolean
  failures: string[]
}

/**
 * Performance Benchmark Manager
 */
export class PerformanceBenchmark {
  private metrics: PerformanceMetric[] = []
  private reportDir: string
  private currentTest: string = ''

  constructor(reportDir?: string) {
    this.reportDir =
      reportDir ||
      path.join(process.cwd(), '__tests__', 'reports', 'performance')
  }

  /**
   * Start a performance measurement
   */
  startMeasure(
    name: string
  ): (metadata?: Record<string, any>) => PerformanceMetric {
    const startTime = performance.now()
    const startMemory = process.memoryUsage()

    return (metadata?: Record<string, any>) => {
      const duration = performance.now() - startTime
      const endMemory = process.memoryUsage()

      const metric: PerformanceMetric = {
        name,
        duration,
        timestamp: new Date().toISOString(),
        memory: {
          rss: endMemory.rss - startMemory.rss,
          heapTotal: endMemory.heapTotal - startMemory.heapTotal,
          heapUsed: endMemory.heapUsed - startMemory.heapUsed,
          external: endMemory.external - startMemory.external,
          arrayBuffers: endMemory.arrayBuffers - startMemory.arrayBuffers,
        },
        metadata,
      }

      this.metrics.push(metric)
      return metric
    }
  }

  /**
   * Measure an async operation
   */
  async measure<T>(
    name: string,
    operation: () => Promise<T>,
    metadata?: Record<string, any>
  ): Promise<{ result: T; metric: PerformanceMetric }> {
    const endMeasure = this.startMeasure(name)
    const result = await operation()
    const metric = endMeasure(metadata)
    return { result, metric }
  }

  /**
   * Measure sync operation
   */
  measureSync<T>(
    name: string,
    operation: () => T,
    metadata?: Record<string, any>
  ): { result: T; metric: PerformanceMetric } {
    const endMeasure = this.startMeasure(name)
    const result = operation()
    const metric = endMeasure(metadata)
    return { result, metric }
  }

  /**
   * Calculate statistics from metrics
   */
  private calculateStats(metrics: PerformanceMetric[]) {
    const durations = metrics.map((m) => m.duration).sort((a, b) => a - b)
    const memories = metrics.map((m) => m.memory.heapUsed / 1024 / 1024) // Convert to MB

    return {
      mean: durations.reduce((a, b) => a + b, 0) / durations.length,
      median: durations[Math.floor(durations.length / 2)],
      min: Math.min(...durations),
      max: Math.max(...durations),
      p95: durations[Math.floor(durations.length * 0.95)],
      p99: durations[Math.floor(durations.length * 0.99)],
      memoryPeak: Math.max(...memories),
    }
  }

  /**
   * Validate against thresholds
   */
  validateThresholds(
    metrics: PerformanceMetric[],
    thresholds: PerformanceThresholds
  ): { passed: boolean; failures: string[] } {
    const stats = this.calculateStats(metrics)
    const failures: string[] = []

    if (thresholds.maxDuration && stats.max > thresholds.maxDuration) {
      failures.push(
        `Max duration ${stats.max.toFixed(2)}ms exceeds threshold ${thresholds.maxDuration}ms`
      )
    }

    if (thresholds.maxMemory && stats.memoryPeak > thresholds.maxMemory) {
      failures.push(
        `Peak memory ${stats.memoryPeak.toFixed(2)}MB exceeds threshold ${thresholds.maxMemory}MB`
      )
    }

    if (thresholds.percentile95 && stats.p95 > thresholds.percentile95) {
      failures.push(
        `95th percentile ${stats.p95.toFixed(2)}ms exceeds threshold ${thresholds.percentile95}ms`
      )
    }

    return {
      passed: failures.length === 0,
      failures,
    }
  }

  /**
   * Generate benchmark report
   */
  async generateReport(
    testName: string,
    thresholds: PerformanceThresholds = {}
  ): Promise<BenchmarkReport> {
    const testMetrics = this.metrics.filter((m) => m.name.startsWith(testName))
    const stats = this.calculateStats(testMetrics)
    const validation = this.validateThresholds(testMetrics, thresholds)

    const report: BenchmarkReport = {
      testName,
      metrics: testMetrics,
      summary: stats,
      thresholds,
      passed: validation.passed,
      failures: validation.failures,
    }

    // Save report to file
    await this.ensureReportDir()
    // Ensure test-specific subdir exists to avoid ENOENT
    const safeName = testName.replace(/[^a-zA-Z0-9_-]/g, '_')
    const testDir = path.join(this.reportDir, safeName)
    await fs.mkdir(testDir, { recursive: true })

    const reportPath = path.join(testDir, `${safeName}_${Date.now()}.json`)
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2))

    return report
  }

  /**
   * Compare with baseline
   */
  async compareWithBaseline(
    testName: string,
    currentMetrics: PerformanceMetric[],
    degradationThreshold: number = 10
  ): Promise<{ passed: boolean; comparison: any }> {
    const baselinePath = path.join(this.reportDir, `${testName}_baseline.json`)

    try {
      const baselineContent = await fs.readFile(baselinePath, 'utf-8')
      const baseline = JSON.parse(baselineContent) as BenchmarkReport

      const currentStats = this.calculateStats(currentMetrics)
      const degradation =
        ((currentStats.mean - baseline.summary.mean) / baseline.summary.mean) *
        100

      return {
        passed: degradation <= degradationThreshold,
        comparison: {
          baseline: baseline.summary.mean,
          current: currentStats.mean,
          degradation: degradation.toFixed(2) + '%',
        },
      }
    } catch (_error) {
      // No baseline exists, create one
      await this.saveBaseline(testName, currentMetrics)
      return {
        passed: true,
        comparison: { message: 'Baseline created' },
      }
    }
  }

  /**
   * Save baseline metrics
   */
  async saveBaseline(
    testName: string,
    metrics: PerformanceMetric[]
  ): Promise<void> {
    await this.ensureReportDir()
    const baselinePath = path.join(this.reportDir, `${testName}_baseline.json`)

    const report: BenchmarkReport = {
      testName,
      metrics,
      summary: this.calculateStats(metrics),
      thresholds: {},
      passed: true,
      failures: [],
    }

    await fs.writeFile(baselinePath, JSON.stringify(report, null, 2))
  }

  /**
   * Ensure report directory exists
   */
  private async ensureReportDir(): Promise<void> {
    await fs.mkdir(this.reportDir, { recursive: true })
  }

  /**
   * Clear metrics
   */
  clear(): void {
    this.metrics = []
  }
}

/**
 * Performance test utilities
 */
export class PerformanceTestUtils {
  /**
   * Simulate CPU-intensive operation
   */
  static simulateCPULoad(duration: number): void {
    const start = Date.now()
    while (Date.now() - start < duration) {
      // Busy loop
      Math.sqrt(Math.random())
    }
  }

  /**
   * Simulate memory allocation
   */
  static simulateMemoryLoad(sizeMB: number): Buffer {
    return Buffer.alloc(sizeMB * 1024 * 1024)
  }

  /**
   * Measure database query performance
   */
  static async measureQuery<T>(
    queryName: string,
    query: () => Promise<T>,
    benchmark: PerformanceBenchmark
  ): Promise<{ result: T; metric: PerformanceMetric }> {
    return benchmark.measure(queryName, query, {
      type: 'database_query',
    })
  }

  /**
   * Measure API endpoint performance
   */
  static async measureEndpoint(
    endpointName: string,
    request: () => Promise<Response>,
    benchmark: PerformanceBenchmark
  ): Promise<{ response: Response; metric: PerformanceMetric }> {
    const { result, metric } = await benchmark.measure(endpointName, request, {
      type: 'api_endpoint',
    })

    return { response: result, metric }
  }

  /**
   * Run performance test suite
   */
  static async runSuite(
    suiteName: string,
    tests: Array<{
      name: string
      test: () => Promise<any>
      threshold?: PerformanceThresholds
    }>,
    iterations: number = 10
  ): Promise<BenchmarkReport[]> {
    const benchmark = new PerformanceBenchmark()
    const reports: BenchmarkReport[] = []

    for (const { name, test, threshold } of tests) {
      console.log(`Running ${name} (${iterations} iterations)...`)

      // Warm-up run
      await test()

      // Actual test runs
      for (let i = 0; i < iterations; i++) {
        await benchmark.measure(`${suiteName}/${name}`, test, {
          iteration: i + 1,
        })
      }

      const report = await benchmark.generateReport(
        `${suiteName}/${name}`,
        threshold || {}
      )
      reports.push(report)

      if (!report.passed) {
        console.warn(
          `❌ ${name} failed performance thresholds:`,
          report.failures
        )
      } else {
        console.log(
          `✅ ${name} passed (mean: ${report.summary.mean.toFixed(2)}ms)`
        )
      }
    }

    return reports
  }
}

/**
 * Jest matchers for performance assertions
 */
export const performanceMatchers = {
  toBeWithinDuration(
    received: number,
    expected: number,
    tolerance: number = 100
  ) {
    const pass = received <= expected + tolerance
    return {
      pass,
      message: () =>
        pass
          ? `Expected ${received}ms to not be within ${expected}ms ± ${tolerance}ms`
          : `Expected ${received}ms to be within ${expected}ms ± ${tolerance}ms`,
    }
  },

  toHaveAcceptableMemory(received: NodeJS.MemoryUsage, maxMB: number) {
    const usedMB = received.heapUsed / 1024 / 1024
    const pass = usedMB <= maxMB
    return {
      pass,
      message: () =>
        pass
          ? `Expected memory ${usedMB.toFixed(2)}MB to exceed ${maxMB}MB`
          : `Expected memory ${usedMB.toFixed(2)}MB to be under ${maxMB}MB`,
    }
  },
}

/**
 * Performance monitoring decorator
 */
export function measurePerformance(thresholds?: PerformanceThresholds) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value
    const benchmark = new PerformanceBenchmark()

    descriptor.value = async function (...args: any[]) {
      const { result, metric } = await benchmark.measure(propertyKey, () =>
        originalMethod.apply(this, args)
      )

      if (thresholds) {
        const validation = benchmark.validateThresholds([metric], thresholds)
        if (!validation.passed) {
          console.warn(
            `Performance threshold violations in ${propertyKey}:`,
            validation.failures
          )
        }
      }

      return result
    }

    return descriptor
  }
}
