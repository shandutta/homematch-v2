'use client'

import { ReactNode, useEffect, useMemo, useState, useCallback } from 'react'
import { Property } from '@/lib/schemas/property'
import { Neighborhood } from '@/lib/schemas/property'
import { Badge } from '@/components/ui/badge'
import {
  Bed,
  Bath,
  Square,
  Home,
  ExternalLink,
  Heart,
  X,
  type LucideIcon,
} from 'lucide-react'
import { PropertyImage } from '@/components/ui/property-image'
import { InteractionType } from '@/types/app'
import { MutualLikesIndicator } from '@/components/features/couples/MutualLikesBadge'
import { useMutualLikes } from '@/hooks/useCouples'
import { StorytellingDescription } from '@/components/features/storytelling/StorytellingDescription'
import { PropertyMap } from '@/components/property/PropertyMap'
import { cn } from '@/lib/utils'
import { usePropertyDetail } from './PropertyDetailProvider'

interface PropertyCardProps {
  property: Property
  neighborhood?: Neighborhood
  onDecision?: (propertyId: string, type: InteractionType) => void
  imagePriority?: boolean
  actions?: ReactNode
  floatingAction?: ReactNode
  showStory?: boolean
  storyVariant?: 'tagline' | 'futureVision'
  showMap?: boolean
  enableDetailsToggle?: boolean
  disableDetailModal?: boolean
}

function usePropertyDetailSafe() {
  try {
    return usePropertyDetail()
  } catch {
    return null
  }
}

function buildZillowUrl(property: Property): string {
  if (property.zpid) {
    return `https://www.zillow.com/homedetails/${property.zpid}_zpid/`
  }
  const q = encodeURIComponent(
    `${property.address}, ${property.city}, ${property.state} ${property.zip_code}`
  )
  return `https://www.zillow.com/homes/${q}_rb/`
}

