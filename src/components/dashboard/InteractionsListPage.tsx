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

  const renderSkeletons = () =>
    Array.from({ length: 6 }).map((_, i) => (
      <Skeleton key={i} className="h-96 w-full rounded-xl bg-white/10" />
    ))

  return (
    <div className="space-y-8">
      <h1 className="text-4xl font-bold text-white">{title}</h1>

      {isLoading && properties.length === 0 ? (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {renderSkeletons()}
        </div>
      ) : properties.length === 0 ? (
        <div className="py-20 text-center">
          <h2 className="text-2xl font-semibold text-white">
            No {title.toLowerCase()} yet.
          </h2>
          <p className="mt-2 text-purple-300/80">
            Start swiping to see properties here!
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
                      className="group shadow-token-lg relative flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border border-rose-400/40 bg-rose-500/90 text-white transition-[width,background-color] duration-200 ease-out hover:w-[10.5rem] focus-visible:w-[10.5rem] focus-visible:outline-none disabled:opacity-60"
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
                      <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-4 transition-opacity duration-150 group-hover:opacity-0 group-focus-visible:opacity-0">
                        <HeartOff className="h-6 w-6" strokeWidth={2.25} />
                      </div>
                      <span className="pointer-events-none absolute inset-0 flex items-center justify-center px-4 text-sm font-semibold whitespace-nowrap opacity-0 transition-opacity delay-75 duration-150 group-hover:opacity-100 group-focus-visible:opacity-100">
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
                      className="group shadow-token-lg relative flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border border-emerald-200/60 bg-emerald-500/90 text-white transition-[width,background-color] duration-200 ease-out hover:w-[10.5rem] focus-visible:w-[10.5rem] focus-visible:outline-none disabled:opacity-60"
                      disabled={isMutatingDecision}
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDecision(property.id, 'liked')
                      }}
                    >
                      <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-4 transition-opacity duration-150 group-hover:opacity-0 group-focus-visible:opacity-0">
                        <Heart className="h-6 w-6" strokeWidth={2.25} />
                      </div>
                      <span className="pointer-events-none absolute inset-0 flex items-center justify-center px-4 text-sm font-semibold whitespace-nowrap opacity-0 transition-opacity delay-75 duration-150 group-hover:opacity-100 group-focus-visible:opacity-100">
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

                  {/* Insert sponsored ad after every AD_FREQUENCY cards */}
                  {(index + 1) % AD_FREQUENCY === 0 &&
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
                className="bg-purple-600 text-white hover:bg-purple-700"
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
