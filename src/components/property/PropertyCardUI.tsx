'use client'

import { ReactNode, useEffect, useMemo, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import { AnimatePresence } from 'framer-motion'
import { MotionDiv } from '@/components/ui/motion-components'
import { Property, Neighborhood } from '@/lib/schemas/property'
import type { NeighborhoodVibesRecord } from '@/lib/schemas/neighborhood-vibes'
import type { PropertyVibes } from '@/lib/schemas/property-vibes'
import {
  Bed,
  Bath,
  Square,
  ExternalLink,
  Heart,
  MapPin,
  Sparkles,
  X,
} from 'lucide-react'
import { PropertyImage } from '@/components/ui/property-image'
import { InteractionType } from '@/types/app'
import { MutualLikesIndicator } from '@/components/features/couples/MutualLikesBadge'
import { StorytellingDescription } from '@/components/features/storytelling/StorytellingDescription'
import { cn } from '@/lib/utils'
import { formatPropertyType } from '@/lib/utils/formatPropertyType'

// Code-split: Google Maps loader + PropertyMap only fetched when a card actually
// renders its map view. Saves ~150KB of JS on the initial dashboard payload.
const PropertyMap = dynamic(
  () =>
    import('@/components/property/PropertyMap').then((mod) => mod.PropertyMap),
  {
    ssr: false,
    loading: () => (
      <div className="h-36 w-full animate-pulse rounded-xl border border-white/10 bg-slate-900/60" />
    ),
  }
)

// Types needed for the UI component
export interface PropertyCardUIProps {
  property: Property
  neighborhood?: Neighborhood | null
  mutualLikes?: Array<{ property_id: string; liked_by_count: number }>
  propertyVibes?: PropertyVibes | null
  neighborhoodVibes?: NeighborhoodVibesRecord | null
  onDecision?: (propertyId: string, type: InteractionType) => void
  onCardClick?: () => void
  detailsHref?: string
  imagePriority?: boolean
  actions?: ReactNode
  floatingAction?: ReactNode
  showStory?: boolean
  storyVariant?: 'tagline' | 'futureVision'
  showMap?: boolean
  enableDetailsToggle?: boolean
  isClickable?: boolean
  fullHeight?: boolean
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

const MS_PER_DAY = 1000 * 60 * 60 * 24

function daysSince(iso: string | null | undefined): number | null {
  if (!iso) return null
  const ts = Date.parse(iso)
  if (!Number.isFinite(ts)) return null
  return Math.max(0, Math.floor((Date.now() - ts) / MS_PER_DAY))
}

function formatRelativeDays(days: number): string {
  if (days <= 0) return 'today'
  if (days === 1) return 'yesterday'
  if (days < 30) return `${days}d ago`
  if (days < 365) return `${Math.round(days / 30)}mo ago`
  return `${Math.round(days / 365)}y ago`
}

function pickVibeTag(
  neighborhoodVibes?: NeighborhoodVibesRecord | null
): string | null {
  if (!neighborhoodVibes) return null
  const themeName = neighborhoodVibes.neighborhood_themes?.[0]?.name?.trim()
  if (themeName) return themeName
  const tag = neighborhoodVibes.suggested_tags?.find(
    (t) => typeof t === 'string' && t.trim().length > 0
  )
  return tag ? tag.trim() : null
}

export function PropertyCardUI({
  property,
  neighborhood,
  mutualLikes = [],
  propertyVibes,
  neighborhoodVibes,
  onDecision,
  onCardClick,
  detailsHref,
  imagePriority = false,
  actions,
  floatingAction,
  showStory = true,
  storyVariant = 'tagline',
  showMap = true,
  enableDetailsToggle = false,
  isClickable = false,
  fullHeight = false,
}: PropertyCardUIProps) {
  const hasMapCoordinates = Boolean(property.coordinates)
  const detailPaddingBottom = onDecision ? 'pb-16' : 'pb-14'

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

  const pricePerSqft = useMemo(() => {
    if (!property.square_feet || property.square_feet <= 0) return null
    if (!property.price || property.price <= 0) return null
    return Math.round(property.price / property.square_feet)
  }, [property.price, property.square_feet])

  const listingAgeDays = useMemo(
    () => daysSince(property.created_at),
    [property.created_at]
  )

  const lastUpdatedDays = useMemo(
    () => daysSince(property.updated_at ?? property.created_at),
    [property.updated_at, property.created_at]
  )

  const vibeTag = useMemo(
    () => pickVibeTag(neighborhoodVibes),
    [neighborhoodVibes]
  )

  const [feedback, setFeedback] = useState<'liked' | 'skip' | null>(null)
  const feedbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (feedbackTimeoutRef.current) {
        clearTimeout(feedbackTimeoutRef.current)
      }
    }
  }, [])

  const triggerDecision = (type: InteractionType) => {
    if (type === 'liked' || type === 'skip') {
      setFeedback(type)
      if (feedbackTimeoutRef.current) {
        clearTimeout(feedbackTimeoutRef.current)
      }
      feedbackTimeoutRef.current = setTimeout(() => setFeedback(null), 550)
    }
    onDecision?.(property.id, type)
  }

  const shouldShowStory = showStory
  const shouldShowMap = showMap && hasMapCoordinates
  const shouldShowDetailsCta =
    enableDetailsToggle && isClickable && !!onCardClick

  const availableDetailViews = useMemo(() => {
    const orderedViews: Array<'story' | 'map'> = fullHeight
      ? ['map', 'story']
      : ['story', 'map']

    const isDetailView = (value: string | null): value is 'story' | 'map' =>
      value === 'story' || value === 'map'

    return orderedViews
      .map((view) => {
        if (view === 'story') return shouldShowStory ? view : null
        return shouldShowMap ? view : null
      })
      .filter(isDetailView)
  }, [fullHeight, shouldShowMap, shouldShowStory])

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
    <MotionDiv
      className={cn(
        'card-luxury relative flex w-full flex-col overflow-hidden',
        fullHeight && 'h-full',
        isClickable && 'cursor-pointer'
      )}
      data-testid="property-card"
      onClick={onCardClick}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.28, ease: 'easeOut' }}
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
      <div
        className={cn(
          'group relative w-full flex-none overflow-hidden',
          fullHeight
            ? 'aspect-[16/9] min-h-[180px] sm:aspect-[4/3] lg:aspect-[4/5]'
            : 'aspect-[3/4] md:aspect-[4/5] lg:aspect-[4/3]'
        )}
      >
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
          {pricePerSqft !== null && (
            <p
              className="text-[11px] tracking-wide text-white/80 drop-shadow"
              data-testid="property-price-per-sqft"
            >
              {formatPrice(pricePerSqft)}/sqft
            </p>
          )}
        </div>

        {/* Days-on-market indicator */}
        {listingAgeDays !== null && (
          <div className="absolute right-4 bottom-4">
            <span
              className={cn(
                'rounded-full border px-2.5 py-1 text-[10px] font-semibold tracking-[0.16em] uppercase backdrop-blur-sm',
                listingAgeDays <= 7
                  ? 'border-hm-success/40 bg-hm-success/15 text-hm-success'
                  : 'border-white/15 bg-black/40 text-white/85'
              )}
              data-testid="property-days-on-market"
            >
              {listingAgeDays <= 7
                ? 'New listing'
                : `${listingAgeDays}d listed`}
            </span>
          </div>
        )}

        {/* Property Type + Vibe pills */}
        <div className="absolute top-4 left-4 flex flex-wrap items-center gap-2">
          {property.property_type && (
            <span className="rounded-full bg-black/40 px-3 py-1.5 text-xs font-medium tracking-wide text-white/90 backdrop-blur-sm">
              {formatPropertyType(property.property_type)}
            </span>
          )}
          {vibeTag && (
            <span
              className="border-couples-primary/30 bg-couples-primary/20 text-couples-primary inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium tracking-wide backdrop-blur-sm"
              data-testid="property-vibe-badge"
              title="Neighborhood vibe"
            >
              <Sparkles className="h-3 w-3" />
              {vibeTag}
            </span>
          )}
        </div>

        {/* Like/Skip feedback flash */}
        <AnimatePresence>
          {feedback && (
            <MotionDiv
              key={feedback}
              className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center"
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.2 }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
              data-testid={`property-feedback-${feedback}`}
            >
              <div
                className={cn(
                  'flex h-24 w-24 items-center justify-center rounded-full border-4 backdrop-blur-md',
                  feedback === 'liked'
                    ? 'border-hm-success/70 bg-hm-success/30 text-hm-success'
                    : 'border-hm-error/70 bg-hm-error/30 text-hm-error'
                )}
              >
                {feedback === 'liked' ? (
                  <Heart className="h-12 w-12" fill="currentColor" />
                ) : (
                  <X className="h-12 w-12" strokeWidth={3} />
                )}
              </div>
            </MotionDiv>
          )}
        </AnimatePresence>

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
            className="inline-flex h-11 min-h-[44px] w-11 min-w-[44px] touch-manipulation items-center justify-center rounded-full bg-black/30 text-white/80 backdrop-blur-sm transition-all duration-200 hover:bg-black/50 hover:text-white focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:outline-none"
            aria-label="View on Zillow"
          >
            <ExternalLink className="h-4 w-4" />
          </a>
        </div>
      </div>

      {/* Property Details */}
      <div
        className={cn(
          'relative flex flex-1 flex-col p-5',
          detailPaddingBottom,
          fullHeight && 'min-h-0 overflow-y-auto'
        )}
      >
        {/* Address */}
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <h3
              className="font-display text-hm-stone-200 text-lg font-medium tracking-tight"
              data-testid="property-address"
            >
              {property.address}
            </h3>
            <p className="text-hm-stone-400 text-sm">
              {neighborhood?.name || property.city}, {property.state}
            </p>
          </div>
          {shouldShowDetailsCta &&
            (detailsHref ? (
              <a
                href={detailsHref}
                className="text-hm-stone-200 hover:text-hm-stone-300 border-hm-stone-600/70 bg-hm-obsidian-900 inline-flex min-h-[44px] touch-manipulation items-center justify-center rounded-full border px-4 py-2 text-xs font-semibold tracking-[0.14em] uppercase transition-colors focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:outline-none"
                data-testid="details-cta"
                onClick={(event) => {
                  event.preventDefault()
                  event.stopPropagation()
                  window.location.assign(detailsHref)
                }}
              >
                Details
              </a>
            ) : (
              <button
                type="button"
                className="text-hm-stone-200 hover:text-hm-stone-300 border-hm-stone-600/70 bg-hm-obsidian-900 inline-flex min-h-[44px] touch-manipulation items-center justify-center rounded-full border px-4 py-2 text-xs font-semibold tracking-[0.14em] uppercase transition-colors focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:outline-none"
                data-testid="details-cta"
                onClick={(event) => {
                  event.stopPropagation()
                  onCardClick()
                }}
              >
                Details
              </button>
            ))}
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

        {/* Storytelling Description */}
        {(!enableDetailsToggle && shouldShowStory) ||
        (enableDetailsToggle &&
          (availableDetailViews.length === 1
            ? availableDetailViews[0] === 'story'
            : detailView === 'story')) ? (
          <div className="border-hm-stone-600/60 border-t pt-4">
            <div className="border-hm-stone-600/60 bg-hm-obsidian-900/80 rounded-xl border p-3">
              <p className="text-hm-stone-400 mb-2 text-[10px] font-semibold tracking-[0.24em] uppercase">
                Why it may fit
              </p>
              <StorytellingDescription
                property={property}
                neighborhood={neighborhood || undefined}
                vibes={propertyVibes}
                isMutualLike={isMutualLike}
                variant="compact"
                showLifestyleTags={true}
                showFutureVision={storyVariant === 'futureVision'}
                showNeighborhoodPerks={false}
              />
            </div>
          </div>
        ) : null}

        {neighborhoodVibes && (
          <div className="border-hm-stone-600/60 bg-hm-obsidian-900/65 mt-3 rounded-lg border px-3 py-2">
            <div className="flex items-start gap-2">
              <MapPin className="text-hm-stone-500 mt-0.5 h-3 w-3" />
              <div>
                <p className="text-hm-stone-500 text-[10px] font-semibold tracking-[0.22em] uppercase">
                  Neighborhood vibe
                </p>
                <p className="text-hm-stone-300 line-clamp-1 text-xs">
                  {neighborhoodVibes.tagline}
                </p>
              </div>
            </div>
          </div>
        )}

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
                className="border-hm-stone-600/60 h-36 w-full overflow-hidden rounded-xl border"
              />
            </div>
          ) : null
        ) : null}

        {/* Custom actions slot */}
        {actions && (
          <div className="border-hm-stone-600/60 mt-auto border-t pt-4">
            {actions}
          </div>
        )}

        {/* Trust signals: data source + last updated */}
        <div
          className="text-hm-stone-500 mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] tracking-wide uppercase"
          data-testid="property-trust-signals"
        >
          <a
            href={buildZillowUrl(property)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="hover:text-hm-stone-300 inline-flex items-center gap-1 transition-colors"
            data-testid="property-source-attribution"
          >
            <span>via Zillow</span>
            <ExternalLink className="h-2.5 w-2.5" />
          </a>
          {lastUpdatedDays !== null && (
            <span data-testid="property-last-updated">
              Updated {formatRelativeDays(lastUpdatedDays)}
            </span>
          )}
        </div>

        {/* On-Card Action Buttons - Refined styling */}
        {onDecision && (
          <div className="absolute right-4 bottom-4 flex gap-3">
            <button
              onClick={(e) => {
                e.stopPropagation()
                triggerDecision('skip')
              }}
              className="group bg-hm-obsidian-900 text-hm-error hover:border-hm-error/30 hover:bg-hm-error/10 focus-visible:ring-hm-error/50 border-hm-stone-600/70 flex h-12 w-12 items-center justify-center rounded-full border shadow-sm transition-all duration-200 focus-visible:ring-2 focus-visible:outline-none active:scale-95"
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
                triggerDecision('liked')
              }}
              className="group bg-hm-obsidian-900 text-hm-success hover:border-hm-success/30 hover:bg-hm-success/10 focus-visible:ring-hm-success/50 border-hm-stone-600/70 flex h-12 w-12 items-center justify-center rounded-full border shadow-sm transition-all duration-200 focus-visible:ring-2 focus-visible:outline-none active:scale-95"
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
    </MotionDiv>
  )
}
