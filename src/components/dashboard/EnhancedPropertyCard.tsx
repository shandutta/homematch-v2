'use client'

import { useState, useCallback } from 'react'
import { PropertyImage } from '@/components/ui/property-image'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Property } from '@/types/database'
import { Neighborhood } from '@/lib/schemas/property'
import {
  MapPin,
  Heart,
  X,
  Home,
  ChevronLeft,
  ChevronRight,
  Camera,
} from 'lucide-react'
import { StorytellingDescription } from '@/components/features/storytelling/StorytellingDescription'

interface EnhancedPropertyCardProps {
  property: Property
  neighborhood?: string | Neighborhood
  onLike: (propertyId: string) => void
  onDislike: (propertyId: string) => void
  showActions?: boolean
  isMutualLike?: boolean
}

export function EnhancedPropertyCard({
  property,
  neighborhood,
  onLike,
  onDislike,
  showActions = true,
  isMutualLike = false,
}: EnhancedPropertyCardProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [imageErrors, setImageErrors] = useState<Set<number>>(new Set())
  const [isImageLoading, setIsImageLoading] = useState(true)

  // Format functions
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price)
  }

  const formatBedsBaths = (beds: number, baths: number) => {
    return `${beds} bed${beds !== 1 ? 's' : ''} • ${baths} bath${baths !== 1 ? 's' : ''}`
  }

  const formatSquareFeet = (sqft: number | null) => {
    if (!sqft) return ''
    return `${sqft.toLocaleString()} sqft`
  }

  // Parse images - PropertyImage component will handle fallbacks
  const images = property.images || []
  const validImages = images.filter((_, index) => !imageErrors.has(index))
  const currentImageUrl = validImages[currentImageIndex]

  const nextImage = useCallback(() => {
    if (validImages.length <= 1) return
    setCurrentImageIndex((prev) => (prev + 1) % validImages.length)
  }, [validImages.length])

  const prevImage = useCallback(() => {
    if (validImages.length <= 1) return
    setCurrentImageIndex(
      (prev) => (prev - 1 + validImages.length) % validImages.length
    )
  }, [validImages.length])

  const handleImageError = useCallback((index: number) => {
    setImageErrors((prev) => new Set(Array.from(prev).concat(index)))
  }, [])

  return (
    <Card
      className="bg-card shadow-token-xl transition-token-all duration-token-normal hover:shadow-token-2xl mx-auto w-full max-w-sm overflow-hidden"
      data-testid="property-card"
    >
      {/* Image Section */}
      <div className="from-token-secondary-100 to-token-secondary-200 relative h-64 bg-gradient-to-br">
        {isImageLoading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="rounded-token-full from-token-primary-400 to-token-accent-500 h-12 w-12 animate-pulse bg-gradient-to-r"></div>
          </div>
        )}

        <PropertyImage
          src={currentImageUrl || images}
          alt={property.address || 'Property'}
          fill
          className="object-cover"
          priority
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          onError={() => handleImageError(currentImageIndex)}
          onLoad={() => setIsImageLoading(false)}
        />

        {/* Gradient Overlay */}
        <div className="from-token-secondary-900/60 absolute inset-0 bg-gradient-to-t via-transparent to-transparent" />

        {/* Price Badge */}
        <div className="absolute bottom-4 left-4">
          <Badge
            className="bg-token-background-primary/95 p-token-md text-token-lg text-token-secondary-900 shadow-token-lg font-bold backdrop-blur-sm"
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
              data-testid="property-type"
            >
              <Home className="mr-1 h-3 w-3" />
              {property.property_type}
            </Badge>
          </div>
        )}

        {/* Image Navigation */}
        {validImages.length > 1 && (
          <>
            <button
              onClick={prevImage}
              className="rounded-token-full bg-token-secondary-900/60 p-token-sm text-token-text-inverse transition-token-all hover:bg-token-secondary-900/80 absolute top-1/2 left-2 -translate-y-1/2"
              aria-label="Previous image"
              data-testid="previous-image-button"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={nextImage}
              className="rounded-token-full bg-token-secondary-900/60 p-token-sm text-token-text-inverse transition-token-all hover:bg-token-secondary-900/80 absolute top-1/2 right-2 -translate-y-1/2"
              aria-label="Next image"
              data-testid="next-image-button"
            >
              <ChevronRight className="h-4 w-4" />
            </button>

            {/* Image Counter */}
            <div
              className="gap-token-xs rounded-token-md bg-token-secondary-900/70 p-token-xs text-token-xs text-token-text-inverse absolute bottom-2 left-1/2 flex -translate-x-1/2 items-center"
              data-testid="image-counter"
            >
              <Camera className="h-3 w-3" />
              <span>
                {currentImageIndex + 1} / {validImages.length}
              </span>
            </div>
          </>
        )}

        {/* Image Dots */}
        {validImages.length > 1 && (
          <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 space-x-1">
            {validImages.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentImageIndex(index)}
                className={`rounded-token-full transition-token-all h-2 w-2 ${
                  index === currentImageIndex
                    ? 'bg-token-text-inverse w-4'
                    : 'bg-token-text-inverse/50 hover:bg-token-text-inverse/75'
                }`}
                aria-label={`Go to image ${index + 1}`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Content Section */}
      <CardContent className="p-token-lg space-y-4">
        {/* Address */}
        <div>
          <h3
            className="text-foreground text-token-xl mb-1 font-bold"
            data-testid="property-address"
          >
            {property.address}
          </h3>
          <p
            className="text-muted-foreground text-token-sm"
            data-testid="property-location"
          >
            <MapPin className="mr-1 inline h-3 w-3" />
            {typeof neighborhood === 'string'
              ? neighborhood
              : neighborhood?.name || property.city}
            , {property.state}
          </p>
        </div>

        {/* Property Details */}
        <div className="text-token-sm flex items-center justify-between">
          <span className="font-medium" data-testid="property-beds-baths">
            {formatBedsBaths(property.bedrooms || 0, property.bathrooms || 0)}
          </span>
          <span className="font-medium" data-testid="property-sqft">
            {formatSquareFeet(property.square_feet)}
          </span>
        </div>

        {/* Storytelling Description */}
        <StorytellingDescription
          property={{
            ...property,
            // Ensure property_type matches the expected enum
            property_type: [
              'house',
              'condo',
              'townhouse',
              'apartment',
            ].includes(property.property_type as string)
              ? (property.property_type as
                  | 'house'
                  | 'condo'
                  | 'townhouse'
                  | 'apartment')
              : null,
            // Ensure listing_status matches the expected enum
            listing_status: ['active', 'pending', 'sold'].includes(
              property.listing_status as string
            )
              ? (property.listing_status as 'active' | 'pending' | 'sold')
              : null,
            // Ensure coordinates is handled properly
            coordinates: property.coordinates || null,
          }}
          neighborhood={
            typeof neighborhood === 'object' ? neighborhood : undefined
          }
          isMutualLike={isMutualLike}
          variant="compact"
          showNeighborhoodPerks={true}
          showFutureVision={false}
        />

        {/* Amenities - Commented out for now */}
        {/* {property.amenities && Array.isArray(property.amenities) && property.amenities.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {(property.amenities as string[]).slice(0, 3).map((amenity, index) => (
              <Badge key={index} variant="secondary" className="text-xs">
                {amenity}
              </Badge>
            ))}
          </div>
        )} */}

        {/* Mini Map - Commented out for now */}
        {/* {property.coordinates && typeof property.coordinates === 'object' && property.coordinates !== null && (
          <div className="mt-2">
            <PropertyMap 
              property={property} 
              className="h-32 rounded-lg"
            />
          </div>
        )} */}

        {/* Action Buttons */}
        {showActions && (
          <div className="gap-token-md mt-4 flex">
            <Button
              variant="outline"
              size="lg"
              onClick={() => onDislike(property.id)}
              className="border-token-error-light bg-token-error-light/20 text-token-error transition-token-all hover:border-token-error hover:bg-token-error-light/30 flex-1 hover:scale-105"
              data-testid="pass-button"
            >
              <X className="mr-2 h-5 w-5" />
              Pass
            </Button>

            <Button
              size="lg"
              onClick={() => onLike(property.id)}
              className="bg-token-success transition-token-all hover:bg-token-success-dark flex-1 text-white hover:scale-105"
              data-testid="like-button"
            >
              <Heart className="mr-2 h-5 w-5" fill="currentColor" />
              Like
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
