'use client'

import { useInfiniteInteractions } from '@/hooks/useInteractions'
import { InteractionType } from '@/types/app'
import { PropertyCard } from '@/components/property/PropertyCard'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

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
            {properties.map((property) => (
              <PropertyCard key={property.id} property={property} />
            ))}
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
