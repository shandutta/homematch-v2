'use client'

import { motion } from 'framer-motion'
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
      <div
        className="pointer-events-none absolute inset-0 -z-10"
        aria-hidden
      >
        <ParallaxStarsCanvas className="absolute inset-0 opacity-80" />
      </div>

      <div className="relative z-10 container mx-auto px-4">
        <motion.div
          className="mx-auto max-w-4xl text-center"
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
            className="mx-auto mt-3 max-w-2xl text-white/80 sm:text-lg"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            Tasteful swiping. Smart matches. Real progress. Join early access
            and start finding places you both love.
          </p>

          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            {/* Bottom CTA uses the reusable prime variant (brand blue ring, dark fill) */}
            <Button variant="prime" size="xl" asChild>
              <Link
                href="/signup"
                aria-label="Start Swiping"
                className="relative inline-flex items-center justify-center"
              >
                <span className="relative z-10 drop-shadow-[0_1px_1px_rgba(0,0,0,0.35)]">
                  Start Swiping
                </span>
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
        </motion.div>
      </div>
    </section>
  )
}
