'use client'

import {
  Fragment,
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { Property } from '@/lib/schemas/property'
import { InteractionType } from '@/types/app'
import { PropertyCard } from '@/components/property/PropertyCard'
import { PropertyCardSkeleton } from '@/components/shared/PropertyCardSkeleton'
import { CouplesMessages } from '@/lib/utils/couples-messaging'
import { SwipeablePropertyCard } from '@/components/properties/SwipeablePropertyCard'
import { InFeedAd } from '@/components/ads/InFeedAd'
import { Heart, SlidersHorizontal, X } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

/** Insert an ad after every N property cards */
const AD_FREQUENCY = 4
const MIN_CONTENT_FOR_ADS = AD_FREQUENCY + 2

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
  const hasEnoughContentForAds = properties.length >= MIN_CONTENT_FOR_ADS

  // Detect small screens to switch to swipe-first layout. We track whether
  // the matchMedia listener has had a chance to run; until it has we rely on
  // CSS responsive classes so SSR/initial paint matches the viewport without
  // waiting on a state-driven re-render (which previously caused the mobile
  // dashboard to render the desktop grid until JS hydration finished).
  const [isMobile, setIsMobile] = useState(false)
  const [hasMounted, setHasMounted] = useState(false)
  const [viewMode, setViewMode] = useState<'grid' | 'stack'>('grid')

  useEffect(() => {
    setHasMounted(true)
    if (typeof window === 'undefined' || !('matchMedia' in window)) return
    const mq = window.matchMedia('(max-width: 1024px)')
    const handleChange = (event: MediaQueryListEvent) => {
      setIsMobile(event.matches)
    }
    setIsMobile(mq.matches)
    mq.addEventListener('change', handleChange)
    return () => mq.removeEventListener('change', handleChange)
  }, [])

  useEffect(() => {
    if (isMobile) {
      setViewMode('stack')
    }
  }, [isMobile])

  const isStackView = isMobile || viewMode === 'stack'

  // Track views for the currently focused card in stack mode
  const viewedRef = useRef(new Set<string>())

  useEffect(() => {
    if (!isStackView || !onView || properties.length === 0) return
    const currentId = properties[0]?.id
    if (!currentId || viewedRef.current.has(currentId)) return
    viewedRef.current.add(currentId)
    onView(currentId)
  }, [isStackView, onView, properties])

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
        <div className="mt-4 flex justify-center">
          <Link href="/settings?tab=preferences">
            <Button
              variant="outline"
              className="text-hm-stone-200 border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10"
            >
              Review filters
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  // Show stack on mobile (≤lg breakpoint) once we know the viewport, OR when
  // the user has explicitly chosen "Card stack" on desktop. Until JS detects
  // the viewport, we render BOTH layouts and let CSS responsive classes pick
  // one — this matches what real users see immediately rather than flashing
  // the desktop grid on mobile while React hydrates.
  const showStackOnly = hasMounted && isStackView
  const showGridOnly = hasMounted && !isStackView

  // Mobile: Tinder-style single-card stack with swipe + buttons
  const stackBranch = (
    <div className="relative">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <Link href="/settings?tab=preferences">
          <Button
            variant="outline"
            className="text-hm-stone-200 border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10"
          >
            <SlidersHorizontal className="h-4 w-4" />
            Filters
          </Button>
        </Link>
        {!isMobile && (
          <div className="inline-flex rounded-full border border-white/10 bg-white/5 p-1 backdrop-blur">
            <button
              type="button"
              className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                viewMode === 'grid'
                  ? 'bg-white/10 text-white shadow-sm'
                  : 'text-muted-foreground hover:text-white'
              }`}
              onClick={() => setViewMode('grid')}
            >
              Grid
            </button>
            <button
              type="button"
              className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                viewMode === 'stack'
                  ? 'bg-white/10 text-white shadow-sm'
                  : 'text-muted-foreground hover:text-white'
              }`}
              onClick={() => setViewMode('stack')}
            >
              Card stack
            </button>
          </div>
        )}
      </div>

      <Suspense fallback={null}>
        <FloatingHearts
          trigger={celebrationTrigger?.type === 'mutual-like'}
          count={8}
        />
        <SuccessConfetti trigger={celebrationTrigger?.type === 'milestone'} />
      </Suspense>

      <SwipeablePropertyCard
        properties={properties}
        currentIndex={0}
        onDecision={onDecision}
        showHints
        className="max-w-md"
      />
    </div>
  )

  // Desktop/tablet: grid of cards with inline like/pass actions
  const gridBranch = (
    <div className="relative">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <Link href="/settings?tab=preferences">
          <Button
            variant="outline"
            className="text-hm-stone-200 border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10"
          >
            <SlidersHorizontal className="h-4 w-4" />
            Filters
          </Button>
        </Link>
        <div className="inline-flex rounded-full border border-white/10 bg-white/5 p-1 backdrop-blur">
          <button
            type="button"
            className="rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors"
            onClick={() => setViewMode('grid')}
          >
            Grid
          </button>
          <button
            type="button"
            className="text-muted-foreground rounded-full px-4 py-2 text-sm font-semibold transition-colors hover:text-white"
            onClick={() => setViewMode('stack')}
          >
            Card stack
          </button>
        </div>
      </div>

      <Suspense fallback={null}>
        <FloatingHearts
          trigger={celebrationTrigger?.type === 'mutual-like'}
          count={8}
        />
        <SuccessConfetti trigger={celebrationTrigger?.type === 'milestone'} />
      </Suspense>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {properties.map((property, index) => (
          <Fragment key={property.id}>
            <PropertyViewTracker
              propertyId={property.id}
              onView={onView}
              className="min-h-[520px]"
            >
              <PropertyCard
                property={property}
                showStory
                storyVariant="futureVision"
                showMap={false}
                enableDetailsToggle
                imagePriority={index === 0}
                floatingAction={
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      aria-label="Pass on this home"
                      className="flex h-11 w-11 items-center justify-center rounded-full border border-rose-400/40 bg-rose-500/90 text-white shadow-lg transition-all duration-200 hover:scale-110 hover:bg-rose-600 focus-visible:outline-none"
                      onClick={(e) => {
                        e.stopPropagation()
                        onDecision(property.id, 'skip')
                      }}
                    >
                      <X className="h-5 w-5" strokeWidth={2.5} />
                    </button>
                    <button
                      type="button"
                      aria-label="Like this home"
                      className="flex h-11 w-11 items-center justify-center rounded-full border border-emerald-200/60 bg-emerald-500/90 text-white shadow-lg transition-all duration-200 hover:scale-110 hover:bg-emerald-600 focus-visible:outline-none"
                      onClick={(e) => {
                        e.stopPropagation()
                        onDecision(property.id, 'liked')
                      }}
                    >
                      <Heart className="h-5 w-5" strokeWidth={2.5} />
                    </button>
                  </div>
                }
              />
            </PropertyViewTracker>

            {/* Insert sponsored ad after every AD_FREQUENCY cards when there's enough organic content */}
            {hasEnoughContentForAds &&
              (index + 1) % AD_FREQUENCY === 0 &&
              index < properties.length - 1 && (
                <InFeedAd position={Math.floor((index + 1) / AD_FREQUENCY)} />
              )}
          </Fragment>
        ))}
      </div>
    </div>
  )

  // Post-hydration: pick one branch based on JS-detected viewport + user
  // preference. Pre-hydration: render both, using Tailwind responsive classes
  // to ensure the correct one is visible at first paint.
  if (showStackOnly) {
    return stackBranch
  }
  if (showGridOnly) {
    return gridBranch
  }
  // renderBoth: SSR + first client paint. Mobile (<lg) sees stack, desktop
  // (≥lg) sees grid via display utility classes — matches the 1024px
  // breakpoint used by the matchMedia listener above.
  return (
    <>
      <div className="lg:hidden">{stackBranch}</div>
      <div className="hidden lg:block">{gridBranch}</div>
    </>
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
    if (!(element instanceof Element)) {
      triggerView()
      return
    }
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

    try {
      observer.observe(element)
    } catch (observeError) {
      console.error(
        '[PropertyViewTracker] Failed to observe element',
        observeError
      )
      triggerView()
      return
    }

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
