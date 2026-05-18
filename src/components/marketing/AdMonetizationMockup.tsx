'use client'

import { Card } from '@/components/ui/card'
import { MotionDiv } from '@/components/ui/motion-components'
import { LayoutDashboard, Monitor, Smartphone } from 'lucide-react'

type AdPreview = 'leaderboard' | 'inline' | 'sticky'

const adConcepts: Array<{
  title: string
  badge: string
  description: string
  placement: string
  preview: AdPreview
  icon: typeof Monitor
}> = [
  {
    title: 'Featured brand banner',
    badge: 'Subtle header banner',
    description:
      'Single partner note below the hero or saved searches—clearly labeled and easy to skip.',
    placement: 'Shows under the hero or saved searches when relevant.',
    preview: 'leaderboard',
    icon: Monitor,
  },
  {
    title: 'Sponsored pick in the feed',
    badge: 'Matches property cards',
    description:
      'One sponsored tile between listings so the grid still feels natural and scannable.',
    placement: 'Appears every few cards in recommendations or results.',
    preview: 'inline',
    icon: LayoutDashboard,
  },
  {
    title: 'Mobile sticky offer',
    badge: 'Small, dismissible strip',
    description:
      'Light anchor with a “Sponsored” pill you can swipe away. No pop-ups, no sound.',
    placement: 'Slides in after a short scroll on mobile search.',
    preview: 'sticky',
    icon: Smartphone,
  },
]

function renderPreview(preview: AdPreview) {
  if (preview === 'leaderboard') {
    return (
      <div className="w-full rounded-xl border border-hm-border bg-gradient-to-r from-hm-canvas via-hm-surface to-hm-canvas p-4 shadow-[0_12px_28px_-18px_rgba(43,30,18,0.3)]">
        <div className="flex items-center justify-between text-[11px] font-semibold tracking-[0.12em] text-hm-accent-strong uppercase">
          <span>Header slot</span>
          <span className="rounded-full bg-hm-accent/15 px-2 py-0.5 text-[10px] text-hm-accent-strong">
            Sponsored
          </span>
        </div>
        <div className="mt-3 flex items-center justify-between rounded-lg border border-hm-border bg-hm-surface/85 px-4 py-3 text-hm-ink-soft backdrop-blur">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-hm-accent/15 text-hm-accent-strong">
              Ad
            </div>
            <div>
              <p className="text-sm font-semibold">Partner headline + CTA</p>
              <p className="text-xs text-hm-faint">Sits under hero/search</p>
            </div>
          </div>
          <span className="rounded-full bg-hm-accent/90 px-3 py-1 text-xs font-semibold text-white">
            Calm
          </span>
        </div>
      </div>
    )
  }

  if (preview === 'inline') {
    return (
      <div className="w-full rounded-xl border border-amber-100 bg-gradient-to-r from-amber-50 via-white to-amber-50 p-4 shadow-[0_10px_24px_-18px_rgba(217,119,6,0.35)]">
        <div className="flex items-center justify-between text-[11px] font-semibold tracking-[0.12em] text-amber-900 uppercase">
          <span>Between cards</span>
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] text-amber-900">
            Sponsored
          </span>
        </div>
        <div className="mt-3 grid grid-cols-[2fr,1fr] gap-2 rounded-lg border border-amber-200 bg-white/90 p-3">
          <div className="h-16 rounded-md bg-amber-50" />
          <div className="h-16 rounded-md bg-amber-100" />
        </div>
        <p className="mt-2 text-xs font-semibold tracking-[0.12em] text-amber-800 uppercase">
          Matches listing tiles
        </p>
      </div>
    )
  }

  return (
    <div className="w-full rounded-xl border border-emerald-100 bg-gradient-to-b from-emerald-50 via-white to-emerald-50 p-4 shadow-[0_10px_24px_-18px_rgba(16,185,129,0.35)]">
      <div className="flex items-center justify-between text-[11px] font-semibold tracking-[0.12em] text-emerald-900 uppercase">
        <span>Mobile anchor</span>
        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] text-emerald-900">
          Dismissible
        </span>
      </div>
      <div className="mt-3 space-y-3 rounded-lg border border-emerald-200 bg-white/90 p-3 text-emerald-900">
        <div className="flex items-center gap-2 text-xs font-semibold tracking-[0.12em] uppercase">
          Appears after scroll
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3 text-sm font-semibold text-emerald-800">
          Swipe away anytime
        </div>
      </div>
    </div>
  )
}

