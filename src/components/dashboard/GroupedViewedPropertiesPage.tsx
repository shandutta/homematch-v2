'use client'

import { Fragment, useEffect, useState } from 'react'
import Link from 'next/link'
import { useQueryClient } from '@tanstack/react-query'
import {
  interactionKeys,
  useDeleteInteraction,
  useInfiniteInteractions,
  useRecordInteraction,
} from '@/hooks/useInteractions'
import { PropertyCard } from '@/components/property/PropertyCard'
import { PropertyCardSkeleton } from '@/components/shared/PropertyCardSkeleton'
import { Button } from '@/components/ui/button'
import { Heart, HeartOff, History, X } from 'lucide-react'
import { InFeedAd } from '@/components/ads/InFeedAd'
import { Property } from '@/lib/schemas/property'
import { cn } from '@/lib/utils'

/** Insert an ad after every N property cards within each section */
const AD_FREQUENCY = 6
const MIN_CONTENT_FOR_ADS = AD_FREQUENCY + 2

type ViewedSectionType = 'liked' | 'skip' | 'viewed-only'

interface PropertySectionProps {
  title: string
  description: string
  properties: Property[]
  type: ViewedSectionType
  pendingPropertyId: string | null
  setPendingPropertyId: React.Dispatch<React.SetStateAction<string | null>>
  pendingDecisionId: string | null
  setPendingDecisionId: React.Dispatch<React.SetStateAction<string | null>>
  propertyDecisions: Record<string, 'liked' | 'skip'>
  setPropertyDecisions: React.Dispatch<
    React.SetStateAction<Record<string, 'liked' | 'skip'>>
  >
  deleteInteraction: ReturnType<typeof useDeleteInteraction>
  recordInteraction: ReturnType<typeof useRecordInteraction>
  queryClient: ReturnType<typeof useQueryClient>
}

