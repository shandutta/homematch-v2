'use client'

import React, { useState, useRef, useCallback, useEffect } from 'react'
import { AnimatePresence } from 'framer-motion'
import { MotionDiv } from '@/components/ui/motion-components'
import { Heart, X, RotateCcw, ChevronLeft, ChevronRight } from 'lucide-react'
import { Property } from '@/lib/schemas/property'
import { MotionButton } from '@/components/ui/motion-button'
import { InteractionType } from '@/types/app'
import { PropertyCard } from '@/components/property/PropertyCard'
import { dashboardTokens } from '@/lib/styles/dashboard-tokens'
import { cn } from '@/lib/utils'
import { useSwipePhysics } from '@/hooks/useSwipePhysics'
import { useHapticFeedback } from '@/lib/utils/haptic-feedback'

// Card stack depth constants
const STACK_DEPTH = 3
const STACK_SCALE_FACTOR = 0.05
const STACK_Y_OFFSET = 8
const STACK_OPACITY_FACTOR = 0.3

interface SwipeablePropertyCardProps {
  properties: Property[]
  currentIndex: number
  onDecision: (propertyId: string, type: InteractionType) => void
  onUndo?: () => void
  className?: string
  showHints?: boolean
}

export function SwipeablePropertyCard({
  properties,
  currentIndex,
  onDecision,
  onUndo,
  className,
  showHints = false,
}: SwipeablePropertyCardProps) {
  // Haptic feedback hook
  const haptic = useHapticFeedback()

  // State for decision feedback
  const [dragDirection, setDragDirection] = useState<'left' | 'right' | null>(
    null
  )
  const [isDragging, setIsDragging] = useState(false)
  const [showHintsState, setShowHintsState] = useState(showHints)

  // Refs for performance optimization
  const cardRef = useRef<HTMLDivElement>(null)
  const hasDraggedRef = useRef(false)

  // Get current property
  const currentProperty = properties[currentIndex]
  const nextProperties = properties.slice(
    currentIndex + 1,
    currentIndex + STACK_DEPTH + 1
  )

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
    onSwipeComplete: (direction) => {
      if (!currentProperty) return
      const type: InteractionType = direction === 'right' ? 'liked' : 'skip'
      haptic.success()
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
    if (hasDraggedRef.current && showHintsState) {
      const timer = setTimeout(() => setShowHintsState(false), 1000)
      return () => clearTimeout(timer)
    }
  }, [showHintsState])

  // Swipe hints animation
  useEffect(() => {
    if (showHintsState && currentProperty) {
      const showHints = async () => {
        await controls.start({
          x: [0, 30, 0, -30, 0],
          transition: { duration: 2, repeat: Infinity, repeatDelay: 3 },
        })
      }
      showHints()
    }
  }, [showHintsState, currentProperty, controls])

  // Programmatic swipe function with haptic feedback
  const swipeCard = useCallback(
    (direction: 'left' | 'right') => {
      if (!currentProperty) return
      haptic.success()
      physicsSwipeCard(direction)
    },
    [currentProperty, haptic, physicsSwipeCard]
  )

  if (!currentProperty) {
    return (
      <div
        className={cn(
          'relative mx-auto h-[560px] w-full max-w-md pb-16',
          className
        )}
      >
        <div className="flex h-full items-center justify-center">
          <div className="text-center">
            <h2 className="text-foreground mb-4 text-2xl font-semibold">
              No more properties!
            </h2>
            <p className="text-muted-foreground text-lg">
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
        'relative mx-auto h-[560px] w-full max-w-md pb-16',
        className
      )}
    >
      {/* Card Stack - Background Cards */}
      <div className="relative h-full w-full">
        {nextProperties.map((property, index) => {
          const stackIndex = index + 1
          const stackScale = 1 - stackIndex * STACK_SCALE_FACTOR
          const stackY = stackIndex * STACK_Y_OFFSET
          const stackOpacity = 1 - stackIndex * STACK_OPACITY_FACTOR

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
                <PropertyCard property={property} />
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
        >
          <div className="relative h-full w-full transform-gpu">
            <PropertyCard
              property={currentProperty}
              imagePriority
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
              {showHintsState && (
                <MotionDiv
                  className="absolute bottom-4 left-1/2 z-20 -translate-x-1/2"
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
      </div>

      {/* Action Buttons */}
      <div className="absolute bottom-6 left-1/2 flex -translate-x-1/2 items-center space-x-4">
        <MotionButton
          onClick={() => swipeCard('left')}
          className="flex h-16 min-h-[64px] w-16 min-w-[64px] touch-manipulation items-center justify-center rounded-full bg-white/10 text-red-500 shadow-lg backdrop-blur-sm transition-all hover:scale-110 hover:bg-red-500/20 focus-visible:ring-4 focus-visible:ring-red-400/50 focus-visible:outline-none active:scale-95"
          motionProps={{
            whileHover: { scale: 1.1 },
            whileTap: { scale: 0.95 },
          }}
          aria-label="Pass on this property"
          type="button"
        >
          <X size={28} />
        </MotionButton>

        {onUndo && (
          <MotionButton
            onClick={onUndo}
            className="flex h-14 min-h-[56px] w-14 min-w-[56px] touch-manipulation items-center justify-center rounded-full bg-white/10 text-gray-400 shadow-lg backdrop-blur-sm transition-all hover:scale-110 hover:bg-gray-400/20 focus-visible:ring-4 focus-visible:ring-gray-400/50 focus-visible:outline-none active:scale-95"
            motionProps={{
              whileHover: { scale: 1.1 },
              whileTap: { scale: 0.95 },
            }}
            aria-label="Undo last action"
            type="button"
          >
            <RotateCcw size={22} />
          </MotionButton>
        )}

        <MotionButton
          onClick={() => swipeCard('right')}
          className="flex h-16 min-h-[64px] w-16 min-w-[64px] touch-manipulation items-center justify-center rounded-full bg-white/10 text-green-500 shadow-lg backdrop-blur-sm transition-all hover:scale-110 hover:bg-green-500/20 focus-visible:ring-4 focus-visible:ring-green-400/50 focus-visible:outline-none active:scale-95"
          motionProps={{
            whileHover: { scale: 1.1 },
            whileTap: { scale: 0.95 },
          }}
          aria-label="Like this property"
          type="button"
        >
          <Heart size={28} />
        </MotionButton>
      </div>
    </div>
  )
}
