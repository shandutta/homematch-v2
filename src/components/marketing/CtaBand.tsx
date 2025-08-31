'use client'

import { MotionDiv } from '@/components/ui/motion-components'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ParallaxStarsCanvas } from '@/components/marketing/ParallaxStarsCanvas'

export function CtaBand() {
  return (
    <section className="relative overflow-hidden py-16 sm:py-20">
      {/* Hero-style deep navy gradient + parallax stars */}
      <div
        className="pointer-events-none absolute inset-0 -z-20"
        aria-hidden
        style={{
          background:
            'linear-gradient(180deg, #0B132B 0%, #0E1633 45%, #0B132B 100%)',
        }}
      />
      <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden>
        <ParallaxStarsCanvas className="absolute inset-0 opacity-80" />
      </div>

      <div className="relative z-10 container mx-auto px-4">
        <MotionDiv
          className="mx-auto text-center"
          style={{ maxWidth: '56rem' }}
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.45 }}
        >
          <h3
            className="text-3xl font-bold text-white sm:text-4xl"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            Make House‑Hunting Your Next Couples Game
          </h3>
          <p
            className="mx-auto mt-3 text-white/80 sm:text-lg"
            style={{ maxWidth: '42rem', fontFamily: 'var(--font-body)' }}
          >
            Tasteful swiping. Smart matches. Real progress. Join early access
            and start finding places you both love.
          </p>

          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            {/* Match hero primary CTA behavior: white text, scale + background shift on hover */}
            <Button
              variant="prime"
              size="lg"
              asChild
              className="group relative overflow-visible px-4 py-3 sm:px-8 sm:py-4"
            >
              <Link
                href="/signup"
                aria-label="Start Swiping"
                className="relative inline-flex w-full items-center justify-center sm:w-auto"
                data-cta="dopamine-cta-band"
              >
                {/* Animated gradient background on hover */}
                <span
                  className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-600 via-blue-500 to-sky-500 opacity-0 blur-md transition-all duration-500 group-hover:opacity-90 group-hover:blur-lg"
                  aria-hidden="true"
                />

                {/* Button text with enhanced glow (white by prime variant) */}
                <span className="relative z-10 transition-all duration-300 group-hover:scale-105 group-hover:drop-shadow-[0_0_20px_rgba(147,197,253,0.8)]">
                  Start Swiping
                </span>

                {/* Subtle pulse ring on hover */}
                <span
                  className="absolute inset-0 rounded-full ring-1 ring-white/0 transition-all duration-500 group-hover:ring-white/15 group-hover:ring-offset-2 group-hover:ring-offset-transparent"
                  aria-hidden="true"
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
          </div>
        </MotionDiv>
      </div>
    </section>
  )
}
