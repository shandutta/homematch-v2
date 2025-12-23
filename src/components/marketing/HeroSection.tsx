'use client'

import { useRef, useEffect, useState } from 'react'
import Link from 'next/link'
import {
  useScroll,
  useTransform,
  useMotionValue,
  useSpring,
  motion,
} from 'framer-motion'
import { Heart } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { MotionDiv, MotionP } from '@/components/ui/motion-components'
import { GradientMeshBackground } from './GradientMeshBackground'
import { MarketingPreviewCard } from './MarketingPreviewCard'

// Text reveal component for word-by-word animation
function TextReveal({
  text,
  className,
  delay = 0,
}: {
  text: string
  className?: string
  delay?: number
}) {
  const words = text.split(' ')

  return (
    <motion.h1
      className={className}
      initial="hidden"
      animate="visible"
      variants={{
        hidden: {},
        visible: {
          transition: {
            staggerChildren: 0.08,
            delayChildren: delay,
          },
        },
      }}
    >
      {words.map((word, i) => (
        <motion.span
          key={i}
          className="inline-block"
          variants={{
            hidden: {
              opacity: 0,
              y: 20,
              filter: 'blur(10px)',
            },
            visible: {
              opacity: 1,
              y: 0,
              filter: 'blur(0px)',
              transition: {
                duration: 0.5,
                ease: [0.25, 0.46, 0.45, 0.94],
              },
            },
          }}
        >
          {word}
          {i < words.length - 1 && '\u00A0'}
        </motion.span>
      ))}
    </motion.h1>
  )
}

export function HeroSection() {
  const heroRef = useRef<HTMLDivElement | null>(null)
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)

  // Mouse position for spotlight effect
  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)
  const smoothMouseX = useSpring(mouseX, { stiffness: 50, damping: 20 })
  const smoothMouseY = useSpring(mouseY, { stiffness: 50, damping: 20 })

  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start'],
  })

  const previewScale = useTransform(
    scrollYProgress,
    [0, 0.7, 1],
    [1, 1.03, 1.06]
  )
  const previewLift = useTransform(scrollYProgress, [0, 1], [0, -50])
  const glowOpacity = useTransform(scrollYProgress, [0, 1], [0.4, 0.8])
  const meshFade = useTransform(scrollYProgress, [0, 1], [1, 0.7])
  const spotlightBackground = useTransform(
    [smoothMouseX, smoothMouseY],
    ([x, y]) =>
      `radial-gradient(600px circle at ${x}px ${y}px, rgba(56,189,248,0.08), transparent 40%)`
  )

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

  // Mouse tracking for spotlight
  useEffect(() => {
    if (prefersReducedMotion) return

    const handleMouseMove = (e: MouseEvent) => {
      if (!heroRef.current) return
      const rect = heroRef.current.getBoundingClientRect()
      mouseX.set(e.clientX - rect.left)
      mouseY.set(e.clientY - rect.top)
    }

    window.addEventListener('mousemove', handleMouseMove, { passive: true })
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [prefersReducedMotion, mouseX, mouseY])

  return (
    <section
      ref={heroRef}
      className="relative isolate overflow-hidden bg-[#030712] text-white"
      data-testid="hero"
    >
      {/* Gradient mesh background */}
      <MotionDiv style={{ opacity: meshFade }} className="absolute inset-0">
        <GradientMeshBackground />
      </MotionDiv>

      {/* Mouse-following spotlight */}
      {!prefersReducedMotion && (
        <motion.div
          className="pointer-events-none absolute inset-0"
          style={{
            background: spotlightBackground,
          }}
        />
      )}

      {/* Additional glow overlay */}
      <MotionDiv
        className="pointer-events-none absolute inset-0"
        style={{
          opacity: glowOpacity,
          background:
            'radial-gradient(1200px 580px at 20% 20%, rgba(56,189,248,0.12), transparent 55%), radial-gradient(1200px 720px at 80% 10%, rgba(14,165,233,0.08), transparent 60%)',
        }}
      />

      {/* Bottom gradient fade */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#030712] to-transparent" />

      <div className="relative z-10">
        <div className="container mx-auto max-w-6xl px-6 pt-22 pb-16 sm:pt-24 sm:pb-28 lg:pt-28">
          <div className="grid gap-10 sm:gap-12 lg:grid-cols-[1.05fr,0.95fr] lg:items-center">
            <div className="space-y-5 sm:space-y-8">
              <div className="space-y-4">
                {/* Animated headline with word reveal */}
                <TextReveal
                  text="Find a home that works for everyone."
                  className="text-4xl leading-[1.05] font-black sm:text-5xl md:text-6xl lg:text-7xl"
                  delay={0.3}
                />

                {/* Subtitle with blur-to-sharp animation */}
                <MotionP
                  className="max-w-2xl text-lg leading-relaxed text-white/80 sm:text-xl"
                  initial={{ opacity: 0, y: 12, filter: 'blur(8px)' }}
                  animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                  transition={{
                    duration: 0.6,
                    delay: 0.7,
                    ease: [0.25, 0.46, 0.45, 0.94],
                  }}
                >
                  Swipe through real listings, save the ones your household
                  likes, and keep the search clear instead of stressful.
                </MotionP>
              </div>

              {/* CTAs with spring animation */}
              <MotionDiv
                className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-3"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  type: 'spring',
                  stiffness: 100,
                  damping: 15,
                  delay: 0.9,
                }}
              >
                <Button
                  variant="prime"
                  size="lg"
                  asChild
                  className="group relative w-full overflow-hidden sm:w-auto"
                >
                  <Link
                    href="/signup"
                    aria-label="Start swiping with HomeMatch"
                    data-testid="primary-cta"
                  >
                    <span className="relative z-10 flex items-center gap-2">
                      <Heart className="h-4 w-4 transition-transform duration-300 group-hover:scale-110" />
                      Start swiping
                    </span>
                    {/* Shimmer effect on hover */}
                    <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
                  </Link>
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="w-full border-white/30 bg-white/5 text-white backdrop-blur-sm transition-all duration-300 hover:border-white/50 hover:bg-white/10 hover:!text-white sm:w-auto"
                  asChild
                >
                  <Link href="/login">Resume your search</Link>
                </Button>
              </MotionDiv>
            </div>

            {/* Preview card with enhanced entrance */}
            <MotionDiv
              className="relative"
              initial={{ opacity: 0, scale: 0.9, rotateY: -10 }}
              animate={{ opacity: 1, scale: 1, rotateY: 0 }}
              transition={{
                type: 'spring',
                stiffness: 80,
                damping: 20,
                delay: 1.1,
              }}
              style={{ perspective: 1000 }}
            >
              <MotionDiv
                style={{ scale: previewScale, y: previewLift }}
                className="relative mx-auto w-full max-w-[540px]"
              >
                <MarketingPreviewCard />
              </MotionDiv>
            </MotionDiv>
          </div>
        </div>
      </div>
    </section>
  )
}
