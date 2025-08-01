'use client'

import { useEffect, useRef } from 'react'

type Star = {
  x: number
  y: number
  r: number
  baseAlpha: number
  twinklePhase: number
  layer: number // 0,1,2 for parallax layers (0 = far, 2 = near)
  vx: number
  vy: number
}

type Props = {
  className?: string
  // Keep constant density across devices per request
  starCount?: number // default 220
}

export function ParallaxStarsCanvas({ className, starCount = 220 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const rafRef = useRef<number | null>(null)
  const starsRef = useRef<Star[]>([])
  const sizeRef = useRef({ w: 0, h: 0 })
  const mouseRef = useRef({ x: 0, y: 0 })
  const motionScaleRef = useRef(1)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d', { alpha: true })
    if (!ctx) return

    // Handle devicePixelRatio for crisp rendering
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const { clientWidth, clientHeight } = canvas
      canvas.width = Math.max(1, Math.floor(clientWidth * dpr))
      canvas.height = Math.max(1, Math.floor(clientHeight * dpr))
      sizeRef.current = { w: canvas.width, h: canvas.height }
      ctx.setTransform(1, 0, 0, 1, 0, 0) // reset
      ctx.scale(dpr, dpr) // scale drawing if needed (we'll draw in CSS pixels)
    }

    // Init starfield
    const initStars = () => {
      const stars: Star[] = []
      const layers = [0, 1, 2] // far, mid, near
      for (let i = 0; i < starCount; i++) {
        const layer = layers[Math.floor(Math.random() * layers.length)]
        // radius by layer: near bigger
        const r =
          layer === 2 ? 1.6 + Math.random() * 1.2 : layer === 1 ? 1.1 + Math.random() * 0.9 : 0.6 + Math.random() * 0.6
        const baseAlpha =
          layer === 2 ? 0.9 : layer === 1 ? 0.75 : 0.55
        const twinklePhase = Math.random() * Math.PI * 2
        // gentle drift velocity per layer
        const vx =
          layer === 2 ? (Math.random() * 0.06 - 0.03) : layer === 1 ? (Math.random() * 0.04 - 0.02) : (Math.random() * 0.02 - 0.01)
        const vy =
          layer === 2 ? (Math.random() * 0.06 - 0.03) : layer === 1 ? (Math.random() * 0.04 - 0.02) : (Math.random() * 0.02 - 0.01)
        stars.push({
          x: Math.random(),
          y: Math.random(),
          r,
          baseAlpha,
          twinklePhase,
          layer,
          vx,
          vy,
        })
      }
      starsRef.current = stars
    }

    // Parallax strength per layer
    const parallaxStrength = (layer: number) => (layer + 1) * 6 // near layer moves more

    const onMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect()
      mouseRef.current.x = (e.clientX - rect.left) / rect.width - 0.5 // -0.5..0.5
      mouseRef.current.y = (e.clientY - rect.top) / rect.height - 0.5
    }

    const onTouchMove = (e: TouchEvent) => {
      const t = e.touches[0]
      if (!t) return
      const rect = canvas.getBoundingClientRect()
      mouseRef.current.x = (t.clientX - rect.left) / rect.width - 0.5
      mouseRef.current.y = (t.clientY - rect.top) / rect.height - 0.5
    }

    const onVisibility = () => {
      // Pause animation when tab hidden
      if (document.hidden) {
        if (rafRef.current) cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      } else {
        loop()
      }
    }

    const onPrefersReducedMotion = () => {
      const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
      motionScaleRef.current = mq.matches ? 0 : 1
    }

    const draw = (t: number) => {
      const { w, h } = sizeRef.current
      if (w === 0 || h === 0) return

      // Clear to transparent; page gradient sits beneath via CSS
      ctx.clearRect(0, 0, w, h)

      // Base star color slight variance
      for (const s of starsRef.current) {
        const px = s.x * w
        const py = s.y * h

        // Twinkle: sin phase varying by time + per-star offset
        const twinkleSpeed = 0.0016
        const tw = Math.sin(t * twinkleSpeed + s.twinklePhase) * 0.35 + 0.65
        const alpha = s.baseAlpha * tw * 0.9

        // Parallax offset based on pointer position and layer depth
        const parX = mouseRef.current.x * parallaxStrength(s.layer) * motionScaleRef.current
        const parY = mouseRef.current.y * parallaxStrength(s.layer) * motionScaleRef.current

        // Drift update
        s.x += s.vx * 0.0008 * motionScaleRef.current
        s.y += s.vy * 0.0008 * motionScaleRef.current
        // Wrap
        if (s.x < 0) s.x += 1
        if (s.x > 1) s.x -= 1
        if (s.y < 0) s.y += 1
        if (s.y > 1) s.y -= 1

        // Soft glow
        ctx.globalAlpha = alpha * 0.6
        ctx.fillStyle = 'rgba(255,255,255,0.9)'
        ctx.beginPath()
        ctx.arc(px + parX, py + parY, s.r * 2.2, 0, Math.PI * 2)
        ctx.fill()

        // Core
        ctx.globalAlpha = alpha
        ctx.beginPath()
        ctx.arc(px + parX, py + parY, s.r, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.globalAlpha = 1
    }

    const loop = (now?: number) => {
      rafRef.current = requestAnimationFrame(loop)
      draw(now || performance.now())
    }

    resize()
    initStars()
    onPrefersReducedMotion()
    window.addEventListener('resize', resize)
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('touchmove', onTouchMove, { passive: true })
    document.addEventListener('visibilitychange', onVisibility)

    loop()

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      window.removeEventListener('resize', resize)
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('touchmove', onTouchMove)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [starCount])

  return (
    <div className={className} aria-hidden="true" style={{ pointerEvents: 'none' }}>
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        style={{
          // Ensure the canvas sits above base gradient but below content
          position: 'absolute',
          inset: 0,
        }}
      />
    </div>
  )
}