function PropertySection({
  title,
  description,
  properties,
  type,
  pendingPropertyId,
  setPendingPropertyId,
  pendingDecisionId,
  setPendingDecisionId,
  propertyDecisions,
  setPropertyDecisions,
  deleteInteraction,
  recordInteraction,
  queryClient,
}: PropertySectionProps) {
  if (properties.length === 0) return null

  const hasEnoughContentForAds = properties.length >= MIN_CONTENT_FOR_ADS

  const invalidateLists = (decision: 'liked' | 'skip') => {
    queryClient.invalidateQueries({
      queryKey: interactionKeys.list('viewed'),
    })
    queryClient.invalidateQueries({
      queryKey: interactionKeys.list(decision),
    })
  }

  const handleDecision = (propertyId: string, decision: 'liked' | 'skip') => {
    setPendingDecisionId(propertyId)
    setPropertyDecisions((prev) => ({
      ...prev,
      [propertyId]: decision,
    }))
    recordInteraction.mutate(
      { propertyId, type: decision },
      {
        onSettled: () => {
          setPendingDecisionId((prev) => (prev === propertyId ? null : prev))
          invalidateLists(decision)
        },
      }
    )
  }

  const renderFloatingAction = (property: Property) => {
    const isRemoving =
      pendingPropertyId === property.id && deleteInteraction.isPending
    const isMutatingDecision =
      pendingDecisionId === property.id && recordInteraction.isPending

    // Liked section: Show "Remove from likes" button (highlighted/active state)
    if (type === 'liked') {
      return (
        <button
          type="button"
          aria-label="Remove from likes"
          data-testid={`remove-like-${property.id}`}
          className="group shadow-token-lg relative flex h-12 w-12 scale-110 items-center justify-center overflow-hidden rounded-full border border-rose-300 bg-rose-600 text-white ring-2 ring-rose-300/50 transition-[width,background-color] duration-200 ease-out hover:w-[10.5rem] focus-visible:w-[10.5rem] focus-visible:outline-none disabled:opacity-60"
          disabled={isRemoving}
          onClick={(e) => {
            e.stopPropagation()
            setPendingPropertyId(property.id)
            deleteInteraction.mutate(
              { propertyId: property.id },
              {
                onSettled: () => {
                  setPendingPropertyId((prev) =>
                    prev === property.id ? null : prev
                  )
                  // Also invalidate the passed list since removing a like moves it there
                  queryClient.invalidateQueries({
                    queryKey: interactionKeys.list('skip'),
                  })
                },
              }
            )
          }}
        >
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-4 transition-opacity duration-150 group-hover:opacity-0 group-focus-visible:opacity-0">
            <HeartOff className="h-6 w-6" strokeWidth={2.25} />
          </div>
          <span className="pointer-events-none absolute inset-0 flex items-center justify-center px-4 text-sm font-semibold whitespace-nowrap opacity-0 transition-opacity delay-75 duration-150 group-hover:opacity-100 group-focus-visible:opacity-100">
            {isRemoving ? 'Removing...' : 'Remove from likes'}
          </span>
        </button>
      )
    }

    // Passed section: Show "Like this home" button (highlighted/active state)
    if (type === 'skip') {
      return (
        <button
          type="button"
          aria-label="Like this home"
          data-testid={`like-${property.id}`}
          className="group shadow-token-lg relative flex h-12 w-12 scale-110 items-center justify-center overflow-hidden rounded-full border border-emerald-300 bg-emerald-600 text-white ring-2 ring-emerald-300/50 transition-[width,background-color] duration-200 ease-out hover:w-[10.5rem] focus-visible:w-[10.5rem] focus-visible:outline-none disabled:opacity-60"
          disabled={isMutatingDecision}
          onClick={(e) => {
            e.stopPropagation()
            handleDecision(property.id, 'liked')
          }}
        >
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-4 transition-opacity duration-150 group-hover:opacity-0 group-focus-visible:opacity-0">
            <Heart className="h-6 w-6" strokeWidth={2.25} fill="currentColor" />
          </div>
          <span className="pointer-events-none absolute inset-0 flex items-center justify-center px-4 text-sm font-semibold whitespace-nowrap opacity-0 transition-opacity delay-75 duration-150 group-hover:opacity-100 group-focus-visible:opacity-100">
            {isMutatingDecision ? 'Adding...' : 'Like this home'}
          </span>
        </button>
      )
    }

    // Viewed-only section: Show both Pass and Like buttons
    if (type === 'viewed-only') {
      const decision = propertyDecisions[property.id]
      const isPassSelected = decision === 'skip'
      const isLikeSelected = decision === 'liked'

      return (
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Pass on this home"
            data-testid={`pass-${property.id}`}
            className={`group shadow-token-lg relative flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border transition-all duration-200 ease-out focus-visible:outline-none disabled:opacity-60 ${
              isPassSelected
                ? 'scale-110 border-rose-300 bg-rose-600 ring-2 ring-rose-300/50'
                : isLikeSelected
                  ? 'border-rose-400/20 bg-rose-500/40 opacity-50'
                  : 'border-rose-400/40 bg-rose-500/90 hover:w-24 focus-visible:w-24'
            } text-white`}
            disabled={isMutatingDecision || !!decision}
            onClick={(e) => {
              e.stopPropagation()
              handleDecision(property.id, 'skip')
            }}
          >
            <div
              className={`pointer-events-none absolute inset-0 flex items-center justify-center px-4 transition-opacity duration-150 ${!decision ? 'group-hover:opacity-0 group-focus-visible:opacity-0' : ''}`}
            >
              <X className="h-6 w-6" strokeWidth={2.25} />
            </div>
            {!decision && (
              <span className="pointer-events-none absolute inset-0 flex items-center justify-center px-4 text-sm font-semibold whitespace-nowrap opacity-0 transition-opacity delay-75 duration-150 group-hover:opacity-100 group-focus-visible:opacity-100">
                Pass
              </span>
            )}
          </button>
          <button
            type="button"
            aria-label="Like this home"
            data-testid={`like-${property.id}`}
            className={`group shadow-token-lg relative flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border transition-all duration-200 ease-out focus-visible:outline-none disabled:opacity-60 ${
              isLikeSelected
                ? 'scale-110 border-emerald-300 bg-emerald-600 ring-2 ring-emerald-300/50'
                : isPassSelected
                  ? 'border-emerald-200/20 bg-emerald-500/40 opacity-50'
                  : 'border-emerald-200/60 bg-emerald-500/90 hover:w-24 focus-visible:w-24'
            } text-white`}
            disabled={isMutatingDecision || !!decision}
            onClick={(e) => {
              e.stopPropagation()
              handleDecision(property.id, 'liked')
            }}
          >
            <div
              className={`pointer-events-none absolute inset-0 flex items-center justify-center px-4 transition-opacity duration-150 ${!decision ? 'group-hover:opacity-0 group-focus-visible:opacity-0' : ''}`}
            >
              <Heart
                className="h-6 w-6"
                strokeWidth={2.25}
                fill={isLikeSelected ? 'currentColor' : 'none'}
              />
            </div>
            {!decision && (
              <span className="pointer-events-none absolute inset-0 flex items-center justify-center px-4 text-sm font-semibold whitespace-nowrap opacity-0 transition-opacity delay-75 duration-150 group-hover:opacity-100 group-focus-visible:opacity-100">
                Like
              </span>
            )}
          </button>
        </div>
      )
    }

    return null
  }

  return (
    <section
      id={`section-${type}`}
      data-testid={`section-${type}`}
      className="space-y-4"
    >
      <div>
        <h2 className="font-display text-hm-stone-200 text-xl font-medium tracking-tight sm:text-2xl">
          {title}
        </h2>
        <p className="text-hm-stone-500 text-sm">{description}</p>
      </div>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {properties.map((property, index) => (
          <Fragment key={property.id}>
            <div data-testid={`property-card-${property.id}`}>
              <PropertyCard
                property={property}
                showMap={false}
                showStory={type !== 'skip'}
                storyVariant="tagline"
                floatingAction={renderFloatingAction(property)}
                imagePriority={index < 2}
              />
            </div>

            {/* Insert sponsored ad after every AD_FREQUENCY cards when there's enough organic content */}
            {hasEnoughContentForAds &&
              (index + 1) % AD_FREQUENCY === 0 &&
              index < properties.length - 1 && (
                <InFeedAd position={Math.floor((index + 1) / AD_FREQUENCY)} />
              )}
          </Fragment>
        ))}
      </div>
    </section>
  )
}

