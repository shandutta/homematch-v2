'use client'

import { useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { CouplesActivityFeed } from '@/components/couples/CouplesActivityFeed'
import { Skeleton } from '@/components/ui/skeleton'
import { useHouseholdActivity } from '@/hooks/useCouples'
import { RefreshCw } from 'lucide-react'

const DEFAULT_LIMIT = 50

export function HouseholdActivityPage() {
  const query = useHouseholdActivity(DEFAULT_LIMIT, 0)

  const activity = useMemo(() => query.data ?? [], [query.data])

  return (
    <div className="space-y-6 sm:space-y-8" data-testid="dashboard-activity">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <h1 className="font-display text-hm-stone-200 text-2xl font-medium tracking-tight sm:text-4xl">
            Activity
          </h1>
          <p className="text-hm-stone-500 mt-2 max-w-2xl text-sm sm:text-base">
            A shared timeline of how your household is exploring listings.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => query.refetch()}
          disabled={query.isFetching}
          className="self-start sm:self-auto"
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          {query.isFetching ? 'Refreshing…' : 'Refresh'}
        </Button>
      </div>

      {query.isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-6 w-44 bg-white/10" />
          <Skeleton className="h-28 w-full bg-white/10" />
          <Skeleton className="h-28 w-full bg-white/10" />
          <Skeleton className="h-28 w-full bg-white/10" />
        </div>
      ) : query.error ? (
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-6 py-12 text-center backdrop-blur">
          <p className="text-hm-error text-sm font-semibold">
            Couldn’t load activity
          </p>
          <p className="text-hm-stone-500 mt-2 text-sm">
            {query.error.message || 'Please try again.'}
          </p>
          <Button
            variant="outline"
            className="mt-6"
            onClick={() => query.refetch()}
          >
            Try again
          </Button>
        </div>
      ) : (
        <CouplesActivityFeed
          activity={activity}
          showViewAllLink={false}
          returnToPath="/dashboard/activity"
        />
      )}
    </div>
  )
}
