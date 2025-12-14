import { Metadata } from 'next'
import { Header } from '@/components/marketing/Header'
import { Footer } from '@/components/marketing/Footer'
import { AdMonetizationMockup } from '@/components/marketing/AdMonetizationMockup'

export const metadata: Metadata = {
  title: 'Sponsored moments preview | HomeMatch',
  description:
    'See how sponsor placements look inside the HomeMatch experience.',
  robots: { index: false, follow: false },
}

export default function SponsorMockupsPage() {
  return (
    <>
      <div className="min-h-screen bg-[#f7f9fc] text-slate-900">
        <div className="relative overflow-hidden bg-gradient-to-b from-[#050913] via-[#0c1a33] to-[#0f2744]">
          <div className="pointer-events-none absolute inset-0 opacity-60">
            <div className="absolute inset-0 bg-[radial-gradient(1400px_720px_at_20%_10%,rgba(56,189,248,0.18),transparent_60%),radial-gradient(1400px_720px_at_80%_-5%,rgba(14,165,233,0.14),transparent_60%)]" />
          </div>

          <Header />

          <section className="mx-auto max-w-6xl px-4 pt-24 pb-16 text-white sm:px-6 sm:pt-28 sm:pb-20 lg:px-8">
            <div className="max-w-3xl space-y-4">
              <p className="text-sm font-semibold tracking-[0.18em] text-white/80 uppercase">
                Preview
              </p>
              <h1
                className="text-3xl font-bold sm:text-4xl md:text-5xl"
                style={{ fontFamily: 'var(--font-heading)' }}
              >
                Sponsor mockups in context
              </h1>
              <p
                className="text-lg text-white/80 sm:text-xl"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                See exactly how lightly branded partner placements sit inside
                the HomeMatch experience—no pop-ups, no heavy chrome.
              </p>
            </div>
          </section>

          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-b from-transparent via-[#0f2744]/40 to-[#f7f9fc]" />
        </div>

        <AdMonetizationMockup />
      </div>
      <Footer />
    </>
  )
}
