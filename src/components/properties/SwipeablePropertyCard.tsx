'use client'

import React, { useState, useRef, useCallback, useEffect } from 'react'
import { AnimatePresence } from 'framer-motion'
import { MotionDiv } from '@/components/ui/motion-components'
import { Heart, X, RotateCcw, ChevronLeft, ChevronRight } from 'lucide-react'
import { Neighborhood, Property } from '@/lib/schemas/property'
import { MotionButton } from '@/components/ui/motion-button'
import { InteractionType } from '@/types/app'
import { PropertyCard } from '@/components/property/PropertyCard'
import { dashboardTokens } from '@/lib/styles/dashboard-tokens'
import { cn } from '@/lib/utils'
import { useSwipePhysics } from '@/hooks/useSwipePhysics'
import { useHapticFeedback } from '@/lib/utils/haptic-feedback'
import { usePropertyDetail } from '@/components/property/PropertyDetailProvider'

// Card stack depth constants
const STACK_DEPTH = 3
const STACK_SCALE_FACTOR = 0.05
const STACK_Y_OFFSET = 8
const STACK_OPACITY_FACTOR = 0.08
const STACK_MIN_OPACITY = 0.9

interface SwipeablePropertyCardProps {
  properties: Property[]
  currentIndex: number
  onDecision: (propertyId: string, type: InteractionType) => void
  onUndo?: () => void
  className?: string
  showHints?: boolean
}

function usePropertyDetailSafe() {
  try {
    return usePropertyDetail()
  } catch {
    return null
  }
}

function getPropertyNeighborhood(property?: Property | null) {
  if (!property) return undefined
  return (
    (property as (Property & { neighborhood?: Neighborhood | null }) | null)
      ?.neighborhood ||
    (property as (Property & { neighborhoods?: Neighborhood | null }) | null)
      ?.neighborhoods ||
    undefined
  )
}

function isTapOnInteractiveElement(target: EventTarget | null) {
  if (!target || !(target instanceof Element)) return false
  return Boolean(target.closest('a,button,[role="button"],[data-card-action]'))
}

