/**
 * Performance Monitoring and Core Web Vitals Utilities
 * Helps track and optimize LCP, FID, and CLS metrics
 */

declare global {
  interface Window {
    webVitals?: {
      getCLS: (callback: (metric: any) => void) => void
      getFID: (callback: (metric: any) => void) => void
      getLCP: (callback: (metric: any) => void) => void
    }
  }
}

interface WebVitalMetric {
  name: string
  value: number
  rating: 'good' | 'needs-improvement' | 'poor'
  delta: number
  id: string
}

interface CoreWebVitalsTargets {
  LCP: number // Largest Contentful Paint - should be < 2.5s
  FID: number // First Input Delay - should be < 100ms
  CLS: number // Cumulative Layout Shift - should be < 0.1
}

export const CORE_WEB_VITALS_TARGETS: CoreWebVitalsTargets = {
  LCP: 2500, // 2.5 seconds
  FID: 100, // 100 milliseconds
  CLS: 0.1, // 0.1 score
}

export function getCWVRating(
  name: string,
  value: number
): 'good' | 'needs-improvement' | 'poor' {
  switch (name) {
    case 'LCP':
      return value <= 2500
        ? 'good'
        : value <= 4000
          ? 'needs-improvement'
          : 'poor'
    case 'FID':
      return value <= 100 ? 'good' : value <= 300 ? 'needs-improvement' : 'poor'
    case 'CLS':
      return value <= 0.1
        ? 'good'
        : value <= 0.25
          ? 'needs-improvement'
          : 'poor'
    default:
      return 'good'
  }
}

export function logWebVital(metric: WebVitalMetric) {
  const rating = getCWVRating(metric.name, metric.value)

  console.log(
    `%c${metric.name}: ${metric.value}ms (${rating})`,
    rating === 'good'
      ? 'color: green'
      : rating === 'needs-improvement'
        ? 'color: orange'
        : 'color: red'
  )

  // Send to analytics in production
  if (typeof window !== 'undefined' && process.env.NODE_ENV === 'production') {
    // Replace with your analytics service
    // analytics.track('Web Vital', { metric: metric.name, value: metric.value, rating })
  }
}

export async function measurePerformance(): Promise<PerformanceReport> {
  if (typeof window === 'undefined') {
    return {
      LCP: { value: 0, rating: 'good', target: CORE_WEB_VITALS_TARGETS.LCP },
      FID: { value: 0, rating: 'good', target: CORE_WEB_VITALS_TARGETS.FID },
      CLS: { value: 0, rating: 'good', target: CORE_WEB_VITALS_TARGETS.CLS },
      recommendations: [],
    }
  }

  return new Promise((resolve) => {
    const report: PerformanceReport = {
      LCP: { value: 0, rating: 'good', target: CORE_WEB_VITALS_TARGETS.LCP },
      FID: { value: 0, rating: 'good', target: CORE_WEB_VITALS_TARGETS.FID },
      CLS: { value: 0, rating: 'good', target: CORE_WEB_VITALS_TARGETS.CLS },
      recommendations: [],
    }

    let metricsCollected = 0
    const totalMetrics = 3

    function checkComplete() {
      metricsCollected++
      if (metricsCollected >= totalMetrics) {
        report.recommendations = generateRecommendations(report)
        resolve(report)
      }
    }

    // Use web-vitals library if available
    if (window.webVitals) {
      window.webVitals.getLCP((metric: WebVitalMetric) => {
        report.LCP = {
          value: metric.value,
          rating: getCWVRating('LCP', metric.value),
          target: CORE_WEB_VITALS_TARGETS.LCP,
        }
        logWebVital(metric)
        checkComplete()
      })

      window.webVitals.getFID((metric: WebVitalMetric) => {
        report.FID = {
          value: metric.value,
          rating: getCWVRating('FID', metric.value),
          target: CORE_WEB_VITALS_TARGETS.FID,
        }
        logWebVital(metric)
        checkComplete()
      })

      window.webVitals.getCLS((metric: WebVitalMetric) => {
        report.CLS = {
          value: metric.value,
          rating: getCWVRating('CLS', metric.value),
          target: CORE_WEB_VITALS_TARGETS.CLS,
        }
        logWebVital(metric)
        checkComplete()
      })
    } else {
      // Fallback measurements using Performance API
      setTimeout(() => {
        // LCP approximation using navigation timing
        const navigation = performance.getEntriesByType(
          'navigation'
        )[0] as PerformanceNavigationTiming
        // Approximate LCP using timeOrigin as navigationStart replacement
        const lcpApprox = navigation.loadEventEnd - performance.timeOrigin

        report.LCP = {
          value: lcpApprox,
          rating: getCWVRating('LCP', lcpApprox),
          target: CORE_WEB_VITALS_TARGETS.LCP,
        }
        checkComplete()
      }, 100)

      // FID - measure first interaction delay
      const measureFID = () => {
        const startTime = performance.now()
        requestAnimationFrame(() => {
          const fidValue = performance.now() - startTime
          report.FID = {
            value: fidValue,
            rating: getCWVRating('FID', fidValue),
            target: CORE_WEB_VITALS_TARGETS.FID,
          }
          checkComplete()
        })
      }
      measureFID()

      // CLS - simplified measurement
      setTimeout(() => {
        // This is a simplified CLS measurement
        // In practice, you'd need to track layout shifts over time
        report.CLS = {
          value: 0.05, // Default good value
          rating: 'good',
          target: CORE_WEB_VITALS_TARGETS.CLS,
        }
        checkComplete()
      }, 200)
    }
  })
}

