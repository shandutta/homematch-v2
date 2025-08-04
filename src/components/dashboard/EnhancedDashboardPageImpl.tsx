'use client'

import { useState } from 'react'
import {
  useInteractionSummary,
  useRecordInteraction,
} from '@/hooks/useInteractions'
import { PropertySwiper } from '@/components/features/properties/PropertySwiper'
import { DashboardStats } from '@/components/features/dashboard/DashboardStats'
import { Property } from '@/lib/schemas/property'
import { InteractionType, InteractionSummary } from '@/types/app'
import { DashboardData } from '@/lib/data/loader'
import { useRenderPerformance } from '@/lib/utils/client-performance'

interface EnhancedDashboardPageImplProps {
  initialData: DashboardData
  // These props are passed from the server component but not currently used in the client component
  // They will be used in future iterations for enhanced functionality
  // _returning?: boolean  // Prefixed with _ to indicate unused variable
  // _userProfile?: any // Will be typed properly with Zod later
  // _initialSwipeStats?: any // Will be typed properly with Zod later
  // _session?: any // Will be typed properly with Zod later
}

export function EnhancedDashboardPageImpl({
  initialData,
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

  const handleDecision = (propertyId: string, type: InteractionType) => {
    // 1. Optimistically remove the card from the UI
    setProperties((prev) => prev.filter((p) => p.id !== propertyId))

    // 2. Optimistically update the summary stats
    const currentSummary = optimisticSummary || summary
    if (currentSummary) {
      const newSummary = { ...currentSummary }
      if (type === 'liked') newSummary.liked++
      if (type === 'skip') newSummary.passed++
      // A decision on a card implies it has been viewed.
      // A separate "viewed" event should be fired when a card becomes active.
      // For now, we can increment viewed on any decision.
      newSummary.viewed++
      setOptimisticSummary(newSummary)
    }

    // 3. Call the mutation to update the backend.
    // React Query will handle refetching the summary in the background on success.
    recordInteraction({ propertyId, type })
  }

  // Use the optimistic summary if it exists, otherwise fall back to the fetched server state.
  const displaySummary = optimisticSummary || summary

  return (
    <>
      <DashboardStats summary={displaySummary} isLoading={summaryIsLoading} />
      <PropertySwiper properties={properties} onDecision={handleDecision} />
    </>
  )
}
