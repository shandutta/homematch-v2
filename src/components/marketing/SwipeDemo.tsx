'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useState, useCallback } from 'react'
import { Heart, X, Bed, Bath, Square } from 'lucide-react'
import Image from 'next/image'
import { getPropertyBlurPlaceholder } from '@/lib/image-blur'

interface Property {
  id: number
  image: string
  price: string
  address: string
  beds: number
  baths: number
  sqft: string
}

const demoProperties: Property[] = [
  {
    id: 1,
    image: '/images/properties/house-1.svg',
    price: '$1,250,000',
    address: '742 Evergreen Terrace',
    beds: 4,
    baths: 3,
    sqft: '2,800',
  },
  {
    id: 2,
    image: '/images/properties/house-2.svg',
    price: '$875,000',
    address: '1428 Elm Street',
    beds: 3,
    baths: 2,
    sqft: '1,950',
  },
  {
    id: 3,
    image: '/images/properties/house-3.svg',
    price: '$2,100,000',
    address: '90210 Beverly Hills',
    beds: 2,
    baths: 2,
    sqft: '1,600',
  },
]

export function SwipeDemo() {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [direction, setDirection] = useState(0)

  const handleSwipe = useCallback((swipeDirection: 'left' | 'right') => {
    setDirection(swipeDirection === 'right' ? 1 : -1)
    setCurrentIndex((prev) => (prev + 1) % demoProperties.length)
  }, [])

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        handleSwipe('left')
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        handleSwipe('right')
      }
    },
    [handleSwipe]
  )

  return (
    <section className="bg-white py-12 sm:py-20">
      <div className="container mx-auto px-4">
        <motion.div
          className="mx-auto max-w-3xl text-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2
            className="text-3xl font-bold text-gray-900 sm:text-4xl md:text-5xl lg:text-6xl"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            Try It Out—Swipe Through Homes
          </h2>
          <p
            className="mt-4 text-lg text-gray-600 sm:text-xl md:text-2xl"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            Go ahead, give it a swipe. We promise it&apos;s addictive.
          </p>
        </motion.div>

        <div className="relative mx-auto mt-8 max-w-sm sm:mt-16 sm:max-w-md">
          {/* Swipe Instructions */}
          <div className="mb-6 flex justify-between px-4 sm:mb-8 sm:px-8">
            <motion.div
              className="flex items-center gap-2 text-red-500"
              animate={{ x: [-5, 5, -5] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <X className="h-5 w-5" />
              <span
                className="text-xs font-medium sm:text-sm"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                Nah
              </span>
            </motion.div>

            <motion.div
              className="flex items-center gap-2 text-green-500"
              animate={{ x: [5, -5, 5] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <span
                className="text-xs font-medium sm:text-sm"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                Love it
              </span>
              <Heart className="h-5 w-5 fill-current" />
            </motion.div>
          </div>

          {/* Card Container */}
          <div
            className="relative h-[500px] rounded-2xl focus:ring-2 focus:ring-[#29E3FF] focus:ring-offset-4 focus:outline-none sm:h-[600px]"
            tabIndex={0}
            onKeyDown={handleKeyDown}
            role="region"
            aria-label="Swipeable property cards. Use arrow keys to navigate."
            aria-live="polite"
          >
            <AnimatePresence initial={false} custom={direction}>
              <motion.div
                key={currentIndex}
                custom={direction}
                variants={{
                  enter: (direction) => ({
                    x: direction > 0 ? 1000 : -1000,
                    opacity: 0,
                  }),
                  center: {
                    zIndex: 1,
                    x: 0,
                    opacity: 1,
                  },
                  exit: (direction) => ({
                    zIndex: 0,
                    x: direction < 0 ? 1000 : -1000,
                    opacity: 0,
                  }),
                }}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{
                  x: { type: 'spring', stiffness: 300, damping: 30 },
                  opacity: { duration: 0.2 },
                }}
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={1}
                onDragEnd={(e, { offset, velocity }) => {
                  const swipe = Math.abs(offset.x) * velocity.x
                  if (swipe < -10000) {
                    handleSwipe('left')
                  } else if (swipe > 10000) {
                    handleSwipe('right')
                  }
                }}
                className="absolute h-full w-full cursor-grab active:cursor-grabbing"
              >
                <div className="h-full overflow-hidden rounded-2xl bg-white shadow-2xl">
                  {/* Property Image */}
                  <div className="relative h-[280px] sm:h-[350px]">
                    <Image
                      src={demoProperties[currentIndex].image}
                      alt={demoProperties[currentIndex].address}
                      fill
                      className="object-cover select-none pointer-events-none"
                      sizes="400px"
                      priority
                      placeholder="blur"
                      blurDataURL={getPropertyBlurPlaceholder(
                        demoProperties[currentIndex].image
                      )}
                      draggable={false}
                    />

                    {/* Price Tag */}
                    <div className="absolute bottom-2 left-2 rounded-lg bg-white/95 px-3 py-1.5 backdrop-blur sm:bottom-4 sm:left-4 sm:px-4 sm:py-2">
                      <p
                        className="text-lg font-bold text-gray-900 sm:text-2xl"
                        style={{ fontFamily: 'var(--font-heading)' }}
                      >
                        {demoProperties[currentIndex].price}
                      </p>
                    </div>
                  </div>

                  {/* Property Details */}
                  <div className="p-4 sm:p-6">
                    <h3
                      className="text-lg font-semibold text-gray-900 sm:text-xl"
                      style={{ fontFamily: 'var(--font-heading)' }}
                    >
                      {demoProperties[currentIndex].address}
                    </h3>

                    <div className="mt-3 flex items-center gap-4 text-gray-600 sm:mt-4 sm:gap-6">
                      <div className="flex items-center gap-1">
                        <Bed className="h-4 w-4" />
                        <span
                          className="text-sm sm:text-base"
                          style={{ fontFamily: 'var(--font-body)' }}
                        >
                          {demoProperties[currentIndex].beds} beds
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Bath className="h-4 w-4" />
                        <span
                          className="text-sm sm:text-base"
                          style={{ fontFamily: 'var(--font-body)' }}
                        >
                          {demoProperties[currentIndex].baths} baths
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Square className="h-4 w-4" />
                        <span
                          className="text-sm sm:text-base"
                          style={{ fontFamily: 'var(--font-body)' }}
                        >
                          {demoProperties[currentIndex].sqft} sqft
                        </span>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="mt-4 flex gap-3 sm:mt-6 sm:gap-4">
                      <motion.button
                        className="flex flex-1 items-center justify-center gap-2 rounded-lg border-2 border-red-500 py-2.5 text-red-500 transition-all hover:bg-red-50 sm:py-3"
                        style={{ fontFamily: 'var(--font-body)' }}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleSwipe('left')}
                        aria-label="Pass on this property"
                      >
                        <X className="h-4 w-4 sm:h-5 sm:w-5" />
                        <span className="text-sm font-medium sm:text-base">
                          Pass
                        </span>
                      </motion.button>

                      <motion.button
                        className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-green-500 py-2.5 text-white transition-all hover:bg-green-600 sm:py-3"
                        style={{ fontFamily: 'var(--font-body)' }}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleSwipe('right')}
                        aria-label="Love this property"
                      >
                        <Heart className="h-4 w-4 fill-current sm:h-5 sm:w-5" />
                        <span className="text-sm font-medium sm:text-base">
                          Love
                        </span>
                      </motion.button>
                    </div>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  )
}
