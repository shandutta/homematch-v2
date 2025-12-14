'use client'

import { useMotionValue, useTransform, animate } from 'framer-motion'
import { MotionDiv } from '@/components/ui/motion-components'
import { useState, useCallback, useEffect, useRef } from 'react'
import { Heart, X, Home } from 'lucide-react'
import { MotionButton } from '@/components/ui/motion-button'
import Image from 'next/image'
import { getPropertyBlurPlaceholder } from '@/lib/image-blur'

/**
 * Marketing phone mockup uses local, rights-safe assets (no third-party listing
 * imagery) and optionally swaps in cards from `/api/properties/marketing`.
 */
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
  } catch (_error) {
    // Silently fail and return empty array for marketing demo
    return []
  }
}

interface Property {
  id: number
  image: string
  price: string
  beds: number
  baths: number
  location: string
}

const placeholderProperties: Property[] = [
  {
    id: 1,
    image: '/images/marketing/mock-home-1.svg',
    price: '$850,000',
    beds: 4,
    baths: 3,
    location: 'Palo Alto',
  },
  {
    id: 2,
    image: '/images/marketing/mock-home-2.svg',
    price: '$1,200,000',
    beds: 3,
    baths: 2,
    location: 'Mountain View',
  },
  {
    id: 3,
    image: '/images/marketing/mock-home-3.svg',
    price: '$950,000',
    beds: 3,
    baths: 2,
    location: 'Sunnyvale',
  },
]

interface PropertyCardProps {
  property: Property
  index: number
  onSwipe: (direction: 'left' | 'right') => void
  autoplayHint?: boolean
  onAutoplayDone?: () => void
}