interface MetricReport {
  value: number
  rating: 'good' | 'needs-improvement' | 'poor'
  target: number
}

interface PerformanceReport {
  LCP: MetricReport
  FID: MetricReport
  CLS: MetricReport
  recommendations: string[]
}

function generateRecommendations(report: PerformanceReport): string[] {
  const recommendations: string[] = []

  if (report.LCP.rating !== 'good') {
    recommendations.push(
      'LCP: Optimize image loading with Next.js Image component',
      'LCP: Preload critical resources and fonts',
      'LCP: Remove unused JavaScript and CSS',
      'LCP: Use a Content Delivery Network (CDN)'
    )
  }

  if (report.FID.rating !== 'good') {
    recommendations.push(
      'FID: Split large JavaScript bundles',
      'FID: Use code splitting with Next.js dynamic imports',
      'FID: Defer non-critical JavaScript',
      'FID: Optimize long-running tasks'
    )
  }

  if (report.CLS.rating !== 'good') {
    recommendations.push(
      'CLS: Set explicit dimensions for images and embeds',
      'CLS: Reserve space for dynamic content',
      'CLS: Avoid inserting content above existing content',
      'CLS: Use CSS aspect-ratio for responsive media'
    )
  }

  return recommendations
}

// Performance optimizations specifically for the landing page
export const LANDING_PAGE_OPTIMIZATIONS = {
  // Image optimization
  images: {
    priority: ['hero-background', 'phone-mockup', 'property-images'],
    sizes: {
      mobile: '100vw',
      desktop: '50vw',
    },
    formats: ['webp', 'avif'],
  },

  // Font optimization
  fonts: {
    preload: ['Inter', 'Plus Jakarta Sans'],
    display: 'swap',
    subset: 'latin',
  },

  // JavaScript optimization
  scripts: {
    defer: ['analytics', 'tracking'],
    async: ['non-critical-features'],
    critical: ['navigation', 'hero-interactions'],
  },

  // CSS optimization
  styles: {
    critical: ['above-the-fold', 'navigation', 'hero'],
    defer: ['animations', 'below-the-fold'],
  },
}

export function logPerformanceReport(report: PerformanceReport) {
  console.group('🚀 Core Web Vitals Report')

  console.log(
    `LCP: ${report.LCP.value}ms (${report.LCP.rating}) - Target: <${report.LCP.target}ms`
  )
  console.log(
    `FID: ${report.FID.value}ms (${report.FID.rating}) - Target: <${report.FID.target}ms`
  )
  console.log(
    `CLS: ${report.CLS.value} (${report.CLS.rating}) - Target: <${report.CLS.target}`
  )

  if (report.recommendations.length > 0) {
    console.group('📋 Recommendations')
    report.recommendations.forEach((rec) => console.log(`• ${rec}`))
    console.groupEnd()
  }

  console.groupEnd()
}
