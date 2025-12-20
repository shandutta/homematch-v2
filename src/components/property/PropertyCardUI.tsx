'use client'

import { ReactNode, useEffect, useMemo, useState } from 'react'
import { Property, Neighborhood } from '@/lib/schemas/property'
import type { NeighborhoodVibesRecord } from '@/lib/schemas/neighborhood-vibes'
import type { PropertyVibes } from '@/lib/schemas/property-vibes'
import { Bed, Bath, Square, ExternalLink, Heart, MapPin, X } from 'lucide-react'
import { PropertyImage } from '@/components/ui/property-image'
import { InteractionType } from '@/types/app'
import { MutualLikesIndicator } from '@/components/features/couples/MutualLikesBadge'
import { StorytellingDescription } from '@/components/features/storytelling/StorytellingDescription'
import { PropertyMap } from '@/components/property/PropertyMap'
import { cn } from '@/lib/utils'
import { formatPropertyType } from '@/lib/utils/formatPropertyType'

// Types needed for the UI component
export interface PropertyCardUIProps {
  property: Property
  neighborhood?: Neighborhood | null
  mutualLikes?: Array<{ property_id: string; liked_by_count: number }>
  propertyVibes?: PropertyVibes | null
  neighborhoodVibes?: NeighborhoodVibesRecord | null
  onDecision?: (propertyId: string, type: InteractionType) => void
  onCardClick?: () => void
  imagePriority?: boolean
  actions?: ReactNode
  floatingAction?: ReactNode
  showStory?: boolean
  storyVariant?: 'tagline' | 'futureVision'
  showMap?: boolean
  enableDetailsToggle?: boolean
  isClickable?: boolean
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

export function PropertyCardUI({
  property,
  neighborhood,
  mutualLikes = [],
  propertyVibes,
  neighborhoodVibes,
  onDecision,
  onCardClick,
  imagePriority = false,
  actions,
  floatingAction,
  showStory = true,
  storyVariant = 'tagline',
  showMap = true,
  enableDetailsToggle = false,
  isClickable = false,
}: PropertyCardUIProps) {
  const hasMapCoordinates = Boolean(property.coordinates)

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

  return (
    <div
      className={cn(
        'card-luxury relative flex h-full w-full flex-col overflow-hidden',
        isClickable && 'cursor-pointer'
      )}
      data-testid="property-card"
      onClick={onCardClick}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onKeyDown={
        isClickable && onCardClick
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onCardClick()
              }
            }
          : undefined
      }
    >
      {/* Property Image - Responsive aspect ratio */}
      <div className="group relative aspect-[3/4] w-full overflow-hidden md:aspect-[4/5] lg:aspect-[4/3]">
        <PropertyImage
          src={property.images || undefined}
          alt={property.address || 'Property'}
          fill
          className="img-zoom object-cover"
          priority={imagePriority}
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />

        {/* Subtle vignette overlay */}
        <div className="vignette-overlay pointer-events-none absolute inset-0" />

