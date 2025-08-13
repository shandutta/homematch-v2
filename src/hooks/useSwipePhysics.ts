'use client'

import { useMotionValue, useTransform, useAnimation } from 'framer-motion'
import { useCallback, useRef } from 'react'

// Enhanced Physics constants for dating app quality
const SWIPE_THRESHOLD = 120 // Slightly higher for more deliberate swipes
const SWIPE_VELOCITY_THRESHOLD = 400 // Lower for more responsive quick swipes
const SCALE_FACTOR = 0.92 // More pronounced scale effect
const RUBBER_BAND_FACTOR = 0.25 // Slightly less elastic for better control
const MAX_ROTATION = 25 // Maximum rotation angle
const _ROTATION_FACTOR = 0.1 // How much rotation is applied per pixel (reserved for future use)

export const SPRING_CONFIG = {
  type: 'spring' as const,
  stiffness: 280,
  damping: 25,
  mass: 0.8,
}

// Specialized spring configs for different animations
export const SNAP_BACK_CONFIG = {
  type: 'spring' as const,
  stiffness: 400,
  damping: 35,
  mass: 0.6,
}

export const EXIT_CONFIG = {
  type: 'spring' as const,
  stiffness: 200,
  damping: 20,
  mass: 0.5,
}

export interface UseSwipePhysicsOptions {
  onSwipeComplete?: (direction: 'left' | 'right') => void
  onSwipeThresholdCrossed?: (direction: 'left' | 'right' | null) => void
  onDragStart?: () => void
  onDragEnd?: () => void
  maxDragDistance?: number
}

