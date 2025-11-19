'use client'

import { Card } from '@/components/ui/card'
import { MotionDiv } from '@/components/ui/motion-components'
import { LayoutDashboard, Monitor, Smartphone } from 'lucide-react'

type AdPreview = 'leaderboard' | 'inline' | 'sticky'

const adConcepts = [
  {
    title: 'Featured brand banner',
    badge: 'Subtle header banner',
    description:
      'Occasional partner message from movers, lenders, or decor brands. Clearly labeled and easy to ignore.',
    placement: 'Shows under the hero or saved searches when relevant.',
    preview: 'leaderboard' as AdPreview,
    icon: Monitor,
  },
  {
    title: 'Sponsored pick in the feed',
    badge: 'Matches property cards',
    description:
      'A single sponsored tile between listings so the grid still feels natural and scannable.',
    placement: 'Appears every few cards in recommendations or results.',
    preview: 'inline' as AdPreview,
    icon: LayoutDashboard,
  },
  {
    title: 'Mobile sticky offer',
    badge: 'Small, dismissible strip',
    description:
      'Light anchor with a “Sponsored” pill that you can swipe away. No pop-ups, no sound.',
    placement: 'Slides in after a short scroll on mobile search.',
    preview: 'sticky' as AdPreview,
    icon: Smartphone,
  },
]

function renderPreview(preview: AdPreview) {
  if (preview === 'leaderboard') {
    return (
      <div className="mt-4 rounded-xl border border-sky-200/80 bg-gradient-to-r from-sky-50 via-white to-indigo-50 p-4 shadow-[0_18px_45px_-25px_rgba(6,58,158,0.45)]">
        <div className="flex items-center justify-between text-[11px] font-semibold tracking-[0.18em] text-sky-700 uppercase">
          <span>Sponsored partner (mock)</span>
          <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[10px] text-sky-800">
            Blends with header
          </span>
        </div>
        <div className="mt-3 flex items-center justify-between rounded-lg border border-dashed border-sky-300 bg-white/70 px-4 py-3 text-gray-800 backdrop-blur">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-100 text-sky-800">
              Ad
            </div>
            <div>
              <p className="text-sm font-semibold">Partner message + CTA</p>
              <p className="text-xs text-gray-500">Sits below the main CTA</p>
            </div>
          </div>
          <span className="rounded-full bg-sky-600 px-3 py-1 text-xs font-semibold text-white">
            Sponsored
          </span>
        </div>
      </div>
    )
  }

  if (preview === 'inline') {
    return (
      <div className="mt-4 space-y-3">
        <div className="rounded-lg bg-slate-100 p-3 text-xs text-slate-500">
          Property card
        </div>
        <div className="rounded-xl border border-dashed border-amber-300 bg-gradient-to-r from-amber-50 via-white to-amber-50 p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs font-semibold text-amber-900">
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] tracking-wide text-amber-900 uppercase">
              Sponsored
            </span>
            <span className="text-[11px] text-amber-700">Responsive</span>
          </div>
          <div className="mt-3 rounded-lg border border-amber-200 bg-white/80 p-3">
            <div className="h-3 w-24 rounded-full bg-amber-200" />
            <div className="mt-2 grid grid-cols-[2fr,1fr] gap-2">
              <div className="h-16 rounded-md bg-amber-50" />
              <div className="h-16 rounded-md bg-amber-100" />
            </div>
          </div>
        </div>
        <div className="rounded-lg bg-slate-100 p-3 text-xs text-slate-500">
          Property card
        </div>
      </div>
    )
  }

  return (
    <div className="mt-4 flex justify-center">
      <div className="relative w-[220px] rounded-[28px] border border-gray-200 bg-white/90 p-3 shadow-[0_20px_55px_-35px_rgba(0,0,0,0.45)]">
        <div className="h-28 rounded-2xl bg-gradient-to-b from-slate-100 via-white to-slate-50" />
        <div className="absolute inset-x-3 bottom-3 rounded-xl border border-dashed border-emerald-300 bg-emerald-50/80 p-3 shadow-sm">
          <div className="flex items-center justify-between text-xs font-semibold text-emerald-900">
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] tracking-wide uppercase">
              Sponsored
            </span>
            <span className="text-[11px] text-emerald-700">Dismissible</span>
          </div>
          <div className="mt-2 h-8 rounded-lg bg-emerald-100/80" />
        </div>
        <div className="absolute top-3 right-3 left-3 h-[14px] rounded-full bg-gray-100" />
      </div>
    </div>
  )
}

