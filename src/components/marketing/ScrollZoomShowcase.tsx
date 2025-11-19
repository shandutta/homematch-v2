'use client'

import { useRef } from 'react'
import { useScroll, useTransform } from 'framer-motion'
import { cn } from '@/lib/utils'
import {
  MotionDiv,
  MotionH2,
  MotionP,
} from '@/components/ui/motion-components'
import { Badge } from '@/components/ui/badge'
import { Sparkles, MapPin, Radar, ShieldCheck, Heart } from 'lucide-react'

const storyBeats = [
  {
    title: 'Zoom in as you scroll',
    description: 'See the listing details pop closer without clicks.',
    accent: 'Smooth motion',
  },
  {
    title: 'Stay oriented',
    description:
      'Text stays pinned so you can read while the visuals move around it.',
    accent: 'Easy to follow',
  },
  {
    title: 'See the neighborhood',
    description:
      'A mini map and quick chips keep location context in view.',
    accent: 'Street-level clarity',
  },
]

export function ScrollZoomShowcase({ className }: { className?: string }) {
  const sectionRef = useRef<HTMLDivElement | null>(null)
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start end', 'end start'],
  })

  const scale = useTransform(scrollYProgress, [0, 0.5, 1], [0.97, 1.05, 1.1])
  const lift = useTransform(scrollYProgress, [0, 1], [30, -120])
  const tilt = useTransform(scrollYProgress, [0, 1], [0, -6])
  const glowOpacity = useTransform(scrollYProgress, [0, 1], [0.3, 0.8])
  const accentDrift = useTransform(scrollYProgress, [0, 1], [0, -60])
  const progress = useTransform(scrollYProgress, [0, 1], ['18%', '100%'])

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
            Scroll to see more
          </Badge>
        </div>

        <div className="grid gap-10 lg:grid-cols-[1.1fr,0.9fr] lg:items-start">
          <div className="relative">
            <div className="lg:sticky lg:top-16">
              <MotionDiv
                style={{ scale, y: lift, rotate: tilt }}
                className="relative mx-auto aspect-[4/5] w-full max-w-[520px] overflow-hidden rounded-[36px] border border-slate-200/70 bg-white/10 shadow-[0_40px_120px_rgba(15,23,42,0.18)] backdrop-blur-xl"
              >
                <MotionDiv
                  style={{ opacity: glowOpacity }}
                  className="absolute inset-0 bg-[radial-gradient(900px_680px_at_50%_20%,rgba(56,189,248,0.14),transparent),radial-gradient(600px_540px_at_30%_60%,rgba(79,70,229,0.16),transparent)]"
                />

                <div className="absolute inset-0 bg-gradient-to-br from-white/70 via-white/20 to-white/0" />
                <div className="absolute inset-[1px] rounded-[32px] border border-white/40" />

                <div className="relative z-10 h-full p-6 sm:p-7">
                  <div className="flex items-center justify-between rounded-2xl border border-slate-100/70 bg-white/70 px-4 py-3 shadow-lg shadow-slate-300/30 backdrop-blur">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                        Live preview
                      </p>
                      <p className="text-lg font-semibold text-slate-900">
                        See more as you scroll
                      </p>
                    </div>
                    <Badge className="bg-emerald-100 text-emerald-700">
                      <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                      Moves with you
                    </Badge>
                  </div>

                  <div className="mt-5 rounded-3xl border border-slate-100/70 bg-white/80 p-4 shadow-xl shadow-slate-400/20 backdrop-blur">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                          Listing · San Francisco
                        </p>
                        <p className="text-xl font-semibold text-slate-900">
                          Pacific Heights brownstone
                        </p>
                        <p className="text-sm text-slate-500">
                          $2,450,000 · 4 bed · 3.5 bath
                        </p>
                      </div>
                      <div className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white shadow-sm">
                        Mutual like
                      </div>
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-3">
                      {[
                        { label: 'Match score', value: '97%' },
                        { label: 'Commute', value: '18 min' },
                        { label: 'Walkable', value: '92' },
                      ].map((item) => (
                        <div
                          key={item.label}
                          className="rounded-2xl border border-slate-100 bg-white/90 px-3 py-3 text-sm font-semibold text-slate-900 shadow-sm"
                        >
                          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                            {item.label}
                          </p>
                          <p className="text-lg">{item.value}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <div className="rounded-3xl border border-slate-100/80 bg-white/80 p-4 shadow-lg shadow-slate-400/20 backdrop-blur">
                      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                        <MapPin className="h-3.5 w-3.5 text-sky-500" />
                        Neighborhood micro-map
                      </div>
                      <div className="mt-3 h-32 rounded-2xl bg-gradient-to-br from-sky-100 via-white to-indigo-50 ring-1 ring-slate-100">
                        <div className="relative h-full w-full overflow-hidden rounded-2xl">
                          <div className="absolute inset-6 rounded-full bg-gradient-to-br from-sky-500/20 via-white to-indigo-500/10 blur-3xl" />
                          <div className="absolute inset-[10px] rounded-2xl border border-dashed border-slate-200/80" />
                          <div className="absolute left-6 top-6 h-3 w-3 rounded-full bg-emerald-400 shadow-[0_0_0_6px_rgba(16,185,129,0.25)]" />
                          <div className="absolute right-8 bottom-8 h-3 w-3 rounded-full bg-sky-500 shadow-[0_0_0_6px_rgba(56,189,248,0.25)]" />
                          <div className="absolute inset-x-6 top-1/2 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
                        </div>
                      </div>
                    </div>

                    <MotionDiv
                      style={{ y: accentDrift }}
                      className="rounded-3xl border border-indigo-100/70 bg-gradient-to-br from-indigo-600 via-blue-500 to-sky-400 p-4 text-white shadow-xl shadow-indigo-400/30 backdrop-blur"
                    >
                      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-white/70">
                        <Radar className="h-4 w-4" />
                        Stay in sync
                      </div>
                      <p className="mt-2 text-lg font-semibold leading-tight">
                        Likes and saves stay synced for both of you.
                      </p>
                      <p className="mt-1 text-sm text-white/85">
                        Keep one shared view of the homes you love—no copy-paste
                        texts required.
                      </p>
                    </MotionDiv>
                  </div>
                </div>
              </MotionDiv>
            </div>
          </div>

          <div className="space-y-10 lg:pl-4">
            <div className="max-w-xl space-y-4">
              <MotionH2
                className="text-3xl font-semibold leading-tight sm:text-4xl md:text-5xl"
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
              >
                See more with every scroll
              </MotionH2>
              <MotionP
                className="text-lg text-slate-600 sm:text-xl"
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.05 }}
              >
                Listings, maps, and quick facts glide together so you can stay
                focused on how each place feels.
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
                  className="group rounded-3xl border border-slate-200/80 bg-white/80 p-5 shadow-sm shadow-slate-200/80 backdrop-blur hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md transition"
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
