'use client'

import { motion, useScroll, useTransform, MotionValue } from 'framer-motion'
import { useEffect, useState, useMemo } from 'react'

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

  // Memoize star generation to prevent re-calculation on every render
  const stars = useMemo(() => {
    return Array.from({ length: 50 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 3 + 1,
      duration: Math.random() * 20 + 10,
    }))
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
