'use client'

import { motion, useMotionValue, useTransform } from 'framer-motion'
import { useState, useCallback, useEffect, useRef } from 'react'
import { Heart, X } from 'lucide-react'
import Image from 'next/image'
import { getPropertyBlurPlaceholder } from '@/lib/image-blur'

/**
 * Runtime-fetched Zillow image URL (server-side API returns a random one)
 * Removed local real-#.jpg fallback per request for purely dynamic imagery.
 */
type _ZillowCard = {
  zpid: string
  imageUrl: string
  price?: number
  bedrooms?: number
  bathrooms?: number
  address?: string
  latitude?: number
  longitude?: number
}

type MarketingCard = {
  zpid: string
  imageUrl: string | null
  price: number | null
  bedrooms: number | null
  bathrooms: number | null
  address: string
  latitude: number | null
  longitude: number | null
}

async function fetchMarketingCards(): Promise<MarketingCard[]> {
  try {
    const res = await fetch('/api/properties/marketing', { cache: 'no-store' })
    if (!res.ok) return []
    const data = (await res.json()) as MarketingCard[]
    if (Array.isArray(data)) {
      return data.filter((c) => c?.zpid && typeof c?.imageUrl === 'string')
    }
    return []
  } catch {
    return []
  }
}

interface Property {
  id: number
  image: string
  price: string
  beds: number
  location: string
}

