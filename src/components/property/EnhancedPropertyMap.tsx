'use client';

import { useEffect, useRef, useState } from 'react';
import { Property } from '@/types/database';
import { MapPin, Loader2 } from 'lucide-react';

interface EnhancedPropertyMapProps {
  property: Property;
  className?: string;
  zoom?: number;
  showMarker?: boolean;
}

export function EnhancedPropertyMap({ 
  property, 
  className = '', 
  zoom = 15,
  showMarker = true 
}: EnhancedPropertyMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!mapRef.current || !property.coordinates) return;

    // Check if Google Maps is loaded
    if (!window.google?.maps) {
      setError('Google Maps not loaded');
      setIsLoading(false);
      return;
    }

    try {
      const coords = property.coordinates as { lat: number; lng: number };
      
      // Create map
      const map = new window.google.maps.Map(mapRef.current, {
        center: coords,
        zoom,
        styles: [
          {
            featureType: 'poi',
            elementType: 'labels',
            stylers: [{ visibility: 'off' }]
          },
          {
            featureType: 'transit',
            elementType: 'labels',
            stylers: [{ visibility: 'off' }]
          }
        ],
        disableDefaultUI: false,
        zoomControl: true,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
      });

      // Add marker
      if (showMarker) {
        const marker = new window.google.maps.Marker({
          position: coords,
          map,
          title: property.address || 'Property',
          icon: {
            url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
              <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
                <circle cx="16" cy="16" r="12" fill="#3b82f6" stroke="#ffffff" stroke-width="3"/>
                <circle cx="16" cy="16" r="6" fill="#ffffff"/>
              </svg>
            `),
            scaledSize: new window.google.maps.Size(32, 32),
            anchor: new window.google.maps.Point(16, 16),
          },
        });

        // Add info window
        const infoWindow = new window.google.maps.InfoWindow({
          content: `
            <div class="p-3 max-w-xs">
