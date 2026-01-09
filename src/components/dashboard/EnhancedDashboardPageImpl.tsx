'use client'

import { lazy, Suspense, useState, useMemo, useCallback } from 'react'
import {
  useInteractionSummary,
  useRecordInteraction,
} from '@/hooks/useInteractions'
import { useCouplesInteraction } from '@/hooks/useCouplesInteractions'
import { DashboardStats } from '@/components/features/dashboard/DashboardStats'
import { DashboardPropertyGrid } from '@/components/features/dashboard/DashboardPropertyGrid'
import { propertySchema, Property } from '@/lib/schemas/property'
import { InteractionType, InteractionSummary } from '@/types/app'
import { DashboardData } from '@/lib/data/loader'
import { useRenderPerformance } from '@/lib/utils/client-performance'
import { Skeleton } from '@/components/ui/skeleton'

interface EnhancedDashboardPageImplProps {
  initialData: DashboardData
  userId?: string
  // These props are passed from the server component but not currently used in the client component
  // They will be used in future iterations for enhanced functionality
  // _returning?: boolean  // Prefixed with _ to indicate unused variable
  // _userProfile?: any // Will be typed properly with Zod later
  // _initialSwipeStats?: any // Will be typed properly with Zod later
  // _session?: any // Will be typed properly with Zod later
}

const MutualLikesSection = lazy(() =>
  import('@/components/features/couples/MutualLikesSection').then((module) => ({
    default: module.MutualLikesSection,
  }))
)

function MutualLikesFallback() {
  return (
    <div className="min-h-[320px] rounded-xl border border-white/10 bg-white/5 p-6 backdrop-blur">
      <div className="mb-4 flex items-center gap-3">
        <Skeleton className="h-5 w-5 rounded-full bg-white/10" />
        <Skeleton className="h-5 w-40 bg-white/10" />
      </div>
      <div className="space-y-3">
        {[1, 2, 3].map((row) => (
          <div
            key={row}
            className="flex items-center gap-4 rounded-lg bg-white/5 p-3"
          >
            <Skeleton className="h-14 w-14 rounded-md bg-white/10" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-full bg-white/10" />
              <Skeleton className="h-4 w-24 bg-white/10" />
              <div className="flex gap-3">
                <Skeleton className="h-3 w-12 bg-white/10" />
                <Skeleton className="h-3 w-12 bg-white/10" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function EnhancedDashboardPageImpl({
  initialData,
  userId,
  // _returning,  // Prefixed with _ to indicate unused variable
  // _userProfile,  // Prefixed with _ to indicate unused variable
  // _initialSwipeStats,  // Prefixed with _ to indicate unused variable
  // _session,  // Prefixed with _ to indicate unused variable
}: EnhancedDashboardPageImplProps) {
  // Performance monitoring
  useRenderPerformance('EnhancedDashboardPageImpl')

  const initialProperties = useMemo(() => {
    const parsed = propertySchema.array().safeParse(initialData.properties)
    return parsed.success ? parsed.data : []
  }, [initialData.properties])

  const [properties, setProperties] = useState<Property[]>(initialProperties)
  const [optimisticSummary, setOptimisticSummary] = useState<
    InteractionSummary | undefined
  >(undefined)

  // Server State via React Query Hooks
  const { data: summary, isLoading: summaryIsLoading } = useInteractionSummary()
  const { mutate: recordInteraction } = useRecordInteraction()

  // Enhanced couples interaction with celebration support
  const couplesInteraction = useCouplesInteraction()

  const handleDecision = useCallback(
    (propertyId: string, type: InteractionType) => {
      // 1. Optimistically remove the card from the UI
      setProperties((prev) => prev.filter((p) => p.id !== propertyId))

      // 2. Optimistically update the summary stats
      const currentSummary = optimisticSummary || summary
      if (currentSummary) {
        const newSummary = { ...currentSummary }
        if (type === 'liked') newSummary.liked++
        if (type === 'skip') newSummary.passed++
        setOptimisticSummary(newSummary)
      }

      // 3. Use couples interaction if user is in a household, otherwise regular interaction
      if (userId) {
        couplesInteraction.recordInteraction({ propertyId, type })
      } else {
        recordInteraction({ propertyId, type })
      }
    },
    [optimisticSummary, summary, userId, couplesInteraction, recordInteraction]
  )

  const handlePropertyView = useCallback(
    (propertyId: string) => {
      // Optimistically update the viewed count
      const currentSummary = optimisticSummary || summary
      if (currentSummary) {
        const newSummary = { ...currentSummary }
        newSummary.viewed++
        setOptimisticSummary(newSummary)
      }

      // Record the view interaction
      if (userId) {
        couplesInteraction.recordInteraction({ propertyId, type: 'viewed' })
      } else {
        recordInteraction({ propertyId, type: 'viewed' })
      }
    },
    [userId, couplesInteraction, recordInteraction, optimisticSummary, summary]
  )

  // Memoize computed values to prevent unnecessary recalculations
  const displaySummary = useMemo(
    () => optimisticSummary || summary,
    [optimisticSummary, summary]
  )
  const propertiesLoading = useMemo(
    () => properties.length === 0 && summaryIsLoading,
    [properties.length, summaryIsLoading]
  )

  return (
    <div className="space-y-6 sm:space-y-8" data-testid="dashboard-content">
      <h1
        className="mb-4 text-2xl font-bold text-white sm:mb-6 sm:text-3xl"
        data-testid="dashboard-header"
      >
        Dashboard
      </h1>
      <DashboardStats summary={displaySummary} isLoading={summaryIsLoading} />

      <DashboardPropertyGrid
        properties={properties}
        onDecision={handleDecision}
        isLoading={propertiesLoading}
        celebrationTrigger={couplesInteraction.celebrationTrigger}
        onView={handlePropertyView}
      />

      {/* Add MutualLikesSection if userId is available */}
      {userId && (
        <>
          <Suspense fallback={<MutualLikesFallback />}>
            <MutualLikesSection userId={userId} className="w-full" />
          </Suspense>
          <div
            className="pointer-events-none mt-8 mb-1 h-px w-full bg-gradient-to-r from-transparent via-white/25 to-transparent"
            aria-hidden="true"
          />
        </>
      )}
    </div>
  )
}