export function PropertyCard({
  property,
  neighborhood,
  onDecision,
  imagePriority = false,
  actions,
  floatingAction,
  showStory = true,
  storyVariant = 'tagline',
  showMap = true,
  enableDetailsToggle = false,
  disableDetailModal = false,
}: PropertyCardProps) {
  const { data: mutualLikes = [] } = useMutualLikes()
  const hasMapCoordinates = Boolean(property.coordinates)
  const propertyDetail = usePropertyDetailSafe()

  const handleCardClick = useCallback(() => {
    if (!disableDetailModal && propertyDetail) {
      propertyDetail.openPropertyDetail(property, neighborhood)
    }
  }, [disableDetailModal, propertyDetail, property, neighborhood])

  // Check if this property is a mutual like
  const isMutualLike = mutualLikes.some(
    (ml) => ml.property_id === property.id && ml.liked_by_count >= 2
  )
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price)
  }

  const formatSquareFeet = (sqft: number | null) => {
    if (!sqft) return '—'
    return new Intl.NumberFormat('en-US').format(sqft)
  }

  const formatCount = (value?: number | null) => {
    if (value == null) return '—'
    if (Number.isInteger(value)) return value.toString()
    return value.toFixed(1).replace(/\.0$/, '')
  }

  const formattedBeds = formatCount(property.bedrooms)
  const formattedBaths = formatCount(property.bathrooms)
  const formattedSqft = formatSquareFeet(property.square_feet)

  const propertyStats: Array<{
    icon: LucideIcon
    label: string
    value: string
  }> = [
    {
      icon: Bed,
      label: 'Beds',
      value: formattedBeds,
    },
    {
      icon: Bath,
      label: 'Baths',
      value: formattedBaths,
    },
    {
      icon: Square,
      label: 'Sq. Ft.',
      value: formattedSqft,
    },
  ]

  const shouldShowStory = showStory
  const shouldShowMap = showMap && hasMapCoordinates

  const availableDetailViews = useMemo(() => {
    return [
      shouldShowStory ? 'story' : null,
      shouldShowMap ? 'map' : null,
    ].filter(Boolean) as Array<'story' | 'map'>
  }, [shouldShowMap, shouldShowStory])

  const [detailView, setDetailView] = useState<'story' | 'map' | null>(null)

  useEffect(() => {
    if (!enableDetailsToggle || availableDetailViews.length <= 1) {
      setDetailView(null)
      return
    }

    setDetailView((prev) => {
      if (prev && availableDetailViews.includes(prev)) {
        return prev
      }
      return availableDetailViews[0]!
    })
  }, [availableDetailViews, enableDetailsToggle])

  // Use images array from property - PropertyImage component handles fallbacks
  const isClickable = !disableDetailModal && propertyDetail

  return (
    <div
      className={cn(
        'bg-card rounded-token-xl shadow-token-lg duration-token-normal ease-token-out hover:shadow-token-xl relative flex h-full w-full flex-col overflow-hidden transition-all',
        isClickable && 'cursor-pointer'
      )}
      data-testid="property-card"
      onClick={handleCardClick}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onKeyDown={
        isClickable
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                handleCardClick()
              }
            }
          : undefined
      }
    >
      {/* Property Image */}
      <div className="relative aspect-[16/9] w-full">
        <PropertyImage
          src={property.images || undefined}
          alt={property.address || 'Property'}
          fill
          className="object-cover"
          priority={imagePriority}
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />

        {/* Gradient overlay for text readability */}
        <div className="from-token-secondary-900/70 via-token-secondary-900/20 absolute inset-0 bg-gradient-to-t to-transparent" />

        {/* Price Badge */}
        <div className="absolute bottom-4 left-4">
          <Badge
            className="bg-token-background-primary/95 p-token-md text-token-lg text-token-secondary-900 shadow-token-md font-bold backdrop-blur-sm"
            data-testid="property-price"
          >
            {formatPrice(property.price)}
          </Badge>
        </div>

        {/* Property Type Badge */}
        {property.property_type && (
          <div className="absolute top-4 left-4">
            <Badge
              variant="secondary"
              className="bg-token-background-primary/95 shadow-token-md backdrop-blur-sm"
            >
              <Home className="mr-1 h-3 w-3" />
              {property.property_type}
            </Badge>
          </div>
        )}

        {/* Mutual Likes Badge - positioned at top center */}
        <div className="absolute top-4 left-1/2 z-10 -translate-x-1/2">
          <MutualLikesIndicator
            propertyId={property.id}
            mutualLikes={mutualLikes}
            variant="compact"
          />
        </div>

        {/* Top-right controls (Zillow + optional floating action) */}
        <div className="absolute top-4 right-4 flex items-center gap-3">
          {floatingAction}
          <a
            href={buildZillowUrl(property)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()} // Prevent card swipe on click
            className="rounded-token-full bg-token-text-inverse/10 text-token-text-inverse duration-token-fast ease-token-out hover:bg-token-text-inverse/20 flex h-10 w-10 items-center justify-center backdrop-blur-md transition-all"
            aria-label="View on Zillow"
          >
            <ExternalLink className="h-5 w-5" />
          </a>
        </div>
      </div>

      {/* Property Details */}
      <div className="p-token-lg relative flex flex-1 flex-col pb-10">
        <div className="mb-token-md">
          <h3
            className="text-foreground text-token-lg font-semibold"
            data-testid="property-address"
          >
            {property.address}
          </h3>
          <p className="text-muted-foreground text-token-sm">
            {neighborhood?.name || property.city}, {property.state}
          </p>
        </div>

        <div className="gap-token-sm grid grid-cols-3">
          {propertyStats.map(({ icon: Icon, label, value }) => (
            <div
              key={label}
              className="rounded-[18px] border border-white/50 bg-white/90 px-4 py-3 shadow-[0_8px_24px_rgba(15,23,42,0.08)] backdrop-blur-sm dark:border-slate-700/70 dark:bg-slate-900/60"
            >
              <div className="flex min-w-0 items-center gap-3">
                <div className="bg-token-primary/10 text-token-primary flex h-9 w-9 items-center justify-center rounded-full">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold tracking-[0.12em] whitespace-nowrap text-slate-500 uppercase">
                    {label}
                  </p>
                  <p className="text-foreground text-lg leading-tight font-semibold">
                    {value}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {enableDetailsToggle && availableDetailViews.length > 1 && (
          <div className="mt-token-lg flex gap-2">
            {availableDetailViews.map((view) => (
              <button
                key={view}
                type="button"
                className={cn(
                  'flex-1 rounded-full border px-4 py-2 text-sm font-semibold transition-colors',
                  detailView === view
                    ? 'border-token-primary bg-token-primary/10 text-token-primary'
                    : 'border-white/20 bg-white/5 text-white/70 hover:text-white'
                )}
                onClick={() => setDetailView(view)}
              >
                {view === 'story' ? 'HomeMatch story' : 'Neighborhood map'}
              </button>
            ))}
          </div>
        )}

        {/* Storytelling Description */}
        {(!enableDetailsToggle && shouldShowStory) ||
        (enableDetailsToggle &&
          (availableDetailViews.length === 1
            ? availableDetailViews[0] === 'story'
            : detailView === 'story')) ? (
          <div className="mt-token-md">
            <StorytellingDescription
              property={property}
              neighborhood={neighborhood}
              isMutualLike={isMutualLike}
              variant="compact"
              showLifestyleTags={false}
              showFutureVision={storyVariant === 'futureVision'}
            />
          </div>
        ) : null}

        {(!enableDetailsToggle && shouldShowMap) ||
        (enableDetailsToggle &&
          (availableDetailViews.length === 1
            ? availableDetailViews[0] === 'map'
            : detailView === 'map')) ? (
          shouldShowMap ? (
            <div className="mt-token-md">
              <PropertyMap
                property={property}
                className="rounded-token-xl h-40 w-full border border-white/15"
              />
            </div>
          ) : null
        ) : null}

        {actions && (
          <div className="pt-token-md mt-auto border-t border-white/5">
            {actions}
          </div>
        )}

        {/* On-Card Action Buttons */}
        {onDecision && (
          <div className="gap-token-sm absolute right-5 bottom-4 flex">
            <button
              onClick={(e) => {
                e.stopPropagation()
                onDecision(property.id, 'skip')
              }}
              className="shadow-token-lg duration-token-fast ease-token-out flex h-14 w-14 items-center justify-center rounded-full border border-red-500/80 bg-red-500 text-white transition-all hover:bg-red-600 focus-visible:ring-4 focus-visible:ring-red-200/80"
              aria-label="Pass property"
            >
              <X className="h-6 w-6" strokeWidth={2.5} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                onDecision(property.id, 'liked')
              }}
              className="shadow-token-lg duration-token-fast ease-token-out flex h-14 w-14 items-center justify-center rounded-full border border-emerald-500/80 bg-emerald-500 text-white transition-all hover:bg-emerald-600 focus-visible:ring-4 focus-visible:ring-emerald-200/80"
              aria-label="Like property"
              data-testid="like-button"
            >
              <Heart
                className="h-6 w-6"
                strokeWidth={2.5}
                fill="currentColor"
              />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
