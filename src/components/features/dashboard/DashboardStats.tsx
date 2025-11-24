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
  colorClass,
}: {
  href: string
  label: string
  value: number | undefined
  icon: React.ElementType
  colorClass: string
}) => (
  <Link
    href={href}
    className="card-glassmorphism-style group block min-h-[120px] rounded-xl p-4 sm:p-5"
  >
    <div className="flex items-center justify-between gap-4">
      <div className="text-[13px] font-medium tracking-wide text-purple-200/70 uppercase">
        {label}
      </div>
      <div className="flex items-center gap-3">
        <Icon className={`h-6 w-6 ${colorClass} opacity-80`} />
        <div className={`text-3xl font-bold leading-none ${colorClass}`}>
          {value !== undefined ? (
            value
          ) : (
            <Skeleton className="h-8 w-12 bg-white/10" />
          )}
        </div>
      </div>
    </div>
  </Link>
)

export function DashboardStats({ summary, isLoading }: DashboardStatsProps) {
  if (isLoading && !summary) {
    return (
      <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3">
        <Skeleton className="h-24 w-full rounded-lg bg-white/10" />
        <Skeleton className="h-24 w-full rounded-lg bg-white/10" />
        <Skeleton className="h-24 w-full rounded-lg bg-white/10" />
      </div>
    )
  }

  return (
    <div
      className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3"
      data-testid="dashboard-stats"
    >
      <StatTile
        href="/dashboard/viewed"
        label="Viewed"
        value={summary?.viewed}
        icon={Eye}
        colorClass="text-token-primary"
      />
      <StatTile
        href="/dashboard/liked"
        label="Liked"
        value={summary?.liked}
        icon={Heart}
        colorClass="text-token-success"
      />
      <StatTile
        href="/dashboard/passed"
        label="Passed"
        value={summary?.passed}
        icon={X}
        colorClass="text-token-error"
      />
    </div>
  )
}
