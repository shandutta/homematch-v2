'use client'

import { useState, useMemo } from 'react'
import {
  useInteractionSummary,
  useRecordInteraction,
} from '@/hooks/useInteractions'
import { PropertySwiper } from '@/components/features/properties/PropertySwiper'
import { DashboardStats } from '@/components/features/dashboard/DashboardStats'
import { Property } from '@/types/database'
import { InteractionType, InteractionSummary } from '@/types/app'
import { DashboardData } from '@/lib/data/loader'

interface EnhancedDashboardPageImplProps {
  initialData: DashboardData
}

export function EnhancedDashboardPageImpl({
  initialData,
}: EnhancedDashboardPageImplProps) {
  // Component State
  const [properties, setProperties] = useState<Property[]>(
    initialData.properties
  )
  const [optimisticSummary, setOptimisticSummary] = useState<
    InteractionSummary | undefined
  >(undefined)

  // Server State via React Query Hooks
  const { data: summary, isLoading: summaryIsLoading } = useInteractionSummary()
  const { mutate: recordInteraction } = useRecordInteraction()

  const handleDecision = (propertyId: string, type: InteractionType) => {
    // 1. Optimistically remove the card from the UI
    setProperties(prev => prev.filter(p => p.id !== propertyId))

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
