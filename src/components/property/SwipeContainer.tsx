'use client';

import { useState, useMemo } from 'react';
import { Property, Neighborhood } from '@/lib/schemas/property';
import { PropertyCard } from './PropertyCard';
import { Heart, X } from 'lucide-react';

interface SwipeContainerProps {
  properties: Property[];
  neighborhoods?: Neighborhood[];
  onSwipe: (direction: 'left' | 'right') => void;
  onEmpty: () => void;
}

export function SwipeContainer({
  properties,
  neighborhoods = [],
  onSwipe,
  onEmpty,
}: SwipeContainerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const currentProperty = useMemo(() => {
    if (properties && properties.length > 0) {
      return properties[currentIndex];
    }
    return null;
  }, [properties, currentIndex]);

  // const currentNeighborhood = useMemo(() => {
  //   if (!currentProperty) return undefined;
  //   return neighborhoods.find(n => n.id === currentProperty.neighborhood_id);
  // }, [currentProperty, neighborhoods]);

  const handleSwipe = (direction: 'left' | 'right') => {
    onSwipe(direction);
    if (currentIndex < properties.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      onEmpty();
    }
  };

  if (!currentProperty) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-center">
          <h3 className="text-xl font-semibold text-gray-900">No properties to show</h3>
          <p className="text-gray-600">Check back later for new listings!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-[600px] w-full max-w-md mx-auto">
      {/* Property Card Stack */}
      <div className="relative h-full w-full">
        {properties.slice(currentIndex, currentIndex + 3).map((property, index) => {
          const neighborhood = neighborhoods.find(n => n.id === property.neighborhood_id);
          return (
            <div
              key={property.id}
              className="absolute h-full w-full transition-transform duration-300 ease-in-out"
              style={{
                transform: `translateY(${index * 10}px) scale(${1 - index * 0.05})`,
                zIndex: properties.length - currentIndex - index,
              }}
            >
              <PropertyCard property={property} neighborhood={neighborhood} />
            </div>
          );
        })}
      </div>

      {/* Tinder-style Action Buttons */}
      <div className="absolute bottom-8 left-0 right-0 flex justify-center gap-8">
        <button
          onClick={() => handleSwipe('left')}
          className="group flex h-16 w-16 items-center justify-center rounded-full bg-white shadow-lg transition-all duration-200 hover:scale-110 hover:shadow-xl"
          aria-label="Pass"
        >
          <X className="h-8 w-8 text-red-500 group-hover:text-red-600" />
        </button>
        
        <button
          onClick={() => handleSwipe('right')}
          className="group flex h-16 w-16 items-center justify-center rounded-full bg-white shadow-lg transition-all duration-200 hover:scale-110 hover:shadow-xl"
          aria-label="Like"
        >
          <Heart className="h-8 w-8 text-green-500 group-hover:text-green-600" fill="currentColor" />
        </button>
      </div>

      {/* Swipe Instructions */}
      {currentIndex === 0 && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 rounded-full bg-black/70 px-4 py-2 text-white text-sm">
          Swipe or tap to like/dislike
        </div>
      )}
    </div>
  );
}
