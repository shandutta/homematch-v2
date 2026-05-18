'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useMutualLikes } from '@/hooks/useCouples'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { PropertyImage } from '@/components/ui/property-image'
import { Heart, Users, ChevronRight, Sparkles, SearchX } from 'lucide-react'
import { MotionDiv } from '@/components/ui/motion-components'
import { MutualLikesBadge } from '@/components/features/couples/MutualLikesBadge'
import { MutualLikesComparePanel } from './MutualLikesComparePanel'

const MAX_COMPARE = 3

type SortKey = 'recent' | 'most-liked' | 'price-desc' | 'price-asc'
type BedFilter = 'any' | '1' | '2' | '3' | '4'

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'recent', label: 'Recently liked' },
  { value: 'most-liked', label: 'Most liked' },
  { value: 'price-desc', label: 'Highest price' },
  { value: 'price-asc', label: 'Lowest price' },
]

const BED_FILTER_OPTIONS: { value: BedFilter; label: string }[] = [
  { value: 'any', label: 'Any beds' },
  { value: '1', label: '1+ beds' },
  { value: '2', label: '2+ beds' },
  { value: '3', label: '3+ beds' },
  { value: '4', label: '4+ beds' },
]

const SELECT_CLASS =
  'rounded-md border border-hm-border-strong bg-white/80 px-3 py-1.5 text-sm text-hm-ink shadow-sm hover:border-hm-border-strong focus:border-hm-accent focus:outline-none focus:ring-1 focus:ring-hm-accent/40'

