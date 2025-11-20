import { Metadata } from 'next'
import { Header } from '@/components/marketing/Header'
import { Footer } from '@/components/marketing/Footer'
import { AdMonetizationMockup } from '@/components/marketing/AdMonetizationMockup'

export const metadata: Metadata = {
  title: 'Sponsored moments preview | HomeMatch',
  description: 'See how sponsor placements look inside the HomeMatch experience.',
}

export default function SponsorMockupsPage() {
  return (
    <>
      <div className="relative isolate min-h-screen bg-white">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-gradient-to-b from-[#030712] via-[#0a1a3d] to-white" />
          <div className="absolute inset-0 bg-[radial-gradient(1200px_620px_at_20%_10%,rgba(56,189,248,0.16),transparent_55%),radial-gradient(1200px_620px_at_80%_0%,rgba(14,165,233,0.12),transparent_55%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(255,255,255,0.85),rgba(255,255,255,0)_45%)]" />
        </div>

        <Header />

        <main className="relative">
          <section className="mx-auto max-w-6xl px-4 pb-14 pt-24 text-white sm:px-6 sm:pb-16 sm:pt-28">
            <div className="max-w-3xl space-y-4">
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-white/80">
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
                See exactly how lightly branded partner placements sit inside the
                HomeMatch experience—no pop-ups, no heavy chrome.
              </p>
            </div>
          </section>

          <div className="relative -mt-6 bg-white">
            <div className="absolute inset-x-0 top-0 h-24 -translate-y-1/2 bg-gradient-to-b from-white/0 via-white to-white" />
            <AdMonetizationMockup />
          </div>
        </main>
      </div>
      <Footer />
    </>
  )
}
