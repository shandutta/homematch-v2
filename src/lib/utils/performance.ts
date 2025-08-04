/**
 * Performance monitoring utilities
 */

import { useRef, useEffect } from 'react'

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

// React hook for component render performance
export function useRenderPerformance(componentName: string) {
  const renderCount = useRef(0)

  useEffect(() => {
    renderCount.current++
    const currentRenderCount = renderCount.current
    performanceMonitor.mark(`${componentName}-render-${currentRenderCount}`)

    return () => {
      performanceMonitor.measure(
        `${componentName} render`,
        `${componentName}-render-${currentRenderCount}`,
        { renderCount: currentRenderCount }
      )
    }
  })
}

// API route performance wrapper
export function withPerformanceTracking<
  T extends (...args: unknown[]) => Promise<unknown>,
>(handler: T, routeName: string): T {
  return (async (...args) => {
    performanceMonitor.mark(`${routeName}-start`)

    try {
      const result = await handler(...args)
      const typedResult = result as { status?: number }
      performanceMonitor.measure(`${routeName}`, `${routeName}-start`, {
        status: typedResult.status || 200,
      })
      return result
    } catch (error) {
      performanceMonitor.measure(`${routeName}`, `${routeName}-start`, {
        status: 500,
        error: true,
      })
      throw error
    }
  }) as T
}
