'use client'

import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  type ReactNode,
} from 'react'
import { Property } from '@/lib/schemas/property'
import { InteractionType } from '@/types/app'
import { PropertyCard } from '@/components/property/PropertyCard'
import { PropertyCardSkeleton } from '@/components/shared/PropertyCardSkeleton'
import { CouplesMessages } from '@/lib/utils/couples-messaging'

const FloatingHearts = lazy(() =>
  import('@/components/couples/CouplesMicroInteractions').then((m) => ({
    default: m.FloatingHearts,
  }))
)
const SuccessConfetti = lazy(() =>
  import('@/components/couples/CouplesMicroInteractions').then((m) => ({
    default: m.SuccessConfetti,
  }))
)

interface DashboardPropertyGridProps {
  properties: Property[]
  onDecision: (propertyId: string, type: InteractionType) => void
  isLoading?: boolean
  celebrationTrigger?: {
    type: 'mutual-like' | 'streak' | 'milestone'
    propertyAddress?: string
    partnerName?: string
    count?: number
  } | null
  onView?: (propertyId: string) => void
}

export function DashboardPropertyGrid({
  properties,
  onDecision,
  isLoading = false,
  celebrationTrigger,
  onView,
}: DashboardPropertyGridProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {[0, 1, 2].map((index) => (
          <div key={index} className="h-[520px]">
            <PropertyCardSkeleton />
          </div>
        ))}
      </div>
    )
  }

  if (!properties.length) {
    return (
      <div className="rounded-xl border border-white/5 bg-white/5 px-6 py-12 text-center backdrop-blur-md">
        <h2 className="text-foreground mb-3 text-2xl font-semibold">
          {CouplesMessages.empty.noProperties.title}
        </h2>
        <p className="text-muted-foreground mb-2">
          {CouplesMessages.empty.noProperties.message}
        </p>
        <p className="text-muted-foreground/80 text-sm">
          {CouplesMessages.empty.noProperties.cta}
        </p>
      </div>
    )
  }

  return (
    <div className="relative">
      <Suspense fallback={null}>
        <FloatingHearts
          trigger={celebrationTrigger?.type === 'mutual-like'}
          count={8}
        />
        <SuccessConfetti trigger={celebrationTrigger?.type === 'milestone'} />
      </Suspense>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {properties.map((property) => (
          <PropertyViewTracker
            key={property.id}
            propertyId={property.id}
            onView={onView}
            className="h-[520px]"
          >
            <PropertyCard property={property} onDecision={onDecision} />
          </PropertyViewTracker>
        ))}
      </div>
    </div>
  )
}

export default DashboardPropertyGrid

function PropertyViewTracker({
  children,
  propertyId,
  onView,
  className,
}: {
  children: ReactNode
  propertyId: string
  onView?: (propertyId: string) => void
  className?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const hasTrackedRef = useRef(false)

  const triggerView = useCallback(() => {
    if (!onView || hasTrackedRef.current) return
    hasTrackedRef.current = true
    onView(propertyId)
  }, [onView, propertyId])

  useEffect(() => {
    if (!onView || typeof window === 'undefined') return
    const element = ref.current
    if (!element || hasTrackedRef.current) return
    if (!('IntersectionObserver' in window)) {
      triggerView()
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            triggerView()
          }
        })
      },
      { threshold: 0.6 }
    )

    observer.observe(element)

    return () => {
      observer.disconnect()
    }
  }, [onView, triggerView])

  return (
    <div
      ref={ref}
      onMouseEnter={triggerView}
      onFocus={triggerView}
      className={className}
    >
      {children}
    </div>
  )
}
