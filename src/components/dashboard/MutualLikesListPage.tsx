'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { useMutualLikes } from '@/hooks/useCouples'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { PropertyImage } from '@/components/ui/property-image'
import { Heart, Users, ChevronRight } from 'lucide-react'
import { MutualLikesBadge } from '@/components/features/couples/MutualLikesBadge'
import { dashboardTokens } from '@/lib/styles/dashboard-tokens'

export function MutualLikesListPage() {
  const query = useMutualLikes()

  const mutualLikes = useMemo(() => {
    const likes = query.data ?? []
    return [...likes].sort(
      (a, b) =>
        new Date(b.last_liked_at).getTime() -
        new Date(a.last_liked_at).getTime()
    )
  }, [query.data])

  return (
    <div
      className="space-y-6 sm:space-y-8"
      data-testid="dashboard-mutual-likes"
    >
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <h1 className="font-display text-hm-stone-200 text-2xl font-medium tracking-tight sm:text-4xl">
            Mutual Likes
          </h1>
          <p className="text-hm-stone-500 mt-2 max-w-2xl text-sm sm:text-base">
            Homes your household liked — tap a card to see details.
          </p>
        </div>

        <Button
          variant="ghost"
          size="sm"
          asChild
          className="self-start sm:self-auto"
        >
          <Link href="/couples" className="text-hm-stone-300 hover:text-white">
            Household hub
            <ChevronRight className="ml-1 h-4 w-4" />
          </Link>
        </Button>
      </div>

      {query.isLoading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {Array.from({ length: 6 }).map((_, index) => (
            <Card
              key={index}
              className="border-white/10"
              style={{
                backgroundColor: dashboardTokens.colors.background.cardDark,
                borderColor: dashboardTokens.colors.secondary[700],
              }}
            >
              <CardContent className="flex items-start gap-4 p-4">
                <Skeleton className="h-20 w-20 bg-white/10" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4 bg-white/10" />
                  <Skeleton className="h-4 w-1/2 bg-white/10" />
                  <Skeleton className="h-3 w-1/3 bg-white/10" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : query.error ? (
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-6 py-12 text-center backdrop-blur">
          <p className="text-hm-error text-sm font-semibold">
            Couldn’t load mutual likes
          </p>
          <p className="text-hm-stone-500 mt-2 text-sm">
            {query.error.message || 'Please try again.'}
          </p>
          <Button
            variant="outline"
            className="mt-6"
            onClick={() => query.refetch()}
          >
            Try again
          </Button>
        </div>
      ) : mutualLikes.length === 0 ? (
        <Card
          className="border-white/10"
          style={{
            backgroundColor: dashboardTokens.colors.background.cardDark,
            borderColor: dashboardTokens.colors.secondary[700],
          }}
        >
          <CardContent className="p-10 text-center">
            <div className="mb-5 flex justify-center">
              <div className="relative">
                <Heart className="text-couples-primary/40 h-12 w-12 fill-current" />
                <Users className="text-couples-secondary absolute -top-2 -right-2 h-5 w-5" />
              </div>
            </div>
            <h2 className="text-hm-stone-100 text-xl font-semibold">
              No mutual likes yet
            </h2>
            <p className="text-hm-stone-300 mx-auto mt-2 max-w-xl text-sm">
              Keep swiping — when your household likes the same home it will
              appear here.
            </p>
            <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button
                asChild
                className="bg-gradient-couples-mutual hover:opacity-80"
              >
                <Link href="/dashboard">Start swiping</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/couples">Household hub</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {mutualLikes.map((like) => (
            <Card
              key={like.property_id}
              className="border-white/10"
              style={{
                backgroundColor: dashboardTokens.colors.background.cardDark,
                borderColor: dashboardTokens.colors.secondary[700],
              }}
            >
              <CardContent className="p-4">
                <Link
                  href={`/properties/${like.property_id}?returnTo=/dashboard/mutual-likes`}
                  className="group block"
                >
                  <div className="flex items-start gap-4">
                    <div className="relative h-20 w-20 overflow-hidden rounded-lg border border-white/10">
                      <PropertyImage
                        src={like.property?.images || like.property?.image_urls}
                        alt={like.property?.address || 'Property'}
                        fill
                        className="object-cover transition-transform group-hover:scale-105"
                        sizes="80px"
                      />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-hm-stone-100 truncate text-sm font-semibold">
                          {like.property?.address ||
                            `Property ${like.property_id.slice(0, 8)}`}
                        </p>
                        <MutualLikesBadge
                          likedByCount={like.liked_by_count}
                          variant="compact"
                          showAnimation={false}
                        />
                      </div>

                      {like.property && (
                        <p className="text-hm-stone-400 mt-1 text-xs">
                          ${Math.round(like.property.price / 1000)}k •{' '}
                          {like.property.bedrooms} bd •{' '}
                          {like.property.bathrooms} ba
                        </p>
                      )}

                      <p className="text-hm-stone-500 mt-3 text-xs">
                        Last liked{' '}
                        {new Date(like.last_liked_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