export function SwipeablePropertyCard({
  properties,
  currentIndex,
  onDecision,
  onUndo,
  className,
  showHints = false,
}: SwipeablePropertyCardProps) {
  const propertyDetail = usePropertyDetailSafe()
  // Haptic feedback hook
  const haptic = useHapticFeedback()
  const isTopCard = currentIndex === 0
  const initialTopPropertyId = useRef<string | null>(null)
  const [leavingCard, setLeavingCard] = useState<{
    property: Property
    direction: 'left' | 'right'
  } | null>(null)
  const isProcessingSwipeRef = useRef(false)

  // State for decision feedback
  const [dragDirection, setDragDirection] = useState<'left' | 'right' | null>(
    null
  )
  const [isDragging, setIsDragging] = useState(false)
  const [showHintsState, setShowHintsState] = useState(showHints)

  // Refs for performance optimization
  const cardRef = useRef<HTMLDivElement>(null)
  const hasDraggedRef = useRef(false)
  const hasShownHintsRef = useRef(false)

  // Get current property
  const currentProperty = properties[currentIndex]
  const nextProperties = properties.slice(
    currentIndex + 1,
    currentIndex + STACK_DEPTH + 1
  )
  const neighborhoodData = getPropertyNeighborhood(currentProperty)
  if (!initialTopPropertyId.current && properties[0]) {
    initialTopPropertyId.current = properties[0].id
  }
  const isInitialTopCard =
    !!currentProperty?.id && currentProperty.id === initialTopPropertyId.current
  const shouldShowHints = showHintsState && isTopCard && isInitialTopCard
  const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 1000

  useEffect(() => {
    isProcessingSwipeRef.current = false
  }, [currentProperty?.id])

  // Initialize swipe physics with haptic feedback
  const {
    x,
    y,
    rotate,
    opacity,
    scale,
    likeOpacity,
    passOpacity,
    controls,
    handleDragStart: physicsHandleDragStart,
    handleDrag: physicsHandleDrag,
    handleDragEnd: physicsHandleDragEnd,
    swipeCard: physicsSwipeCard,
  } = useSwipePhysics({
    onSwipeStart: (direction) => {
      if (!currentProperty || isProcessingSwipeRef.current) return
      isProcessingSwipeRef.current = true
      setLeavingCard({ property: currentProperty, direction })
      const type: InteractionType = direction === 'right' ? 'liked' : 'skip'
      if (type === 'liked') {
        haptic.success()
      } else {
        haptic.selection()
      }
      onDecision(currentProperty.id, type)
    },
    onSwipeThresholdCrossed: (direction) => {
      setDragDirection(direction)
      if (direction) {
        haptic.medium()
      }
    },
    onDragStart: () => {
      setIsDragging(true)
      haptic.light()
      hasDraggedRef.current = true

      // Add hardware acceleration hints
      if (cardRef.current) {
        cardRef.current.style.willChange = 'transform'
      }
    },
    onDragEnd: () => {
      setIsDragging(false)
      setDragDirection(null)

      // Remove hardware acceleration hint
      if (cardRef.current) {
        cardRef.current.style.willChange = 'auto'
      }
    },
  })

  // Hide hints after first interaction
  useEffect(() => {
    if (hasDraggedRef.current && shouldShowHints) {
      const timer = setTimeout(() => setShowHintsState(false), 1000)
      return () => clearTimeout(timer)
    }
  }, [shouldShowHints])

  // Ensure hints never show for cards beyond the initial top card
  useEffect(() => {
    if (
      currentProperty &&
      currentProperty.id !== initialTopPropertyId.current
    ) {
      setShowHintsState(false)
    }
  }, [currentProperty])

  // Swipe hints animation - only plays once on initial load
  useEffect(() => {
    if (shouldShowHints && currentProperty && !hasShownHintsRef.current) {
      hasShownHintsRef.current = true
      const runHints = async () => {
        await controls.start({
          x: [0, 30, 0, -30, 0],
          transition: { duration: 2, repeat: 1, repeatDelay: 1 },
        })
        setShowHintsState(false)
      }
      runHints()
    }
  }, [shouldShowHints, currentProperty, controls])

  // Programmatic swipe function (haptic feedback handled in onSwipeComplete)
  const swipeCard = useCallback(
    (direction: 'left' | 'right') => {
      if (!currentProperty) return
      physicsSwipeCard(direction)
    },
    [currentProperty, physicsSwipeCard]
  )

  const handleCardTap = useCallback(
    (event: MouseEvent | TouchEvent | PointerEvent) => {
      if (!propertyDetail || !currentProperty) return
      if (isDragging || isProcessingSwipeRef.current) return
      if (isTapOnInteractiveElement(event.target)) return

      propertyDetail.openPropertyDetail(
        currentProperty,
        neighborhoodData || undefined
      )
    },
    [
      propertyDetail,
      currentProperty,
      neighborhoodData,
      isDragging,
      isProcessingSwipeRef,
    ]
  )

  if (!currentProperty) {
    return (
      <div
        className={cn(
          'relative mx-auto h-[min(560px,70vh)] w-full max-w-md pb-20 md:pb-16',
          className
        )}
      >
        <div className="flex h-full items-center justify-center">
          <div className="text-center">
            <h2 className="font-display text-hm-stone-200 mb-4 text-2xl font-medium tracking-tight">
              No more properties!
            </h2>
            <p className="text-hm-stone-400 text-lg">
              Check back later for new listings.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      className={cn(
        'relative mx-auto h-[min(560px,70vh)] w-full max-w-md pb-20 md:pb-16',
        className
      )}
    >
      {/* Card Stack - Background Cards */}
      <div className="relative h-full w-full">
        {nextProperties.map((property, index) => {
          const stackIndex = index + 1
          const stackScale = 1 - stackIndex * STACK_SCALE_FACTOR
          const stackY = stackIndex * STACK_Y_OFFSET
          const stackOpacity = Math.max(
            STACK_MIN_OPACITY,
            1 - stackIndex * STACK_OPACITY_FACTOR
          )

          return (
            <MotionDiv
              key={`${property.id}-stack-${stackIndex}`}
              className="absolute h-full w-full"
              initial={{ scale: stackScale, y: stackY, opacity: stackOpacity }}
              animate={{ scale: stackScale, y: stackY, opacity: stackOpacity }}
              style={{
                zIndex: STACK_DEPTH - stackIndex,
                transformOrigin: 'center bottom',
              }}
            >
              <div className="h-full w-full transform-gpu">
                <PropertyCard
                  property={property}
                  disableDetailModal
                  fullHeight
                  enableDetailsToggle
                />
              </div>
            </MotionDiv>
          )
        })}

        {/* Current Card */}
        <MotionDiv
          ref={cardRef}
          className="absolute h-full w-full cursor-grab active:cursor-grabbing"
          style={{
            x,
            y,
            rotate,
            opacity,
            scale,
            zIndex: STACK_DEPTH + 1,
            transformOrigin: 'center bottom',
          }}
          animate={controls}
          drag
          dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
          dragElastic={0.2}
          dragTransition={{ bounceStiffness: 300, bounceDamping: 30 }}
          onDragStart={physicsHandleDragStart}
          onDrag={physicsHandleDrag}
          onDragEnd={physicsHandleDragEnd}
          whileTap={{ scale: 0.98 }}
          onTap={propertyDetail ? handleCardTap : undefined}
          data-testid="swipe-card-tap-target"
        >
          <div className="relative h-full w-full transform-gpu">
            <PropertyCard
              property={currentProperty}
              imagePriority
              disableDetailModal
              fullHeight
              enableDetailsToggle
            />

            {/* Decision Overlays */}
            <AnimatePresence>
              {isDragging && (
                <>
                  {/* Like Overlay */}
                  <MotionDiv
                    className="absolute inset-0 flex items-center justify-center rounded-xl"
                    style={{
                      background: `linear-gradient(135deg, ${dashboardTokens.colors.success[500]}20, ${dashboardTokens.colors.success[600]}40)`,
                      opacity: likeOpacity,
                    }}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: dragDirection === 'right' ? 1 : 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                  >
                    <div className="flex items-center space-x-2 rounded-full bg-white/20 px-6 py-3 backdrop-blur-sm">
                      <Heart className="h-8 w-8 fill-green-500 text-green-500" />
                      <span className="text-2xl font-bold text-green-500">
                        LIKE
                      </span>
                    </div>
                  </MotionDiv>

                  {/* Pass Overlay */}
                  <MotionDiv
                    className="absolute inset-0 flex items-center justify-center rounded-xl"
                    style={{
                      background: `linear-gradient(135deg, ${dashboardTokens.colors.error[500]}20, ${dashboardTokens.colors.error[600]}40)`,
                      opacity: passOpacity,
                    }}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: dragDirection === 'left' ? 1 : 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                  >
                    <div className="flex items-center space-x-2 rounded-full bg-white/20 px-6 py-3 backdrop-blur-sm">
                      <X className="h-8 w-8 text-red-500" />
                      <span className="text-2xl font-bold text-red-500">
                        PASS
                      </span>
                    </div>
                  </MotionDiv>
                </>
              )}
            </AnimatePresence>

            {/* Swipe Hints */}
            <AnimatePresence>
              {shouldShowHints && (
                <MotionDiv
                  className="pointer-events-none absolute top-20 left-1/2 z-20 w-full max-w-[80%] -translate-x-1/2 md:top-24"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  transition={{ duration: 0.5 }}
                >
                  <div className="flex items-center space-x-4 rounded-full bg-black/50 px-6 py-3 backdrop-blur-sm">
                    <div className="flex items-center space-x-2 text-white">
                      <ChevronLeft className="h-5 w-5 animate-pulse" />
                      <span className="text-sm">Swipe to explore</span>
                      <ChevronRight className="h-5 w-5 animate-pulse" />
                    </div>
                  </div>
                </MotionDiv>
              )}
            </AnimatePresence>

            {/* Threshold Indicators */}
            {isDragging && (
              <>
                <div className="absolute top-1/2 left-4 -translate-y-1/2 opacity-50">
                  <div className="h-12 w-1 rounded-full bg-gradient-to-b from-red-400 to-red-600"></div>
                </div>
                <div className="absolute top-1/2 right-4 -translate-y-1/2 opacity-50">
                  <div className="h-12 w-1 rounded-full bg-gradient-to-b from-green-400 to-green-600"></div>
                </div>
              </>
            )}
          </div>
        </MotionDiv>

        <AnimatePresence>
          {leavingCard && (
            <MotionDiv
              key={`${leavingCard.property.id}-leaving`}
              className="pointer-events-none absolute h-full w-full"
              data-testid="leaving-card"
              initial={{ x: 0, y: 0, opacity: 1, scale: 1, rotate: 0 }}
              animate={{
                x:
                  leavingCard.direction === 'right'
                    ? viewportWidth * 0.7
                    : -viewportWidth * 0.7,
                rotate: leavingCard.direction === 'right' ? 18 : -18,
                opacity: 0,
                scale: 0.9,
              }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              style={{
                zIndex: STACK_DEPTH + 2,
                transformOrigin: 'center bottom',
              }}
              onAnimationComplete={() => {
                setLeavingCard(null)
                isProcessingSwipeRef.current = false
              }}
            >
              <div className="h-full w-full transform-gpu">
                <PropertyCard
                  property={leavingCard.property}
                  disableDetailModal
                  fullHeight
                  enableDetailsToggle
                />
              </div>
            </MotionDiv>
          )}
        </AnimatePresence>
      </div>

      {/* Action Buttons */}
      <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-6 md:-bottom-2">
        <MotionButton
          onClick={() => swipeCard('left')}
          className="bg-hm-obsidian-800 text-hm-error hover:border-hm-error/30 hover:bg-hm-error/10 focus-visible:ring-hm-error/50 flex h-14 w-14 items-center justify-center rounded-full border border-white/10 shadow-lg transition-all duration-200 focus-visible:ring-2 focus-visible:outline-none"
          motionProps={{
            whileHover: { scale: 1.1 },
            whileTap: { scale: 0.95 },
          }}
          aria-label="Pass on this property"
          type="button"
        >
          <X size={24} strokeWidth={2.5} />
        </MotionButton>

        {onUndo && (
          <MotionButton
            onClick={onUndo}
            className="bg-hm-obsidian-800 text-hm-stone-400 hover:border-hm-amber-400/30 hover:bg-hm-amber-400/10 hover:text-hm-amber-400 focus-visible:ring-hm-amber-400/50 flex h-11 w-11 items-center justify-center rounded-full border border-white/10 shadow-lg transition-all duration-200 focus-visible:ring-2 focus-visible:outline-none"
            motionProps={{
              whileHover: { scale: 1.1 },
              whileTap: { scale: 0.95 },
            }}
            aria-label="Undo last action"
            type="button"
          >
            <RotateCcw size={18} strokeWidth={2.5} />
          </MotionButton>
        )}

        <MotionButton
          onClick={() => swipeCard('right')}
          className="bg-hm-obsidian-800 text-hm-success hover:border-hm-success/30 hover:bg-hm-success/10 focus-visible:ring-hm-success/50 flex h-14 w-14 items-center justify-center rounded-full border border-white/10 shadow-lg transition-all duration-200 focus-visible:ring-2 focus-visible:outline-none"
          motionProps={{
            whileHover: { scale: 1.1 },
            whileTap: { scale: 0.95 },
          }}
          aria-label="Like this property"
          type="button"
        >
          <Heart size={24} strokeWidth={2.5} />
        </MotionButton>
      </div>
    </div>
  )
}
