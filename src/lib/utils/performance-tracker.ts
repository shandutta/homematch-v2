/**
 * Real-time Performance Tracker
 * Monitors and reports performance metrics in production
 */

import { onCLS, onFCP, onFID, onLCP, onTTFB, type Metric } from 'web-vitals'
import { getCookieConsent } from '@/lib/cookies/consent'

export interface PerformanceMetric {
  name: string
  value: number
  rating: 'good' | 'needs-improvement' | 'poor'
  delta?: number
  id: string
  navigationType?: string
  timestamp: number
}

export interface PerformanceThresholds {
  LCP: { good: number; poor: number }
  FID: { good: number; poor: number }
  CLS: { good: number; poor: number }
  FCP: { good: number; poor: number }
  TTFB: { good: number; poor: number }
}

// Core Web Vitals thresholds
export const THRESHOLDS: PerformanceThresholds = {
  LCP: { good: 2500, poor: 4000 },
  FID: { good: 100, poor: 300 },
  CLS: { good: 0.1, poor: 0.25 },
  FCP: { good: 1800, poor: 3000 },
  TTFB: { good: 800, poor: 1800 },
}

type LayoutShiftEntry = PerformanceEntry & {
  value: number
  hadRecentInput: boolean
}

const isNavigationTiming = (
  entry: PerformanceEntry
): entry is PerformanceNavigationTiming =>
  entry.entryType === 'navigation' &&
  'domContentLoadedEventEnd' in entry &&
  'domContentLoadedEventStart' in entry &&
  'loadEventEnd' in entry &&
  'loadEventStart' in entry &&
  'domainLookupEnd' in entry &&
  'domainLookupStart' in entry &&
  'connectEnd' in entry &&
  'connectStart' in entry

const isResourceTiming = (
  entry: PerformanceEntry
): entry is PerformanceResourceTiming =>
  entry.entryType === 'resource' && 'transferSize' in entry

const toLayoutShiftEntry = (
  entry: PerformanceEntry
): LayoutShiftEntry | null => {
  if (entry.entryType !== 'layout-shift') return null
  const valueDescriptor = Object.getOwnPropertyDescriptor(entry, 'value')
  const hadRecentInputDescriptor = Object.getOwnPropertyDescriptor(
    entry,
    'hadRecentInput'
  )
  const value: unknown = valueDescriptor?.value
  const hadRecentInput: unknown = hadRecentInputDescriptor?.value
  if (typeof value !== 'number' || typeof hadRecentInput !== 'boolean') {
    return null
  }
  return { ...entry, value, hadRecentInput }
}

class PerformanceTracker {
  private metrics: Map<string, PerformanceMetric> = new Map()
  private observers: Map<string, PerformanceObserver> = new Map()
  private reportQueue: PerformanceMetric[] = []
  private reportTimer: NodeJS.Timeout | null = null
  private isEnabled: boolean = true
  private apiEndpoint: string = '/api/performance/metrics'

  constructor() {
    if (typeof window === 'undefined') return

    // Check if performance tracking is enabled
    this.isEnabled =
      process.env.NEXT_PUBLIC_ENABLE_PERFORMANCE_TRACKING === 'true'

    if (!this.isEnabled || !hasAnalyticsConsent()) {
      this.isEnabled = false
      return
    }

    this.initialize()
  }

