'use client'

/**
 * Client-side performance monitoring utilities
 */

import { useRef, useEffect } from 'react'
import { performanceMonitor } from './performance'

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