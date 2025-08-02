'use client';

import { Property } from '@/types/database';
import { MapPin } from 'lucide-react';

interface PropertyMapProps {
  property: Property;
  className?: string;
}

export function PropertyMap({ property, className = '' }: PropertyMapProps) {
  // For now, we'll use a placeholder map since Google Maps requires API key
  // In production, you'd integrate with Google Maps, Mapbox, etc.
  
  return (
    <div className={`relative h-48 w-full overflow-hidden rounded-lg bg-gray-100 ${className}`}>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center">
          <MapPin className="mx-auto h-8 w-8 text-gray-400 mb-2" />
          <p className="text-sm text-gray-600">
            {property.address}
          </p>
          <p className="text-xs text-gray-500">
            Map integration coming soon
          </p>
        </div>
      </div>
      
      {/* Placeholder for map tiles */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-green-50 opacity-50" />
    </div>
  );
}