export function useSwipePhysics({
  onSwipeComplete,
  onSwipeThresholdCrossed,
  onDragStart,
  onDragEnd,
  maxDragDistance,
}: UseSwipePhysicsOptions = {}) {
  // Motion values
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const controls = useAnimation()

  // Enhanced transform values for smoother animations
  const rotate = useTransform(
    x,
    [-400, 0, 400],
    [-MAX_ROTATION, 0, MAX_ROTATION]
  )
  const opacity = useTransform(
    x,
    [-200, -50, 0, 50, 200],
    [0.4, 0.8, 1, 0.8, 0.4]
  )
  const scale = useTransform(x, [-200, 0, 200], [SCALE_FACTOR, 1, SCALE_FACTOR])

  // Enhanced overlay opacity with smoother curves
  const likeOpacity = useTransform(
    x,
    [0, SWIPE_THRESHOLD * 0.3, SWIPE_THRESHOLD],
    [0, 0.2, 1]
  )
  const passOpacity = useTransform(
    x,
    [-SWIPE_THRESHOLD, -SWIPE_THRESHOLD * 0.3, 0],
    [1, 0.2, 0]
  )

  // Additional transform for enhanced effects
  const cardTilt = useTransform(x, [-300, 0, 300], [5, 0, -5]) // Subtle Y-axis tilt
  const shadowIntensity = useTransform(x, [-200, 0, 200], [0.3, 0.1, 0.3])

  // Track current drag direction for threshold crossing detection
  const currentDirectionRef = useRef<'left' | 'right' | null>(null)

  // Enhanced drag handlers
  const handleDragStart = useCallback(() => {
    onDragStart?.()
  }, [onDragStart])

  const handleDrag = useCallback(
    (
      _event: unknown,
      info: {
        offset: { x: number; y: number }
        velocity: { x: number; y: number }
      }
    ) => {
      const { offset } = info
      const threshold = SWIPE_THRESHOLD

      // Determine drag direction
      const direction =
        offset.x > threshold ? 'right' : offset.x < -threshold ? 'left' : null

      // Check for threshold crossing
      if (direction !== currentDirectionRef.current) {
        currentDirectionRef.current = direction
        onSwipeThresholdCrossed?.(direction)
      }

      // Rubber band effect at boundaries
      const maxX = maxDragDistance || window.innerWidth * 0.8
      if (Math.abs(offset.x) > maxX) {
        const rubberBandX =
          maxX + (Math.abs(offset.x) - maxX) * RUBBER_BAND_FACTOR
        x.set(offset.x > 0 ? rubberBandX : -rubberBandX)
      }
    },
    [maxDragDistance, onSwipeThresholdCrossed, x]
  )

  const handleDragEnd = useCallback(
    (
      _event: unknown,
      info: {
        offset: { x: number; y: number }
        velocity: { x: number; y: number }
      }
    ) => {
      const { offset, velocity } = info
      const swipeVelocity = Math.abs(velocity.x)
      const swipeDistance = Math.abs(offset.x)

      onDragEnd?.()
      currentDirectionRef.current = null

      // Enhanced swipe detection with velocity curve
      const velocityFactor = Math.min(
        swipeVelocity / SWIPE_VELOCITY_THRESHOLD,
        2
      )
      const adjustedThreshold = SWIPE_THRESHOLD * (1 - velocityFactor * 0.3)
      const shouldSwipe =
        swipeDistance > adjustedThreshold ||
        swipeVelocity > SWIPE_VELOCITY_THRESHOLD

      if (shouldSwipe) {
        const direction = offset.x > 0 ? 'right' : 'left'

        // Enhanced exit animation with physics
        const exitX =
          direction === 'right'
            ? window.innerWidth * 1.2
            : -window.innerWidth * 1.2
        const exitY = offset.y + velocity.y * 0.15 // More natural arc
        const exitRotate =
          direction === 'right' ? MAX_ROTATION * 1.5 : -MAX_ROTATION * 1.5

        controls
          .start({
            x: exitX,
            y: exitY,
            rotate: exitRotate,
            opacity: 0,
            scale: 0.85,
            transition: {
              ...EXIT_CONFIG,
              duration: Math.max(0.4, Math.min(0.8, 0.6 / velocityFactor)),
            },
          })
          .then(() => {
            onSwipeComplete?.(direction)
            // Reset position
            x.set(0)
            y.set(0)
            controls.set({
              x: 0,
              y: 0,
              rotate: 0,
              opacity: 1,
              scale: 1,
            })
          })
      } else {
        // Enhanced snap back with rubber band effect
        const snapBackForce = Math.max(
          0.8,
          1 - (swipeDistance / SWIPE_THRESHOLD) * 0.3
        )
        controls.start({
          x: 0,
          y: 0,
          rotate: 0,
          scale: 1,
          transition: {
            ...SNAP_BACK_CONFIG,
            stiffness: SNAP_BACK_CONFIG.stiffness * snapBackForce,
          },
        })
      }
    },
    [controls, onDragEnd, onSwipeComplete, x, y]
  )

  // Enhanced programmatic swipe function
  const swipeCard = useCallback(
    (direction: 'left' | 'right') => {
      const exitX =
        direction === 'right'
          ? window.innerWidth * 1.2
          : -window.innerWidth * 1.2
      const exitRotate =
        direction === 'right' ? MAX_ROTATION * 1.2 : -MAX_ROTATION * 1.2
      const exitY = (Math.random() - 0.5) * 100 // Add slight random trajectory

      controls
        .start({
          x: exitX,
          y: exitY,
          rotate: exitRotate,
          opacity: 0,
          scale: 0.85,
          transition: {
            ...EXIT_CONFIG,
            duration: 0.5,
          },
        })
        .then(() => {
          onSwipeComplete?.(direction)
          x.set(0)
          y.set(0)
          controls.set({
            x: 0,
            y: 0,
            rotate: 0,
            opacity: 1,
            scale: 1,
          })
        })
    },
    [controls, onSwipeComplete, x, y]
  )

  // Reset function for when cards change
  const resetPosition = useCallback(() => {
    x.set(0)
    y.set(0)
    controls.set({
      x: 0,
      y: 0,
      rotate: 0,
      opacity: 1,
      scale: 1,
    })
  }, [controls, x, y])

  return {
    // Motion values
    x,
    y,
    rotate,
    opacity,
    scale,
    likeOpacity,
    passOpacity,
    cardTilt,
    shadowIntensity,
    controls,

    // Handlers
    handleDragStart,
    handleDrag,
    handleDragEnd,

    // Actions
    swipeCard,
    resetPosition,

    // Physics constants for external use
    SWIPE_THRESHOLD,
    SWIPE_VELOCITY_THRESHOLD,
  }
}
