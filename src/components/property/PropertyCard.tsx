'use client'

import { ReactNode, useCallback } from 'react'
import { Property, Neighborhood } from '@/lib/schemas/property'
import { InteractionType } from '@/types/app'
import { useMutualLikes } from '@/hooks/useCouples'
import { usePropertyVibes } from '@/hooks/usePropertyVibes'
import { useNeighborhoodVibes } from '@/hooks/useNeighborhoodVibes'
import { usePropertyDetail } from './PropertyDetailProvider'
import { PropertyCardUI } from './PropertyCardUI'

interface PropertyCardProps {
  property: Property
  neighborhood?: Neighborhood
  onDecision?: (propertyId: string, type: InteractionType) => void
  imagePriority?: boolean
  actions?: ReactNode
  floatingAction?: ReactNode
  showStory?: boolean
  storyVariant?: 'tagline' | 'futureVision'
  showMap?: boolean
  enableDetailsToggle?: boolean
  disableDetailModal?: boolean
}

function usePropertyDetailSafe() {
  try {
    return usePropertyDetail()
  } catch {
    return null
  }
}

export function PropertyCard({
  property,
  neighborhood,
  onDecision,
  imagePriority = false,
  actions,
  floatingAction,
  showStory = true,
  storyVariant = 'tagline',
  showMap = true,
  enableDetailsToggle = false,
  disableDetailModal = false,
}: PropertyCardProps) {
  const { data: mutualLikes = [] } = useMutualLikes()
  const { data: vibes } = usePropertyVibes(showStory ? property.id : undefined)

  const neighborhoodData =
    neighborhood ||
    (property as Property & { neighborhood?: Neighborhood | null })
      .neighborhood ||
    (property as Property & { neighborhoods?: Neighborhood | null })
      .neighborhoods ||
    null

  const { data: neighborhoodVibes } = useNeighborhoodVibes(
    neighborhoodData?.id || property.neighborhood_id || undefined
  )

  const propertyDetail = usePropertyDetailSafe()

  const handleCardClick = useCallback(() => {
    if (!disableDetailModal && propertyDetail) {
      propertyDetail.openPropertyDetail(property, neighborhoodData || undefined)
    }
  }, [disableDetailModal, propertyDetail, property, neighborhoodData])

  const isClickable = !disableDetailModal && !!propertyDetail

  return (
    <PropertyCardUI
      property={property}
      neighborhood={neighborhoodData}
      mutualLikes={mutualLikes}
      propertyVibes={vibes}
      neighborhoodVibes={neighborhoodVibes}
      onDecision={onDecision}
      onCardClick={handleCardClick}
      imagePriority={imagePriority}
      actions={actions}
      floatingAction={floatingAction}
      showStory={showStory}
      storyVariant={storyVariant}
      showMap={showMap}
      enableDetailsToggle={enableDetailsToggle}
      isClickable={isClickable}
    />
  )
}
