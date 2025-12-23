'use client'

import { motion } from 'framer-motion'
import { MotionDiv } from '@/components/ui/motion-components'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { GradientMeshBackground } from '@/components/marketing/GradientMeshBackground'

// Word reveal component for staggered text animation
function WordReveal({ text, className }: { text: string; className?: string }) {
  const words = text.split(' ')

  return (
    <motion.h3
      className={className}
      style={{ fontFamily: 'var(--font-heading)' }}
      initial="hidden"
      whileInView="visible"
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
        <motion.span
          key={i}
          className="inline-block"
          variants={{
            hidden: { opacity: 0, y: 15 },
            visible: {
              opacity: 1,
              y: 0,
              transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] },
            },
          }}
        >
          {word}
          {i < words.length - 1 && '\u00A0'}
        </motion.span>
      ))}
    </motion.h3>
  )
}

export function CtaBand() {
  return (
    <section className="relative overflow-hidden py-16 sm:py-20">
      {/* Gradient mesh background (darker variant) */}
      <GradientMeshBackground variant="darker" intensity={0.8} />

      {/* Top gradient fade for smooth transition from previous section */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-gray-50 to-transparent" />

      <div className="relative z-10 container mx-auto px-4">
        <MotionDiv
          className="mx-auto text-center"
          style={{ maxWidth: '56rem' }}
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          {/* Animated headline with word reveal */}
          <WordReveal
            text="Make House-Hunting Your Next Shared Game"
            className="text-3xl font-bold text-white sm:text-4xl"
          />

          <MotionDiv
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <p
              className="mx-auto mt-3 text-white/80 sm:text-lg"
              style={{ maxWidth: '42rem', fontFamily: 'var(--font-body)' }}
            >
              Tasteful swiping. Smart matches. Real progress. Join early access
              and start finding places everyone likes.
            </p>
          </MotionDiv>

          <MotionDiv
            className="mt-6 flex flex-col items-center justify-center gap-3 sm:mt-8 sm:flex-row"
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{
              type: 'spring',
              stiffness: 100,
              damping: 15,
              delay: 0.5,
            }}
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
                aria-label="Start Swiping"
                className="relative inline-flex w-full items-center justify-center sm:w-auto"
                data-cta="dopamine-cta-band"
              >
                {/* Animated gradient background on hover */}
                <span
                  className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-600 via-blue-500 to-sky-500 opacity-0 blur-md transition-all duration-500 group-hover:opacity-90 group-hover:blur-lg"
                  aria-hidden="true"
                />

                {/* Shimmer sweep effect */}
                <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 group-hover:translate-x-full" />

                {/* Button text with enhanced glow */}
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
              className="w-full border-2 border-white/20 bg-white/5 px-8 py-4 text-lg font-medium text-white backdrop-blur-sm transition-all duration-300 hover:border-white/40 hover:bg-white/10 hover:!text-white sm:w-auto sm:py-6"
              asChild
            >
              <Link href="/login">Already a Member?</Link>
            </Button>
          </MotionDiv>
        </MotionDiv>
      </div>
    </section>
  )
}
