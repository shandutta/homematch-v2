'use client'

import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import { AnimatePresence } from 'framer-motion'
import { MotionDiv } from '@/components/ui/motion-components'
import { Property, Neighborhood } from '@/lib/schemas/property'
import { PropertyCard } from './PropertyCard'
import { useSwipePhysics, SPRING_CONFIG } from '@/hooks/useSwipePhysics'
import { HapticFeedback } from '@/lib/utils/haptic-feedback'
import { Heart, X } from 'lucide-react'
import { CouplesMessages } from '@/lib/utils/couples-messaging'
import { MotionButton } from '@/components/ui/motion-button'

interface SwipeContainerProps {
  properties: Property[]
  neighborhoods?: Neighborhood[]
  onSwipe: (direction: 'left' | 'right') => void
  onEmpty: () => void
}

export function SwipeContainer({
  properties,
  neighborhoods = [],
  onSwipe,
  onEmpty,
}: SwipeContainerProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [dragDirection, setDragDirection] = useState<'left' | 'right' | null>(
    null
  )
  const [isAnimating, setIsAnimating] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const currentProperty = useMemo(() => {
    if (properties && properties.length > 0) {
      return properties[currentIndex]
    }
    return null
  }, [properties, currentIndex])

  // Get upcoming cards for stack effect
  const upcomingCards = useMemo(() => {
    return properties
      .slice(currentIndex, currentIndex + 3)
      .map((property, index) => {
        const neighborhood = neighborhoods.find(
          (n) => n.id === property.neighborhood_id
        )
        return { property, neighborhood, stackIndex: index }
      })
  }, [properties, neighborhoods, currentIndex])

  // const currentNeighborhood = useMemo(() => {
  //   if (!currentProperty) return undefined;
  //   return neighborhoods.find(n => n.id === currentProperty.neighborhood_id);
  // }, [currentProperty, neighborhoods]);

  // Handle swipe completion
  const handleSwipeComplete = useCallback(
    (direction: 'left' | 'right') => {
      setIsAnimating(false)
      setDragDirection(null)

      // Haptic feedback for completion
      HapticFeedback.success()

      // Call parent handler
      onSwipe(direction)

      // Move to next card or trigger empty callback
      if (currentIndex < properties.length - 1) {
        setCurrentIndex((prev) => prev + 1)
      } else {
        onEmpty()
      }
    },
    [currentIndex, properties.length, onSwipe, onEmpty]
  )

  // Handle threshold crossing for visual feedback
  const handleThresholdCrossed = useCallback(
    (direction: 'left' | 'right' | null) => {
      if (direction !== dragDirection) {
        setDragDirection(direction)
        // Light haptic feedback when crossing threshold
        if (direction && HapticFeedback.isAvailable) {
          HapticFeedback.light()
        }
      }
    },
    [dragDirection]
  )

  // Handle drag start
  const handleDragStart = useCallback(() => {
    setIsAnimating(true)
    // Light haptic feedback on drag start
    HapticFeedback.selection()
  }, [])

  // Handle drag end
  const handleDragEnd = useCallback(() => {
    // Reset drag direction when drag ends
    setTimeout(() => {
      if (!isAnimating) {
        setDragDirection(null)
      }
    }, 100)
  }, [isAnimating])

  // Initialize swipe physics
  const {
    x,
    y,
    rotate,
    opacity,
    scale,
    likeOpacity,
    passOpacity,
    controls: _controls,
    handleDragStart: physicsHandleDragStart,
    handleDrag,
    handleDragEnd: physicsHandleDragEnd,
    swipeCard,
    resetPosition,
  } = useSwipePhysics({
    onSwipeComplete: handleSwipeComplete,
    onSwipeThresholdCrossed: handleThresholdCrossed,
    onDragStart: handleDragStart,
    onDragEnd: handleDragEnd,
    maxDragDistance: 300,
  })

  // Button swipe handlers
  const handleButtonSwipe = useCallback(
    (direction: 'left' | 'right') => {
      if (isAnimating) return

      setIsAnimating(true)
      HapticFeedback.medium() // Medium haptic for button press
      swipeCard(direction)
    },
    [isAnimating, swipeCard]
  )

  // Reset position when cards change
  useEffect(() => {
    resetPosition()
  }, [currentIndex, resetPosition])

  if (!currentProperty) {
    return (
      <div
        className="flex h-96 items-center justify-center"
        data-testid="empty-state"
      >
        <div className="text-center">
          <h3 className="text-xl font-semibold text-gray-900">
            {CouplesMessages.empty.noProperties.title}
          </h3>
          <p className="mb-2 text-gray-600">
            {CouplesMessages.empty.noProperties.message}
          </p>
          <p className="text-sm text-gray-500">
            {CouplesMessages.empty.noProperties.cta}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className="relative mx-auto h-[600px] w-full max-w-md"
      data-testid="swipe-container"
      style={{ perspective: '1000px' }}
    >
      {/* Property Card Stack */}
      <div className="relative h-full w-full">
        <AnimatePresence mode="popLayout">
          {upcomingCards.map(({ property, neighborhood, stackIndex }) => {
            const isTopCard = stackIndex === 0

            return (
              <MotionDiv
                key={`${property.id}-${currentIndex}`}
                className="absolute h-full w-full cursor-grab active:cursor-grabbing"
                style={{
                  zIndex: 10 - stackIndex,
                  x: isTopCard ? x : 0,
                  y: isTopCard ? y : 0,
                  rotate: isTopCard ? rotate : 0,
                  opacity: isTopCard ? opacity : 1,
                  scale: isTopCard ? scale : 1 - stackIndex * 0.05,
                }}
                initial={{
                  scale: 1 - stackIndex * 0.05,
                  y: stackIndex * 8,
                  opacity: stackIndex === 0 ? 1 : 0.8,
                }}
                animate={{
                  scale: 1 - stackIndex * 0.05,
                  y: stackIndex * 8,
                  opacity: stackIndex === 0 ? 1 : 0.8,
                  rotateY: stackIndex * 2, // Slight 3D rotation for depth
                }}
                transition={SPRING_CONFIG}
                drag={isTopCard ? true : false}
                dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
                dragElastic={0.2}
                onDragStart={isTopCard ? physicsHandleDragStart : undefined}
                onDrag={isTopCard ? handleDrag : undefined}
                onDragEnd={isTopCard ? physicsHandleDragEnd : undefined}
                whileHover={
                  isTopCard && !isAnimating ? { scale: 1.02 } : undefined
                }
                whileTap={isTopCard ? { scale: 0.98 } : undefined}
              >
                {/* Card Content */}
                <div className="relative h-full w-full">
                  <PropertyCard
                    property={property}
                    neighborhood={neighborhood}
                  />

                  {/* Swipe Decision Overlays - Only on top card */}
                  {isTopCard && (
                    <>
                      {/* LIKE Overlay */}
                      <MotionDiv
                        className="absolute inset-0 flex items-center justify-center bg-green-500/20 backdrop-blur-sm"
                        style={{
                          opacity: likeOpacity,
                        }}
                      >
                        <div className="rotate-12 transform rounded-lg border-4 border-green-500 bg-green-500/90 px-6 py-3">
                          <span className="text-2xl font-black tracking-wider text-white drop-shadow-lg">
                            LIKE
                          </span>
                        </div>
                      </MotionDiv>

                      {/* NOPE Overlay */}
                      <MotionDiv
                        className="absolute inset-0 flex items-center justify-center bg-red-500/20 backdrop-blur-sm"
                        style={{
                          opacity: passOpacity,
                        }}
                      >
                        <div className="-rotate-12 transform rounded-lg border-4 border-red-500 bg-red-500/90 px-6 py-3">
                          <span className="text-2xl font-black tracking-wider text-white drop-shadow-lg">
                            NOPE
                          </span>
                        </div>
                      </MotionDiv>
                    </>
                  )}
                </div>
              </MotionDiv>
            )
          })}
        </AnimatePresence>
      </div>

      {/* Enhanced Action Buttons with Physics */}
      <div className="absolute right-0 bottom-6 left-0 flex justify-center gap-8">
        <MotionButton
          onClick={() => handleButtonSwipe('left')}
          disabled={isAnimating}
          className="group relative flex h-16 min-h-[64px] w-16 min-w-[64px] touch-manipulation items-center justify-center rounded-full bg-white shadow-lg transition-all duration-200 focus-visible:ring-4 focus-visible:ring-red-400/50 focus-visible:outline-none disabled:opacity-50"
          motionProps={{
            whileHover: !isAnimating
              ? { scale: 1.1, boxShadow: '0 10px 30px rgba(0,0,0,0.2)' }
              : undefined,
            whileTap: !isAnimating ? { scale: 0.9 } : undefined,
          }}
          aria-label="Not quite right"
          type="button"
          data-testid="pass-button"
        >
          <MotionDiv
            animate={
              dragDirection === 'left'
                ? { scale: 1.2, rotate: -10 }
                : { scale: 1, rotate: 0 }
            }
            transition={{ duration: 0.2, ease: 'easeOut' }}
          >
            <X className="h-8 w-8 text-red-500 transition-colors duration-150 group-hover:text-red-600" />
          </MotionDiv>

          {/* Ripple effect */}
          <MotionDiv
            className="absolute inset-0 rounded-full border-2 border-red-500/30"
            initial={{ scale: 0, opacity: 1 }}
            animate={
              dragDirection === 'left'
                ? { scale: 1.5, opacity: 0 }
                : { scale: 0, opacity: 1 }
            }
            transition={{ duration: 0.3 }}
          />
        </MotionButton>

        <MotionButton
          onClick={() => handleButtonSwipe('right')}
          disabled={isAnimating}
          className="group relative flex h-16 min-h-[64px] w-16 min-w-[64px] touch-manipulation items-center justify-center rounded-full bg-white shadow-lg transition-all duration-200 focus-visible:ring-4 focus-visible:ring-green-400/50 focus-visible:outline-none disabled:opacity-50"
          motionProps={{
            whileHover: !isAnimating
              ? { scale: 1.1, boxShadow: '0 10px 30px rgba(0,0,0,0.2)' }
              : undefined,
            whileTap: !isAnimating ? { scale: 0.9 } : undefined,
          }}
          aria-label="We love this one!"
          type="button"
          data-testid="like-button"
        >
          <MotionDiv
            animate={
              dragDirection === 'right'
                ? { scale: 1.2, rotate: 10 }
                : { scale: 1, rotate: 0 }
            }
            transition={{ duration: 0.2, ease: 'easeOut' }}
          >
            <Heart
              className="h-8 w-8 text-green-500 transition-colors duration-150 group-hover:text-green-600"
              fill="currentColor"
            />
          </MotionDiv>

          {/* Ripple effect */}
          <MotionDiv
            className="absolute inset-0 rounded-full border-2 border-green-500/30"
            initial={{ scale: 0, opacity: 1 }}
            animate={
              dragDirection === 'right'
                ? { scale: 1.5, opacity: 0 }
                : { scale: 0, opacity: 1 }
            }
            transition={{ duration: 0.3 }}
          />
        </MotionButton>
      </div>

      {/* Enhanced Swipe Instructions with Animation */}
      <AnimatePresence>
        {currentIndex === 0 && (
          <MotionDiv
            initial={{ opacity: 0, y: -20, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.8 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="absolute top-4 left-1/2 -translate-x-1/2 rounded-full bg-black/70 px-4 py-2 text-sm text-white shadow-md backdrop-blur-sm"
            data-testid="swipe-instructions"
          >
            <div className="flex items-center gap-2">
              <MotionDiv
                animate={{ x: [0, 5, 0] }}
                transition={{
                  repeat: Infinity,
                  duration: 1.5,
                  ease: 'easeInOut',
                }}
              >
                👆
              </MotionDiv>
              Swipe to discover your perfect home together
            </div>
          </MotionDiv>
        )}
      </AnimatePresence>

      {/* Physics Debug Info (hidden in production) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="absolute top-16 left-4 rounded bg-white/80 p-2 font-mono text-xs text-gray-500">
          <div>Direction: {dragDirection || 'none'}</div>
          <div>Animating: {isAnimating ? 'yes' : 'no'}</div>
          <div>
            Haptic: {HapticFeedback.isAvailable ? 'available' : 'unavailable'}
          </div>
        </div>
      )}
    </div>
  )
}