function PropertyCard({
  property,
  index,
  onSwipe,
  autoplayHint,
  onAutoplayDone,
}: PropertyCardProps) {
  const x = useMotionValue(0)
  const rotate = useTransform(x, [-200, 200], [-18, 18])
  // Make indicators unmissable: appear from very small drags, with strong scale
  const likeOpacity = useTransform(x, [10, 30], [0, 1])
  const passOpacity = useTransform(x, [-30, -10], [1, 0])
  const likeScale = useTransform(x, [0, 30, 120], [0.9, 1.1, 1.25])
  const passScale = useTransform(x, [-120, -30, 0], [1.25, 1.1, 0.9])
  const matchOpacity = useTransform(x, [120, 200], [0, 1])
  const opacity = useTransform(
    x,
    [-200, -100, 0, 100, 200],
    [0.5, 1, 1, 1, 0.5]
  )

  // Autoplay "jiggle" hint: right then left once (first mount) - smoother with spring animations
  useEffect(() => {
    if (!autoplayHint || index !== 0 || typeof window === 'undefined') return
    let cancelled = false

    const prefersReduced =
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches

    async function runHint() {
      if (prefersReduced) {
        onAutoplayDone?.()
        return
      }

      // slight pause before hint
      await new Promise((r) => setTimeout(r, 350))
      if (cancelled) return

      // Smooth spring to the right
      await new Promise<void>((resolve) => {
        const controls = animate(x, 110, {
          type: 'spring',
          stiffness: 220,
          damping: 20,
          mass: 0.4,
          onComplete: () => resolve(),
        })
        return () => controls.stop()
      })
      if (cancelled) return

      // Back to center
      await new Promise<void>((resolve) => {
        const controls = animate(x, 0, {
          type: 'spring',
          stiffness: 260,
          damping: 22,
          mass: 0.35,
          onComplete: () => resolve(),
        })
        return () => controls.stop()
      })
      if (cancelled) return

      // Smooth spring to the left
      await new Promise<void>((resolve) => {
        const controls = animate(x, -110, {
          type: 'spring',
          stiffness: 220,
          damping: 20,
          mass: 0.4,
          onComplete: () => resolve(),
        })
        return () => controls.stop()
      })
      if (cancelled) return

      // Back to center
      await new Promise<void>((resolve) => {
        const controls = animate(x, 0, {
          type: 'spring',
          stiffness: 260,
          damping: 22,
          mass: 0.35,
          onComplete: () => resolve(),
        })
        return () => controls.stop()
      })
      if (cancelled) return

      onAutoplayDone?.()
    }

    void runHint()
    return () => {
      cancelled = true
    }
  }, [autoplayHint, index, onAutoplayDone, x])

  const handleDragEnd = (_event: unknown, info: { offset: { x: number } }) => {
    const threshold = 100
    if (Math.abs(info.offset.x) > threshold) {
      const direction = info.offset.x > 0 ? 'right' : 'left'
      onSwipe(direction)
    }
  }

  return (
    <MotionDiv
      className="absolute inset-0 cursor-grab will-change-transform active:cursor-grabbing"
      style={{ x, rotate, opacity }}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      onDragEnd={handleDragEnd}
      onDragStart={() => {
        const el = document.activeElement as HTMLElement | null
        if (el?.blur) el.blur()
      }}
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
            className="pointer-events-none object-cover select-none"
            sizes="300px"
            priority={index === 0}
            placeholder="blur"
            blurDataURL={getPropertyBlurPlaceholder(property.image)}
            draggable={false}
            onError={(e) => {
              const target = e.target as HTMLImageElement
              if (target && target.src !== placeholderProperties[0]?.image) {
                target.src = placeholderProperties[0]?.image
              }
            }}
          />

          {/* Price Tag - More prominent display */}
          <div className="absolute bottom-3 left-3 rounded-xl bg-white/95 px-4 py-2 shadow-lg backdrop-blur-sm">
            <p className="text-xl font-bold text-gray-900">{property.price}</p>
          </div>

          {/* Like/Pass Indicators — improved spacing and sizing */}
          <MotionDiv
            className="pointer-events-none absolute top-3 right-3 z-30"
            aria-hidden="true"
            style={{ opacity: likeOpacity }}
          >
            <div
              className="flex items-center gap-2 rounded-full border border-emerald-300/40 bg-emerald-600/95 px-4 py-2 text-white shadow-lg backdrop-blur-sm"
              style={{
                transform: `scale(${(likeScale as unknown as number) || 1})`,
              }}
            >
              <Heart className="h-4 w-4 fill-current" aria-hidden="true" />
              <span className="text-sm font-semibold tracking-wide">LIKED</span>
            </div>
          </MotionDiv>

          <MotionDiv
            className="pointer-events-none absolute top-3 left-3 z-30"
            aria-hidden="true"
            style={{ opacity: passOpacity }}
          >
            <div
              className="flex items-center gap-2 rounded-full border border-rose-300/40 bg-rose-600/95 px-4 py-2 text-white shadow-lg backdrop-blur-sm"
              style={{
                transform: `scale(${(passScale as unknown as number) || 1})`,
              }}
            >
              <X className="h-4 w-4" aria-hidden="true" />
              <span className="text-sm font-semibold tracking-wide">
                PASSED
              </span>
            </div>
          </MotionDiv>

          {/* "It's a Match!" overlay when swiping right far enough */}
          <MotionDiv
            className="pointer-events-none absolute inset-x-0 top-1/2 z-30 -translate-y-1/2 text-center"
            aria-hidden="true"
            style={{ opacity: matchOpacity }}
          >
            <span className="shadow-token-xl blur-glass-sm inline-flex items-center gap-2 rounded-full border border-emerald-300/40 bg-emerald-600/95 px-4 py-2 text-sm font-semibold text-white">
              <Heart className="h-4 w-4 fill-current" />
              It&#39;s a Match!
            </span>
          </MotionDiv>
        </div>

        {/* Property Details with improved styling */}
        <div className="p-4">
          <div className="mb-3">
            <h3 className="text-lg font-semibold text-gray-900">
              {property.location}
            </h3>
            <div className="mt-1 flex items-center gap-3 text-sm text-gray-600">
              <span>{property.beds} beds</span>
              <span>•</span>
              <span>{property.baths} baths</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-3">
            <MotionButton
              className="flex flex-1 items-center justify-center rounded-lg border-2 border-rose-200/70 bg-white px-6 py-3.5 text-rose-600 transition-all hover:border-rose-300/70 hover:bg-rose-50/40"
              motionProps={{
                whileHover: { scale: 1.02 },
                whileTap: { scale: 0.98 },
              }}
              onClick={() => {
                try {
                  if (window?.toast) {
                    window.toast({
                      title: 'Passed',
                      description: "We'll show you more like this.",
                      variant: 'destructive',
                    })
                  } else {
                    const evt = new CustomEvent('landing-toast', {
                      detail: {
                        title: 'Passed',
                        description: "We'll show you more like this.",
                        variant: 'destructive',
                      },
                    })
                    window.dispatchEvent(evt)
                  }
                } catch {
                  // ignore error
                }
                onSwipe('left')
              }}
              aria-label="Pass on this property"
            >
              Pass
            </MotionButton>

            <MotionButton
              className="relative flex flex-1 items-center justify-center overflow-hidden rounded-lg bg-emerald-600 px-6 py-3.5 text-white shadow-sm transition-all hover:bg-emerald-700 hover:shadow"
              motionProps={{
                whileHover: { scale: 1.02 },
                whileTap: { scale: 0.98 },
              }}
              onClick={(e) => {
                // click burst effect
                const btn = e.currentTarget
                const burst = document.createElement('span')
                burst.style.position = 'absolute'
                burst.style.left = '50%'
                burst.style.top = '50%'
                burst.style.width = '10px'
                burst.style.height = '10px'
                burst.style.borderRadius = '9999px'
                burst.style.transform = 'translate(-50%, -50%)'
                burst.style.background = 'rgba(255,255,255,0.8)'
                burst.style.boxShadow = '0 0 10px rgba(255,255,255,0.5)'
                burst.style.transition =
                  'transform 380ms ease-out, opacity 380ms ease-out'
                btn.appendChild(burst)
                requestAnimationFrame(() => {
                  burst.style.transform = 'translate(-50%, -50%) scale(12)'
                  burst.style.opacity = '0'
                })
                setTimeout(() => burst.remove(), 420)

                try {
                  if (window?.toast) {
                    window.toast({
                      title: "It's a Match!",
                      description: 'Saved to your likes.',
                      variant: 'success',
                    })
                  } else {
                    const evt = new CustomEvent('landing-toast', {
                      detail: {
                        title: "It's a Match!",
                        description: 'Saved to your likes.',
                        variant: 'success',
                      },
                    })
                    window.dispatchEvent(evt)
                  }
                } catch {
                  // ignore error
                }
                onSwipe('right')
              }}
              aria-label="Love this property"
            >
              Love
            </MotionButton>
          </div>
        </div>
      </div>
    </MotionDiv>
  )
}