  private initialize() {
    // Web Vitals
    this.measureWebVitals()

    // Custom metrics
    this.measureCustomMetrics()

    // Navigation timing
    this.measureNavigationTiming()

    // Resource timing
    this.observeResources()

    // Long tasks
    this.observeLongTasks()

    // Layout shifts
    this.observeLayoutShifts()

    // Report metrics on page unload
    if (typeof window !== 'undefined') {
      window.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
          this.flush()
        }
      })

      window.addEventListener('pagehide', () => {
        this.flush()
      })
    }
  }

  private measureWebVitals() {
    // Largest Contentful Paint
    onLCP((metric: Metric) => {
      this.recordMetric({
        ...metric,
        timestamp: Date.now(),
        rating: this.getRating('LCP', metric.value),
      })
    })

    // First Input Delay
    onFID((metric: Metric) => {
      this.recordMetric({
        ...metric,
        timestamp: Date.now(),
        rating: this.getRating('FID', metric.value),
      })
    })

    // Cumulative Layout Shift
    onCLS((metric: Metric) => {
      this.recordMetric({
        ...metric,
        timestamp: Date.now(),
        rating: this.getRating('CLS', metric.value),
      })
    })

    // First Contentful Paint
    onFCP((metric: Metric) => {
      this.recordMetric({
        ...metric,
        timestamp: Date.now(),
        rating: this.getRating('FCP', metric.value),
      })
    })

    // Time to First Byte
    onTTFB((metric: Metric) => {
      this.recordMetric({
        ...metric,
        timestamp: Date.now(),
        rating: this.getRating('TTFB', metric.value),
      })
    })
  }

  private measureCustomMetrics() {
    // Time to Interactive
    this.measureTTI()

    // First Paint
    this.measureFP()

    // DOM Content Loaded
    this.measureDCL()

    // Component hydration time
    this.measureHydration()
  }

  private measureTTI() {
    if (!window.performance) return

    // Simplified TTI calculation
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries()
      const lastLongTask = entries[entries.length - 1]

      if (lastLongTask) {
        const tti = lastLongTask.startTime + lastLongTask.duration
        this.recordMetric({
          name: 'TTI',
          value: tti,
          rating:
            tti < 3800 ? 'good' : tti < 7300 ? 'needs-improvement' : 'poor',
          id: 'tti-' + Date.now(),
          timestamp: Date.now(),
        })
      }
    })

    try {
      observer.observe({ entryTypes: ['longtask'] })
      this.observers.set('tti', observer)
    } catch (_e) {
      console.warn('TTI observation not supported')
    }
  }

  private measureFP() {
    const paintEntries = performance.getEntriesByType('paint')
    const fp = paintEntries.find((entry) => entry.name === 'first-paint')

    if (fp) {
      this.recordMetric({
        name: 'FP',
        value: fp.startTime,
        rating:
          fp.startTime < 1000
            ? 'good'
            : fp.startTime < 3000
              ? 'needs-improvement'
              : 'poor',
        id: 'fp-' + Date.now(),
        timestamp: Date.now(),
      })
    }
  }

  private measureDCL() {
    if (
      document.readyState === 'complete' ||
      document.readyState === 'interactive'
    ) {
      // Use Navigation Timing API instead of deprecated performance.timing
      const navEntries = performance
        .getEntriesByType('navigation')
        .filter(isNavigationTiming)
      if (navEntries.length > 0) {
        const navTiming = navEntries[0]
        const dcl =
          navTiming.domContentLoadedEventEnd -
          navTiming.domContentLoadedEventStart
        this.recordMetric({
          name: 'DCL',
          value: dcl,
          rating:
            dcl < 1500 ? 'good' : dcl < 3500 ? 'needs-improvement' : 'poor',
          id: 'dcl-' + Date.now(),
          timestamp: Date.now(),
        })
      }
    } else {
      window.addEventListener('DOMContentLoaded', () => this.measureDCL())
    }
  }

  private measureHydration() {
    // Measure React hydration time
    if (typeof window !== 'undefined') {
      const hydrationTime = window.__REACT_HYDRATION_TIME__
      if (typeof hydrationTime !== 'number') return
      this.recordMetric({
        name: 'Hydration',
        value: hydrationTime,
        rating:
          hydrationTime < 500
            ? 'good'
            : hydrationTime < 1500
              ? 'needs-improvement'
              : 'poor',
        id: 'hydration-' + Date.now(),
        timestamp: Date.now(),
      })
    }
  }

  private measureNavigationTiming() {
    if (!window.performance) return

    window.addEventListener('load', () => {
      // Use Navigation Timing API instead of deprecated performance.timing
      const navEntries = performance
        .getEntriesByType('navigation')
        .filter(isNavigationTiming)
      if (navEntries.length === 0) return

      const timing = navEntries[0]

      // DNS lookup time
      const dnsTime = timing.domainLookupEnd - timing.domainLookupStart
      this.recordMetric({
        name: 'DNS',
        value: dnsTime,
        rating:
          dnsTime < 50 ? 'good' : dnsTime < 150 ? 'needs-improvement' : 'poor',
        id: 'dns-' + Date.now(),
        timestamp: Date.now(),
      })

      // TCP connection time
      const tcpTime = timing.connectEnd - timing.connectStart
      this.recordMetric({
        name: 'TCP',
        value: tcpTime,
        rating:
          tcpTime < 100 ? 'good' : tcpTime < 250 ? 'needs-improvement' : 'poor',
        id: 'tcp-' + Date.now(),
        timestamp: Date.now(),
      })

      // Page load time
      const loadTime = timing.loadEventEnd - timing.loadEventStart
      this.recordMetric({
        name: 'Load',
        value: loadTime,
        rating:
          loadTime < 3000
            ? 'good'
            : loadTime < 5000
              ? 'needs-improvement'
              : 'poor',
        id: 'load-' + Date.now(),
        timestamp: Date.now(),
      })
    })
  }

  private observeResources() {
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries().filter(isResourceTiming)

      entries.forEach((entry) => {
        // Track slow resources
        if (entry.duration > 1000) {
          this.recordMetric({
            name: 'SlowResource',
            value: entry.duration,
            rating: 'poor',
            id: 'resource-' + Date.now(),
            timestamp: Date.now(),
            navigationType: entry.name,
          })
        }

        // Track large resources
        if (entry.transferSize && entry.transferSize > 500000) {
          // 500KB
          this.recordMetric({
            name: 'LargeResource',
            value: entry.transferSize,
            rating: entry.transferSize < 1000000 ? 'needs-improvement' : 'poor',
            id: 'size-' + Date.now(),
            timestamp: Date.now(),
            navigationType: entry.name,
          })
        }
      })
    })

    try {
      observer.observe({ entryTypes: ['resource'] })
      this.observers.set('resource', observer)
    } catch (_e) {
      console.warn('Resource timing not supported')
    }
  }

  private observeLongTasks() {
    if (!('PerformanceObserver' in window)) return

    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries()

      entries.forEach((entry) => {
        if (entry.duration > 50) {
          // Tasks longer than 50ms
          this.recordMetric({
            name: 'LongTask',
            value: entry.duration,
            rating: entry.duration < 100 ? 'needs-improvement' : 'poor',
            id: 'task-' + Date.now(),
            timestamp: Date.now(),
          })
        }
      })
    })

    try {
      observer.observe({ entryTypes: ['longtask'] })
      this.observers.set('longtask', observer)
    } catch (_e) {
      console.warn('Long task observation not supported')
    }
  }

  private observeLayoutShifts() {
    if (!('PerformanceObserver' in window)) return

    let clsValue = 0
    let clsEntries: PerformanceEntry[] = []

    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries()

      entries.forEach((entry) => {
        const layoutShiftEntry = toLayoutShiftEntry(entry)
        if (!layoutShiftEntry) return

        // Only count layout shifts without user input
        if (!layoutShiftEntry.hadRecentInput) {
          clsValue += layoutShiftEntry.value
          clsEntries.push(entry)
        }
      })

      // Report accumulated CLS
      if (clsValue > 0.1) {
        this.recordMetric({
          name: 'CLS-Accumulated',
          value: clsValue,
          rating: this.getRating('CLS', clsValue),
          id: 'cls-acc-' + Date.now(),
          timestamp: Date.now(),
        })
      }
    })

    try {
      observer.observe({ entryTypes: ['layout-shift'] })
      this.observers.set('layout-shift', observer)
    } catch (_e) {
      console.warn('Layout shift observation not supported')
    }
  }

  private getRating(
    name: keyof PerformanceThresholds,
    value: number
  ): 'good' | 'needs-improvement' | 'poor' {
    const threshold = THRESHOLDS[name]
    if (value <= threshold.good) return 'good'
    if (value <= threshold.poor) return 'needs-improvement'
    return 'poor'
  }

  private recordMetric(metric: PerformanceMetric) {
    this.metrics.set(metric.name, metric)
    this.reportQueue.push(metric)

    // Log in development
    if (process.env.NODE_ENV === 'development') {
      const icon =
        metric.rating === 'good'
          ? '✅'
          : metric.rating === 'needs-improvement'
            ? '⚠️'
            : '❌'
      console.log(
        `${icon} ${metric.name}: ${metric.value.toFixed(2)}ms (${metric.rating})`
      )
    }

    // Schedule batch reporting
    this.scheduleReport()
  }

  private scheduleReport() {
    if (this.reportTimer) return

    this.reportTimer = setTimeout(() => {
      this.report()
      this.reportTimer = null
    }, 5000) // Report every 5 seconds
  }

  private async report() {
    if (this.reportQueue.length === 0) return

    const metrics = [...this.reportQueue]
    this.reportQueue = []

    try {
      // Send to analytics endpoint
      if (process.env.NODE_ENV === 'production') {
        await fetch(this.apiEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            metrics,
            url: window.location.href,
            userAgent: navigator.userAgent,
            timestamp: Date.now(),
          }),
        })
      }

      // Also send to PostHog if available
      if (typeof window !== 'undefined' && window.posthog) {
        metrics.forEach((metric) => {
          window.posthog!.capture('performance_metric', {
            metric_name: metric.name,
            metric_value: metric.value,
            metric_rating: metric.rating,
            page_url: window.location.href,
          })
        })
      }
    } catch (error) {
      console.error('Failed to report metrics:', error)
    }
  }

  public flush() {
    // Send any remaining metrics
    if (this.reportQueue.length > 0) {
      this.report()
    }
  }

  public getMetrics(): Map<string, PerformanceMetric> {
    return new Map(this.metrics)
  }

  public clearMetrics() {
    this.metrics.clear()
    this.reportQueue = []
  }

  public destroy() {
    // Clean up observers
    this.observers.forEach((observer) => observer.disconnect())
    this.observers.clear()

    // Clear timer
    if (this.reportTimer) {
      clearTimeout(this.reportTimer)
      this.reportTimer = null
    }

    // Send remaining metrics
    this.flush()
  }
}

// Singleton instance
let tracker: PerformanceTracker | null = null

function hasAnalyticsConsent() {
  if (typeof window === 'undefined') return false
  const consent = getCookieConsent()
  return Boolean(consent?.analytics)
}

export function initPerformanceTracker(): PerformanceTracker | null {
  if (typeof window === 'undefined') return null
  if (!hasAnalyticsConsent()) return null

  if (!tracker) {
    tracker = new PerformanceTracker()
  }

  return tracker
}

export function getPerformanceTracker(): PerformanceTracker | null {
  return tracker
}

// Auto-initialize in browser
if (typeof window !== 'undefined') {
  initPerformanceTracker()
}
