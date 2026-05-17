'use client'

import type { ReactNode } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Heart, Users, Flame, Home } from 'lucide-react'
import { MotionDiv } from '@/components/ui/motion-components'
import { Skeleton } from '@/components/ui/skeleton'
import type { CouplesStats } from '@/lib/services/couples'

interface CouplesHeroProps {
  stats?: CouplesStats | null
  loading?: boolean
}

export function CouplesHero({ stats, loading }: CouplesHeroProps) {
  if (loading) {
    return (
      <Card className="border-hm-stone-600/60 bg-hm-obsidian-900/90 relative overflow-hidden rounded-2xl shadow-[0_14px_40px_rgba(52,43,37,0.08)]">
        <CardContent className="p-8">
          <Skeleton className="bg-hm-obsidian-800 mb-4 h-5 w-40" />
          <Skeleton className="bg-hm-obsidian-800 mb-4 h-10 w-80 max-w-full" />
          <Skeleton className="bg-hm-obsidian-800 h-5 w-full max-w-2xl" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-hm-stone-600/60 bg-hm-obsidian-900/92 relative overflow-hidden rounded-2xl shadow-[0_16px_42px_rgba(52,43,37,0.09)]">
      <div className="bg-hm-amber-400 absolute inset-y-0 left-0 w-1.5" />
      <CardContent className="relative p-8">
        <MotionDiv
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
        >
          <div className="border-hm-stone-600/60 bg-hm-obsidian-950 text-hm-stone-500 mb-4 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-semibold tracking-[0.18em] uppercase">
            <Home className="text-hm-amber-500 h-3.5 w-3.5" />
            Household search
          </div>

          <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <h1 className="font-display text-hm-stone-200 text-3xl font-medium tracking-tight sm:text-4xl">
                Shared shortlist
              </h1>
              <p className="text-hm-stone-400 mt-3 max-w-2xl text-base leading-relaxed">
                See where both people are converging, which homes still need a
                decision, and what evidence makes each match worth discussing.
              </p>
            </div>

            {stats ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:min-w-[420px]">
                <StatPill
                  icon={<Heart className="h-4 w-4 fill-current" />}
                  value={stats.total_mutual_likes}
                  label="mutual likes"
                />
                <StatPill
                  icon={<Users className="h-4 w-4" />}
                  value={stats.total_household_likes}
                  label="total likes"
                />
                <StatPill
                  icon={<Flame className="h-4 w-4" />}
                  value={stats.activity_streak_days}
                  label="day streak"
                  muted={stats.activity_streak_days === 0}
                />
              </div>
            ) : (
              <p className="border-hm-stone-600/60 bg-hm-obsidian-950 text-hm-stone-500 rounded-xl border px-4 py-3 text-sm">
                Start liking homes to build a household-level read on fit.
              </p>
            )}
          </div>
        </MotionDiv>
      </CardContent>
    </Card>
  )
}

function StatPill({
  icon,
  value,
  label,
  muted = false,
}: {
  icon: ReactNode
  value: number
  label: string
  muted?: boolean
}) {
  return (
    <div
      className={`rounded-2xl border px-4 py-3 ${
        muted
          ? 'border-hm-stone-600/50 bg-hm-obsidian-950/70 text-hm-stone-500'
          : 'border-hm-amber-400/20 bg-hm-obsidian-950 text-hm-stone-300'
      }`}
    >
      <div className="text-hm-amber-500 mb-1 flex items-center gap-2">
        {icon}
        <span className="font-display text-hm-stone-200 text-2xl font-medium">
          {value}
        </span>
      </div>
      <p className="text-[11px] font-semibold tracking-[0.16em] uppercase">
        {label}
      </p>
    </div>
  )
}
