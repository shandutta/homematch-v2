'use client'

import { Property } from '@/lib/schemas/property'
import { Neighborhood } from '@/lib/schemas/property'
import { Badge } from '@/components/ui/badge'
import {
  MapPin,
  Bed,
  Bath,
  Square,
  Home,
  ExternalLink,
  Heart,
  X,
} from 'lucide-react'
import { PropertyImage } from '@/components/ui/property-image'
import { PropertyMap } from './PropertyMap'
import { InteractionType } from '@/types/app'
import { MutualLikesIndicator } from '@/components/features/couples/MutualLikesBadge'
import { useMutualLikes } from '@/hooks/useCouples'
import { StorytellingDescription } from '@/components/features/storytelling/StorytellingDescription'

interface PropertyCardProps {
  property: Property
  neighborhood?: Neighborhood
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

export function PropertyCard({
  property,
  neighborhood,
  onDecision,
}: PropertyCardProps) {
  const { data: mutualLikes = [] } = useMutualLikes()

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
    if (!sqft) return 'N/A'
    return new Intl.NumberFormat('en-US').format(sqft)
  }

  // Use images array from property - PropertyImage component handles fallbacks

  return (
    <div
      className="bg-card rounded-token-xl shadow-token-lg duration-token-normal ease-token-out hover:shadow-token-xl relative h-full w-full overflow-hidden transition-all"
      data-testid="property-card"
    >
      {/* Property Image */}
      <div className="relative h-1/2 w-full">
        <PropertyImage
          src={property.images || undefined}
          alt={property.address || 'Property'}
          fill
          className="object-cover"
          priority
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

        {/* Zillow Link */}
        <a
          href={buildZillowUrl(property)}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()} // Prevent card swipe on click
          className="rounded-token-full bg-token-text-inverse/10 text-token-text-inverse duration-token-fast ease-token-out hover:bg-token-text-inverse/20 absolute top-4 right-4 flex h-10 w-10 items-center justify-center backdrop-blur-md transition-all"
          aria-label="View on Zillow"
        >
          <ExternalLink className="h-5 w-5" />
        </a>
      </div>

      {/* Property Details */}
      <div className="p-token-lg h-1/2">
        <div className="mb-token-md">
          <h3
            className="text-foreground text-token-xl font-bold"
            data-testid="property-address"
          >
            {property.address}
          </h3>
          <p className="text-muted-foreground text-token-sm">
            {neighborhood?.name || property.city}, {property.state}
          </p>
        </div>

        <div className="gap-token-sm text-token-sm grid grid-cols-3">
          <div className="gap-token-xs flex items-center">
            <Bed className="text-token-primary h-4 w-4" />
            <span className="font-medium">{property.bedrooms} beds</span>
          </div>
          <div className="gap-token-xs flex items-center">
            <Bath className="text-token-primary h-4 w-4" />
            <span className="font-medium">{property.bathrooms} baths</span>
          </div>
          <div className="gap-token-xs flex items-center">
            <Square className="text-token-primary h-4 w-4" />
            <span className="font-medium">
              {formatSquareFeet(property.square_feet)} sqft
            </span>
          </div>
        </div>

        {/* Storytelling Description */}
        <div className="mt-token-md">
          <StorytellingDescription
            property={property}
            neighborhood={neighborhood}
            isMutualLike={isMutualLike}
          />
        </div>

        {property.description && (
          <p className="text-muted-foreground mt-token-md text-token-sm line-clamp-3">
            {property.description}
          </p>
        )}

        <div className="mt-token-md space-y-2">
          {neighborhood && (
            <Badge variant="outline" className="text-token-xs">
              <MapPin className="mr-1 h-3 w-3" />
              {neighborhood.name}
            </Badge>
          )}

          {property.amenities && property.amenities.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {property.amenities.slice(0, 3).map((amenity, index) => (
                <Badge
                  key={index}
                  variant="secondary"
                  className="text-token-xs"
                >
                  {amenity}
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Mini Map - Conditionally render only if coordinates are available */}
        {property.coordinates != null && (
          <div className="mt-token-md h-24">
            <PropertyMap
              property={property}
              className="rounded-token-lg h-full w-full"
            />
          </div>
        )}

        {/* On-Card Action Buttons */}
        {onDecision && (
          <div className="gap-token-sm absolute right-5 bottom-5 flex">
            <button
              onClick={(e) => {
                e.stopPropagation()
                onDecision(property.id, 'skip')
              }}
              className="rounded-token-full bg-token-text-inverse/10 text-token-error duration-token-fast ease-token-out hover:bg-token-text-inverse/20 flex h-14 w-14 items-center justify-center backdrop-blur-md transition-all"
              aria-label="Pass property"
            >
              <X size={32} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                onDecision(property.id, 'liked')
              }}
              className="rounded-token-full bg-token-text-inverse/10 text-token-success duration-token-fast ease-token-out hover:bg-token-text-inverse/20 flex h-14 w-14 items-center justify-center backdrop-blur-md transition-all"
              aria-label="Like property"
              data-testid="like-button"
            >
              <Heart size={32} />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
