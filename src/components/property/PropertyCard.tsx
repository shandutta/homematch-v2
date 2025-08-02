'use client';

import { Property, Neighborhood } from '@/types/database';
import { Badge } from '@/components/ui/badge';
import { MapPin, Bed, Bath, Square, Home } from 'lucide-react';
import Image from 'next/image';
import { PropertyMap } from './PropertyMap';

interface PropertyCardProps {
  property: Property;
  neighborhood?: Neighborhood;
}

export function PropertyCard({ property, neighborhood }: PropertyCardProps) {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  const formatSquareFeet = (sqft: number | null) => {
    if (!sqft) return 'N/A';
    return new Intl.NumberFormat('en-US').format(sqft);
  };

  // Use images array from property, fallback to placeholder
  const imageUrl = property.images && property.images.length > 0 
    ? property.images[0] 
    : '/images/properties/house-1.svg';

  return (
    <div className="relative h-full w-full overflow-hidden rounded-xl bg-card shadow-lg transition-all duration-300 hover:shadow-xl">
      {/* Property Image */}
      <div className="relative h-1/2 w-full">
        <Image
          src={imageUrl}
          alt={property.address || 'Property'}
          fill
          className="object-cover"
          priority
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          onError={(e) => {
            (e.target as HTMLImageElement).src = '/images/properties/house-1.svg';
          }}
        />
        
        {/* Gradient overlay for text readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        
        {/* Price Badge */}
        <div className="absolute bottom-4 left-4">
          <Badge className="bg-white/95 px-3 py-1.5 text-lg font-bold text-gray-900 backdrop-blur-sm shadow-md">
            {formatPrice(property.price)}
          </Badge>
        </div>

        {/* Property Type Badge */}
        {property.property_type && (
          <div className="absolute top-4 left-4">
            <Badge variant="secondary" className="bg-white/95 backdrop-blur-sm shadow-md">
              <Home className="mr-1 h-3 w-3" />
              {property.property_type}
            </Badge>
          </div>
        )}
      </div>

      {/* Property Details */}
      <div className="h-1/2 p-5">
        <div className="mb-4">
          <h3 className="text-xl font-bold text-foreground">{property.address}</h3>
          <p className="text-sm text-muted-foreground">
            {neighborhood?.name || property.city}, {property.state}
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3 text-sm">
          <div className="flex items-center gap-1.5">
            <Bed className="h-4 w-4 text-primary" />
            <span className="font-medium">{property.bedrooms} beds</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Bath className="h-4 w-4 text-primary" />
            <span className="font-medium">{property.bathrooms} baths</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Square className="h-4 w-4 text-primary" />
            <span className="font-medium">{formatSquareFeet(property.square_feet)} sqft</span>
          </div>
        </div>

        {property.description && (
          <p className="mt-4 text-sm text-muted-foreground line-clamp-3">
            {property.description}
          </p>
        )}

        <div className="mt-4 space-y-2">
          {neighborhood && (
            <Badge variant="outline" className="text-xs">
              <MapPin className="mr-1 h-3 w-3" />
              {neighborhood.name}
            </Badge>
          )}
          
          {property.amenities && property.amenities.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {property.amenities.slice(0, 3).map((amenity, index) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  {amenity}
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Mini Map */}
        <div className="mt-4">
          <PropertyMap property={property} className="h-24 rounded-lg" />
        </div>
      </div>
    </div>
  );
}
