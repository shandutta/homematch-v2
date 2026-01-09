/**
 * Core Performance Metrics Collection
 *
 * Provides utilities for collecting and reporting performance metrics
 * including Core Web Vitals and custom application metrics
 */

import type { Metric } from 'web-vitals'

export interface PerformanceMetric {
  name: string
  value: number
  rating: 'good' | 'needs-improvement' | 'poor'
  delta?: number
  id: string
  navigationType?: string
  timestamp: number
}

export interface CustomMetric {
  name: string
  value: number
  unit?: 'ms' | 'kb' | 'mb' | 'count' | 'score'
  tags?: Record<string, string>
  timestamp?: number
}

export type MetricName =
  | 'LCP'
  | 'FID'
  | 'CLS'
  | 'FCP'
  | 'TTFB'
  | 'INP'
  | 'propertyCardRender'
  | 'searchResultsLoad'
  | 'imageOptimization'
  | 'apiResponse'
  | 'bundleSize'

// Performance thresholds based on Web Vitals recommendations
export const THRESHOLDS: Record<MetricName, { good: number; poor: number }> = {
  // Core Web Vitals
  LCP: { good: 2500, poor: 4000 }, // Largest Contentful Paint
  FID: { good: 100, poor: 300 }, // First Input Delay
  CLS: { good: 0.1, poor: 0.25 }, // Cumulative Layout Shift
  FCP: { good: 1800, poor: 3000 }, // First Contentful Paint
  TTFB: { good: 800, poor: 1800 }, // Time to First Byte
  INP: { good: 200, poor: 500 }, // Interaction to Next Paint

  // Custom metrics
  propertyCardRender: { good: 100, poor: 300 },
  searchResultsLoad: { good: 500, poor: 1500 },
  imageOptimization: { good: 50, poor: 150 },
  apiResponse: { good: 200, poor: 1000 },
  bundleSize: { good: 500, poor: 1000 }, // in KB
}

const isMetricName = (value: string): value is MetricName => value in THRESHOLDS

/**
 * Rate a metric value based on thresholds
 */
export function rateMetric(
  name: string,
  value: number
): 'good' | 'needs-improvement' | 'poor' {
  const threshold = isMetricName(name) ? THRESHOLDS[name] : undefined

  if (!threshold) {
    // Default rating for unknown metrics
    return value < 100 ? 'good' : value < 500 ? 'needs-improvement' : 'poor'
  }

  if (value <= threshold.good) return 'good'
  if (value >= threshold.poor) return 'poor'
  return 'needs-improvement'
}

/**
 * Format a metric value for display
 */
export function formatMetricValue(value: number, unit?: string): string {
  if (unit === 'kb') {
    return `${(value / 1024).toFixed(1)} KB`
  }
  if (unit === 'mb') {
    return `${(value / (1024 * 1024)).toFixed(2)} MB`
  }
  if (unit === 'ms' || !unit) {
    return value < 1000
      ? `${Math.round(value)}ms`
      : `${(value / 1000).toFixed(2)}s`
  }
  if (unit === 'score') {
    return value.toFixed(2)
  }
  return `${value} ${unit || ''}`
}

/**
 * Performance metrics collector
 */
export class MetricsCollector {
  private metrics: PerformanceMetric[] = []
  private customMetrics: CustomMetric[] = []
  private reportUrl: string | null = null
  private reportInterval: number = 10000 // 10 seconds
  private reportTimer: NodeJS.Timeout | null = null
  private isEnabled: boolean = true

  constructor(options?: {
    reportUrl?: string
    reportInterval?: number
    enabled?: boolean
  }) {
    this.reportUrl = options?.reportUrl || '/api/performance/metrics'
    this.reportInterval = options?.reportInterval || 10000
    this.isEnabled = options?.enabled !== false

    if (this.isEnabled && typeof window !== 'undefined') {
      this.startReporting()
    }
  }

  /**
   * Add a Web Vitals metric
   */
  addMetric(metric: Metric) {
    if (!this.isEnabled) return

    const performanceMetric: PerformanceMetric = {
      name: metric.name,
      value: metric.value,
      rating: metric.rating || rateMetric(metric.name, metric.value),
      delta: metric.delta,
      id: metric.id,
      navigationType: metric.navigationType,
      timestamp: Date.now(),
    }

    this.metrics.push(performanceMetric)

    // Log poor metrics immediately
    if (performanceMetric.rating === 'poor') {
      console.warn(
        `[Performance] Poor ${metric.name}: ${formatMetricValue(metric.value)}`,
        { metric: performanceMetric }
      )
    }
  }

  /**
   * Add a custom metric
   */
  addCustomMetric(metric: CustomMetric) {
    if (!this.isEnabled) return

    this.customMetrics.push({
      ...metric,
      timestamp: metric.timestamp || Date.now(),
    })
  }

