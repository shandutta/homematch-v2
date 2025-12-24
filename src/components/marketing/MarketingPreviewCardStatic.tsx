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
        'group relative overflow-hidden rounded-[24px] border border-white/10 bg-[#0f172a]/85 shadow-[0_18px_44px_rgba(0,0,0,0.3),0_0_40px_rgba(56,189,248,0.08)] backdrop-blur-xl transition-shadow duration-300 hover:shadow-[0_24px_60px_rgba(0,0,0,0.4),0_0_60px_rgba(56,189,248,0.12)]',
        className
      )}
    >
      <div
        className="pointer-events-none absolute inset-0 rounded-[24px] opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background:
            'radial-gradient(600px circle at 50% 40%, rgba(56,189,248,0.1), transparent 40%)',
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
        <div className="absolute inset-0 bg-gradient-to-t from-[#0f172a] via-black/20 to-transparent" />

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
            {
              title: 'Real listings, quick swipes',
              copy: 'Decide together in one tap.',
              icon: Heart,
              className: 'right-2 bottom-20 sm:left-4 sm:bottom-25',
            },
          ].map(({ title, copy, icon: Icon, className: positionClass }) => (
            <div
              key={title}
              className={cn(
                'absolute flex max-w-[210px] flex-col gap-1 rounded-2xl border border-white/20 bg-[#0f172a]/70 p-3 text-white shadow-[0_10px_24px_rgba(0,0,0,0.25)] backdrop-blur-xl transition-transform duration-500 group-hover:-translate-y-1 sm:max-w-[230px]',
                positionClass
              )}
            >
              <div className="flex items-center gap-2 text-xs font-semibold tracking-[0.14em] text-slate-300 uppercase">
                <Icon className="h-4 w-4 text-sky-400" />
                {title}
              </div>
              <p className="text-sm text-slate-200">{copy}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-4 p-6 pb-4">
        <div>
          <p className="text-xs font-semibold tracking-[0.16em] text-slate-400 uppercase">
            Listing · Lake Merritt
          </p>
          <h3 className="text-xl font-semibold text-white">
            1200 Lakeview Dr, Oakland, CA 94610
          </h3>
        </div>

        <div className="flex flex-wrap gap-3 text-sm font-medium text-slate-200">
          <div className="flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-3 py-2">
            <Bed className="h-4 w-4 text-slate-400" />
            <span>3 beds</span>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-3 py-2">
            <Bath className="h-4 w-4 text-slate-400" />
            <span>2 baths</span>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-3 py-2">
            <MapPin className="h-4 w-4 text-slate-400" />
            <span>Near parks</span>
          </div>
        </div>

        <div className="flex gap-3 pt-1">
          <button
            type="button"
            className="flex-1 rounded-full border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm font-semibold text-rose-400 shadow-sm transition-transform duration-200 hover:-translate-y-0.5 hover:border-rose-500/50 hover:bg-rose-500/20"
          >
            <span className="inline-flex items-center justify-center gap-2">
              <X className="h-4 w-4" />
              Pass
            </span>
          </button>
          <button
            type="button"
            className="flex-1 rounded-full border border-emerald-500/30 bg-emerald-500/20 px-4 py-3 text-sm font-semibold text-emerald-400 shadow-sm transition-transform duration-200 hover:-translate-y-0.5 hover:border-emerald-500/50 hover:bg-emerald-500/30"
          >
            <span className="inline-flex items-center justify-center gap-2">
              <Heart className="h-4 w-4" />
              Like
            </span>
          </button>
        </div>
      </div>
    </div>
  )
}
