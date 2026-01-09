'use client'

import { useEffect } from 'react'

const isLowDataMode = () => {
  const connection = navigator.connection

  if (connection?.saveData) return true
  const effectiveType = connection?.effectiveType
  return effectiveType === 'slow-2g' || effectiveType === '2g'
}

export function HeroMotionEnhancer() {
  useEffect(() => {
    const hero = document.querySelector<HTMLElement>('[data-hero]')
    const spotlight =
      hero?.querySelector<HTMLElement>('[data-hero-spotlight]') || null

    if (!hero || !spotlight) return

    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches

    if (prefersReducedMotion || isLowDataMode()) {
      return
    }

    spotlight.style.opacity = '1'

    const handlePointerMove = (event: PointerEvent) => {
      const rect = hero.getBoundingClientRect()
      const x = Math.max(0, Math.min(rect.width, event.clientX - rect.left))
      const y = Math.max(0, Math.min(rect.height, event.clientY - rect.top))
      hero.style.setProperty('--spotlight-x', `${x}px`)
      hero.style.setProperty('--spotlight-y', `${y}px`)
    }

    hero.addEventListener('pointermove', handlePointerMove, { passive: true })

    return () => {
      hero.removeEventListener('pointermove', handlePointerMove)
    }
  }, [])

  return null
}
