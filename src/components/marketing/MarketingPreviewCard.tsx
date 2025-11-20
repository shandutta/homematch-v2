'use client'

import Image from 'next/image'
import { useRef } from 'react'
import { useScroll, useTransform } from 'framer-motion'
import { cn } from '@/lib/utils'
import { Bed, Bath, MapPin, Heart, X, ShieldCheck } from 'lucide-react'
import { MotionDiv } from '@/components/ui/motion-components'

interface MarketingPreviewCardProps {
  className?: string
}

export function MarketingPreviewCard({ className }: MarketingPreviewCardProps) {
  const cardRef = useRef<HTMLDivElement | null>(null)
  const { scrollYProgress } = useScroll({
    target: cardRef,
    offset: ['start end', 'end start'],
  })

  const couplesShift = useTransform(scrollYProgress, [0, 1], [0, -14])
  const spotsShift = useTransform(scrollYProgress, [0, 1], [0, -8])
  const listingsShift = useTransform(scrollYProgress, [0, 1], [0, -18])

  return (
    <div
      ref={cardRef}
      className={cn(
        'relative overflow-hidden rounded-[24px] bg-white shadow-[0_18px_44px_rgba(15,23,42,0.14)]',
        className
      )}
    >
      <div className="relative aspect-[4/3]">
        <Image
          src="https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=1400&q=80"
          alt="Sample property interior"
          fill
          sizes="(max-width: 768px) 100vw, 540px"
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-black/5 to-transparent" />
        <div className="absolute bottom-4 left-4 rounded-full bg-white px-4 py-2 text-lg font-bold text-slate-900 shadow-md">
          $975,000
        </div>

        <div className="pointer-events-none absolute inset-0">
          {[
            {
              title: 'Built for couples',
              copy: 'Stay in sync on likes, tours, and moves.',
              icon: ShieldCheck,
              className: 'left-3 top-3',
              shift: couplesShift,
            },
            {
              title: 'See nearby spots',
              copy: 'Peek at parks and cafés without leaving the card.',
              icon: MapPin,
              className: 'right-3 top-12',
              shift: spotsShift,
            },
            {
              title: 'Real listings, quick swipes',
              copy: 'Decide together in one tap.',
              icon: Heart,
              className: 'left-3 bottom-20',
              shift: listingsShift,
            },
          ].map(({ title, copy, icon: Icon, className: pos, shift }) => (
            <MotionDiv
              key={title}
              className={cn(
                'absolute flex max-w-[230px] flex-col gap-1 rounded-2xl border border-white/50 bg-white/80 p-3 text-slate-900 shadow-[0_10px_24px_rgba(15,23,42,0.12)] backdrop-blur-xl',
                pos
              )}
              style={{ y: shift }}
              transition={{ type: 'spring', stiffness: 120, damping: 18 }}
            >
              <div className="flex items-center gap-2 text-xs font-semibold tracking-[0.14em] text-slate-600 uppercase">
                <Icon className="h-4 w-4 text-sky-500" />
                {title}
              </div>
              <p className="text-sm text-slate-800">{copy}</p>
            </MotionDiv>
          ))}
        </div>
      </div>

      <div className="space-y-4 p-6 pb-4">
        <div>
          <p className="text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase">
            Listing · Lake Merritt
          </p>
          <h3 className="text-xl font-semibold text-slate-900">
            1200 Lakeview Dr, Oakland, CA 94610
          </h3>
        </div>

        <div className="flex flex-wrap gap-3 text-sm font-medium text-slate-700">
          <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-2">
            <Bed className="h-4 w-4 text-slate-500" />
            <span>3 beds</span>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-2">
            <Bath className="h-4 w-4 text-slate-500" />
            <span>2 baths</span>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-2">
            <MapPin className="h-4 w-4 text-slate-500" />
            <span>Near parks</span>
          </div>
        </div>

        <div className="flex gap-3 pt-1">
          <button className="flex-1 rounded-full border border-red-200 bg-white px-4 py-3 text-sm font-semibold text-red-500 shadow-sm transition hover:bg-red-50">
            <span className="inline-flex items-center gap-2">
              <X className="h-4 w-4" />
              Pass
            </span>
          </button>
          <button className="flex-1 rounded-full border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700 shadow-sm transition hover:bg-emerald-100">
            <span className="inline-flex items-center gap-2">
              <Heart className="h-4 w-4" />
              Love
            </span>
          </button>
        </div>
      </div>
    </div>
  )
}