export function AdMonetizationMockup() {
  return (
    <section className="relative overflow-hidden py-8 sm:py-10">
      <div
        className="pointer-events-none absolute inset-0 -z-10"
        aria-hidden
        style={{
          background:
            'radial-gradient(1200px 600px at 50% -10%, rgba(43,30,18,0.05) 0%, rgba(43,30,18,0.02) 35%, rgba(255,255,255,1) 65%)',
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 -z-10 opacity-20"
        aria-hidden
        style={{
          backgroundImage:
            'repeating-linear-gradient(0deg, rgba(43,30,18,0.05) 0px, rgba(43,30,18,0.05) 1px, transparent 1px, transparent 28px), repeating-linear-gradient(90deg, rgba(43,30,18,0.05) 0px, rgba(43,30,18,0.05) 1px, transparent 1px, transparent 28px)',
          backgroundSize: '28px 28px',
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.06]"
        aria-hidden
        style={{
          backgroundImage:
            'radial-gradient(600px 300px at 80% 0%, rgba(183,121,31,0.12) 0%, rgba(183,121,31,0) 60%), radial-gradient(700px 320px at 15% 0%, rgba(111,72,18,0.10) 0%, rgba(111,72,18,0) 60%)',
        }}
      />

      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
        <MotionDiv
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-3xl"
        >
          <p
            className="text-sm font-semibold tracking-[0.2em] text-hm-accent uppercase"
            style={{ fontFamily: 'var(--font-mono)' }}
          >
            Sponsored moments
          </p>
          <h2
            className="mt-2 text-3xl font-bold text-hm-ink sm:text-4xl md:text-5xl"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            How ads appear without killing the vibe
          </h2>
          <p
            className="mt-4 text-lg text-hm-muted sm:text-xl"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            Light, clearly labeled sponsor spots from relevant home partners so
            HomeMatch stays free for households.
          </p>
        </MotionDiv>

        <div className="mt-8 grid gap-5 lg:grid-cols-3">
          {adConcepts.map((concept, index) => {
            const Icon = concept.icon

            return (
              <MotionDiv
                key={concept.title}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.08 }}
              >
                <Card className="group flex h-full flex-col rounded-2xl border border-hm-border bg-hm-surface shadow-md transition-all duration-200 hover:-translate-y-1 hover:shadow-lg">
                  <div className="flex min-h-[190px] flex-col gap-3">
                    <div className="grid grid-cols-[auto,1fr] items-start gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-hm-canvas text-hm-accent-strong ring-1 ring-hm-border">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="leading-tight">
                        <h3
                          className="text-xl font-semibold text-hm-ink"
                          style={{ fontFamily: 'var(--font-heading)' }}
                        >
                          {concept.title}
                        </h3>
                        <p className="text-sm text-hm-faint">
                          {concept.placement}
                        </p>
                      </div>
                    </div>

                    <p
                      className="text-[15px] leading-relaxed text-hm-muted"
                      style={{ fontFamily: 'var(--font-body)' }}
                    >
                      {concept.description}
                    </p>
                  </div>

                  <div className="mt-3 flex h-[38px] w-full items-center justify-center rounded-full bg-hm-canvas/85 px-3 text-sm font-semibold text-hm-ink-soft shadow-inner">
                    {concept.badge}
                  </div>

                  <div className="mt-3 w-full">
                    {renderPreview(concept.preview)}
                  </div>
                </Card>
              </MotionDiv>
            )
          })}
        </div>
      </div>
    </section>
  )
}
