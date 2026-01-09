/**
 * Performance monitoring utilities - Server-side only
 */

interface PerformanceMetric {
  name: string
  duration: number
  timestamp: number
  metadata?: Record<string, unknown>
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = []
  private marks: Map<string, number> = new Map()

  mark(name: string) {
    this.marks.set(name, performance.now())
  }

  measure(name: string, startMark: string, metadata?: Record<string, unknown>) {
    const startTime = this.marks.get(startMark)
    if (!startTime) {
      console.warn(`Performance mark '${startMark}' not found`)
      return
    }

    const duration = performance.now() - startTime
    const metric: PerformanceMetric = {
      name,
      duration,
      timestamp: Date.now(),
      metadata,
    }

    this.metrics.push(metric)
    this.marks.delete(startMark)

    // Log slow operations
    if (duration > 1000) {
      console.warn(
        `Slow operation detected: ${name} took ${duration.toFixed(2)}ms`,
        metadata
      )
    }

    return metric
  }

  getMetrics() {
    return [...this.metrics]
  }

  clearMetrics() {
    this.metrics = []
    this.marks.clear()
  }

  // Report metrics (could send to analytics service)
  async reportMetrics() {
    const metrics = this.getMetrics()
    if (metrics.length === 0) return

    // In production, send to analytics service
    if (process.env.NODE_ENV === 'development') {
      console.table(
        metrics.map((m) => ({
          name: m.name,
          duration: `${m.duration.toFixed(2)}ms`,
          ...m.metadata,
        }))
      )
    }

    this.clearMetrics()
  }
}

export const performanceMonitor = new PerformanceMonitor()
let performanceSequence = 0

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const getStatusCode = (value: unknown): number | undefined =>
  isRecord(value) && typeof value.status === 'number' ? value.status : undefined

// API route performance wrapper
export function withPerformanceTracking<Args extends unknown[], Result>(
  handler: (...args: Args) => Promise<Result>,
  routeName: string
): (...args: Args) => Promise<Result> {
  return async (...args: Args) => {
    const runId = ++performanceSequence
    const markName = `${routeName}-${runId}-start`
    performanceMonitor.mark(markName)

    try {
      const result = await handler(...args)
      const status = getStatusCode(result) ?? 200
      performanceMonitor.measure(`${routeName}`, markName, {
        status,
      })
      return result
    } catch (error) {
      performanceMonitor.measure(`${routeName}`, markName, {
        status: 500,
        error: true,
      })
      throw error
    }
  }
}
