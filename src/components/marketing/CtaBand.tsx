'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export function CtaBand() {
  return (
    <section className="relative overflow-hidden py-16 sm:py-20">
      {/* Background */}
      <div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(135deg, #021A44 0%, #063A9E 100%)',
        }}
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-70"
        style={{
          background:
            'radial-gradient(120% 120% at 80% -20%, rgba(56,189,248,0.12), transparent 60%), radial-gradient(120% 120% at 10% 120%, rgba(59,130,246,0.12), transparent 60%)',
        }}
        aria-hidden="true"
      />

      <div className="container relative z-10 mx-auto px-4">
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
            Tasteful swiping. Smart matches. Real progress. Join early access and
            start finding places you both love.
          </p>

          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            {/* Bottom CTA uses the reusable prime variant (brand blue ring, dark fill) */}
            <Button variant="prime" size="xl" asChild>
              <Link href="/signup" aria-label="Start Swiping" className="relative inline-flex items-center justify-center">
                <span className="relative z-10 drop-shadow-[0_1px_1px_rgba(0,0,0,0.35)]">Start Swiping</span>
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
