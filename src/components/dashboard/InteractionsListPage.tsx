'use client'

import { useState } from 'react'
import {
  useInfiniteInteractions,
  useDeleteInteraction,
} from '@/hooks/useInteractions'
import { InteractionType } from '@/types/app'
import { PropertyCard } from '@/components/property/PropertyCard'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { HeartOff } from 'lucide-react'

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
  const [pendingPropertyId, setPendingPropertyId] = useState<string | null>(
    null
  )

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
            {properties.map((property) => {
              const isRemoving =
                pendingPropertyId === property.id && deleteInteraction.isPending
              return (
                <div key={property.id}>
                  <PropertyCard
                    property={property}
                    floatingAction={
                      type === 'liked' ? (
                        <button
                          type="button"
                          aria-label="Remove from likes"
                          className="group shadow-token-lg relative flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border border-rose-400/40 bg-rose-500/90 text-white transition-[width,background-color] duration-200 ease-out hover:w-[10.5rem] focus-visible:w-[10.5rem] focus-visible:outline-none disabled:opacity-60"
                          disabled={isRemoving}
                          onClick={() => {
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
                      ) : null
                    }
                  />
                </div>
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