export function PhoneMockup() {
  const [cards, setCards] = useState<Property[]>(placeholderProperties)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const autoplayDoneRef = useRef(false)

  // On mount, fetch up to 3 marketing listings; fill with placeholders if fewer.
  useEffect(() => {
    let cancelled = false

    async function initCards() {
      const cardsResp = await fetchMarketingCards()

      if (!cancelled) {
        if (cardsResp.length > 0) {
          const mapped: Property[] = cardsResp.map((c, idx) => {
            const price =
              typeof c.price === 'number'
                ? `$${c.price.toLocaleString()}`
                : (placeholderProperties[idx % placeholderProperties.length]
                    ?.price ?? '$000,000')
            const beds =
              typeof c.bedrooms === 'number'
                ? c.bedrooms
                : (placeholderProperties[idx % placeholderProperties.length]
                    ?.beds ?? 3)
            const baths =
              typeof c.bathrooms === 'number'
                ? c.bathrooms
                : (placeholderProperties[idx % placeholderProperties.length]
                    ?.baths ?? 2)
            const location =
              typeof c.address === 'string' && c.address.length > 0
                ? c.address
                : (placeholderProperties[idx % placeholderProperties.length]
                    ?.location ?? 'Unknown')

            return {
              id: idx + 1,
              image:
                c.imageUrl ??
                placeholderProperties[idx % placeholderProperties.length]
                  ?.image ??
                '/images/properties/house-1.svg',
              price,
              beds,
              baths,
              location,
            }
          })

          const base =
            mapped.length >= 3
              ? mapped.slice(0, 3)
              : [
                  ...mapped,
                  ...placeholderProperties
                    .slice(0, 3 - mapped.length)
                    .map((p, i) => ({ ...p, id: mapped.length + i + 1 })),
                ]
          setCards(base)
        } else {
          setCards(placeholderProperties.slice(0, 3))
        }
      }
    }

    if (typeof window !== 'undefined') {
      void initCards()
    }

    return () => {
      cancelled = true
    }
  }, [])

  // Use existing UI/Toast system when there's a right-swipe "match"
  // We assume a global toast API is available via window or injected provider.
  const showMatchToast = useCallback(() => {
    try {
      // shadcn/ui toast usually via useToast, but on landing we might have a global
      // Fallback to a custom event if global isn't available.
      if (window?.toast) {
        window.toast({
          title: "It's a Match!",
          description: 'You and this home are a perfect fit.',
          variant: 'success',
        })
      } else {
        const evt = new CustomEvent('landing-toast', {
          detail: {
            title: "It's a Match!",
            description: 'You and this home are a perfect fit.',
            variant: 'success',
          },
        })
        window.dispatchEvent(evt)
      }
    } catch {
      // no-op
    }
  }, [])

  // Infinite cycle: recycle top card to the back with new id; delay for right swipe to reveal match overlay
  const handleSwipe = useCallback(
    (cardId: number, direction: 'left' | 'right') => {
      setCards((prev) => {
        const top = prev.find((c) => c.id === cardId)
        if (!top) return prev
        const rest = prev.filter((c) => c.id !== cardId)
        const nextId = (prev.reduce((m, c) => Math.max(m, c.id), 0) || 0) + 1

        if (direction === 'right') {
          // show toast and delay recycle slightly to let "match" badge be visible
          showMatchToast()
          if (timeoutRef.current) clearTimeout(timeoutRef.current)
          timeoutRef.current = setTimeout(() => {
            setCards((cur) => {
              const stillTop = cur.find((c) => c.id === cardId)
              if (!stillTop) return cur
              const remaining = cur.filter((c) => c.id !== cardId)
              return [...remaining, { ...stillTop, id: nextId }]
            })
          }, 450)
          return prev
        }

        // Left: recycle immediately
        return [...rest, { ...top, id: nextId }]
      })
    },
    [showMatchToast]
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
    <div className="relative mx-auto w-full" style={{ maxWidth: '24rem' }}>
      {/* Professional Device Frame */}
      <div className="shadow-token-2xl blur-glass-md relative z-20 mx-auto h-[700px] w-[350px] rounded-[3rem] border border-zinc-300/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.9),rgba(246,246,248,0.9))] ring-1 ring-white/60 ring-inset">
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
        <div className="relative m-[10px] h-[calc(100%-20px)] overflow-hidden rounded-[2.2rem] bg-[#0b0f1a] ring-1 ring-white/10">
          {/* Premium gradient aurora backdrop with subtle grain */}
          <div
            className="pointer-events-none absolute inset-0"
            aria-hidden="true"
          >
            <div
              className="absolute inset-0 [mask-image:radial-gradient(120%_100%_at_50%_0%,#000_40%,transparent_80%)] opacity-[0.85]"
              style={{
                background:
                  'radial-gradient(1200px 700px at 80% -20%, rgba(56,189,248,0.18), transparent 60%),' +
                  'radial-gradient(1000px 600px at 10% 110%, rgba(59,130,246,0.16), transparent 60%),' +
                  'conic-gradient(from 210deg at 60% 40%, rgba(147,197,253,0.08), rgba(56,189,248,0.10), rgba(59,130,246,0.08), rgba(147,197,253,0.08))',
                filter: 'saturate(1.1) blur(0.2px)',
              }}
            />
            {/* Subtle starfield with film grain for depth */}
            <div
              className="absolute inset-0 opacity-80"
              style={{
                background:
                  'radial-gradient(0.6px 0.6px at 8% 12%, rgba(255,255,255,0.75), rgba(255,255,255,0) 55%),' +
                  'radial-gradient(0.5px 0.5px at 14% 32%, rgba(255,255,255,0.65), rgba(255,255,255,0) 55%),' +
                  'radial-gradient(0.7px 0.7px at 22% 54%, rgba(255,255,255,0.8), rgba(255,255,255,0) 55%),' +
                  'radial-gradient(0.6px 0.6px at 28% 76%, rgba(255,255,255,0.6), rgba(255,255,255,0) 55%),' +
                  'radial-gradient(0.7px 0.7px at 36% 18%, rgba(255,255,255,0.75), rgba(255,255,255,0) 55%),' +
                  'radial-gradient(0.5px 0.5px at 44% 42%, rgba(255,255,255,0.65), rgba(255,255,255,0) 55%),' +
                  'radial-gradient(0.8px 0.8px at 52% 64%, rgba(255,255,255,0.85), rgba(255,255,255,0) 55%),' +
                  'radial-gradient(0.6px 0.6px at 60% 82%, rgba(255,255,255,0.6), rgba(255,255,255,0) 55%),' +
                  'radial-gradient(0.6px 0.6px at 68% 26%, rgba(255,255,255,0.7), rgba(255,255,255,0) 55%),' +
                  'radial-gradient(0.5px 0.5px at 76% 48%, rgba(255,255,255,0.6), rgba(255,255,255,0) 55%),' +
                  'radial-gradient(0.7px 0.7px at 84% 70%, rgba(255,255,255,0.8), rgba(255,255,255,0) 55%),' +
                  'radial-gradient(0.6px 0.6px at 90% 88%, rgba(255,255,255,0.65), rgba(255,255,255,0) 55%)',
                mixBlendMode: 'screen',
              }}
            />
            <div
              className="absolute inset-0 opacity-[0.12]"
              style={{
                backgroundImage:
                  'radial-gradient(rgba(255,255,255,0.04) 1px, transparent 1px)',
                backgroundSize: '3px 3px',
                mixBlendMode: 'overlay',
              }}
            />
          </div>
          {/* Inner vignette to focus content and add premium depth */}
          <div
            className="pointer-events-none absolute inset-0 rounded-[2.1rem] ring-1 [box-shadow:inset_0_0_60px_rgba(0,0,0,0.45),inset_0_0_120px_rgba(2,6,23,0.45)] ring-white/5"
            aria-hidden="true"
          />

          {/* Status Bar - Cleaner without timestamp */}
          <div className="flex h-8 items-center justify-end px-5 text-[11px] text-zinc-300/90">
            {/* Status icons area - battery, wifi, signal */}
            <div className="flex items-center gap-1">
              {/* Signal bars */}
              <svg
                width="15"
                height="10"
                viewBox="0 0 15 10"
                fill="currentColor"
                className="opacity-90"
              >
                <rect x="0" y="6" width="2.5" height="4" rx="0.5" />
                <rect x="4" y="4" width="2.5" height="6" rx="0.5" />
                <rect x="8" y="2" width="2.5" height="8" rx="0.5" />
                <rect x="12" y="0" width="2.5" height="10" rx="0.5" />
              </svg>
              {/* WiFi icon */}
              <svg
                width="14"
                height="10"
                viewBox="0 0 14 10"
                fill="currentColor"
                className="opacity-90"
              >
                <path d="M7 2.5c2.5 0 4.5 1 6 2.5l-1.5 1.5c-1-1-2.5-1.5-4.5-1.5s-3.5.5-4.5 1.5L1 5C2.5 3.5 4.5 2.5 7 2.5zM7 6c1.5 0 2.5.5 3.5 1.5L9 9c-.5-.5-1-1-2-1s-1.5.5-2 1L3.5 7.5C4.5 6.5 5.5 6 7 6z" />
              </svg>
              {/* Battery icon */}
              <svg
                width="22"
                height="10"
                viewBox="0 0 22 10"
                fill="none"
                className="opacity-90"
              >
                <rect
                  x="0.5"
                  y="1.5"
                  width="18"
                  height="7"
                  rx="1.5"
                  stroke="currentColor"
                  strokeWidth="0.8"
                />
                <rect
                  x="2"
                  y="3"
                  width="15"
                  height="4"
                  rx="0.5"
                  fill="currentColor"
                />
                <rect
                  x="19"
                  y="3.5"
                  width="2"
                  height="3"
                  rx="0.5"
                  fill="currentColor"
                />
              </svg>
            </div>
          </div>

          {/* App Content */}
          <div className="relative h-[calc(100%-2rem)] bg-transparent p-4">
            {/* App Header */}
            <h2 className="mb-2 text-center text-base font-semibold tracking-tight text-zinc-100 sm:text-lg">
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
                  autoplayHint={index === 0 && !autoplayDoneRef.current}
                  onAutoplayDone={() => {
                    autoplayDoneRef.current = true
                  }}
                />
              ))}

              {/* Empty State */}
              {cards.length === 0 && (
                <div className="flex h-full items-center justify-center">
                  <div className="text-center" role="status" aria-live="polite">
                    <div
                      className="mb-2 flex justify-center"
                      aria-hidden="true"
                    >
                      <Home className="h-12 w-12 text-zinc-400" />
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
