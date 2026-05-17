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
        'group border-hm-stone-200/80 relative overflow-hidden rounded-[24px] border bg-white/90 shadow-[0_24px_80px_rgba(68,64,60,0.16)] backdrop-blur-xl transition-shadow duration-300 hover:shadow-[0_28px_90px_rgba(68,64,60,0.2)]',
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
        <div className="from-hm-stone-900/60 via-hm-stone-900/10 absolute inset-0 bg-gradient-to-t to-transparent" />

        <div className="absolute bottom-4 left-4 rounded-full bg-white/90 px-4 py-2 text-lg font-bold text-slate-900 shadow-lg backdrop-blur-sm transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:scale-[1.03]">
          $975,000
        </div>

        <div className="pointer-events-none absolute inset-0">
          {[
            {
              title: 'Built for households',
              copy: 'Stay in sync on likes, tours, and moves.',
              icon: ShieldCheck,
              className: 'left-2 top-2 sm:left-4 sm:top-4',
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
                'border-hm-stone-200/80 text-hm-stone-900 absolute flex max-w-[210px] flex-col gap-1 rounded-2xl border bg-white/90 p-3 shadow-[0_10px_24px_rgba(68,64,60,0.16)] backdrop-blur-xl transition-transform duration-500 group-hover:-translate-y-1 sm:max-w-[230px]',
                positionClass
              )}
            >
              <div className="text-hm-stone-500 flex items-center gap-2 text-xs font-semibold tracking-[0.14em] uppercase">
                <Icon className="text-hm-amber-500 h-4 w-4" />
                {title}
              </div>
              <p className="text-hm-stone-600 text-sm">{copy}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-4 p-6 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <p className="text-hm-stone-500 text-xs font-semibold tracking-[0.16em] uppercase">
              Example Listing
            </p>
            <span className="border-hm-amber-300/60 bg-hm-amber-50 text-hm-amber-700 rounded-full border px-2 py-0.5 text-[10px] font-semibold tracking-[0.14em] uppercase">
              Example
            </span>
          </div>
          <h3 className="text-hm-stone-900 text-xl font-semibold">
            123 Sample Street, Anytown, USA
          </h3>
        </div>

        <div className="text-hm-stone-700 flex flex-wrap gap-3 text-sm font-medium">
          <div className="border-hm-stone-200 bg-hm-ivory-100 flex items-center gap-2 rounded-full border px-3 py-2">
            <Bed className="text-hm-stone-500 h-4 w-4" />
            <span>3 beds</span>
          </div>
          <div className="border-hm-stone-200 bg-hm-ivory-100 flex items-center gap-2 rounded-full border px-3 py-2">
            <Bath className="text-hm-stone-500 h-4 w-4" />
            <span>2 baths</span>
          </div>
          <div className="border-hm-stone-200 bg-hm-ivory-100 flex items-center gap-2 rounded-full border px-3 py-2">
            <MapPin className="text-hm-stone-500 h-4 w-4" />
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