const placeholderProperties: Property[] = [
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
            onError={(e) => {
              const target = e.target as HTMLImageElement
              if (target && target.src !== '/images/properties/house-1.svg') {
                target.src = '/images/properties/house-1.svg'
              }
            }}
          />

          {/* Like/Dislike Indicators + Match badge */}
          <motion.div
            className="absolute top-4 right-4 rounded-full bg-emerald-500 p-3 text-white shadow-lg"
            aria-hidden="true"
            style={{ opacity: useTransform(x, [0, 120], [0, 1]) }}
          >
            <Heart className="h-8 w-8 fill-current" aria-hidden="true" />
          </motion.div>

          <motion.div
            className="absolute top-4 left-4 rounded-full bg-rose-500 p-3 text-white shadow-lg"
            aria-hidden="true"
            style={{ opacity: useTransform(x, [-120, 0], [1, 0]) }}
          >
            <X className="h-8 w-8" aria-hidden="true" />
          </motion.div>

          {/* "It's a Match!" overlay when swiping right far enough */}
          <motion.div
            className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 text-center"
            aria-hidden="true"
            style={{ opacity: useTransform(x, [120, 180], [0, 1]) }}
          >
            <span className="inline-flex items-center gap-2 rounded-full bg-emerald-600/90 px-4 py-2 text-sm font-semibold text-white shadow-md">
              <Heart className="h-4 w-4 fill-current" />
              It&#39;s a Match!
            </span>
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
  const [cards, setCards] = useState<Property[]>(placeholderProperties)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // On mount, fetch up to 3 marketing listings and display them fully populated
  useEffect(() => {
    let cancelled = false

    async function initCards() {
      const cardsResp = await fetchMarketingCards()

      if (!cancelled && cardsResp.length > 0) {
        const mapped: Property[] = cardsResp.slice(0, 3).map((c, idx) => {
          const price =
            typeof c.price === 'number'
              ? `$${c.price.toLocaleString()}`
              : (placeholderProperties[idx]?.price ?? '$000,000')
          const beds =
            typeof c.bedrooms === 'number'
              ? c.bedrooms
              : (placeholderProperties[idx]?.beds ?? 3)
          const location =
            typeof c.address === 'string' && c.address.length > 0
              ? c.address
              : (placeholderProperties[idx]?.location ?? 'Unknown')

          return {
            id: idx + 1,
            image:
              c.imageUrl ??
              placeholderProperties[idx]?.image ??
              '/images/properties/house-1.svg',
            price,
            beds,
            location,
          }
        })

        // If fewer than 3 returned, fill with placeholders to keep stack shape
        const filled: Property[] =
          mapped.length < 3
            ? [
                ...mapped,
                ...placeholderProperties
                  .slice(mapped.length, 3)
                  .map((p, i) => ({ ...p, id: mapped.length + i + 1 })),
              ]
            : mapped

        setCards(filled)
      }
    }

    if (typeof window !== 'undefined') {
      void initCards()
    }

    return () => {
      cancelled = true
    }
  }, [])

  const handleSwipe = useCallback(
    (cardId: number, direction: 'left' | 'right') => {
      // Fire a quick toast-like overlay for right swipes using the existing "It's a Match!" UI
      // We emulate the visual by briefly delaying removal on right swipe so the overlay is visible.
      setCards((prev) => {
        // If right swipe, keep the card briefly to show the overlay then remove
        if (direction === 'right') {
          if (timeoutRef.current) clearTimeout(timeoutRef.current)
          timeoutRef.current = setTimeout(() => {
            setCards((cur) => cur.filter((c) => c.id !== cardId))
          }, 400) // 400ms to allow overlay animation to show
          return prev
        }

        // Left swipe: remove immediately
        const newCards = prev.filter((c) => c.id !== cardId)

        // Reset cards when all are swiped
        if (newCards.length === 0) {
          timeoutRef.current = setTimeout(
            () => setCards(prev.length > 0 ? prev : placeholderProperties),
            1000
          )
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
      {/* Professional Device Frame */}
      <div className="relative z-20 mx-auto h-[700px] w-[350px] rounded-[3rem] border border-zinc-300/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.9),rgba(246,246,248,0.9))] shadow-[0_10px_30px_rgba(2,6,23,0.25)] ring-1 ring-white/60 backdrop-blur-sm ring-inset">
        {/* Bezel/Inner border */}
        <div
          className="pointer-events-none absolute inset-0 rounded-[3rem] ring-1 ring-black/5"
          aria-hidden="true"
        />
        {/* Subtle reflection */}
        <div
          className="pointer-events-none absolute inset-x-6 top-3 h-8 rounded-full bg-white/50 blur-[6px]"
          aria-hidden="true"
        />

        {/* Clean camera island only (no extra speaker blocks to avoid overlap) */}
        <div
          className="pointer-events-none absolute top-2 left-1/2 z-30 h-6 w-40 -translate-x-1/2 rounded-full bg-zinc-900/95 shadow-[inset_0_-1px_0_0_rgba(255,255,255,0.2)] ring-1 ring-white/10"
          aria-hidden="true"
        />

        {/* Screen */}
        <div className="relative m-[10px] h-[calc(100%-20px)] overflow-hidden rounded-[2.2rem] bg-zinc-950 ring-1 ring-white/10">
          {/* Dynamic subtle screen gradient */}
          <div
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(1200px_600px_at_80%_-20%,rgba(56,189,248,0.15),transparent_60%),radial-gradient(1200px_600px_at_10%_120%,rgba(59,130,246,0.15),transparent_60%)]"
            aria-hidden="true"
          />

          {/* Status Bar */}
          <div className="flex h-8 items-center justify-between px-5 text-[11px] text-zinc-300/90">
            <span className="tracking-tight">9:41</span>
            <div className="flex items-center gap-1.5">
              <div
                className="h-3 w-5 rounded-sm bg-zinc-300/90"
                aria-hidden="true"
              />
              <div
                className="h-3 w-5 rounded-sm bg-zinc-300/90"
                aria-hidden="true"
              />
              <div
                className="h-3 w-5 rounded-sm bg-zinc-300/90"
                aria-hidden="true"
              />
            </div>
          </div>

          {/* App Content */}
          <div className="relative h-[calc(100%-2rem)] bg-transparent p-4">
            {/* App Header */}
            <h2 className="mb-3 text-center text-lg font-semibold tracking-tight text-zinc-100">
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
                    <p className="mt-2 text-zinc-300">Loading more homes...</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Camera island (single, cleaned) */}
      <div className="absolute top-[10px] left-1/2 z-30 h-6 w-40 -translate-x-1/2 rounded-full bg-zinc-900 shadow-[inset_0_-1px_0_0_rgba(255,255,255,0.2)] ring-1 ring-white/10" />
    </div>
  )
}
