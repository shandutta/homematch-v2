'use client'

import { motion, useMotionValue, useTransform } from 'framer-motion'
import { useState, useCallback, useEffect, useRef } from 'react'
import { Heart, X } from 'lucide-react'
import Image from 'next/image'
import { getPropertyBlurPlaceholder } from '@/lib/image-blur'

interface Property {
  id: number
  image: string
  price: string
  beds: number
  location: string
}

const mockProperties: Property[] = [
  {
    id: 1,
    image: '/images/properties/house-1.svg',
    price: '$850,000',
    beds: 4,
    location: 'Palo Alto',
  },
  {
    id: 2,
    image: '/images/properties/house-2.svg',
    price: '$1,200,000',
    beds: 3,
    location: 'Mountain View',
  },
  {
    id: 3,
    image: '/images/properties/house-3.svg',
    price: '$950,000',
    beds: 3,
    location: 'Sunnyvale',
  },
]

interface PropertyCardProps {
  property: Property
  index: number
  onSwipe: (direction: 'left' | 'right') => void
}

function PropertyCard({ property, index, onSwipe }: PropertyCardProps) {
  const x = useMotionValue(0)
  const rotate = useTransform(x, [-200, 200], [-30, 30])
  const opacity = useTransform(
    x,
    [-200, -100, 0, 100, 200],
    [0.5, 1, 1, 1, 0.5]
  )

  const handleDragEnd = (_event: unknown, info: { offset: { x: number } }) => {
    const threshold = 100
    if (Math.abs(info.offset.x) > threshold) {
      const direction = info.offset.x > 0 ? 'right' : 'left'
      onSwipe(direction)
    }
  }

  return (
    <motion.div
      className="absolute inset-0 cursor-grab will-change-transform active:cursor-grabbing"
      style={{
        x,
        rotate,
        opacity,
      }}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      onDragEnd={handleDragEnd}
      animate={{ scale: 1 - index * 0.05, zIndex: 100 - index }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
    >
      <div className="h-full overflow-hidden rounded-2xl bg-white shadow-xl">
        {/* Property Image */}
        <div className="relative h-[300px]">
          <Image
            src={property.image}
            alt={`Property in ${property.location}`}
            fill
            className="object-cover"
            sizes="300px"
            priority={index === 0}
            placeholder="blur"
            blurDataURL={getPropertyBlurPlaceholder(property.image)}
          />

          {/* Like/Dislike Indicators */}
          <motion.div
            className="absolute top-4 right-4 rounded-full bg-green-500 p-3 text-white"
            aria-hidden="true"
            style={{ opacity: useTransform(x, [0, 100], [0, 1]) }}
          >
            <Heart className="h-8 w-8 fill-current" aria-hidden="true" />
          </motion.div>

          <motion.div
            className="absolute top-4 left-4 rounded-full bg-red-500 p-3 text-white"
            aria-hidden="true"
            style={{ opacity: useTransform(x, [-100, 0], [1, 0]) }}
          >
            <X className="h-8 w-8" aria-hidden="true" />
          </motion.div>
        </div>

        {/* Property Details */}
        <div className="p-4">
          <h3 className="text-2xl font-bold text-gray-900">{property.price}</h3>
          <p className="mt-1 text-gray-600">
            {property.beds} beds • {property.location}
          </p>
        </div>
      </div>
    </motion.div>
  )
}

export function PhoneMockup() {
  const [cards, setCards] = useState(mockProperties)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleSwipe = useCallback(
    (cardId: number, _direction: 'left' | 'right') => {
      setCards((prev) => {
        const newCards = prev.filter((c) => c.id !== cardId)

        // Reset cards when all are swiped
        if (newCards.length === 0) {
          timeoutRef.current = setTimeout(() => setCards(mockProperties), 1000)
        }

        return newCards
      })
    },
    []
  )

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  return (
    <div className="relative mx-auto w-full max-w-sm">
      {/* Phone Frame */}
      <div className="relative z-20 mx-auto h-[700px] w-[350px] rounded-[3rem] border-[14px] border-gray-900 bg-gray-900 shadow-2xl">
        {/* Screen */}
        <div className="h-full w-full overflow-hidden rounded-[2.2rem] bg-gray-100">
          {/* Status Bar */}
          <div className="flex h-6 items-center justify-between bg-white px-6 text-xs">
            <span>9:41 AM</span>
            <div className="flex gap-1">
              <div className="h-3 w-6 rounded-sm bg-gray-900" />
              <div className="h-3 w-6 rounded-sm bg-gray-900" />
              <div className="h-3 w-6 rounded-sm bg-gray-900" />
            </div>
          </div>

          {/* App Content */}
          <div className="relative h-full bg-gray-50 p-4">
            {/* App Header */}
            <h2 className="mb-4 text-center text-xl font-bold text-gray-900">
              HomeMatch
            </h2>

            {/* Card Stack */}
            <div
              className="relative h-[500px] outline-none"
              role="group"
              aria-label="Swipe through property cards"
              tabIndex={0}
              onKeyDown={(e) => {
                const top = cards[0]
                if (!top) return
                if (e.key === 'ArrowLeft') {
                  e.preventDefault()
                  handleSwipe(top.id, 'left')
                } else if (e.key === 'ArrowRight') {
                  e.preventDefault()
                  handleSwipe(top.id, 'right')
                }
              }}
            >
              {cards.map((property, index) => (
                <PropertyCard
                  key={property.id}
                  property={property}
                  index={index}
                  onSwipe={(direction) => handleSwipe(property.id, direction)}
                />
              ))}

              {/* Empty State */}
              {cards.length === 0 && (
                <div className="flex h-full items-center justify-center">
                  <div className="text-center" role="status" aria-live="polite">
                    <div className="text-4xl" aria-hidden="true">
                      🏠
                    </div>
                    <p className="mt-2 text-gray-600">Loading more homes...</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Notch */}
      <div className="absolute top-[14px] left-1/2 z-30 h-6 w-40 -translate-x-1/2 rounded-full bg-gray-900" />
    </div>
  )
}
