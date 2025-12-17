'use client'

import { useEffect, useMemo, useState } from 'react'
import { Property, Neighborhood } from '@/lib/schemas/property'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Bed,
  Bath,
  Square,
  ExternalLink,
  MapPin,
  Calendar,
  Heart,
  X,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { PropertyImage } from '@/components/ui/property-image'
import { PropertyMap } from '@/components/property/PropertyMap'
import { StorytellingDescription } from '@/components/features/storytelling/StorytellingDescription'
import { MutualLikesIndicator } from '@/components/features/couples/MutualLikesBadge'
import { useMutualLikes } from '@/hooks/useCouples'
import { usePropertyVibes } from '@/hooks/usePropertyVibes'
import { useNeighborhoodVibes } from '@/hooks/useNeighborhoodVibes'
import { InteractionType } from '@/types/app'
import { formatPropertyType } from '@/lib/utils/formatPropertyType'

interface PropertyDetailModalProps {
  property: Property | null
  neighborhood?: Neighborhood
  open: boolean
  onOpenChange: (open: boolean) => void
  onDecision?: (propertyId: string, type: InteractionType) => void
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

export function PropertyDetailModal({
  property,
  neighborhood,
  open,
  onOpenChange,
  onDecision,
}: PropertyDetailModalProps) {
  const { data: mutualLikes = [] } = useMutualLikes()
  const { data: vibes } = usePropertyVibes(property?.id)
  const images = useMemo(
    () => property?.images?.filter(Boolean) ?? [],
    [property?.images]
  )
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const neighborhoodData =
    neighborhood ||
    (property as (Property & { neighborhood?: Neighborhood | null }) | null)
      ?.neighborhood ||
    (property as (Property & { neighborhoods?: Neighborhood | null }) | null)
      ?.neighborhoods ||
    null
  const { data: neighborhoodVibes } = useNeighborhoodVibes(
    neighborhoodData?.id || property?.neighborhood_id || undefined
  )

  useEffect(() => {
    setCurrentImageIndex(0)
  }, [property?.id])

  const hasMultipleImages = images.length > 1

  const { normalizedIndex, currentImage } = useMemo(() => {
    if (!images.length) return { normalizedIndex: 0, currentImage: undefined }
    const normalizedIndex =
      ((currentImageIndex % images.length) + images.length) % images.length
    return { normalizedIndex, currentImage: images[normalizedIndex] }
  }, [currentImageIndex, images])

  const showNextImage = () => {
    if (!hasMultipleImages) return
    setCurrentImageIndex((prev) => (prev + 1) % images.length)
  }

  const showPreviousImage = () => {
    if (!hasMultipleImages) return
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length)
  }

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

  if (!property) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-hm-obsidian-900 max-h-[90vh] max-w-2xl overflow-hidden rounded-2xl border-white/10 p-0 text-white shadow-[0_30px_90px_rgba(0,0,0,0.55)]">
        <div className="max-h-[90vh] overflow-y-auto">
          <div className="relative aspect-video w-full">
            <PropertyImage
              src={currentImage || images}
              alt={property.address || 'Property'}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 672px"
            />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent" />

            {property.property_type && (
              <div className="absolute top-4 left-4">
                <span className="rounded-full bg-black/40 px-3 py-1.5 text-xs font-medium tracking-wide text-white/90 backdrop-blur-sm">
                  {formatPropertyType(property.property_type)}
                </span>
              </div>
            )}

            <div className="absolute top-4 left-1/2 -translate-x-1/2">
              <MutualLikesIndicator
                propertyId={property.id}
                mutualLikes={mutualLikes}
                variant="compact"
              />
            </div>

            <a
              href={buildZillowUrl(property)}
              target="_blank"
              rel="noopener noreferrer"
              className="absolute top-4 right-4 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-black/30 text-white/80 backdrop-blur-sm transition-all hover:bg-black/50 hover:text-white"
              aria-label="View on Zillow"
            >
              <ExternalLink className="h-5 w-5" />
            </a>

            {hasMultipleImages && (
              <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-between px-3">
                <button
                  type="button"
                  onClick={showPreviousImage}
                  className="pointer-events-auto flex h-10 w-10 items-center justify-center rounded-full bg-black/35 text-white shadow-lg transition hover:bg-black/50"
                  aria-label="Previous image"
                  data-testid="previous-image"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={showNextImage}
                  className="pointer-events-auto flex h-10 w-10 items-center justify-center rounded-full bg-black/35 text-white shadow-lg transition hover:bg-black/50"
                  aria-label="Next image"
                  data-testid="next-image"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
            )}

            {hasMultipleImages && (
              <div className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 flex-col items-center gap-2">
                <div
                  className="rounded-full bg-black/45 px-3 py-1 text-xs font-medium text-white/90"
                  data-testid="image-counter"
                >
                  {normalizedIndex + 1} / {images.length}
                </div>
                <div className="flex gap-2">
                  {images.map((_, index) => {
                    const isActive = index === normalizedIndex
                    return (
                      <button
                        key={index}
                        type="button"
                        aria-label={`View image ${index + 1}`}
                        data-testid={`image-dot-${index}`}
                        onClick={() => setCurrentImageIndex(index)}
                        className="h-2.5 w-2.5 rounded-full bg-white/70 transition hover:bg-white"
                        style={{ opacity: isActive ? 1 : 0.4 }}
                      />
                    )
                  })}
                </div>
              </div>
            )}

