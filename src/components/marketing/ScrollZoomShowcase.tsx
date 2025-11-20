'use client'

import { useRef } from 'react'
import { useScroll, useTransform } from 'framer-motion'
import { cn } from '@/lib/utils'
import { MotionDiv, MotionH2, MotionP } from '@/components/ui/motion-components'
import { Badge } from '@/components/ui/badge'
import { Heart, ShieldCheck } from 'lucide-react'
import { MarketingPreviewCard } from './MarketingPreviewCard'

const storyBeats = [
  {
    title: 'Swipe together',
    description: 'Say yes/no in one tap and see it sync across both accounts.',
    accent: 'Shared actions',
  },
  {
    title: 'Stay aligned',
    description: 'Mutual likes and saved tours sit right below the photo.',
    accent: 'One feed',
  },
  {
    title: 'No guesswork',
    description:
      'Price, beds/baths, and pass/love buttons match the dashboard.',
    accent: 'Familiar layout',
  },
]

export function ScrollZoomShowcase({ className }: { className?: string }) {
  const sectionRef = useRef<HTMLDivElement | null>(null)
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start end', 'end start'],
  })

  const scale = useTransform(scrollYProgress, [0, 0.5, 1], [0.99, 1.01, 1.03])
  const lift = useTransform(scrollYProgress, [0, 1], [6, -30])
  const progress = useTransform(scrollYProgress, [0, 1], ['20%', '100%'])

  return (
    <section
      ref={sectionRef}
      className={cn(
        'relative isolate overflow-hidden bg-slate-50 py-20 text-slate-900 sm:py-24 lg:py-28',
        'mt-20 sm:mt-24',
        className
      )}
    >
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(900px_520px_at_12%_15%,rgba(45,182,255,0.12),transparent),radial-gradient(720px_520px_at_88%_10%,rgba(56,189,248,0.14),transparent)]" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(10,37,64,0.04),rgba(255,255,255,0.4))]" />
      </div>

      <div className="container mx-auto px-4">
        <div className="mb-12 flex flex-wrap items-center gap-3 sm:mb-14">
          <Badge className="bg-white text-slate-800 shadow-sm ring-1 ring-slate-200">
            <Heart className="mr-2 h-3.5 w-3.5" />
            Made for couples
          </Badge>
          <Badge variant="outline" className="border-blue-200 text-blue-700">
            Matches your dashboard
          </Badge>
        </div>

        <div className="grid gap-10 lg:grid-cols-[1.1fr,0.9fr] lg:items-start">
          <div className="relative">
            <div className="lg:sticky lg:top-16">
              <MotionDiv
                style={{ scale, y: lift }}
                className="relative mx-auto w-full max-w-[540px]"
              >
                <MarketingPreviewCard />
              </MotionDiv>
            </div>
          </div>

          <div className="space-y-10 lg:pl-4">
            <div className="max-w-xl space-y-4">
              <MotionH2
                className="text-3xl leading-tight font-semibold sm:text-4xl md:text-5xl"
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
              >
                See how your dashboard breathes
              </MotionH2>
              <MotionP
                className="text-lg text-slate-600 sm:text-xl"
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.05 }}
              >
                Watch a real card from your feed—photo, price, beds/baths, and
                actions match what you see on the dashboard.
              </MotionP>
              <div className="h-1.5 w-full rounded-full bg-slate-200/80">
                <MotionDiv
                  style={{ width: progress }}
                  className="h-full origin-left rounded-full bg-gradient-to-r from-blue-500 via-indigo-500 to-sky-400 shadow-[0_0_20px_rgba(56,189,248,0.35)]"
                />
              </div>
            </div>

            <div className="grid gap-4">
              {storyBeats.map((beat) => (
                <MotionDiv
                  key={beat.title}
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.3 }}
                  className="group rounded-3xl border border-slate-200/80 bg-white/80 p-5 shadow-sm shadow-slate-200/80 backdrop-blur transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 rounded-2xl bg-slate-900 p-2 text-white">
                      <ShieldCheck className="h-4 w-4" />
                    </div>
                    <div className="space-y-1.5">
                      <p className="text-sm font-semibold tracking-[0.08em] text-slate-500">
                        {beat.accent}
                      </p>
                      <h3 className="text-lg font-semibold text-slate-900">
                        {beat.title}
                      </h3>
                      <p className="text-sm text-slate-600">
                        {beat.description}
                      </p>
                    </div>
                  </div>
                </MotionDiv>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
