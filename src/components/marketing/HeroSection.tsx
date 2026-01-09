import Link from 'next/link'
import { Heart } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { CSSProperties } from 'react'
import { HeroMotionEnhancer } from './HeroMotionEnhancer'
import { MarketingPreviewCardStatic } from './MarketingPreviewCardStatic'

export function HeroSection() {
  const heroStyle: CSSProperties & Record<string, string> = {
    '--spotlight-x': '50%',
    '--spotlight-y': '35%',
  }

  return (
    <section
      data-hero
      className="relative isolate min-h-[680px] overflow-hidden bg-[#030712] text-white sm:min-h-[720px]"
      style={heroStyle}
      data-testid="hero"
    >
      <div className="pointer-events-none absolute inset-0">
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(135deg, #030712 0%, #0f172a 50%, #030712 100%)',
          }}
          aria-hidden
        />
        <div
          className="absolute inset-0 opacity-70"
          style={{
            background:
              'radial-gradient(1000px 520px at 18% 18%, rgba(2,26,68,0.8), transparent 65%), radial-gradient(880px 600px at 82% 12%, rgba(6,58,158,0.55), transparent 65%)',
          }}
          aria-hidden
        />
        <div
          className="absolute inset-0 opacity-30"
          style={{
            background:
              'radial-gradient(700px 380px at 15% 70%, rgba(56,189,248,0.18), transparent 60%), radial-gradient(900px 480px at 85% 60%, rgba(30,27,75,0.35), transparent 70%)',
          }}
          aria-hidden
        />
      </div>

      <div
        data-hero-spotlight
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500"
        style={{
          background:
            'radial-gradient(600px circle at var(--spotlight-x) var(--spotlight-y), rgba(56,189,248,0.08), transparent 40%)',
        }}
        aria-hidden
      />

      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(1200px 580px at 20% 20%, rgba(56,189,248,0.12), transparent 55%), radial-gradient(1200px 720px at 80% 10%, rgba(14,165,233,0.08), transparent 60%)',
          opacity: 0.5,
        }}
        aria-hidden
      />

      {/* Bottom gradient fade */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#030712] to-transparent" />

      <HeroMotionEnhancer />

      <div className="relative z-10">
        <div className="container mx-auto max-w-6xl px-6 pt-22 pb-16 sm:pt-24 sm:pb-28 lg:pt-28">
          <div className="grid gap-10 sm:gap-12 lg:grid-cols-[1.05fr,0.95fr] lg:items-center">
            <div className="space-y-5 sm:space-y-8">
              <div className="space-y-4">
                <h1 className="text-4xl leading-[1.05] font-black sm:text-5xl md:text-6xl lg:text-7xl">
                  Find a home that works for everyone.
                </h1>

                <p className="max-w-2xl text-lg leading-relaxed text-white/80 sm:text-xl">
                  Swipe through real listings, save the ones your household
                  likes, and keep the search clear instead of stressful.
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-3">
                <Button
                  variant="prime"
                  size="lg"
                  asChild
                  className="group relative w-full overflow-hidden sm:w-auto"
                >
                  <Link
                    href="/signup"
                    aria-label="Start swiping with HomeMatch"
                    data-testid="primary-cta"
                  >
                    <span className="relative z-10 flex items-center gap-2">
                      <Heart className="h-4 w-4 transition-transform duration-300 group-hover:scale-110" />
                      Start swiping
                    </span>
                    {/* Shimmer effect on hover */}
                    <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
                  </Link>
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="w-full border-white/30 bg-white/5 text-white backdrop-blur-sm transition-all duration-300 hover:border-white/50 hover:bg-white/10 hover:!text-white sm:w-auto"
                  asChild
                >
                  <Link href="/login">Resume your search</Link>
                </Button>
              </div>
            </div>

            <div className="relative">
              <div className="relative mx-auto w-full max-w-[540px]">
                <MarketingPreviewCardStatic />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
