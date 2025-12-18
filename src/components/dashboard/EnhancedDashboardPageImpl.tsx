'use client'

import { useState, useMemo, useCallback } from 'react'
import {
  useInteractionSummary,
  useRecordInteraction,
} from '@/hooks/useInteractions'
import { useCouplesInteraction } from '@/hooks/useCouplesInteractions'
import { DashboardStats } from '@/components/features/dashboard/DashboardStats'
import { MutualLikesSection } from '@/components/features/couples/MutualLikesSection'
import { DashboardPropertyGrid } from '@/components/features/dashboard/DashboardPropertyGrid'
import { Property } from '@/lib/schemas/property'
import { InteractionType, InteractionSummary } from '@/types/app'
import { DashboardData } from '@/lib/data/loader'
import { useRenderPerformance } from '@/lib/utils/client-performance'

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

  // Component State
  // Cast/normalize initialData.properties (runtime data) to our UI Property type.
  // The source data may have looser string enums; we trust upstream Zod parsing on fetch/load.
  const [properties, setProperties] = useState<Property[]>(
    initialData.properties as unknown as Property[]
  )
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
          <MutualLikesSection userId={userId} className="w-full" />
          <div
            className="pointer-events-none mt-8 mb-1 h-px w-full bg-gradient-to-r from-transparent via-white/25 to-transparent"
            aria-hidden="true"
          />
        </>
      )}
    </div>
  )
}