export function AdMonetizationMockup() {
  return (
    <section className="relative overflow-hidden py-16 sm:py-20">
      <div
        className="pointer-events-none absolute inset-0 -z-10"
        aria-hidden
        style={{
          background:
            'radial-gradient(1200px 600px at 50% -10%, rgba(2,26,68,0.05) 0%, rgba(2,26,68,0.02) 35%, rgba(255,255,255,1) 65%)',
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 -z-10 opacity-20"
        aria-hidden
        style={{
          backgroundImage:
            'repeating-linear-gradient(0deg, rgba(2,26,68,0.05) 0px, rgba(2,26,68,0.05) 1px, transparent 1px, transparent 28px), repeating-linear-gradient(90deg, rgba(2,26,68,0.05) 0px, rgba(2,26,68,0.05) 1px, transparent 1px, transparent 28px)',
          backgroundSize: '28px 28px',
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.06]"
        aria-hidden
        style={{
          backgroundImage:
            'radial-gradient(600px 300px at 80% 0%, rgba(41,227,255,0.12) 0%, rgba(41,227,255,0) 60%), radial-gradient(700px 320px at 15% 0%, rgba(6,58,158,0.10) 0%, rgba(6,58,158,0) 60%)',
        }}
      />

      <div className="container mx-auto px-4">
        <MotionDiv
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-3xl"
        >
          <p
            className="text-sm font-semibold tracking-[0.2em] text-sky-700 uppercase"
            style={{ fontFamily: 'var(--font-mono)' }}
          >
            Sponsored moments
          </p>
          <h2
            className="mt-2 text-3xl font-bold text-gray-900 sm:text-4xl md:text-5xl"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            How ads appear without killing the vibe
          </h2>
          <p
            className="mt-4 text-lg text-gray-600 sm:text-xl"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            Light, clearly labeled sponsor spots from relevant home partners so
            HomeMatch stays free for couples.
          </p>
        </MotionDiv>

        <div className="mt-10 grid gap-6 lg:grid-cols-3">
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
                <Card className="shadow-token-md h-full border-gray-200 bg-white/90 backdrop-blur">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-50 text-sky-800">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <h3
                          className="text-lg font-semibold text-gray-900"
                          style={{ fontFamily: 'var(--font-heading)' }}
                        >
                          {concept.title}
                        </h3>
                        <p className="text-xs tracking-[0.18em] text-gray-500 uppercase">
                          {concept.placement}
                        </p>
                      </div>
                    </div>
                    <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
                      {concept.badge}
                    </span>
                  </div>
                  <p
                    className="mt-3 text-sm text-gray-600"
                    style={{ fontFamily: 'var(--font-body)' }}
                  >
                    {concept.description}
                  </p>

                  {renderPreview(concept.preview)}
                </Card>
              </MotionDiv>
            )
          })}
        </div>

        <MotionDiv
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.12 }}
          className="mt-10"
        >
          <Card className="shadow-token-md border-gray-200 bg-white/90 backdrop-blur">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm font-semibold tracking-[0.16em] text-gray-700">
                  Respectful by design
                </p>
                <p className="text-sm text-gray-600">
                  Always marked as sponsored, low frequency, and only from
                  brands that help you move, finance, or furnish your place.
                </p>
              </div>
              <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
                No pop-ups or autoplay
              </span>
            </div>
            <div className="mt-4 grid gap-3 text-sm text-gray-700 sm:grid-cols-3">
              <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
                <p className="font-semibold text-gray-900">Clearly labeled</p>
                <p className="text-xs text-gray-600">
                  Every placement carries a “Sponsored” badge.
                </p>
              </div>
              <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
                <p className="font-semibold text-gray-900">Minimal frequency</p>
                <p className="text-xs text-gray-600">
                  One sponsor tile for every handful of homes.
                </p>
              </div>
              <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
                <p className="font-semibold text-gray-900">Contextual</p>
                <p className="text-xs text-gray-600">
                  Moving, mortgage, insurance, and decor partners only.
                </p>
              </div>
            </div>
          </Card>
        </MotionDiv>
      </div>
    </section>
  )
}