  /**
   * Measure execution time of a function
   */
  async measure<T>(
    name: string,
    fn: () => T | Promise<T>,
    tags?: Record<string, string>
  ): Promise<T> {
    const start = performance.now()

    try {
      const result = await fn()
      const duration = performance.now() - start

      this.addCustomMetric({
        name,
        value: duration,
        unit: 'ms',
        tags,
      })

      return result
    } catch (error) {
      const duration = performance.now() - start

      this.addCustomMetric({
        name: `${name}_error`,
        value: duration,
        unit: 'ms',
        tags: { ...tags, error: 'true' },
      })

      throw error
    }
  }

  /**
   * Create a performance mark
   */
  mark(name: string) {
    if (typeof window !== 'undefined' && window.performance) {
      performance.mark(name)
    }
  }

  /**
   * Measure between two marks
   */
  measureBetweenMarks(name: string, startMark: string, endMark: string) {
    if (typeof window !== 'undefined' && window.performance) {
      try {
        performance.measure(name, startMark, endMark)
        const measure = performance.getEntriesByName(name)[0]

        if (measure) {
          this.addCustomMetric({
            name,
            value: measure.duration,
            unit: 'ms',
          })
        }
      } catch (error) {
        console.error('Failed to measure performance:', error)
      }
    }
  }

  /**
   * Start automatic reporting
   */
  private startReporting() {
    if (this.reportTimer) return

    this.reportTimer = setInterval(() => {
      this.flush()
    }, this.reportInterval)

    // Also report on page unload
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => this.flush())
      window.addEventListener('pagehide', () => this.flush())
    }
  }

  /**
   * Stop automatic reporting
   */
  stopReporting() {
    if (this.reportTimer) {
      clearInterval(this.reportTimer)
      this.reportTimer = null
    }
  }

  /**
   * Send collected metrics to the server
   */
  async flush() {
    if (!this.isEnabled || !this.reportUrl) return
    if (this.metrics.length === 0 && this.customMetrics.length === 0) return

    const payload = {
      metrics: [...this.metrics],
      customMetrics: [...this.customMetrics],
      url: typeof window !== 'undefined' ? window.location.href : 'unknown',
      userAgent:
        typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
      timestamp: Date.now(),
    }

    // Clear metrics after capturing
    this.metrics = []
    this.customMetrics = []

    try {
      // Use sendBeacon for reliability on page unload
      if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
        const blob = new Blob([JSON.stringify(payload)], {
          type: 'application/json',
        })
        navigator.sendBeacon(this.reportUrl, blob)
      } else {
        // Fallback to fetch
        await fetch(this.reportUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          keepalive: true,
        })
      }
    } catch (error) {
      console.error('Failed to report metrics:', error)
      // Re-add metrics if reporting failed
      this.metrics.push(...payload.metrics)
      this.customMetrics.push(...payload.customMetrics)
    }
  }

  /**
   * Get current metrics without clearing
   */
  getMetrics() {
    return {
      webVitals: [...this.metrics],
      custom: [...this.customMetrics],
    }
  }

  /**
   * Clear all metrics
   */
  clear() {
    this.metrics = []
    this.customMetrics = []
  }

  /**
   * Enable/disable metrics collection
   */
  setEnabled(enabled: boolean) {
    this.isEnabled = enabled

    if (enabled) {
      this.startReporting()
    } else {
      this.stopReporting()
    }
  }
}

// Singleton instance
let metricsCollector: MetricsCollector | null = null

/**
 * Get or create the global metrics collector
 */
export function getMetricsCollector(options?: {
  reportUrl?: string
  reportInterval?: number
  enabled?: boolean
}): MetricsCollector {
  if (typeof window === 'undefined') {
    // Return a no-op collector for SSR
    return new MetricsCollector({ enabled: false })
  }

  if (!metricsCollector) {
    metricsCollector = new MetricsCollector(options)
  }

  return metricsCollector
}

/**
 * Performance observer for long tasks
 */
export function observeLongTasks(callback: (duration: number) => void) {
  if (typeof window === 'undefined' || !('PerformanceObserver' in window)) {
    return () => {} // No-op cleanup function
  }

  try {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        // Report tasks longer than 50ms
        if (entry.duration > 50) {
          callback(entry.duration)
        }
      }
    })

    observer.observe({ entryTypes: ['longtask'] })

    return () => observer.disconnect()
  } catch (error) {
    console.error('Failed to observe long tasks:', error)
    return () => {}
  }
}

/**
 * Monitor resource loading performance
 */
export function observeResourceTiming(
  callback: (resource: PerformanceResourceTiming) => void
) {
  if (typeof window === 'undefined' || !('PerformanceObserver' in window)) {
    return () => {}
  }

  try {
    const isResourceTiming = (
      entry: PerformanceEntry
    ): entry is PerformanceResourceTiming => entry.entryType === 'resource'

    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (isResourceTiming(entry)) {
          callback(entry)
        }
      }
    })

    observer.observe({ entryTypes: ['resource'] })

    return () => observer.disconnect()
  } catch (error) {
    console.error('Failed to observe resource timing:', error)
    return () => {}
  }
}
