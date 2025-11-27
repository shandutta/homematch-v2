'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion'
import { cn } from '@/lib/utils'

interface GradientMeshBackgroundProps {
  className?: string
  /** Intensity of the animation (0-1) */
  intensity?: number
  /** Whether to show noise texture overlay */
  showNoise?: boolean
  /** Color variant */
  variant?: 'default' | 'darker' | 'accent'
}

export function GradientMeshBackground({
  className,
  intensity = 1,
  showNoise = true,
  variant = 'default',
}: GradientMeshBackgroundProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isVisible, setIsVisible] = useState(true)
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)

  // Mouse position tracking
  const mouseX = useMotionValue(0.5)
  const mouseY = useMotionValue(0.5)

  // Smooth spring animation for mouse movement
  const smoothX = useSpring(mouseX, { stiffness: 50, damping: 30 })
  const smoothY = useSpring(mouseY, { stiffness: 50, damping: 30 })

  // Transform mouse position to blob offsets
  const blob1X = useTransform(smoothX, [0, 1], [-20, 20])
  const blob1Y = useTransform(smoothY, [0, 1], [-20, 20])
  const blob2X = useTransform(smoothX, [0, 1], [15, -15])
  const blob2Y = useTransform(smoothY, [0, 1], [10, -10])
  const blob3X = useTransform(smoothX, [0, 1], [-10, 10])
  const blob3Y = useTransform(smoothY, [0, 1], [15, -15])

  // Check for reduced motion preference
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    setPrefersReducedMotion(mediaQuery.matches)

    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches)
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  // Visibility API - pause animations when tab is hidden
  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsVisible(document.visibilityState === 'visible')
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () =>
      document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [])

  // Mouse tracking
  useEffect(() => {
    if (prefersReducedMotion || !isVisible) return

    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return

      const rect = containerRef.current.getBoundingClientRect()
      const x = (e.clientX - rect.left) / rect.width
      const y = (e.clientY - rect.top) / rect.height

      mouseX.set(Math.max(0, Math.min(1, x)))
      mouseY.set(Math.max(0, Math.min(1, y)))
    }

    window.addEventListener('mousemove', handleMouseMove, { passive: true })
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [prefersReducedMotion, isVisible, mouseX, mouseY])

  // Color variants
  const colors = {
    default: {
      base: '#030712',
      blob1: 'rgba(2, 26, 68, 0.8)',
      blob2: 'rgba(6, 58, 158, 0.6)',
      blob3: 'rgba(30, 58, 95, 0.5)',
      blob4: 'rgba(30, 27, 75, 0.4)',
      glow: 'rgba(14, 165, 233, 0.15)',
    },
    darker: {
      base: '#020617',
      blob1: 'rgba(2, 26, 68, 0.9)',
      blob2: 'rgba(6, 58, 158, 0.7)',
      blob3: 'rgba(30, 58, 95, 0.6)',
      blob4: 'rgba(30, 27, 75, 0.5)',
      glow: 'rgba(14, 165, 233, 0.1)',
    },
    accent: {
      base: '#030712',
      blob1: 'rgba(2, 26, 68, 0.7)',
      blob2: 'rgba(6, 58, 158, 0.5)',
      blob3: 'rgba(56, 189, 248, 0.2)',
      blob4: 'rgba(30, 27, 75, 0.4)',
      glow: 'rgba(56, 189, 248, 0.2)',
    },
  }

  const c = colors[variant]
  const shouldAnimate = !prefersReducedMotion && isVisible

  return (
    <div
      ref={containerRef}
      className={cn('absolute inset-0 overflow-hidden', className)}
      style={{ backgroundColor: c.base }}
    >
      {/* Base gradient layer */}
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(135deg, ${c.base} 0%, #0f172a 50%, ${c.base} 100%)`,
        }}
      />

      {/* Animated gradient blobs */}
      <motion.div
        className="absolute inset-0"
        style={{
          x: shouldAnimate ? blob1X : 0,
          y: shouldAnimate ? blob1Y : 0,
        }}
      >
        <div
          className="absolute h-[800px] w-[800px] rounded-full blur-[120px]"
          style={{
            top: '10%',
            left: '15%',
            background: `radial-gradient(circle, ${c.blob1} 0%, transparent 70%)`,
            opacity: intensity,
          }}
        />
      </motion.div>

      <motion.div
        className="absolute inset-0"
        style={{
          x: shouldAnimate ? blob2X : 0,
          y: shouldAnimate ? blob2Y : 0,
        }}
        animate={
          shouldAnimate
            ? {
                scale: [1, 1.1, 1],
                rotate: [0, 5, 0],
              }
            : undefined
        }
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      >
        <div
          className="absolute h-[600px] w-[600px] rounded-full blur-[100px]"
          style={{
            top: '40%',
            right: '10%',
            background: `radial-gradient(circle, ${c.blob2} 0%, transparent 70%)`,
            opacity: intensity * 0.8,
          }}
        />
      </motion.div>

      <motion.div
        className="absolute inset-0"
        style={{
          x: shouldAnimate ? blob3X : 0,
          y: shouldAnimate ? blob3Y : 0,
        }}
        animate={
          shouldAnimate
            ? {
                scale: [1, 1.15, 1],
              }
            : undefined
        }
        transition={{
          duration: 25,
          repeat: Infinity,
          ease: 'easeInOut',
          delay: 2,
        }}
      >
        <div
          className="absolute h-[500px] w-[500px] rounded-full blur-[80px]"
          style={{
            bottom: '10%',
            left: '30%',
            background: `radial-gradient(circle, ${c.blob3} 0%, transparent 70%)`,
            opacity: intensity * 0.7,
          }}
        />
      </motion.div>

      {/* Fourth blob - subtle accent */}
      <motion.div
        animate={
          shouldAnimate
            ? {
                x: [0, 30, 0],
                y: [0, -20, 0],
              }
            : undefined
        }
        transition={{
          duration: 30,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      >
        <div
          className="absolute h-[700px] w-[700px] rounded-full blur-[150px]"
          style={{
            top: '60%',
            right: '25%',
            background: `radial-gradient(circle, ${c.blob4} 0%, transparent 70%)`,
            opacity: intensity * 0.6,
          }}
        />
      </motion.div>

      {/* Glow accent at top */}
      <div
        className="absolute inset-x-0 top-0 h-[400px]"
        style={{
          background: `radial-gradient(ellipse 80% 50% at 50% 0%, ${c.glow}, transparent 70%)`,
          opacity: intensity,
        }}
      />

      {/* Noise texture overlay */}
      {showNoise && (
        <div className="pointer-events-none absolute inset-0 opacity-[0.03]">
          <svg className="h-full w-full">
            <filter id="noise">
              <feTurbulence
                type="fractalNoise"
                baseFrequency="0.8"
                numOctaves="4"
                stitchTiles="stitch"
              />
              <feColorMatrix type="saturate" values="0" />
            </filter>
            <rect width="100%" height="100%" filter="url(#noise)" />
          </svg>
        </div>
      )}

      {/* Subtle vignette */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at center, transparent 0%, rgba(0,0,0,0.3) 100%)',
        }}
      />
    </div>
  )
}
