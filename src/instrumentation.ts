/**
 * Next.js Instrumentation Hook
 * Initializes performance monitoring and tracking
 */

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Server-side instrumentation
    if (process.env.NODE_ENV === 'development') {
      console.log('🚀 Server instrumentation initialized')
    }

    // You can add server-side performance monitoring here
    // e.g., APM tools, custom metrics collection, etc.
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    // Edge runtime instrumentation
    if (process.env.NODE_ENV === 'development') {
      console.log('⚡ Edge runtime instrumentation initialized')
    }
  }
}

// Client-side instrumentation
if (typeof window !== 'undefined') {
  // Dynamically import performance tracker to avoid SSR issues
  import('./lib/utils/performance-tracker').then(
    ({ initPerformanceTracker }) => {
      initPerformanceTracker()
      if (process.env.NODE_ENV === 'development') {
        console.log('📊 Client performance tracking initialized')
      }
    }
  )
}
