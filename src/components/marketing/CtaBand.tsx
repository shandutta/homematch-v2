'use client'

import { m, useReducedMotion } from 'framer-motion'
import { MotionDiv } from '@/components/ui/motion-components'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

// Word reveal component for staggered text animation
function WordReveal({ text, className }: { text: string; className?: string }) {
  const shouldReduceMotion = useReducedMotion()
  const words = text.split(' ')

  return (
    <m.h2
      className={className}
      style={{ fontFamily: 'var(--font-heading)' }}
      initial={shouldReduceMotion ? false : 'hidden'}
      whileInView={shouldReduceMotion ? undefined : 'visible'}
      viewport={{ once: true }}
      variants={{
        hidden: {},
        visible: {
          transition: {
            staggerChildren: 0.06,
          },
        },
      }}
    >
      {words.map((word, i) => (
        <m.span
          key={i}
          className="inline-block"
          variants={{
            hidden: shouldReduceMotion
              ? { opacity: 1, y: 0 }
              : { opacity: 0, y: 15 },
            visible: {
              opacity: 1,
              y: 0,
              transition: shouldReduceMotion
                ? { duration: 0 }
                : { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] },
            },
          }}
        >
          {word}
          {i < words.length - 1 && '\u00A0'}
        </m.span>
      ))}
    </m.h2>
  )
}

export function CtaBand() {
  const shouldReduceMotion = useReducedMotion()

  return (
    <section className="bg-hm-ivory-100 text-hm-stone-900 relative overflow-hidden py-16 sm:py-20">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(900px_420px_at_50%_0%,rgba(194,129,65,0.16),transparent_65%)]" />
      <div className="from-hm-ivory-50 pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b to-transparent" />

      <div className="relative z-10 container mx-auto px-4">
        <MotionDiv
          className="mx-auto text-center"
          style={{ maxWidth: '56rem' }}
          initial={shouldReduceMotion ? false : { opacity: 0 }}
          whileInView={shouldReduceMotion ? undefined : { opacity: 1 }}
          viewport={{ once: true }}
          transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.5 }}
        >
          {/* Animated headline with word reveal */}
          <WordReveal
            text="Bring your partner into the search."
            className="text-hm-stone-900 text-3xl font-semibold tracking-[-0.03em] sm:text-4xl"
          />

          <MotionDiv
            initial={shouldReduceMotion ? false : { opacity: 0, y: 12 }}
            whileInView={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={
              shouldReduceMotion
                ? { duration: 0 }
                : { duration: 0.5, delay: 0.3 }
            }
          >
            <p
              className="text-hm-stone-600 mx-auto mt-3 sm:text-lg"
              style={{ maxWidth: '42rem', fontFamily: 'var(--font-body)' }}
            >
              Create your household, invite the people deciding with you, and
              stop relaying screenshots over text.
            </p>
          </MotionDiv>

          <MotionDiv
            className="mt-6 flex flex-col items-center justify-center gap-3 sm:mt-8 sm:flex-row"
            initial={shouldReduceMotion ? false : { opacity: 0, y: 16 }}
            whileInView={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={
              shouldReduceMotion
                ? { duration: 0 }
                : {
                    type: 'spring',
                    stiffness: 100,
                    damping: 15,
                    delay: 0.5,
                  }
            }
          >
            {/* Primary CTA with shimmer effect */}
            <Button
              variant="prime"
              size="lg"
              asChild
              className="group relative w-full overflow-hidden px-4 py-3 sm:w-auto sm:px-8 sm:py-4"
            >
              <Link
                href="/signup"
                aria-label="Invite your partner"
                className="relative inline-flex w-full items-center justify-center sm:w-auto"
                data-cta="dopamine-cta-band"
              >
                {/* Animated gradient background on hover */}
                <span
                  className="from-hm-amber-400 via-hm-amber-500 to-hm-stone-300 absolute inset-0 rounded-full bg-gradient-to-r opacity-0 blur-md transition-all duration-500 group-hover:opacity-60 group-hover:blur-lg"
                  aria-hidden="true"
                />

                {/* Shimmer sweep effect */}
                <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 group-hover:translate-x-full" />

                {/* Button text with enhanced glow */}
                <span className="relative z-10 transition-all duration-300 group-hover:scale-105">
                  Invite your partner
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
              variant="ghost"
              className="text-hm-stone-600 hover:text-hm-stone-900 w-full bg-transparent text-base font-medium transition-colors duration-200 hover:bg-white/60 sm:w-auto"
              asChild
            >
              <Link href="/login">Sign in</Link>
            </Button>
          </MotionDiv>
        </MotionDiv>
      </div>
    </section>
  )
}
