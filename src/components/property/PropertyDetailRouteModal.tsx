'use client'

import { useCallback, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { PropertyDetailModal } from '@/components/property/PropertyDetailModal'
import { useRecordInteraction } from '@/hooks/useInteractions'
import { neighborhoodSchema, propertySchema } from '@/lib/schemas/property'
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

  const parsedProperty = useMemo(() => {
    const result = propertySchema.safeParse(property)
    return result.success ? result.data : null
  }, [property])

  const neighborhood = useMemo(() => {
    const candidate = property.neighborhood || property.neighborhoods
    const result = neighborhoodSchema.safeParse(candidate)
    return result.success ? result.data : undefined
  }, [property.neighborhood, property.neighborhoods])

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

  if (!parsedProperty) {
    return null
  }

  return (
    <PropertyDetailModal
      property={parsedProperty}
      neighborhood={neighborhood}
      open={open}
      onOpenChange={handleOpenChange}
      onDecision={handleDecision}
    />
  )
}
