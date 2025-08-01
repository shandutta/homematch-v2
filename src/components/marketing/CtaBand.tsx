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
            <Button
              size="lg"
              className="group relative overflow-hidden px-8 py-6 text-lg font-semibold transition-all duration-300 hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-white/40"
              asChild
            >
              <Link href="/signup" className="relative inline-flex items-center justify-center" aria-label="Start Swiping">
                <span className="relative z-20 drop-shadow-[0_1px_1px_rgba(0,0,0,0.35)]">Start Swiping</span>

                {/* Animated gradient background */}
                <span
                  className="absolute inset-0 z-10 rounded-md"
                  style={{
                    background:
                      'conic-gradient(from 180deg at 50% 50%, #6EE7F9, #7C3AED, #F97316, #10B981, #6EE7F9)',
                    filter: 'saturate(0.9) brightness(0.95)',
                    animation: 'ctaHue 8s linear infinite',
                  }}
                  aria-hidden="true"
                />

                {/* Subtle moving border */}
                <span
                  className="pointer-events-none absolute -inset-[2px] z-[5] rounded-lg"
                  style={{
                    background:
                      'linear-gradient(90deg, rgba(255,255,255,0.35), rgba(255,255,255,0.05) 40%, rgba(255,255,255,0.35))',
                    mask: 'linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)',
                    WebkitMask: 'linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)',
                    WebkitMaskComposite: 'xor',
                    maskComposite: 'exclude',
                    padding: '2px',
                    animation: 'ctaBorder 2.8s linear infinite',
                  }}
                  aria-hidden="true"
                />

                {/* Contrast overlay */}
                <span
                  className="absolute inset-0 z-10 rounded-md"
                  style={{
                    background:
                      'radial-gradient(120% 120% at 50% 50%, rgba(0,0,0,0) 40%, rgba(0,0,0,0.18) 100%)',
                  }}
                  aria-hidden="true"
                />

                <style>{`
                  @media (prefers-reduced-motion: reduce) {
                    a > span[style*='conic-gradient'] {
                      animation: none !important;
                    }
                    a > span[style*='ctaBorder'] {
                      animation: none !important;
                    }
                  }
                  @keyframes ctaHue {
                    0% {
                      filter: saturate(0.9) brightness(0.95) hue-rotate(0deg);
                    }
                    100% {
                      filter: saturate(0.9) brightness(0.95) hue-rotate(360deg);
                    }
                  }
                  @keyframes ctaBorder {
                    0% {
                      transform: translateX(-10%);
                      opacity: 0.65;
                    }
                    50% {
                      transform: translateX(10%);
                      opacity: 0.35;
                    }
                    100% {
                      transform: translateX(-10%);
                      opacity: 0.65;
                    }
                  }
                `}</style>
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
