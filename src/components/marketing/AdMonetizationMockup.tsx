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
      <div className="rounded-lg border border-sky-100/80 bg-gradient-to-r from-sky-50 via-white to-indigo-50 p-3 shadow-[0_18px_45px_-28px_rgba(6,58,158,0.45)]">
        <div className="flex items-center justify-between text-[11px] font-semibold tracking-[0.12em] text-sky-800 uppercase">
          <span>Example header slot</span>
          <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[10px] text-sky-800">
            Sponsored
          </span>
        </div>
        <div className="mt-3 flex items-center justify-between rounded-lg border border-dashed border-sky-200 bg-white/75 px-4 py-3 text-gray-800 backdrop-blur">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-100 text-sky-800">
              Ad
            </div>
            <div>
              <p className="text-sm font-semibold">Partner message + CTA</p>
              <p className="text-xs text-gray-500">Sits under hero/search</p>
            </div>
          </div>
          <span className="rounded-full bg-sky-500/90 px-3 py-1 text-xs font-semibold text-white">
            Soft glow
          </span>
        </div>
      </div>
    )
  }

  if (preview === 'inline') {
    return (
      <div className="space-y-3">
        <div className="rounded-lg bg-slate-100 p-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
          Property card
        </div>
        <div className="rounded-xl border border-amber-100 bg-gradient-to-r from-amber-50 via-white to-amber-50 p-3 shadow-sm">
          <div className="flex items-center justify-between text-xs font-semibold text-amber-900">
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] tracking-wide text-amber-900 uppercase">
              Sponsored
            </span>
            <span className="text-[11px] text-amber-700">Matches cards</span>
          </div>
          <div className="mt-2 rounded-lg border border-amber-200 bg-white/85 p-3">
            <div className="h-3 w-24 rounded-full bg-amber-200" />
            <div className="mt-2 grid grid-cols-[2fr,1fr] gap-2">
              <div className="h-16 rounded-md bg-amber-50" />
              <div className="h-16 rounded-md bg-amber-100" />
            </div>
          </div>
        </div>
        <div className="rounded-lg bg-slate-100 p-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
          Property card
        </div>
      </div>
    )
  }

  return (
    <div className="flex justify-center">
      <div className="relative w-[220px] rounded-[24px] border border-emerald-100 bg-white/92 p-3 shadow-[0_18px_45px_-30px_rgba(0,0,0,0.35)]">
        <div className="h-28 rounded-2xl bg-gradient-to-b from-slate-100 via-white to-slate-50" />
        <div className="absolute inset-x-3 bottom-3 rounded-xl border border-dashed border-emerald-200 bg-emerald-50/85 p-3 shadow-sm">
          <div className="flex items-center justify-between text-xs font-semibold text-emerald-900">
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] tracking-wide uppercase">
              Sponsored
            </span>
            <span className="text-[11px] text-emerald-700">Dismissible</span>
          </div>
          <div className="mt-2 h-8 rounded-lg bg-emerald-100/80" />
        </div>
        <div className="absolute left-3 right-3 top-3 h-[14px] rounded-full bg-gray-100" />
      </div>
    </div>
  )
}

export function AdMonetizationMockup() {
  return (
    <section className="relative overflow-hidden py-10 sm:py-12">
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

      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
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
                <Card className="group h-full rounded-2xl border border-slate-200 bg-white/95 shadow-token-md backdrop-blur-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-token-lg">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-50 text-sky-800 ring-1 ring-sky-100">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <h3
                          className="text-xl font-semibold text-gray-900"
                          style={{ fontFamily: 'var(--font-heading)' }}
                        >
                          {concept.title}
                        </h3>
                        <p className="text-sm text-gray-500">
                          {concept.placement}
                        </p>
                      </div>
                    </div>
                    <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700 shadow-inner">
                      {concept.badge}
                    </span>
                  </div>
                  <p
                    className="mt-3 text-base text-gray-600"
                    style={{ fontFamily: 'var(--font-body)' }}
                  >
                    {concept.description}
                  </p>

                  <div className="mt-5 rounded-xl border border-slate-100 bg-slate-50/70 p-3">
                    <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                      <span>Example placement</span>
                      <span className="rounded-full bg-white px-2 py-0.5 text-[11px] text-slate-700">
                        Sponsored
                      </span>
                    </div>
                    <div className="mt-3">{renderPreview(concept.preview)}</div>
                  </div>
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
