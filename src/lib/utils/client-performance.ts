'use client'

/**
 * Client-side performance monitoring utilities
 */

import { useRef, useEffect } from 'react'

// React hook for component render performance
// Note: This hook tracks render counts only. Actual render time measurement
// requires React DevTools Profiler or the Profiler component.
export function useRenderPerformance(componentName: string) {
  const renderCount = useRef(0)
  const lastRenderTime = useRef(performance.now())

  // Track render count on every render (not in useEffect)
  renderCount.current++
  const renderTime = performance.now()
  const timeSinceLastRender = renderTime - lastRenderTime.current
  lastRenderTime.current = renderTime

  // Only log in development and only for excessive re-renders
  useEffect(() => {
    if (process.env.NODE_ENV === 'development' && renderCount.current > 20) {
      console.debug(
        `[Performance] ${componentName} has rendered ${renderCount.current} times`
      )
    }
  }, [componentName])

  // Log if component re-renders very quickly (potential infinite loop)
  if (
    process.env.NODE_ENV === 'development' &&
    renderCount.current > 1 &&
    timeSinceLastRender < 16
  ) {
    // Only warn after multiple fast re-renders
    if (renderCount.current > 5 && renderCount.current % 10 === 0) {
      console.debug(
        `[Performance] ${componentName} is re-rendering rapidly (${renderCount.current} renders)`
      )
    }
  }
}
