'use client'

import { motion, useScroll, useTransform } from 'framer-motion'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { PhoneMockup } from './PhoneMockup'
import { ParallaxStars } from './ParallaxStars'

export function HeroSection() {
  const { scrollY } = useScroll()
  const y = useTransform(scrollY, [0, 500], [0, 150])
  const opacity = useTransform(scrollY, [0, 300], [1, 0])

  return (
    <section
      className="relative min-h-screen overflow-hidden"
      data-testid="hero"
    >
      {/* Deep Blue Gradient Background */}
      <div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(135deg, #021A44 0%, #063A9E 100%)',
        }}
      />

      {/* Motion Blur Overlay */}
      <motion.div
        className="absolute inset-0"
        style={{
          y,
          background:
            'radial-gradient(ellipse at center, transparent 0%, rgba(2, 26, 68, 0.4) 100%)',
        }}
      />

      {/* Parallax Stars */}
      <ParallaxStars />

      {/* Content Container */}
      <div className="relative z-10 flex min-h-screen items-center">
        <div className="container mx-auto px-4 py-20">
          <motion.div
            className="grid gap-12 lg:grid-cols-2 lg:items-center"
            style={{ opacity }}
          >
            {/* Text Content */}
            <div className="max-w-2xl">
              <motion.h1
                className="text-4xl leading-tight font-black text-white sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl"
                style={{ fontFamily: 'var(--font-heading)' }}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
              >
                Swipe.
                <br />
                Match.
                <br />
                Move In.
              </motion.h1>

              <motion.p
                className="mt-4 text-lg leading-relaxed text-white/80 sm:mt-6 sm:text-xl md:text-2xl"
                style={{ fontFamily: 'var(--font-body)' }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.2, ease: 'easeOut' }}
              >
                House hunting just became your favorite couples activity. Find
                your perfect home together with AI that learns what you both
                love.
              </motion.p>

              <motion.div
                className="mt-10 flex flex-col gap-4 sm:flex-row"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.4, ease: 'easeOut' }}
              >
                <Button
                  size="lg"
                  className="hero-cta-primary group relative overflow-hidden px-8 py-6 text-lg font-semibold transition-all duration-300 hover:scale-105"
                  asChild
                >
                  <Link href="/signup">
                    <span className="relative z-10">Start Swiping Free</span>
                    <motion.div
                      className="absolute inset-0 bg-white"
                      initial={{ scale: 0, opacity: 0 }}
                      whileHover={{ scale: 2, opacity: 0.1 }}
                      transition={{ duration: 0.6 }}
                    />
                  </Link>
                </Button>

                <Button
                  size="lg"
                  variant="outline"
                  className="border-2 border-white/20 bg-white/5 px-8 py-6 text-lg font-medium text-white backdrop-blur transition-all duration-300 hover:border-white/40 hover:bg-white/10"
                  asChild
                >
                  <Link href="/login">Already a Member?</Link>
                </Button>
              </motion.div>
            </div>

            {/* Phone Mockup */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1, delay: 0.2, ease: 'easeOut' }}
            >
              <PhoneMockup />
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