        {/* Bottom gradient for price readability */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />

        {/* Price - Elegant typography overlay */}
        <div className="absolute bottom-4 left-5">
          <p
            className="price-display text-3xl text-white drop-shadow-lg"
            data-testid="property-price"
          >
            {formatPrice(property.price)}
          </p>
        </div>

        {/* Property Type - Minimal pill */}
        {property.property_type && (
          <div className="absolute top-4 left-4">
            <span className="rounded-full bg-black/40 px-3 py-1.5 text-xs font-medium tracking-wide text-white/90 backdrop-blur-sm">
              {formatPropertyType(property.property_type)}
            </span>
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

        {/* Top-right controls */}
        <div className="absolute top-4 right-4 flex items-center gap-2">
          {floatingAction}
          <a
            href={buildZillowUrl(property)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-black/30 text-white/80 backdrop-blur-sm transition-all duration-200 hover:bg-black/50 hover:text-white"
            aria-label="View on Zillow"
          >
            <ExternalLink className="h-4 w-4" />
          </a>
        </div>
      </div>

      {/* Property Details */}
      <div className="relative flex flex-1 flex-col p-5 pb-16">
        {/* Address */}
        <div className="mb-3">
          <h3
            className="font-display text-hm-stone-200 text-lg font-medium tracking-tight"
            data-testid="property-address"
          >
            {property.address}
          </h3>
          <p className="text-hm-stone-400 text-sm">
            {neighborhood?.name || property.city}, {property.state}
          </p>
          {neighborhoodVibes && (
            <div className="mt-2 flex items-start gap-2 rounded-lg border border-white/10 bg-white/10 p-2">
              <MapPin className="text-hm-amber-400 mt-0.5 h-4 w-4" />
              <div className="space-y-1">
                <p className="text-hm-stone-100 text-sm font-semibold">
                  {neighborhoodVibes.tagline}
                </p>
                <p className="text-hm-stone-200 text-sm">
                  {neighborhoodVibes.vibe_statement}
                </p>
                {neighborhoodVibes.suggested_tags?.length ? (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {neighborhoodVibes.suggested_tags
                      .slice(0, 4)
                      .map((tag: string) => (
                        <span
                          key={tag}
                          className="rounded-full bg-white/15 px-2.5 py-1 text-[12px] text-white"
                        >
                          {tag}
                        </span>
                      ))}
                  </div>
                ) : null}
              </div>
            </div>
          )}
        </div>

        {/* Stats - Typography-focused horizontal layout */}
        <div className="text-hm-stone-300 mb-4 flex items-center text-sm">
          <span className="flex items-center gap-1.5">
            <Bed className="text-hm-stone-500 h-4 w-4" />
            <span className="font-medium">{formattedBeds}</span>
            <span className="text-hm-stone-500">bed</span>
          </span>
          <span className="text-hm-stone-600 mx-2.5">·</span>
          <span className="flex items-center gap-1.5">
            <Bath className="text-hm-stone-500 h-4 w-4" />
            <span className="font-medium">{formattedBaths}</span>
            <span className="text-hm-stone-500">bath</span>
          </span>
          <span className="text-hm-stone-600 mx-2.5">·</span>
          <span className="flex items-center gap-1.5">
            <Square className="text-hm-stone-500 h-4 w-4" />
            <span className="font-medium">{formattedSqft}</span>
            <span className="text-hm-stone-500">sqft</span>
          </span>
        </div>

        {/* Detail view toggle */}
        {enableDetailsToggle && availableDetailViews.length > 1 && (
          <div className="mb-4 flex gap-2">
            {availableDetailViews.map((view) => (
              <button
                key={view}
                type="button"
                className={cn(
                  'flex-1 rounded-full border px-4 py-2 text-sm font-medium transition-all duration-200',
                  detailView === view
                    ? 'border-hm-amber-400/50 bg-hm-amber-400/10 text-hm-amber-400'
                    : 'text-hm-stone-400 hover:text-hm-stone-300 border-white/10 hover:border-white/20'
                )}
                onClick={(e) => {
                  e.stopPropagation()
                  setDetailView(view)
                }}
              >
                {view === 'story' ? 'Story' : 'Map'}
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
          <div className="border-t border-white/5 pt-4">
            <StorytellingDescription
              property={property}
              neighborhood={neighborhood || undefined}
              vibes={propertyVibes}
              isMutualLike={isMutualLike}
              variant="compact"
              showLifestyleTags={true}
              showFutureVision={storyVariant === 'futureVision'}
            />
          </div>
        ) : null}

        {/* Map */}
        {(!enableDetailsToggle && shouldShowMap) ||
        (enableDetailsToggle &&
          (availableDetailViews.length === 1
            ? availableDetailViews[0] === 'map'
            : detailView === 'map')) ? (
          shouldShowMap ? (
            <div className="mt-4">
              <PropertyMap
                property={property}
                className="h-36 w-full overflow-hidden rounded-xl border border-white/10"
              />
            </div>
          ) : null
        ) : null}

        {/* Custom actions slot */}
        {actions && (
          <div className="mt-auto border-t border-white/5 pt-4">{actions}</div>
        )}

        {/* On-Card Action Buttons - Refined styling */}
        {onDecision && (
          <div className="absolute right-4 bottom-4 flex gap-3">
            <button
              onClick={(e) => {
                e.stopPropagation()
                onDecision(property.id, 'skip')
              }}
              className="group bg-hm-obsidian-800 text-hm-error hover:border-hm-error/30 hover:bg-hm-error/10 focus-visible:ring-hm-error/50 flex h-12 w-12 items-center justify-center rounded-full border border-white/10 transition-all duration-200 focus-visible:ring-2 focus-visible:outline-none"
              aria-label="Pass property"
            >
              <X
                className="h-5 w-5 transition-transform duration-200 group-hover:scale-110"
                strokeWidth={2}
              />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                onDecision(property.id, 'liked')
              }}
              className="group bg-hm-obsidian-800 text-hm-success hover:border-hm-success/30 hover:bg-hm-success/10 focus-visible:ring-hm-success/50 flex h-12 w-12 items-center justify-center rounded-full border border-white/10 transition-all duration-200 focus-visible:ring-2 focus-visible:outline-none"
              aria-label="Like property"
              data-testid="like-button"
            >
              <Heart
                className="h-5 w-5 transition-transform duration-200 group-hover:scale-110"
                strokeWidth={2}
                fill="currentColor"
              />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