export function MutualLikesListPage() {
  const query = useMutualLikes()
  const [sortKey, setSortKey] = useState<SortKey>('recent')
  const [bedFilter, setBedFilter] = useState<BedFilter>('any')
  const [compareMode, setCompareMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [hasMounted, setHasMounted] = useState(false)

  useEffect(() => {
    setHasMounted(true)
  }, [])

  const allLikes = useMemo(() => query.data ?? [], [query.data])
  const totalLikes = allLikes.length

  const toggleSelected = (propertyId: string) => {
    setSelectedIds((prev) => {
      if (prev.includes(propertyId)) {
        return prev.filter((id) => id !== propertyId)
      }
      if (prev.length >= MAX_COMPARE) {
        return prev
      }
      return [...prev, propertyId]
    })
  }

  const exitCompareMode = () => {
    setCompareMode(false)
    setSelectedIds([])
  }

  const selectedLikes = selectedIds
    .map((id) => allLikes.find((like) => like.property_id === id))
    .filter((like): like is NonNullable<typeof like> => like !== undefined)

  const mutualLikes = useMemo(() => {
    const minBeds = bedFilter === 'any' ? 0 : Number(bedFilter)
    const filtered = allLikes.filter((like) => {
      if (minBeds === 0) return true
      const beds = like.property?.bedrooms
      return typeof beds === 'number' && beds >= minBeds
    })

    return [...filtered].sort((a, b) => {
      switch (sortKey) {
        case 'most-liked':
          return (b.liked_by_count ?? 0) - (a.liked_by_count ?? 0)
        case 'price-desc':
          return (b.property?.price ?? 0) - (a.property?.price ?? 0)
        case 'price-asc':
          return (
            (a.property?.price ?? Number.POSITIVE_INFINITY) -
            (b.property?.price ?? Number.POSITIVE_INFINITY)
          )
        case 'recent':
        default:
          return (
            new Date(b.last_liked_at).getTime() -
            new Date(a.last_liked_at).getTime()
          )
      }
    })
  }, [allLikes, sortKey, bedFilter])

  const isFilteredEmpty =
    !query.isLoading &&
    !query.error &&
    totalLikes > 0 &&
    mutualLikes.length === 0

  return (
    <div
      className="space-y-6 sm:space-y-8"
      data-testid="dashboard-mutual-likes"
    >
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <h1 className="font-display text-hm-ink text-2xl font-medium tracking-tight sm:text-4xl">
            Mutual Likes
          </h1>
          <p className="text-hm-faint mt-2 max-w-2xl text-sm sm:text-base">
            Homes your household liked — tap a card to see details.
          </p>
        </div>

        <Button
          variant="ghost"
          size="sm"
          asChild
          className="self-start sm:self-auto"
        >
          <Link
            href="/couples"
            className="text-hm-faint hover:text-hm-ink"
          >
            Household hub
            <ChevronRight className="ml-1 h-4 w-4" />
          </Link>
        </Button>
      </div>

      {!query.isLoading && !query.error && totalLikes > 0 && (
        <div
          className="flex flex-wrap items-center gap-3"
          data-testid="mutual-likes-toolbar"
        >
          <label className="text-hm-muted flex items-center gap-2 text-xs">
            <span>Sort</span>
            <select
              aria-label="Sort mutual likes"
              data-testid="mutual-likes-sort"
              value={sortKey}
              onChange={(event) => {
                const v = event.target.value
                if (SORT_OPTIONS.some((o) => o.value === v)) {
                  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
                  setSortKey(v as SortKey)
                } else {
                  setSortKey('recent')
                }
              }}
              className={SELECT_CLASS}
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="text-hm-muted flex items-center gap-2 text-xs">
            <span>Filter</span>
            <select
              aria-label="Filter mutual likes by bedrooms"
              data-testid="mutual-likes-bed-filter"
              value={bedFilter}
              onChange={(event) => {
                const v = event.target.value
                if (BED_FILTER_OPTIONS.some((o) => o.value === v)) {
                  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
                  setBedFilter(v as BedFilter)
                } else {
                  setBedFilter('any')
                }
              }}
              className={SELECT_CLASS}
            >
              {BED_FILTER_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <span
            className="text-hm-faint text-xs"
            data-testid="mutual-likes-count"
            aria-live="polite"
          >
            Showing {mutualLikes.length} of {totalLikes}
          </span>

          <Button
            type="button"
            variant={compareMode ? 'default' : 'outline'}
            size="sm"
            onClick={() => {
              if (compareMode) {
                exitCompareMode()
              } else {
                setCompareMode(true)
              }
            }}
            data-testid="mutual-likes-compare-toggle"
            aria-pressed={compareMode}
            className="ml-auto"
          >
            {compareMode ? 'Done comparing' : 'Compare'}
          </Button>
        </div>
      )}

      {compareMode && selectedLikes.length > 0 && (
        <MutualLikesComparePanel
          selected={selectedLikes}
          onRemove={(id) =>
            setSelectedIds((prev) => prev.filter((p) => p !== id))
          }
          onClose={exitCompareMode}
        />
      )}

      {compareMode && selectedLikes.length === 0 && totalLikes > 0 && (
        <p
          className="text-hm-muted text-xs"
          data-testid="compare-help-text"
        >
          Pick up to {MAX_COMPARE} homes to compare side-by-side.
        </p>
      )}

      {!hasMounted || query.isLoading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {Array.from({ length: 6 }).map((_, index) => (
            <Card
              key={index}
              className="border-hm-border-strong bg-white/80 shadow-[0_14px_38px_rgba(68,64,60,0.08)]"
            >
              <CardContent className="flex items-start gap-4 p-4">
                <Skeleton className="bg-hm-surface/70 h-20 w-20" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="bg-hm-surface/70 h-4 w-3/4" />
                  <Skeleton className="bg-hm-surface/70 h-4 w-1/2" />
                  <Skeleton className="bg-hm-surface/70 h-3 w-1/3" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : query.error ? (
        <div className="border-hm-border-strong rounded-2xl border bg-white/85 px-6 py-12 text-center shadow-[0_18px_50px_rgba(68,64,60,0.08)]">
          <p className="text-hm-error text-sm font-semibold">
            Couldn’t load mutual likes
          </p>
          <p className="text-hm-faint mt-2 text-sm">
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
      ) : totalLikes === 0 ? (
        <Card
          className="border-hm-border-strong bg-white/85 shadow-[0_18px_50px_rgba(68,64,60,0.08)]"
          data-testid="mutual-likes-empty"
        >
          <CardContent className="p-10 text-center">
            <MotionDiv
              className="mx-auto mb-6 flex h-24 w-24 items-center justify-center"
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
            >
              <div className="from-hm-accent/10 to-hm-surface ring-hm-accent/40 relative flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br ring-1">
                <MotionDiv
                  animate={{ scale: [1, 1.08, 1] }}
                  transition={{
                    duration: 2.4,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  }}
                >
                  <Heart className="text-hm-accent-strong h-10 w-10 fill-current drop-shadow" />
                </MotionDiv>
                <span className="bg-hm-accent/20 text-hm-ink ring-hm-canvas absolute -top-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full text-xs ring-2">
                  <Users className="h-3.5 w-3.5" />
                </span>
                <Sparkles className="text-hm-accent absolute -bottom-1 -left-1 h-4 w-4" />
              </div>
            </MotionDiv>
            <h2 className="text-hm-ink text-xl font-semibold">
              No mutual likes yet
            </h2>
            <p className="text-hm-faint mx-auto mt-2 max-w-xl text-sm">
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
      ) : isFilteredEmpty ? (
        <Card
          className="border-hm-border-strong bg-white/85 shadow-[0_18px_50px_rgba(68,64,60,0.08)]"
          data-testid="mutual-likes-filtered-empty"
        >
          <CardContent className="p-10 text-center">
            <MotionDiv
              className="bg-hm-surface ring-hm-border-strong mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full ring-1"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            >
              <SearchX className="text-hm-muted h-7 w-7" />
            </MotionDiv>
            <h2 className="text-hm-ink text-xl font-semibold">
              No matches with current filters
            </h2>
            <p className="text-hm-faint mx-auto mt-2 max-w-xl text-sm">
              {totalLikes} mutual {totalLikes === 1 ? 'like' : 'likes'} hidden
              by your filter. Adjust to see them.
            </p>
            <div className="mt-6 flex justify-center">
              <Button
                variant="outline"
                onClick={() => {
                  setBedFilter('any')
                  setSortKey('recent')
                }}
              >
                Clear filters
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {mutualLikes.map((like) => {
            const isSelected = selectedIds.includes(like.property_id)
            const selectionDisabled =
              !isSelected && selectedIds.length >= MAX_COMPARE

            return (
              <Card
                key={like.property_id}
                className={`border-hm-border-strong bg-white/90 shadow-[0_14px_42px_rgba(68,64,60,0.08)] transition-shadow hover:shadow-[0_18px_56px_rgba(68,64,60,0.12)] ${
                  compareMode && isSelected ? 'ring-hm-accent/40 ring-1' : ''
                }`}
                data-testid={`mutual-like-card-${like.property_id}`}
              >
                <CardContent className="p-4">
                  {compareMode && (
                    <label
                      className={`mb-3 flex cursor-pointer items-center gap-2 text-xs ${
                        selectionDisabled
                          ? 'text-hm-muted cursor-not-allowed'
                          : 'text-hm-faint'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelected(like.property_id)}
                        disabled={selectionDisabled}
                        aria-label={`Select ${
                          like.property?.address || 'property'
                        } for comparison`}
                        data-testid={`compare-checkbox-${like.property_id}`}
                        className="border-hm-border-strong h-4 w-4 rounded bg-white"
                      />
                      {isSelected
                        ? 'Selected for comparison'
                        : selectionDisabled
                          ? `Max ${MAX_COMPARE} selected`
                          : 'Add to comparison'}
                    </label>
                  )}

                  <Link
                    href={`/properties/${like.property_id}?returnTo=/dashboard/mutual-likes`}
                    className="group block"
                  >
                    <div className="flex items-start gap-4">
                      <div className="border-hm-border-strong relative h-20 w-20 overflow-hidden rounded-lg border">
                        <PropertyImage
                          src={
                            like.property?.images || like.property?.image_urls
                          }
                          alt={like.property?.address || 'Property'}
                          fill
                          className="object-cover transition-transform group-hover:scale-105"
                          sizes="80px"
                        />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <p className="text-hm-ink truncate text-sm font-semibold">
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
                          <p className="text-hm-faint mt-1 text-xs">
                            ${Math.round(like.property.price / 1000)}k •{' '}
                            {like.property.bedrooms} bd •{' '}
                            {like.property.bathrooms} ba
                          </p>
                        )}

                        <p className="text-hm-faint mt-3 text-xs">
                          Last liked{' '}
                          {new Date(like.last_liked_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </Link>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
