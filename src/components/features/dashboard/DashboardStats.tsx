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
  <Link href={href} className="block card-glassmorphism-style p-6 group">
    <div className="flex items-center justify-between">
      <div className="text-sm font-medium text-purple-200/80">{label}</div>
      <Icon className={`h-6 w-6 ${colorClass} opacity-70`} />
    </div>
    <div className={`text-4xl font-bold mt-2 ${colorClass}`}>
      {value !== undefined ? (
        value
      ) : (
        <Skeleton className="h-10 w-16 bg-white/10" />
      )}
    </div>
  </Link>
)

export function DashboardStats({ summary, isLoading }: DashboardStatsProps) {
  if (isLoading && !summary) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Skeleton className="h-28 w-full rounded-lg bg-white/10" />
        <Skeleton className="h-28 w-full rounded-lg bg-white/10" />
        <Skeleton className="h-28 w-full rounded-lg bg-white/10" />
      </div>
    )
  }

  return (
    <div
      className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8"
      data-testid="dashboard-stats"
    >
      <StatTile
        href="/dashboard/viewed"
        label="Viewed"
        value={summary?.viewed}
        icon={Eye}
        colorClass="text-blue-400"
      />
      <StatTile
        href="/dashboard/liked"
        label="Liked"
        value={summary?.liked}
        icon={Heart}
        colorClass="text-green-400"
      />
      <StatTile
        href="/dashboard/passed"
        label="Passed"
        value={summary?.passed}
        icon={X}
        colorClass="text-red-400"
      />
    </div>
  )
}
