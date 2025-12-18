'use client'

import { useCallback, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { PropertyDetailModal } from '@/components/property/PropertyDetailModal'
import { useRecordInteraction } from '@/hooks/useInteractions'
import type { Neighborhood, Property } from '@/lib/schemas/property'
import type { InteractionType } from '@/types/app'
import type { PropertyWithNeighborhood } from '@/types/database'

interface PropertyDetailRouteModalProps {
  property: PropertyWithNeighborhood
  returnTo?: string
}

export function PropertyDetailRouteModal({
  property,
  returnTo,
}: PropertyDetailRouteModalProps) {
  const router = useRouter()
  const recordInteraction = useRecordInteraction()
  const [open, setOpen] = useState(true)

  const neighborhood = useMemo(
    () => property.neighborhood || property.neighborhoods || undefined,
    [property.neighborhood, property.neighborhoods]
  )

  const handleDecision = useCallback(
    (propertyId: string, type: InteractionType) => {
      recordInteraction.mutate({ propertyId, type })
    },
    [recordInteraction]
  )

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      setOpen(nextOpen)
      if (nextOpen) return

      router.replace(returnTo || '/dashboard')
    },
    [returnTo, router]
  )

  return (
    <PropertyDetailModal
      property={property as unknown as Property}
      neighborhood={neighborhood as unknown as Neighborhood | undefined}
      open={open}
      onOpenChange={handleOpenChange}
      onDecision={handleDecision}
    />
  )
}
