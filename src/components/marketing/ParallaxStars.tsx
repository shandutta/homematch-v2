'use client'

import { motion, useScroll, useTransform, MotionValue } from 'framer-motion'
import { useEffect, useState, useMemo } from 'react'

/**
 * Deterministic PRNG (Mulberry32) to ensure SSR/CSR parity for star field
 * Given a fixed seed, server and client generate identical sequences.
 */
function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

interface Star {
  id: number
  x: number
  y: number
  size: number
  duration: number
}

interface StarComponentProps {
  star: Star
  index: number
  prefersReducedMotion: boolean
  scrollY: MotionValue<number>
}

function StarComponent({
  star,
  index,
  prefersReducedMotion,
  scrollY,
}: StarComponentProps) {
  const starY = useTransform(
    scrollY,
    [0, 1000],
    prefersReducedMotion ? [0, 0] : [0, -star.size * 100]
  )

  return (
    <motion.div
      className="absolute rounded-full bg-white/20"
      style={{
        left: `${star.x}%`,
        top: `${star.y}%`,
        width: star.size,
        height: star.size,
        y: starY,
      }}
      animate={
        prefersReducedMotion
          ? { opacity: 0.5 }
          : {
              opacity: [0.2, 0.8, 0.2],
              scale: [1, 1.2, 1],
            }
      }
      transition={{
        duration: prefersReducedMotion ? 0 : star.duration,
        repeat: prefersReducedMotion ? 0 : Infinity,
        delay: prefersReducedMotion ? 0 : index * 0.1,
      }}
    />
  )
}

export function ParallaxStars() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)
  const { scrollY } = useScroll()

  // Generate a deterministic star field so SSR and client match.
  // Use a fixed seed for stable positions/sizes across renders.
  const stars = useMemo(() => {
    const rand = mulberry32(1337)
    const count = 50
    const arr = new Array(count).fill(0).map((_, i) => {
      const x = rand() * 100
      const y = rand() * 100
      const size = rand() * 3 + 1
      const duration = rand() * 20 + 10
      return { id: i, x, y, size, duration }
    })
    return arr
  }, [])

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    setPrefersReducedMotion(mediaQuery.matches)

    const handleChange = () => setPrefersReducedMotion(mediaQuery.matches)
    mediaQuery.addEventListener('change', handleChange)

    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  return (
    <div className="absolute inset-0 overflow-hidden">
      {stars.map((star, index) => (
        <StarComponent
          key={star.id}
          star={star}
          index={index}
          prefersReducedMotion={prefersReducedMotion}
          scrollY={scrollY}
        />
      ))}
    </div>
  )
}
