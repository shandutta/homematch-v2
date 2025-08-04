'use client'

import React, { useState, useMemo, useRef } from 'react'
import TinderCard from 'react-tinder-card'
import { Property } from '@/lib/schemas/property'
import { InteractionType } from '@/types/app'
import { PropertyCard } from '@/components/property/PropertyCard'
import { useRenderPerformance } from '@/lib/utils/performance'
import { PropertyCardSkeleton } from '@/components/shared/PropertyCardSkeleton'

interface PropertySwiperProps {
  properties: Property[]
  onDecision: (propertyId: string, type: InteractionType) => void
  isLoading?: boolean
}

export function PropertySwiper({
  properties,
  onDecision,
  isLoading = false,
}: PropertySwiperProps) {
  // Performance monitoring
  useRenderPerformance('PropertySwiper')
  
  const [currentIndex, setCurrentIndex] = useState(properties.length - 1)

  // used for outOfFrame closure
  const currentIndexRef = useRef(currentIndex)
  currentIndexRef.current = currentIndex

  // Local interface describing the imperative API exposed by react-tinder-card.
  // The package doesn't ship types for the ref, so we define a minimal surface we use.
  type TinderCardApi = {
    swipe: (dir: 'left' | 'right') => Promise<void>
    restoreCard: () => Promise<void>
  }

  const childRefs = useMemo(
    () =>
      Array(properties.length)
        .fill(0)
        .map(() => React.createRef<TinderCardApi>()),
    [properties.length]
  )

  const swiped = (direction: string, propertyId: string, index: number) => {
    if (currentIndexRef.current >= index) {
      const type: InteractionType = direction === 'right' ? 'liked' : 'skip'
      onDecision(propertyId, type)
      setCurrentIndex(index - 1)
    }
  }

  const outOfFrame = (propertyId: string, idx: number) => {
    // handle the case where the card is dragged out of frame
    if (currentIndexRef.current >= idx) {
      childRefs[idx].current?.restoreCard()
    }
  }

  if (isLoading) {
    return (
      <div className="relative w-full max-w-md mx-auto h-[600px]">
        <PropertyCardSkeleton />
      </div>
    )
  }

  if (!properties.length) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-semibold mb-4 text-white">All out of properties!</h2>
        <p className="text-lg text-purple-300/80">
          Check back later for new listings in your area.
        </p>
      </div>
    )
  }

  return (
    <div className="relative w-full max-w-md mx-auto h-[600px]">
      <div className="relative w-full h-full">
        {properties.map((property, index) => (
          <TinderCard
            // Cast only at the boundary where third-party component lacks proper ref typing.
            ref={childRefs[index] as React.Ref<TinderCardApi>}
            className="absolute w-full h-full"
            key={property.id}
            onSwipe={(dir: string) => swiped(dir, property.id, index)}
            onCardLeftScreen={() => outOfFrame(property.id, index)}
            preventSwipe={['up', 'down']}
          >
            <PropertyCard property={property} onDecision={onDecision} />
          </TinderCard>
        ))}
      </div>
    </div>
  )
}
