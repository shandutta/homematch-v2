'use client'

import { useRef } from 'react'
import Link from 'next/link'
import { useScroll, useTransform } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { MotionDiv, MotionH1, MotionP } from '@/components/ui/motion-components'
import { ParallaxStarsCanvas } from './ParallaxStarsCanvas'
import { ShieldCheck, MapPin, Zap, Heart } from 'lucide-react'
import { MarketingPreviewCard } from './MarketingPreviewCard'

export function HeroSection() {
  const heroRef = useRef<HTMLDivElement | null>(null)
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
  const starFade = useTransform(scrollYProgress, [0, 1], [1, 0.45])
  const floatingY = useTransform(scrollYProgress, [0, 1], [0, -30])

  return (
    <section
      ref={heroRef}
      className="relative isolate overflow-hidden bg-[#030712] text-white"
      data-testid="hero"
    >
      <div className="pointer-events-none absolute inset-0">
        <MotionDiv style={{ opacity: starFade }} className="absolute inset-0">
          <ParallaxStarsCanvas className="absolute inset-0" />
        </MotionDiv>
        <MotionDiv
          className="absolute inset-0"
          style={{
            opacity: glowOpacity,
            background:
              'radial-gradient(1200px 580px at 20% 20%, rgba(56,189,248,0.20), transparent 55%), radial-gradient(1200px 720px at 80% 10%, rgba(14,165,233,0.14), transparent 60%)',
          }}
        />
        <div className="absolute inset-x-0 top-32 h-48 bg-gradient-to-b from-white/10 via-transparent to-transparent blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(255,255,255,0.08),rgba(255,255,255,0)_40%)]" />
      </div>

      <div className="relative z-10">
        <div className="container mx-auto max-w-6xl px-4 pt-20 pb-24 sm:pt-24 sm:pb-28 lg:pt-28">
          <div className="grid gap-10 sm:gap-12 lg:grid-cols-[1.05fr,0.95fr] lg:items-center">
            <div className="space-y-6 sm:space-y-8">
              <div className="space-y-4">
                <MotionH1
                  className="text-4xl leading-[1.05] font-black sm:text-5xl md:text-6xl lg:text-7xl"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, ease: 'easeOut' }}
                >
                  Find the home you both love.
                </MotionH1>
                <MotionP
                  className="max-w-2xl text-lg leading-relaxed text-white/80 sm:text-xl"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.08, ease: 'easeOut' }}
                >
                  Swipe through real listings together, save the ones you both
                  like, and keep the search fun instead of stressful.
                </MotionP>
              </div>

              <MotionDiv
                className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-3"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.14, ease: 'easeOut' }}
              >
                <Button
                  variant="prime"
                  size="lg"
                  asChild
                  className="group relative w-full overflow-hidden sm:w-auto"
                >
                  <Link
                    href="/signup"
                    aria-label="Start matching with HomeMatch"
                    data-testid="primary-cta"
                  >
                    <span className="relative z-10 flex items-center gap-2">
                      <Heart className="h-4 w-4" />
                      Start matching
                    </span>
                    <span className="absolute inset-0 bg-gradient-to-r from-sky-500 via-blue-500 to-indigo-500 opacity-0 transition duration-300 group-hover:opacity-30" />
                  </Link>
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="border-white/30 bg-white/5 text-white hover:border-white/60 hover:bg-white/10 sm:w-auto"
                  asChild
                >
                  <Link href="/login">Resume your search</Link>
                </Button>
              </MotionDiv>

              <MotionDiv
                className="grid gap-3 sm:grid-cols-2"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2, ease: 'easeOut' }}
              >
                {[
                  { icon: ShieldCheck, text: 'Built for couples & households' },
                  {
                    icon: MapPin,
                    text: 'See nearby spots without leaving the page',
                  },
                  { icon: Zap, text: 'Real listings with quick swipes' },
                  { icon: Heart, text: 'Favorites sync across your devices' },
                ].map(({ icon: Icon, text }) => (
                  <div
                    key={text}
                    className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white/85 backdrop-blur-sm"
                  >
                    <Icon className="h-4 w-4 text-sky-300" />
                    <span>{text}</span>
                  </div>
                ))}
              </MotionDiv>
            </div>

            <div className="relative">
              <MotionDiv
                style={{ scale: previewScale, y: previewLift }}
                className="relative mx-auto aspect-[4/5] w-full max-w-[520px] overflow-hidden"
              >
                <div className="relative z-10 h-full rounded-[28px] border border-white/10 bg-white/90 p-3 shadow-[0_30px_70px_rgba(0,0,0,0.25)]">
                  <MarketingPreviewCard />
                </div>

                <MotionDiv
                  style={{ y: floatingY }}
                  className="absolute top-10 -left-12 hidden max-w-[220px] rounded-3xl border border-white/20 bg-white/10 p-4 text-sm text-white/80 shadow-xl shadow-blue-500/20 backdrop-blur lg:block"
                >
                  <div className="flex items-center gap-2 text-xs font-semibold tracking-[0.14em] text-white/60 uppercase">
                    <Zap className="h-3.5 w-3.5" />
                    Smooth scroll
                  </div>
                  <p className="mt-2 text-sm leading-relaxed">
                    Gradual lift as you browse—calm, not flashy.
                  </p>
                </MotionDiv>
              </MotionDiv>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