            <div className="absolute bottom-4 left-4">
              <p className="price-display text-3xl text-white drop-shadow-lg">
                {formatPrice(property.price)}
              </p>
            </div>
          </div>

          <div className="space-y-6 p-6">
            <DialogHeader className="text-left">
              <DialogTitle className="font-display text-hm-stone-200 text-2xl font-medium tracking-tight">
                {property.address}
              </DialogTitle>
              <DialogDescription className="text-hm-stone-400">
                Explore photos, key stats, and the story behind this listing.
              </DialogDescription>
              <div className="text-hm-stone-500 flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4" />
                <span>
                  {neighborhoodData?.name || property.city}, {property.state}{' '}
                  {property.zip_code}
                </span>
              </div>
              {neighborhoodVibes && (
                <div className="mt-3 flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur">
                  <div className="text-hm-amber-400 mt-0.5 rounded-full bg-amber-400/10 p-2">
                    <MapPin className="h-4 w-4" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-hm-stone-200 text-sm font-semibold">
                      {neighborhoodVibes.tagline}
                    </p>
                    <p className="text-hm-stone-400 text-sm">
                      {neighborhoodVibes.vibe_statement}
                    </p>
                    {neighborhoodVibes.suggested_tags?.length ? (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {neighborhoodVibes.suggested_tags
                          .slice(0, 6)
                          .map((tag) => (
                            <span
                              key={tag}
                              className="rounded-full bg-white/10 px-2.5 py-1 text-[11px] text-white/90"
                            >
                              {tag}
                            </span>
                          ))}
                      </div>
                    ) : null}
                  </div>
                </div>
              )}
            </DialogHeader>

            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4 text-center">
                <Bed className="text-hm-amber-400 mx-auto mb-2 h-6 w-6" />
                <p className="text-hm-stone-200 text-2xl font-semibold">
                  {formatCount(property.bedrooms)}
                </p>
                <p className="text-hm-stone-500 text-xs">Beds</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4 text-center">
                <Bath className="text-hm-amber-400 mx-auto mb-2 h-6 w-6" />
                <p className="text-hm-stone-200 text-2xl font-semibold">
                  {formatCount(property.bathrooms)}
                </p>
                <p className="text-hm-stone-500 text-xs">Baths</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4 text-center">
                <Square className="text-hm-amber-400 mx-auto mb-2 h-6 w-6" />
                <p className="text-hm-stone-200 text-2xl font-semibold">
                  {formatSquareFeet(property.square_feet)}
                </p>
                <p className="text-hm-stone-500 text-xs">Sq Ft</p>
              </div>
            </div>

            {property.year_built && (
              <div className="text-hm-stone-500 flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4" />
                <span>Built in {property.year_built}</span>
              </div>
            )}

            <div className="space-y-3">
              <h3 className="font-display text-hm-stone-200 text-lg font-medium">
                About this home
              </h3>
              <StorytellingDescription
                property={property}
                neighborhood={neighborhoodData || undefined}
                vibes={vibes}
                isMutualLike={mutualLikes.some(
                  (ml) =>
                    ml.property_id === property.id && ml.liked_by_count >= 2
                )}
                variant="full"
                showLifestyleTags={true}
                showFutureVision={true}
                showVibeStatement={false}
                showEmotionalHooks={false}
              />
            </div>

            <div className="space-y-3">
              <h3 className="font-display text-hm-stone-200 text-lg font-medium">
                Location
              </h3>
              <PropertyMap
                property={property}
                className="h-48 w-full rounded-xl border border-white/10"
              />
            </div>

            {onDecision && (
              <div className="flex gap-4 pt-4">
                <button
                  onClick={() => {
                    onDecision(property.id, 'skip')
                    onOpenChange(false)
                  }}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-red-500/80 bg-red-500 py-4 font-semibold text-white shadow-lg transition-all duration-200 hover:bg-red-600 focus-visible:ring-4 focus-visible:ring-red-200/80"
                  aria-label="Pass property"
                >
                  <X className="h-6 w-6" strokeWidth={2.5} />
                  Pass
                </button>
                <button
                  onClick={() => {
                    onDecision(property.id, 'liked')
                    onOpenChange(false)
                  }}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-emerald-500/80 bg-emerald-500 py-4 font-semibold text-white shadow-lg transition-all duration-200 hover:bg-emerald-600 focus-visible:ring-4 focus-visible:ring-emerald-200/80"
                  aria-label="Like property"
                  data-testid="like-button"
                >
                  <Heart
                    className="h-6 w-6"
                    strokeWidth={2.5}
                    fill="currentColor"
                  />
                  Like
                </button>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
