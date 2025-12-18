'use client'

import Link from 'next/link'
import { InteractionSummary } from '@/types/app'
import { Skeleton } from '@/components/ui/skeleton'
import { Eye, Heart, X } from 'lucide-react'

interface DashboardStatsProps {
  summary: InteractionSummary | undefined
  isLoading: boolean
}

const StatTile = ({
  href,
  label,
  value,
  icon: Icon,
  accentColor,
}: {
  href: string
  label: string
  value: number | undefined
  icon: React.ElementType
  accentColor: 'amber' | 'success' | 'error'
}) => {
  const colorClasses = {
    amber: {
      icon: 'text-hm-amber-400',
      glow: 'group-hover:shadow-[0_0_30px_rgba(251,191,36,0.15)]',
      border: 'group-hover:border-hm-amber-400/20',
    },
    success: {
      icon: 'text-hm-success',
      glow: 'group-hover:shadow-[0_0_30px_rgba(134,239,172,0.15)]',
      border: 'group-hover:border-hm-success/20',
    },
    error: {
      icon: 'text-hm-error',
      glow: 'group-hover:shadow-[0_0_30px_rgba(252,165,165,0.15)]',
      border: 'group-hover:border-hm-error/20',
    },
  }

  const colors = colorClasses[accentColor]

  return (
    <Link
      href={href}
      className={`group bg-hm-obsidian-900 block rounded-xl border border-white/5 p-3 transition-all duration-300 hover:-translate-y-0.5 sm:p-5 ${colors.glow} ${colors.border}`}
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-hm-stone-500 text-[10px] font-medium tracking-widest uppercase sm:text-xs">
            {label}
          </p>
          <div className="font-display text-hm-stone-200 mt-0.5 text-xl font-medium tracking-tight sm:mt-1 sm:text-3xl">
            {value !== undefined ? (
              value
            ) : (
              <Skeleton className="h-9 w-12 bg-white/5" />
            )}
          </div>
        </div>
        <div
          className={`flex h-9 w-9 items-center justify-center rounded-full bg-white/5 ${colors.icon} transition-all duration-300 group-hover:scale-110 sm:h-12 sm:w-12`}
        >
          <Icon className="h-4 w-4 sm:h-5 sm:w-5" strokeWidth={1.5} />
        </div>
      </div>
    </Link>
  )
}

export function DashboardStats({ summary, isLoading }: DashboardStatsProps) {
  if (isLoading && !summary) {
    return (
      <div className="mb-6 grid grid-cols-3 gap-3 sm:mb-8 sm:gap-4">
        <Skeleton className="h-20 w-full rounded-xl bg-white/5 sm:h-24" />
        <Skeleton className="h-20 w-full rounded-xl bg-white/5 sm:h-24" />
        <Skeleton className="h-20 w-full rounded-xl bg-white/5 sm:h-24" />
      </div>
    )
  }

  return (
    <div
      className="mb-6 grid grid-cols-3 gap-3 sm:mb-8 sm:gap-4"
      data-testid="dashboard-stats"
    >
      <StatTile
        href="/dashboard/viewed"
        label="Viewed"
        value={summary?.viewed}
        icon={Eye}
        accentColor="amber"
      />
      <StatTile
        href="/dashboard/liked"
        label="Liked"
        value={summary?.liked}
        icon={Heart}
        accentColor="success"
      />
      <StatTile
        href="/dashboard/passed"
        label="Passed"
        value={summary?.passed}
        icon={X}
        accentColor="error"
      />
    </div>
  )
}
