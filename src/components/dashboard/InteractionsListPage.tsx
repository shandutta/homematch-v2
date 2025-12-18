'use client'

import { Fragment, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  interactionKeys,
  useDeleteInteraction,
  useInfiniteInteractions,
  useRecordInteraction,
} from '@/hooks/useInteractions'
import { InteractionType } from '@/types/app'
import { PropertyCard } from '@/components/property/PropertyCard'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Heart, HeartOff, X } from 'lucide-react'
import { InFeedAd } from '@/components/ads/InFeedAd'

/** Insert an ad after every N property cards */
const AD_FREQUENCY = 6
const MIN_CONTENT_FOR_ADS = AD_FREQUENCY + 2

interface InteractionsListPageProps {
  type: InteractionType
  title: string
}

export function InteractionsListPage({
  type,
  title,
}: InteractionsListPageProps) {
  const { data, fetchNextPage, hasNextPage, isLoading, isFetchingNextPage } =
    useInfiniteInteractions(type)
  const deleteInteraction = useDeleteInteraction(type)
  const recordInteraction = useRecordInteraction()
  const queryClient = useQueryClient()
  const [pendingPropertyId, setPendingPropertyId] = useState<string | null>(
    null
  )
  const [pendingDecisionId, setPendingDecisionId] = useState<string | null>(
    null
  )
  // Track which decision was made for each property (for visual feedback on viewed page)
  const [propertyDecisions, setPropertyDecisions] = useState<
    Record<string, 'liked' | 'skip'>
  >({})

  // Items come from API typed to the Zod Property schema used across UI
  const properties = data?.pages.flatMap((page) => page.items) ?? []
  const hasEnoughContentForAds = properties.length >= MIN_CONTENT_FOR_ADS

  const renderSkeletons = () =>
    Array.from({ length: 6 }).map((_, i) => (
      <Skeleton
        key={i}
        className="aspect-[3/4] w-full rounded-xl bg-white/5 md:aspect-[4/5] lg:aspect-[4/3]"
      />
    ))

  return (
    <div className="space-y-8">
      <h1 className="font-display text-hm-stone-200 text-4xl font-medium tracking-tight">
        {title}
      </h1>

      {isLoading && properties.length === 0 ? (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {renderSkeletons()}
        </div>
      ) : properties.length === 0 ? (
        <div className="py-20 text-center">
          <h2 className="font-display text-hm-stone-300 text-2xl font-medium">
            No {title.toLowerCase()} yet
          </h2>
          <p className="text-hm-stone-500 mt-2">
            Start swiping to see properties here
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {properties.map((property, index) => {
              const isRemoving =
                pendingPropertyId === property.id && deleteInteraction.isPending
              const isMutatingDecision =
                pendingDecisionId === property.id && recordInteraction.isPending

              const invalidateLists = (decision: 'liked' | 'skip') => {
                queryClient.invalidateQueries({
                  queryKey: interactionKeys.list(type),
                })
                queryClient.invalidateQueries({
                  queryKey: interactionKeys.list(decision),
                })
              }

              const handleDecision = (
                propertyId: string,
                decision: 'liked' | 'skip'
              ) => {
                setPendingDecisionId(propertyId)
                // Track decision for visual feedback
                setPropertyDecisions((prev) => ({
                  ...prev,
                  [propertyId]: decision,
                }))
                recordInteraction.mutate(
                  { propertyId, type: decision },
                  {
                    onSettled: () => {
                      setPendingDecisionId((prev) =>
                        prev === propertyId ? null : prev
                      )
                      invalidateLists(decision)
                    },
                  }
                )
              }

              const renderFloatingAction = () => {
                if (type === 'liked') {
                  return (
                    <button
                      type="button"
                      aria-label="Remove from likes"
                      className="group bg-hm-obsidian-800 text-hm-error hover:border-hm-error/30 hover:bg-hm-error/10 relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-white/10 transition-all duration-200 hover:w-40 focus-visible:w-40 focus-visible:outline-none disabled:opacity-60"
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
                            },
                          }
                        )
                      }}
                    >
                      <div className="pointer-events-none absolute inset-0 flex items-center justify-center transition-opacity duration-150 group-hover:opacity-0 group-focus-visible:opacity-0">
                        <HeartOff className="h-4 w-4" strokeWidth={2} />
                      </div>
                      <span className="pointer-events-none absolute inset-0 flex items-center justify-center px-4 text-xs font-medium whitespace-nowrap opacity-0 transition-opacity delay-75 duration-150 group-hover:opacity-100 group-focus-visible:opacity-100">
                        {isRemoving ? 'Removing...' : 'Remove from likes'}
                      </span>
                    </button>
                  )
                }

                if (type === 'skip') {
                  return (
                    <button
                      type="button"
                      aria-label="Like this home"
                      className="group bg-hm-obsidian-800 text-hm-success hover:border-hm-success/30 hover:bg-hm-success/10 relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-white/10 transition-all duration-200 hover:w-36 focus-visible:w-36 focus-visible:outline-none disabled:opacity-60"
                      disabled={isMutatingDecision}
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDecision(property.id, 'liked')
                      }}
                    >
                      <div className="pointer-events-none absolute inset-0 flex items-center justify-center transition-opacity duration-150 group-hover:opacity-0 group-focus-visible:opacity-0">
                        <Heart className="h-4 w-4" strokeWidth={2} />
                      </div>
                      <span className="pointer-events-none absolute inset-0 flex items-center justify-center px-4 text-xs font-medium whitespace-nowrap opacity-0 transition-opacity delay-75 duration-150 group-hover:opacity-100 group-focus-visible:opacity-100">
                        {isMutatingDecision ? 'Adding...' : 'Like this home'}
                      </span>
                    </button>
                  )
                }

                if (type === 'viewed') {
                  const decision = propertyDecisions[property.id]
                  const isPassSelected = decision === 'skip'
                  const isLikeSelected = decision === 'liked'

                  return (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        aria-label="Pass on this home"
                        className={`group relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border transition-all duration-200 focus-visible:outline-none disabled:opacity-60 ${
                          isPassSelected
                            ? 'border-hm-error/50 bg-hm-error/20 ring-hm-error/30 scale-110 ring-2'
                            : isLikeSelected
                              ? 'bg-hm-obsidian-800/50 border-white/5 opacity-40'
                              : 'bg-hm-obsidian-800 hover:border-hm-error/30 hover:bg-hm-error/10 border-white/10 hover:w-20 focus-visible:w-20'
                        } text-hm-error`}
                        disabled={isMutatingDecision || !!decision}
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDecision(property.id, 'skip')
                        }}
                      >
                        <div
                          className={`pointer-events-none absolute inset-0 flex items-center justify-center transition-opacity duration-150 ${!decision ? 'group-hover:opacity-0 group-focus-visible:opacity-0' : ''}`}
                        >
                          <X className="h-4 w-4" strokeWidth={2} />
                        </div>
                        {!decision && (
                          <span className="pointer-events-none absolute inset-0 flex items-center justify-center px-3 text-xs font-medium whitespace-nowrap opacity-0 transition-opacity delay-75 duration-150 group-hover:opacity-100 group-focus-visible:opacity-100">
                            Pass
                          </span>
                        )}
                      </button>
                      <button
                        type="button"
                        aria-label="Like this home"
                        className={`group relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border transition-all duration-200 focus-visible:outline-none disabled:opacity-60 ${
                          isLikeSelected
                            ? 'border-hm-success/50 bg-hm-success/20 ring-hm-success/30 scale-110 ring-2'
                            : isPassSelected
                              ? 'bg-hm-obsidian-800/50 border-white/5 opacity-40'
                              : 'bg-hm-obsidian-800 hover:border-hm-success/30 hover:bg-hm-success/10 border-white/10 hover:w-20 focus-visible:w-20'
                        } text-hm-success`}
                        disabled={isMutatingDecision || !!decision}
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDecision(property.id, 'liked')
                        }}
                      >
                        <div
                          className={`pointer-events-none absolute inset-0 flex items-center justify-center transition-opacity duration-150 ${!decision ? 'group-hover:opacity-0 group-focus-visible:opacity-0' : ''}`}
                        >
                          <Heart
                            className="h-4 w-4"
                            strokeWidth={2}
                            fill={isLikeSelected ? 'currentColor' : 'none'}
                          />
                        </div>
                        {!decision && (
                          <span className="pointer-events-none absolute inset-0 flex items-center justify-center px-3 text-xs font-medium whitespace-nowrap opacity-0 transition-opacity delay-75 duration-150 group-hover:opacity-100 group-focus-visible:opacity-100">
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
                <Fragment key={property.id}>
                  <div>
                    <PropertyCard
                      property={property}
                      showMap={false}
                      showStory={type !== 'skip'}
                      storyVariant="tagline"
                      floatingAction={renderFloatingAction()}
                      imagePriority={index < 2}
                    />
                  </div>

                  {/* Insert sponsored ad after every AD_FREQUENCY cards when there's enough organic content */}
                  {hasEnoughContentForAds &&
                    (index + 1) % AD_FREQUENCY === 0 &&
                    index < properties.length - 1 && (
                      <InFeedAd
                        position={Math.floor((index + 1) / AD_FREQUENCY)}
                      />
                    )}
                </Fragment>
              )
            })}
          </div>
          {hasNextPage && (
            <div className="mt-12 text-center">
              <Button
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
                className="border-hm-amber-400/30 bg-hm-amber-400/10 text-hm-amber-400 hover:border-hm-amber-400/50 hover:bg-hm-amber-400/20 rounded-full border px-8 py-2 font-medium transition-all duration-200"
              >
                {isFetchingNextPage ? 'Loading...' : 'Load More'}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
