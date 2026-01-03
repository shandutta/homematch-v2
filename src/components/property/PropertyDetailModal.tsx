'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import type { PointerEvent, TouchEvent } from 'react'
import { Property, Neighborhood } from '@/lib/schemas/property'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
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
  Home,
} from 'lucide-react'
import { PropertyImage } from '@/components/ui/property-image'
import { PropertyMap } from '@/components/property/PropertyMap'
import { MutualLikesIndicator } from '@/components/features/couples/MutualLikesBadge'
import { useMutualLikes } from '@/hooks/useCouples'
import { usePropertyVibes } from '@/hooks/usePropertyVibes'
import { useNeighborhoodVibes } from '@/hooks/useNeighborhoodVibes'
import { InteractionType } from '@/types/app'
import { formatPropertyType } from '@/lib/utils/formatPropertyType'
import { Badge } from '@/components/ui/badge'

interface PropertyDetailModalProps {
  property: Property | null
  neighborhood?: Neighborhood
  open: boolean
  onOpenChange: (open: boolean) => void
  onDecision?: (propertyId: string, type: InteractionType) => void
  onCloseAutoFocus?: (event: Event) => void
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

function buildGoogleMapsUrl(property: Property): string {
  const q = encodeURIComponent(
    `${property.address}, ${property.city}, ${property.state} ${property.zip_code}`
  )
  return `https://www.google.com/maps/search/?api=1&query=${q}`
}

export function PropertyDetailModal({
  property,
  neighborhood,
  open,
  onOpenChange,
  onDecision,
  onCloseAutoFocus,
}: PropertyDetailModalProps) {
  const propertyId = property?.id
  const { data: mutualLikes = [] } = useMutualLikes()
  const { data: vibes } = usePropertyVibes(propertyId)
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
  const [isMapExpanded, setIsMapExpanded] = useState(false)
  const swipeStartRef = useRef<{ x: number; y: number } | null>(null)

  useEffect(() => {
    setCurrentImageIndex(0)
  }, [propertyId])

  useEffect(() => {
    if (!open || !propertyId) return
    if (typeof window === 'undefined' || !('matchMedia' in window)) {
      setIsMapExpanded(true)
      return
    }
    const mq = window.matchMedia?.('(min-width: 640px)')
    setIsMapExpanded(mq?.matches ?? true)
  }, [open, propertyId])

  const hasImages = images.length > 0
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

  const handleImageTouchStart = (event: TouchEvent<HTMLDivElement>) => {
    if (typeof window !== 'undefined' && 'PointerEvent' in window) return
    if (!hasMultipleImages) return
    const touch = event.touches[0]
    if (!touch) return
    swipeStartRef.current = { x: touch.clientX, y: touch.clientY }
  }

  const handleImageTouchEnd = (event: TouchEvent<HTMLDivElement>) => {
    if (typeof window !== 'undefined' && 'PointerEvent' in window) return
    if (!hasMultipleImages || !swipeStartRef.current) return
    const touch = event.changedTouches[0]
    if (!touch) return

    const deltaX = touch.clientX - swipeStartRef.current.x
    const deltaY = touch.clientY - swipeStartRef.current.y
    swipeStartRef.current = null

    const absX = Math.abs(deltaX)
    const absY = Math.abs(deltaY)
    const threshold = 40

    if (absX < threshold || absX < absY) return

    if (deltaX < 0) {
      showNextImage()
    } else {
      showPreviousImage()
    }
  }

  const handleImageTouchCancel = () => {
    if (typeof window !== 'undefined' && 'PointerEvent' in window) return
    swipeStartRef.current = null
  }

  const handleImagePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType && event.pointerType !== 'touch') return
    if (!hasMultipleImages) return
    swipeStartRef.current = { x: event.clientX, y: event.clientY }
  }

  const handleImagePointerUp = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType && event.pointerType !== 'touch') return
    if (!hasMultipleImages || !swipeStartRef.current) return

    const deltaX = event.clientX - swipeStartRef.current.x
    const deltaY = event.clientY - swipeStartRef.current.y
    swipeStartRef.current = null

    const absX = Math.abs(deltaX)
    const absY = Math.abs(deltaY)
    const threshold = 40

    if (absX < threshold || absX < absY) return

    if (deltaX < 0) {
      showNextImage()
    } else {
      showPreviousImage()
    }
  }

  const handleImagePointerCancel = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType && event.pointerType !== 'touch') return
    swipeStartRef.current = null
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

  const getOneLiner = (text: string) => {
    const trimmed = text.trim()
    if (!trimmed) return null
    const match = trimmed.match(/^[^.!?]+[.!?]/)
    const sentence = match ? match[0] : trimmed
    if (sentence.length <= 140) return sentence
    return `${sentence.slice(0, 137).trimEnd()}...`
  }

  if (!property) return null

  const propertyTypeLabel = property.property_type
    ? formatPropertyType(property.property_type).toLowerCase()
    : 'home'
  const houseOneLiner =
    vibes?.tagline ||
    (property.description ? getOneLiner(property.description) : null) ||
    `A ${propertyTypeLabel} to make your own.`
  const propertyTags = vibes?.suggested_tags?.slice(0, 8) ?? []

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="bg-hm-obsidian-900 h-[100dvh] w-[100vw] max-w-[100vw] overflow-hidden rounded-none border-white/10 p-0 text-white shadow-[0_30px_90px_rgba(0,0,0,0.55)] sm:max-h-[90vh] sm:max-w-2xl sm:rounded-2xl"
        onCloseAutoFocus={onCloseAutoFocus}
        showCloseButton={false}
      >
        <div className="flex h-full min-h-0 flex-col">
          <div
            className="min-h-0 flex-1 overflow-y-auto"
            data-testid="property-detail-scroll"
          >
            <div className="safe-area-top bg-hm-obsidian-900/85 sticky top-0 z-20 flex items-center justify-between border-b border-white/10 px-4 py-3 backdrop-blur sm:px-6">
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                aria-label="Close property details"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/80 transition hover:bg-white/10 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
              {hasImages && (
                <div
                  className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white/90"
                  data-testid="image-counter"
                >
                  {normalizedIndex + 1} / {images.length}
                </div>
              )}
              <div className="h-9 w-9" aria-hidden="true" />
            </div>
            <div
              className="relative aspect-video w-full touch-pan-y"
              data-testid="property-image-carousel"
              onTouchStart={handleImageTouchStart}
              onTouchEnd={handleImageTouchEnd}
              onTouchCancel={handleImageTouchCancel}
              onPointerDown={handleImagePointerDown}
              onPointerUp={handleImagePointerUp}
              onPointerCancel={handleImagePointerCancel}
            >
              <PropertyImage
                src={currentImage || images}
                alt={property.address || 'Property'}
                fill
                className="object-cover"
                priority={open}
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
                className="absolute top-4 right-16 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-black/30 text-white/80 backdrop-blur-sm transition-all hover:bg-black/50 hover:text-white"
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
                <div className="absolute bottom-4 left-1/2 z-10 -translate-x-1/2 rounded-full border border-white/10 bg-black/35 px-2 py-1.5 backdrop-blur-sm">
                  <div className="flex items-center gap-1">
                    {images.map((_, index) => {
                      const isActive = index === normalizedIndex
                      return (
                        <button
                          key={index}
                          type="button"
                          aria-label={`View image ${index + 1}`}
                          aria-current={isActive ? 'true' : undefined}
                          data-testid={`image-dot-${index}`}
                          onClick={() => setCurrentImageIndex(index)}
                          className="group relative flex h-6 w-6 items-center justify-center rounded-full transition focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:ring-offset-2 focus-visible:ring-offset-black/60 focus-visible:outline-none"
                        >
                          <span
                            className={`block h-1.5 w-1.5 rounded-full bg-white/50 transition-all duration-200 ${
                              isActive
                                ? 'w-5 bg-white shadow-[0_0_12px_rgba(255,255,255,0.35)]'
                                : 'group-hover:bg-white/90'
                            }`}
                          />
                        </button>
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

            <div className="space-y-6 p-4 sm:p-6">
              <DialogHeader className="text-left">
                <DialogTitle className="font-display text-hm-stone-200 text-2xl font-medium tracking-tight">
                  {property.address}
                </DialogTitle>
                <DialogDescription className="text-hm-stone-500 flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4" />
                  <span>
                    {neighborhoodData?.name || property.city}, {property.state}{' '}
                    {property.zip_code}
                  </span>
                </DialogDescription>
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
                  Vibe snapshot
                </h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  {neighborhoodVibes && (
                    <div className="relative overflow-hidden rounded-2xl border border-white/15 bg-gradient-to-br from-white/[0.1] via-white/[0.05] to-white/[0.02] p-4 shadow-[0_18px_45px_rgba(0,0,0,0.28)]">
                      <div className="pointer-events-none absolute -top-6 -right-6 h-24 w-24 rounded-full bg-amber-400/10 blur-2xl" />
                      <div className="relative flex items-start gap-3">
                        <div className="text-hm-amber-400 mt-0.5 rounded-full border border-white/10 bg-white/10 p-2">
                          <MapPin className="h-4 w-4" />
                        </div>
                        <div className="space-y-2">
                          <p className="text-hm-stone-400 text-[10px] font-semibold tracking-[0.2em] uppercase">
                            Neighborhood vibe
                          </p>
                          <p className="text-hm-stone-200 text-sm leading-relaxed">
                            {neighborhoodVibes.vibe_statement}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.05] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
                    <div className="pointer-events-none absolute -bottom-8 -left-8 h-24 w-24 rounded-full bg-white/10 blur-2xl" />
                    <div className="relative flex items-start gap-3">
                      <div className="text-hm-stone-300 mt-0.5 rounded-full border border-white/10 bg-white/5 p-2">
                        <Home className="h-4 w-4" />
                      </div>
                      <div className="space-y-2">
                        <p className="text-hm-stone-400 text-[10px] font-semibold tracking-[0.2em] uppercase">
                          Home vibe
                        </p>
                        <p className="text-hm-stone-200 text-sm leading-relaxed">
                          {houseOneLiner}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                {propertyTags.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {propertyTags.map((tag) => (
                      <Badge
                        key={tag}
                        variant="secondary"
                        data-tag={tag}
                        className="rounded-full border border-white/10 bg-white/[0.06] px-2.5 py-1 text-[11px] font-medium tracking-wide text-white/80"
                      >
                        {tag}
                      </Badge>
                    ))}
                  </div>
                ) : null}
              </div>

              <div className="space-y-3">
                <h3 className="font-display text-hm-stone-200 text-lg font-medium">
                  Location
                </h3>
                <div className="flex items-center justify-between gap-3">
                  <p className="text-hm-stone-500 text-xs">
                    Tap for details, or open in Google Maps.
                  </p>
                  <button
                    type="button"
                    className="text-hm-stone-300 hover:text-hm-stone-200 inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium transition sm:hidden"
                    onClick={() => setIsMapExpanded((prev) => !prev)}
                    aria-label={isMapExpanded ? 'Hide map' : 'Show map'}
                    data-testid="toggle-map"
                  >
                    {isMapExpanded ? 'Hide map' : 'Show map'}
                  </button>
                </div>

                {isMapExpanded ? (
                  <PropertyMap
                    property={property}
                    className="h-48 w-full rounded-xl border border-white/10"
                  />
                ) : (
                  <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
                    <div className="flex items-start gap-3">
                      <div className="text-hm-amber-400 rounded-full bg-amber-400/10 p-2">
                        <MapPin className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1 space-y-1">
                        <p className="text-hm-stone-200 text-sm font-semibold">
                          Map preview
                        </p>
                        <p className="text-hm-stone-400 text-sm">
                          <span className="font-medium text-white/80">
                            {property.city}, {property.state}
                          </span>
                          <span className="text-hm-stone-500">
                            {' '}
                            • {property.zip_code}
                          </span>
                        </p>
                        <a
                          href={buildGoogleMapsUrl(property)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-hm-amber-400 hover:text-hm-amber-300 inline-flex items-center gap-1 text-sm font-medium"
                          aria-label="Open in Google Maps"
                          onClick={(e) => e.stopPropagation()}
                        >
                          Open in Google Maps
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {onDecision && (
            <div className="safe-area-bottom bg-hm-obsidian-900/95 border-t border-white/10 backdrop-blur">
              <div className="px-4 py-4 sm:px-6">
                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={() => {
                      onDecision(property.id, 'skip')
                      onOpenChange(false)
                    }}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-red-500/80 bg-red-500 py-4 font-semibold text-white shadow-lg transition-all duration-200 hover:bg-red-600 focus-visible:ring-4 focus-visible:ring-red-200/80"
                    aria-label="Pass property"
                    data-testid="pass-button"
                  >
                    <X className="h-6 w-6" strokeWidth={2.5} />
                    Pass
                  </button>
                  <button
                    type="button"
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
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
