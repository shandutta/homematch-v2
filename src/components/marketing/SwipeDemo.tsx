'use client'

import { AnimatePresence, PanInfo } from 'framer-motion'
import { useState, useCallback, useEffect } from 'react'
import { Heart, X, Bed, Bath } from 'lucide-react'
import { MotionButton } from '@/components/ui/motion-button'
import { MotionDiv } from '@/components/ui/motion-components'
import Image from 'next/image'
import { getPropertyBlurPlaceholder } from '@/lib/image-blur'

interface Property {
  id: number
  image: string
  price: string
  address: string
  beds: number
  baths: number
  sqft: number | string
}

interface MarketingProperty {
  imageUrl: string
  price?: number
  address?: string
  bedrooms?: number
  bathrooms?: number
  sqft?: number
  livingArea?: number
}

export function SwipeDemo() {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [direction, setDirection] = useState(0)
  const [properties, setProperties] = useState<Property[]>([])

  // Fetch real marketing properties like PhoneMockup
  useEffect(() => {
    let cancelled = false
    async function fetchData() {
      try {
        const res = await fetch('/api/properties/marketing', {
          cache: 'no-store',
        })
        if (!res.ok) return
        const data: unknown[] = await res.json()
        if (!Array.isArray(data)) return
        const mapped: Property[] = data
          .filter((c): c is MarketingProperty =>
            Boolean(
              c &&
                typeof c === 'object' &&
                'imageUrl' in c &&
                typeof (c as MarketingProperty).imageUrl === 'string'
            )
          )
          .slice(0, 6)
          .map((c, idx) => ({
            id: idx + 1,
            image: c.imageUrl,
            price:
              typeof c.price === 'number'
                ? `$${c.price.toLocaleString()}`
                : '$—',
            address: typeof c.address === 'string' ? c.address : '—',
            beds: typeof c.bedrooms === 'number' ? c.bedrooms : 0,
            baths: typeof c.bathrooms === 'number' ? c.bathrooms : 0,
            sqft:
              typeof c.sqft === 'number'
                ? c.sqft
                : typeof c.livingArea === 'number'
                  ? c.livingArea
                  : '—',
          }))
        if (!cancelled) setProperties(mapped)
      } catch (_error) {
        // Silent fail; keep empty - this is expected for marketing demo
      }
    }
    void fetchData()
    return () => {
      cancelled = true
    }
  }, [])

  const handleSwipe = useCallback(
    (swipeDirection: 'left' | 'right') => {
      // Direction set drives exit animation; +1 => exit to right, -1 => exit to left
      setDirection(swipeDirection === 'right' ? 1 : -1)
      // Delay index increment slightly so the exit animation direction is respected visually
      setTimeout(() => {
        setCurrentIndex((prev) => {
          const len = properties.length || 1
          return (prev + 1) % len
        })
      }, 0)
    },
    [properties.length]
  )

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
    <section className="relative bg-transparent py-8">
      <div className="container mx-auto px-4">
        <MotionDiv
          className="mx-auto text-center"
          style={{ maxWidth: '48rem' }}
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
            Go ahead, give it a swipe. We promise its addictive.
          </p>

          {/* Start Swiping button styled same as hero primary CTA (dark blue variant) */}
          <div className="mt-6 flex justify-center">
            <a
              href="/signup"
              aria-label="Start Swiping"
              data-cta="dopamine-tryit"
              className="relative inline-flex items-center justify-center rounded-full bg-[#0F172A] px-8 py-4 text-base font-medium text-white shadow-[0_8px_30px_rgba(2,6,23,0.45)] transition-colors hover:bg-[#0b1222] focus:ring-2 focus:ring-[#29E3FF] focus:ring-offset-2 focus:outline-none"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              <span className="relative z-10 drop-shadow-[0_1px_1px_rgba(0,0,0,0.35)]">
                Start Swiping
              </span>
              <span
                aria-hidden
                className="pointer-events-none absolute inset-0"
                id="tryit-particles-host"
              />
            </a>
          </div>
        </MotionDiv>

        <div
          className="relative mx-auto mt-4 w-full sm:mt-6"
          style={{ maxWidth: '32rem' }}
        >
          {/* Removed "Love it / Nah" prompt to reduce confusion */}

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
              <MotionDiv
                key={currentIndex}
                custom={direction}
                variants={{
                  enter: (direction: number) => ({
                    x: direction > 0 ? 1000 : -1000,
                    opacity: 0,
                  }),
                  center: {
                    zIndex: 1,
                    x: 0,
                    opacity: 1,
                  },
                  exit: (direction: number) => ({
                    zIndex: 0,
                    x: direction > 0 ? 1000 : -1000,
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
                onDragEnd={(
                  _e: MouseEvent | TouchEvent | PointerEvent,
                  { offset, velocity }: PanInfo
                ) => {
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
                      src={
                        (properties[currentIndex] || {}).image ||
                        '/images/properties/house-1.svg'
                      }
                      alt={
                        (properties[currentIndex] || {}).address || 'Property'
                      }
                      fill
                      className="pointer-events-none object-cover select-none"
                      sizes="400px"
                      priority
                      placeholder="blur"
                      blurDataURL={getPropertyBlurPlaceholder(
                        (properties[currentIndex] || {}).image ||
                          '/images/properties/house-1.svg'
                      )}
                      draggable={false}
                    />

                    {/* Price Tag */}
                    <div className="absolute bottom-2 left-2 rounded-lg bg-white/95 px-3 py-1.5 backdrop-blur sm:bottom-4 sm:left-4 sm:px-4 sm:py-2">
                      <p
                        className="text-lg font-bold text-gray-900 sm:text-2xl"
                        style={{ fontFamily: 'var(--font-heading)' }}
                      >
                        {(properties[currentIndex] || {}).price || '$—'}
                      </p>
                    </div>
                  </div>

                  {/* Property Details */}
                  <div className="p-4 sm:p-6">
                    <h3
                      className="text-lg font-semibold text-gray-900 sm:text-xl"
                      style={{ fontFamily: 'var(--font-heading)' }}
                    >
                      {(properties[currentIndex] || {}).address || '—'}
                    </h3>

                    <div className="mt-3 flex items-center gap-4 text-gray-600 sm:mt-4 sm:gap-6">
                      <div className="flex items-center gap-1">
                        <Bed className="h-4 w-4" />
                        <span
                          className="text-sm sm:text-base"
                          style={{ fontFamily: 'var(--font-body)' }}
                        >
                          {(properties[currentIndex] || {}).beds ?? 0} beds
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Bath className="h-4 w-4" />
                        <span
                          className="text-sm sm:text-base"
                          style={{ fontFamily: 'var(--font-body)' }}
                        >
                          {(properties[currentIndex] || {}).baths ?? 0} baths
                        </span>
                      </div>
                    </div>

                    {/* Action Buttons - Refined Style */}
                    <div className="mt-5 flex gap-3 sm:mt-6">
                      <MotionButton
                        className="flex flex-1 items-center justify-center gap-2 rounded-lg border-2 border-rose-200/70 bg-white px-5 py-2.5 text-rose-600 transition-all hover:border-rose-300/70 hover:bg-rose-50/40"
                        style={{ fontFamily: 'var(--font-body)' }}
                        motionProps={{
                          whileHover: { scale: 1.01 },
                          whileTap: { scale: 0.99 },
                        }}
                        onClick={() => handleSwipe('left')}
                        aria-label="Pass on this property"
                      >
                        <X className="h-4 w-4" strokeWidth={2.5} />
                        <span className="text-sm font-medium">Pass</span>
                      </MotionButton>

                      <MotionButton
                        className="relative flex flex-1 items-center justify-center gap-2 overflow-hidden rounded-lg bg-emerald-600 px-5 py-2.5 text-white shadow-sm transition-all hover:bg-emerald-700 hover:shadow"
                        style={{ fontFamily: 'var(--font-body)' }}
                        motionProps={{
                          whileHover: { scale: 1.01 },
                          whileTap: { scale: 0.99 },
                        }}
                        onClick={() => handleSwipe('right')}
                        aria-label="Love this property"
                      >
                        <Heart
                          className="h-4 w-4 fill-current"
                          strokeWidth={0}
                        />
                        <span className="text-sm font-medium">Love</span>
                      </MotionButton>
                    </div>
                  </div>
                </div>
              </MotionDiv>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  )
}
