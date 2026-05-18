import Image from 'next/image'
import { Bed, Bath, MapPin, Heart, X, ShieldCheck } from 'lucide-react'
import { cn } from '@/lib/utils'

interface MarketingPreviewCardStaticProps {
  className?: string
}

export function MarketingPreviewCardStatic({
  className,
}: MarketingPreviewCardStaticProps) {
  return (
    <div
      className={cn(
        'group border-hm-border-strong/80 relative overflow-hidden rounded-[24px] border bg-white/90 shadow-[0_24px_80px_rgba(68,64,60,0.16)] backdrop-blur-xl transition-shadow duration-300 hover:shadow-[0_28px_90px_rgba(68,64,60,0.2)]',
        className
      )}
    >
      <div
        className="pointer-events-none absolute inset-0 rounded-[24px] opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background:
            'radial-gradient(600px circle at 50% 40%, rgba(194,129,65,0.10), transparent 40%)',
        }}
      />

      <div className="relative aspect-[4/3]">
        <Image
          src="/images/marketing/mock-home-1.jpg"
          alt="Sample home"
          fill
          sizes="(max-width: 768px) 100vw, 540px"
          className="object-cover"
          priority
          fetchPriority="high"
          quality={75}
        />
        <div className="from-hm-ink/55 via-hm-ink/10 absolute inset-0 bg-gradient-to-t to-transparent" />

        <div className="text-hm-ink absolute bottom-4 left-4 rounded-full bg-white/90 px-4 py-2 text-lg font-bold shadow-lg backdrop-blur-sm transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:scale-[1.03]">
          $975,000
        </div>

        <div className="pointer-events-none absolute inset-0">
          {[
            {
              title: 'Built for households',
              copy: 'Stay in sync on houses you both like.',
              icon: ShieldCheck,
              className:
                'left-2 top-2 max-w-[300px] sm:left-4 sm:top-4 sm:max-w-[330px]',
            },
            {
              title: 'See nearby spots',
              copy: 'Peek at parks and cafés without leaving the card.',
              icon: MapPin,
              className: 'hidden sm:flex right-4 top-30',
            },
          ].map(({ title, copy, icon: Icon, className: positionClass }) => (
            <div
              key={title}
              className={cn(
                'border-hm-border-strong/80 text-hm-ink absolute flex max-w-[210px] flex-col gap-1 rounded-2xl border bg-white/90 p-3 shadow-[0_10px_24px_rgba(68,64,60,0.16)] backdrop-blur-xl transition-transform duration-500 group-hover:-translate-y-1 sm:max-w-[230px]',
                positionClass
              )}
            >
              <div className="text-hm-muted flex items-center gap-2 text-xs font-semibold tracking-[0.14em] uppercase">
                <Icon className="text-hm-accent-strong h-4 w-4" />
                {title}
              </div>
              <p className="text-hm-ink-soft text-sm">{copy}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-4 p-6 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <p className="text-hm-muted text-xs font-semibold tracking-[0.16em] uppercase">
              Example Listing
            </p>
            <span className="border-hm-accent/60 bg-hm-accent/10 text-hm-accent-strong rounded-full border px-2 py-0.5 text-[10px] font-semibold tracking-[0.14em] uppercase">
              Example
            </span>
          </div>
          <h3 className="text-hm-ink text-xl font-semibold">
            123 Sample Street, Anytown, USA
          </h3>
        </div>

        <div className="text-hm-ink flex flex-wrap gap-3 text-sm font-medium">
          <div className="border-hm-border-strong bg-hm-surface flex items-center gap-2 rounded-full border px-3 py-2">
            <Bed className="text-hm-muted h-4 w-4" />
            <span>3 beds</span>
          </div>
          <div className="border-hm-border-strong bg-hm-surface flex items-center gap-2 rounded-full border px-3 py-2">
            <Bath className="text-hm-muted h-4 w-4" />
            <span>2 baths</span>
          </div>
          <div className="border-hm-border-strong bg-hm-surface flex items-center gap-2 rounded-full border px-3 py-2">
            <MapPin className="text-hm-muted h-4 w-4" />
            <span>Near parks</span>
          </div>
        </div>

        {/* Decorative preview only — these aren't real controls. Marked
            aria-hidden so screen readers + keyboard focus skip them. */}
        <div className="flex gap-3 pt-1" aria-hidden="true">
          <div className="flex-1 rounded-full border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 shadow-sm">
            <span className="inline-flex items-center justify-center gap-2">
              <X className="h-4 w-4" />
              Pass
            </span>
          </div>
          <div className="flex-1 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700 shadow-sm">
            <span className="inline-flex items-center justify-center gap-2">
              <Heart className="h-4 w-4" />
              Like
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
