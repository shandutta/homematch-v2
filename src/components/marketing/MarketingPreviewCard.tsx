'use client'

import Image from 'next/image'
import { cn } from '@/lib/utils'
import { Bed, Bath, MapPin, Heart, X } from 'lucide-react'
import React from 'react'

interface MarketingPreviewCardProps {
  className?: string
}

export function MarketingPreviewCard({ className }: MarketingPreviewCardProps) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_16px_40px_rgba(15,23,42,0.12)]',
        className
      )}
    >
      <div className="relative aspect-[4/3]">
        <Image
          src="https://images.unsplash.com/photo-1423655156442-ccc11daa4e99?auto=format&fit=crop&w=1400&q=80"
          alt="Sample property exterior"
          fill
          sizes="(max-width: 768px) 100vw, 540px"
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-black/5 to-transparent" />
        <div className="absolute bottom-4 left-4 rounded-full bg-white px-4 py-2 text-lg font-bold text-slate-900 shadow-md">
          $1,295,000
        </div>
      </div>

      <div className="space-y-4 p-6 pb-4">
        <div>
          <p className="text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase">
            Listing · San Francisco
          </p>
          <h3 className="text-xl font-semibold text-slate-900">
            55 Dolores St #5A, San Francisco, CA 94103
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
