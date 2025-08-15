'use client'

import React, { useState, useCallback } from 'react'
import { Heart, Users } from 'lucide-react'
import { Property } from '@/lib/schemas/property'
import { InteractionType } from '@/types/app'
import { SwipeablePropertyCard } from '@/components/properties/SwipeablePropertyCard'
import { useRenderPerformance } from '@/lib/utils/client-performance'
import { PropertyCardSkeleton } from '@/components/shared/PropertyCardSkeleton'
import { useMutualLikes } from '@/hooks/useCouples'
import {
  FloatingHearts,
  SuccessConfetti,
  SparkleEffect,
} from '@/components/couples/CouplesMicroInteractions'
import { CouplesMessages } from '@/lib/utils/couples-messaging'

interface PropertySwiperProps {
  properties: Property[]
  onDecision: (propertyId: string, type: InteractionType) => void
  isLoading?: boolean
  showSwipeHints?: boolean
  celebrationTrigger?: {
    type: 'mutual-like' | 'streak' | 'milestone'
    propertyAddress?: string
    partnerName?: string
    count?: number
  } | null
  onClearCelebration?: () => void
}

export function PropertySwiper({
  properties,
  onDecision,
  isLoading = false,
  showSwipeHints = true,
  celebrationTrigger,
  onClearCelebration: _onClearCelebration,
}: PropertySwiperProps) {
  // Performance monitoring
  useRenderPerformance('PropertySwiper')

  const { data: mutualLikes = [] } = useMutualLikes()

  const [currentIndex, setCurrentIndex] = useState(0)
  const [swipeHistory, setSwipeHistory] = useState<
    Array<{ propertyId: string; type: InteractionType }>
  >([])

  // Handle decision with state management
  const handleDecision = useCallback(
    (propertyId: string, type: InteractionType) => {
      // Add to history for undo functionality
      setSwipeHistory((prev) => [...prev, { propertyId, type }])

      // Call the parent callback
      onDecision(propertyId, type)

      // Move to next card
      setCurrentIndex((prev) => prev + 1)
    },
    [onDecision]
  )

  // Undo functionality
  const handleUndo = useCallback(() => {
    if (swipeHistory.length === 0 || currentIndex === 0) return

    // Remove last action from history
    const newHistory = swipeHistory.slice(0, -1)
    setSwipeHistory(newHistory)

    // Go back to previous card
    setCurrentIndex((prev) => prev - 1)

    // Note: In a real app, you'd want to call an API to undo the decision
    // For now, we just handle the UI state
  }, [swipeHistory, currentIndex])

  if (isLoading) {
    return (
      <div className="relative mx-auto h-[600px] w-full max-w-md">
        <PropertyCardSkeleton />
      </div>
    )
  }

  if (!properties.length) {
    return (
      <div className="py-12 text-center">
        <h2 className="text-foreground mb-4 text-2xl font-semibold">
          {CouplesMessages.empty.noProperties.title}
        </h2>
        <p className="text-muted-foreground mb-2 text-lg">
          {CouplesMessages.empty.noProperties.message}
        </p>
        <p className="text-muted-foreground/80 text-sm">
          {CouplesMessages.empty.noProperties.cta}
        </p>
      </div>
    )
  }

  // Check if the current property is mutually liked for showing helper text
  const currentProperty = properties[currentIndex]
  const currentIsMutuallyLiked =
    currentProperty &&
    mutualLikes.some((ml) => ml.property_id === currentProperty.id)

  return (
    <div className="relative">
      {/* Celebration animations */}
      <FloatingHearts
        trigger={celebrationTrigger?.type === 'mutual-like'}
        count={8}
      />

      <SuccessConfetti trigger={celebrationTrigger?.type === 'milestone'} />

      <SparkleEffect active={currentIsMutuallyLiked}>
        <SwipeablePropertyCard
          properties={properties}
          currentIndex={currentIndex}
          onDecision={handleDecision}
          onUndo={swipeHistory.length > 0 ? handleUndo : undefined}
          showHints={showSwipeHints && currentIndex === 0}
          className={
            currentIsMutuallyLiked
              ? 'transform-gpu shadow-2xl ring-2 shadow-pink-500/25 ring-pink-400/20 ring-offset-2 ring-offset-transparent'
              : ''
          }
        />
      </SparkleEffect>

      {/* Helper text for mutually liked properties */}
      {currentIsMutuallyLiked && (
        <div className="absolute -bottom-32 left-1/2 z-10 -translate-x-1/2">
          <div className="flex animate-pulse items-center gap-2 rounded-full border border-pink-400/30 bg-gradient-to-r from-pink-500/20 to-purple-500/20 px-4 py-2 text-sm text-pink-300 backdrop-blur-sm">
            <Heart className="h-4 w-4 animate-bounce fill-pink-400 text-pink-400" />
            <span>Your partner liked this too!</span>
            <Users className="h-4 w-4 animate-pulse text-purple-400" />
          </div>
        </div>
      )}
    </div>
  )
}
