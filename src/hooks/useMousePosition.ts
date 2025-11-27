'use client'

import { useEffect, useRef, type RefObject } from 'react'
import { useMotionValue, useSpring, type MotionValue } from 'framer-motion'

interface UseMousePositionOptions {
  /** Whether to track relative to an element (true) or viewport (false) */
  relative?: boolean
  /** Spring stiffness for smooth movement */
  stiffness?: number
  /** Spring damping for smooth movement */
  damping?: number
  /** Whether to enable tracking */
  enabled?: boolean
}

interface MousePosition {
  x: MotionValue<number>
  y: MotionValue<number>
  /** Raw x position without spring smoothing */
  rawX: MotionValue<number>
  /** Raw y position without spring smoothing */
  rawY: MotionValue<number>
}

/**
 * Hook to track mouse position with smooth spring animation
 * Can track relative to an element or the viewport
 */
export function useMousePosition<T extends HTMLElement = HTMLElement>(
  elementRef?: RefObject<T | null>,
  options: UseMousePositionOptions = {}
): MousePosition {
  const {
    relative = true,
    stiffness = 150,
    damping = 15,
    enabled = true,
  } = options

  const rawX = useMotionValue(0)
  const rawY = useMotionValue(0)

  const x = useSpring(rawX, { stiffness, damping })
  const y = useSpring(rawY, { stiffness, damping })

  // Track if we should use reduced motion
  const prefersReducedMotion = useRef(false)

  useEffect(() => {
    // Check for reduced motion preference
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    prefersReducedMotion.current = mediaQuery.matches

    const handleChange = (e: MediaQueryListEvent) => {
      prefersReducedMotion.current = e.matches
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  useEffect(() => {
    if (!enabled) return

    const handleMouseMove = (event: MouseEvent) => {
      if (prefersReducedMotion.current) return

      let newX: number
      let newY: number

      if (relative && elementRef?.current) {
        const rect = elementRef.current.getBoundingClientRect()
        newX = event.clientX - rect.left
        newY = event.clientY - rect.top
      } else {
        newX = event.clientX
        newY = event.clientY
      }

      rawX.set(newX)
      rawY.set(newY)
    }

    // Use passive listener for performance
    window.addEventListener('mousemove', handleMouseMove, { passive: true })

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
    }
  }, [enabled, relative, elementRef, rawX, rawY])

  return { x, y, rawX, rawY }
}

/**
 * Hook to check if the user prefers reduced motion
 */
export function useReducedMotion(): boolean {
  const prefersReducedMotion = useRef(false)

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    prefersReducedMotion.current = mediaQuery.matches

    const handleChange = (e: MediaQueryListEvent) => {
      prefersReducedMotion.current = e.matches
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  return prefersReducedMotion.current
}
