'use client'

import { useState, useCallback } from 'react'
import Image from 'next/image'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Property } from '@/types/database'
import {
  MapPin,
  Heart,
  X,
  Home,
  ChevronLeft,
  ChevronRight,
  Camera,
} from 'lucide-react'

interface EnhancedPropertyCardProps {
  property: Property
  neighborhood?: string
  onLike: (propertyId: string) => void
  onDislike: (propertyId: string) => void
  showActions?: boolean
}

export function EnhancedPropertyCard({
  property,
  neighborhood,
  onLike,
  onDislike,
  showActions = true,
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

  // Parse images
  const images = property.images || []
  const validImages = images.filter((_, index) => !imageErrors.has(index))
  const currentImageUrl =
    validImages[currentImageIndex] || '/images/properties/house-1.svg'

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
    <Card className="bg-card mx-auto w-full max-w-sm overflow-hidden shadow-xl transition-all duration-300 hover:shadow-2xl">
      {/* Image Section */}
      <div className="relative h-64 bg-gradient-to-br from-gray-100 to-gray-200">
        {isImageLoading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-12 w-12 animate-pulse rounded-full bg-gradient-to-r from-blue-400 to-purple-500"></div>
          </div>
        )}

        <Image
          src={currentImageUrl}
          alt={property.address || 'Property'}
          fill
          className="object-cover"
          priority
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          onError={() => handleImageError(currentImageIndex)}
          onLoad={() => setIsImageLoading(false)}
        />

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

        {/* Price Badge */}
        <div className="absolute bottom-4 left-4">
          <Badge className="bg-white/95 px-3 py-1.5 text-lg font-bold text-gray-900 shadow-lg backdrop-blur-sm">
            {formatPrice(property.price)}
          </Badge>
        </div>

        {/* Property Type Badge */}
        {property.property_type && (
          <div className="absolute top-4 left-4">
            <Badge
              variant="secondary"
              className="bg-white/95 shadow-md backdrop-blur-sm"
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
              className="absolute top-1/2 left-2 -translate-y-1/2 rounded-full bg-black/60 p-2 text-white transition-all hover:bg-black/80"
              aria-label="Previous image"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={nextImage}
              className="absolute top-1/2 right-2 -translate-y-1/2 rounded-full bg-black/60 p-2 text-white transition-all hover:bg-black/80"
              aria-label="Next image"
            >
              <ChevronRight className="h-4 w-4" />
            </button>

            {/* Image Counter */}
            <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 items-center space-x-1 rounded bg-black/70 px-2 py-1 text-xs text-white">
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
                className={`h-2 w-2 rounded-full transition-all ${
                  index === currentImageIndex
                    ? 'w-4 bg-white'
                    : 'bg-white/50 hover:bg-white/75'
                }`}
                aria-label={`Go to image ${index + 1}`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Content Section */}
      <CardContent className="space-y-4 p-5">
        {/* Address */}
        <div>
          <h3 className="text-foreground mb-1 text-xl font-bold">
            {property.address}
          </h3>
          <p className="text-muted-foreground text-sm">
            <MapPin className="mr-1 inline h-3 w-3" />
            {neighborhood || property.city}, {property.state}
          </p>
        </div>

        {/* Property Details */}
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">
            {formatBedsBaths(property.bedrooms || 0, property.bathrooms || 0)}
          </span>
          <span className="font-medium">
            {formatSquareFeet(property.square_feet)}
          </span>
        </div>

        {/* Description - Commented out for now */}
        {/* {property.description && typeof property.description === 'string' && (
          <p className="text-sm text-muted-foreground line-clamp-3">
            {property.description}
          </p>
        )} */}

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
          <div className="mt-4 flex gap-3">
            <Button
              variant="outline"
              size="lg"
              onClick={() => onDislike(property.id)}
              className="flex-1 border-red-200 bg-red-50 text-red-600 transition-all hover:scale-105 hover:border-red-300 hover:bg-red-100"
            >
              <X className="mr-2 h-5 w-5" />
              Pass
            </Button>

            <Button
              size="lg"
              onClick={() => onLike(property.id)}
              className="flex-1 bg-green-600 text-white transition-all hover:scale-105 hover:bg-green-700"
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
