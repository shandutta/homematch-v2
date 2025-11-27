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
      className={`group bg-hm-obsidian-900 block rounded-xl border border-white/5 p-5 transition-all duration-300 hover:-translate-y-0.5 ${colors.glow} ${colors.border}`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-hm-stone-500 text-xs font-medium tracking-widest uppercase">
            {label}
          </p>
          <p className="font-display text-hm-stone-200 mt-1 text-3xl font-medium tracking-tight">
            {value !== undefined ? (
              value
            ) : (
              <Skeleton className="h-9 w-12 bg-white/5" />
            )}
          </p>
        </div>
        <div
          className={`flex h-12 w-12 items-center justify-center rounded-full bg-white/5 ${colors.icon} transition-all duration-300 group-hover:scale-110`}
        >
          <Icon className="h-5 w-5" strokeWidth={1.5} />
        </div>
      </div>
    </Link>
  )
}

export function DashboardStats({ summary, isLoading }: DashboardStatsProps) {
  if (isLoading && !summary) {
    return (
      <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3">
        <Skeleton className="h-24 w-full rounded-xl bg-white/5" />
        <Skeleton className="h-24 w-full rounded-xl bg-white/5" />
        <Skeleton className="h-24 w-full rounded-xl bg-white/5" />
      </div>
    )
  }

  return (
    <div
      className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3"
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
