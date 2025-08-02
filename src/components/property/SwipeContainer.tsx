'use client';

import { useState, useMemo } from 'react';
import { Property } from '@/types/database';
import { Card, CardContent } from '@/components/ui/card';

interface SwipeContainerProps {
  properties: Property[];
  onSwipe: (direction: 'left' | 'right') => void;
  onEmpty: () => void;
}

export function SwipeContainer({
  properties,
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
      <div className="text-center">
        <p>No properties to show.</p>
      </div>
    );
  }

  return (
    <div className="relative h-96">
      <Card className="absolute h-full w-full transform transition-transform duration-300 ease-in-out">
        <CardContent className="p-4">
          <h3 className="text-lg font-bold">{currentProperty.address}</h3>
          <p>{currentProperty.price}</p>
          <p>
            {currentProperty.bedrooms} beds, {currentProperty.bathrooms} baths
          </p>
        </CardContent>
      </Card>
      <div className="absolute bottom-4 flex w-full justify-center space-x-4">
        <button
          onClick={() => handleSwipe('left')}
          className="rounded-full bg-red-500 p-4 text-white"
        >
          ✕
        </button>
        <button
          onClick={() => handleSwipe('right')}
          className="rounded-full bg-green-500 p-4 text-white"
        >
          ❤️
        </button>
      </div>
    </div>
  );
}