export function GroupedViewedPropertiesPage() {
  const queryClient = useQueryClient()

  // Fetch all three lists
  const likedQuery = useInfiniteInteractions('liked')
  const passedQuery = useInfiniteInteractions('skip')
  const viewedQuery = useInfiniteInteractions('viewed')

  const deleteInteractionLiked = useDeleteInteraction('liked')
  const recordInteraction = useRecordInteraction()

  const [pendingPropertyId, setPendingPropertyId] = useState<string | null>(
    null
  )
  const [pendingDecisionId, setPendingDecisionId] = useState<string | null>(
    null
  )
  const [propertyDecisions, setPropertyDecisions] = useState<
    Record<string, 'liked' | 'skip'>
  >({})

  // Extract properties from paginated responses
  const likedProperties =
    likedQuery.data?.pages.flatMap((page) => page.items) ?? []
  const passedProperties =
    passedQuery.data?.pages.flatMap((page) => page.items) ?? []
  const allViewedProperties =
    viewedQuery.data?.pages.flatMap((page) => page.items) ?? []

  // Create sets for efficient lookup
  const likedIds = new Set(likedProperties.map((p) => p.id))
  const passedIds = new Set(passedProperties.map((p) => p.id))

  // Filter viewed-only: properties that have been viewed but not liked or passed
  const viewedOnlyProperties = allViewedProperties.filter(
    (p) => !likedIds.has(p.id) && !passedIds.has(p.id)
  )

  const likedCount = likedProperties.length
  const passedCount = passedProperties.length
  const viewedOnlyCount = viewedOnlyProperties.length

  const defaultSection: ViewedSectionType = likedCount
    ? 'liked'
    : passedCount
      ? 'skip'
      : viewedOnlyCount
        ? 'viewed-only'
        : 'liked'

  const [activeSection, setActiveSection] = useState<ViewedSectionType>(
    () => defaultSection
  )

  useEffect(() => {
    if (
      (activeSection === 'liked' && likedCount > 0) ||
      (activeSection === 'skip' && passedCount > 0) ||
      (activeSection === 'viewed-only' && viewedOnlyCount > 0)
    ) {
      return
    }

    if (likedCount > 0) {
      setActiveSection('liked')
    } else if (passedCount > 0) {
      setActiveSection('skip')
    } else if (viewedOnlyCount > 0) {
      setActiveSection('viewed-only')
    }
  }, [activeSection, likedCount, passedCount, viewedOnlyCount])

  const isLoading =
    likedQuery.isLoading || passedQuery.isLoading || viewedQuery.isLoading

  const hasAnyProperties =
    likedProperties.length > 0 ||
    passedProperties.length > 0 ||
    viewedOnlyProperties.length > 0

  const hasNextPage =
    likedQuery.hasNextPage || passedQuery.hasNextPage || viewedQuery.hasNextPage

  const isFetchingNextPage =
    likedQuery.isFetchingNextPage ||
    passedQuery.isFetchingNextPage ||
    viewedQuery.isFetchingNextPage

  const fetchAllNextPages = () => {
    if (likedQuery.hasNextPage) likedQuery.fetchNextPage()
    if (passedQuery.hasNextPage) passedQuery.fetchNextPage()
    if (viewedQuery.hasNextPage) viewedQuery.fetchNextPage()
  }

  const renderSkeletons = () =>
    Array.from({ length: 6 }).map((_, i) => <PropertyCardSkeleton key={i} />)

  const sharedSectionProps = {
    pendingPropertyId,
    setPendingPropertyId,
    pendingDecisionId,
    setPendingDecisionId,
    propertyDecisions,
    setPropertyDecisions,
    deleteInteraction: deleteInteractionLiked,
    recordInteraction,
    queryClient,
  }

  return (
    <div className="space-y-10 sm:space-y-12">
      <h1 className="font-display text-hm-stone-200 text-2xl font-medium tracking-tight sm:text-4xl">
        Viewed Properties
      </h1>

      {isLoading && !hasAnyProperties ? (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {renderSkeletons()}
        </div>
      ) : !hasAnyProperties ? (
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-6 py-16 text-center backdrop-blur">
          <History className="text-hm-amber-400 mx-auto h-10 w-10" />
          <h2 className="font-display text-hm-stone-200 mt-5 text-2xl font-medium tracking-tight">
            No viewed properties yet
          </h2>
          <p className="text-hm-stone-500 mx-auto mt-2 max-w-xl text-sm sm:text-base">
            Swipe through recommendations, then come back here to refine your
            shortlist with your partner.
          </p>

          <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button
              asChild
              className="border-hm-amber-400/30 bg-hm-amber-400/10 text-hm-amber-400 hover:border-hm-amber-400/50 hover:bg-hm-amber-400/20 rounded-full border px-8 py-2 font-medium transition-all duration-200"
            >
              <Link href="/dashboard">Start swiping</Link>
            </Button>
            <Button
              asChild
              variant="ghost"
              className="text-hm-stone-400 hover:text-hm-stone-200"
            >
              <Link href="/dashboard/liked">Review favorites</Link>
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div className="sm:hidden">
            <div className="flex w-full items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] p-1">
              {[
                { id: 'liked', label: 'Liked', count: likedCount },
                { id: 'skip', label: 'Passed', count: passedCount },
                {
                  id: 'viewed-only',
                  label: 'Undecided',
                  count: viewedOnlyCount,
                },
              ].map((section) => {
                const isActive = activeSection === section.id
                const isDisabled = section.count === 0
                return (
                  <button
                    key={section.id}
                    type="button"
                    onClick={() =>
                      setActiveSection(section.id as ViewedSectionType)
                    }
                    disabled={isDisabled}
                    aria-pressed={isActive}
                    className={cn(
                      'flex flex-1 items-center justify-center gap-2 rounded-full px-3 py-2 text-xs font-semibold transition',
                      isActive
                        ? 'bg-white/10 text-white shadow-inner'
                        : 'text-hm-stone-400 hover:text-hm-stone-200',
                      isDisabled && 'cursor-not-allowed opacity-50'
                    )}
                  >
                    <span>{section.label}</span>
                    <span
                      className={cn(
                        'rounded-full px-2 py-0.5 text-[11px]',
                        isActive ? 'bg-white/20' : 'bg-white/10'
                      )}
                    >
                      {section.count}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Section 1: Liked Properties */}
          <div className={cn(activeSection !== 'liked' && 'hidden sm:block')}>
            <PropertySection
              title="Liked Properties"
              description="Properties you've liked. Click to remove from likes."
              properties={likedProperties}
              type="liked"
              {...sharedSectionProps}
            />
          </div>

          {/* Section 2: Passed Properties */}
          <div className={cn(activeSection !== 'skip' && 'hidden sm:block')}>
            <PropertySection
              title="Passed Properties"
              description="Properties you've passed on. Click to like instead."
              properties={passedProperties}
              type="skip"
              {...sharedSectionProps}
            />
          </div>

          {/* Section 3: Viewed Only (not liked or passed) */}
          <div
            className={cn(activeSection !== 'viewed-only' && 'hidden sm:block')}
          >
            <PropertySection
              title="Undecided"
              description="Homes you've seen but haven't decided on yet."
              properties={viewedOnlyProperties}
              type="viewed-only"
              {...sharedSectionProps}
            />
          </div>

          {hasNextPage && (
            <div className="mt-12 text-center">
              <Button
                onClick={fetchAllNextPages}
                disabled={isFetchingNextPage}
                className="border-hm-amber-400/30 bg-hm-amber-400/10 text-hm-amber-400 hover:border-hm-amber-400/50 hover:bg-hm-amber-400/20 rounded-full border px-8 py-2 font-medium transition-all duration-200"
              >
                {isFetchingNextPage ? 'Loading more...' : 'Load More'}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
