'use client'

import { MotionDiv } from '@/components/ui/motion-components'
import { Heart, Sparkles, Users, Star } from 'lucide-react'
import { ReactNode, useEffect, useState } from 'react'

// Floating hearts animation for celebration moments
export function FloatingHearts({
  trigger,
  count = 5,
}: {
  trigger: boolean
  count?: number
}) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    if (trigger) {
      setIsVisible(true)
      const timer = setTimeout(() => setIsVisible(false), 3000)
      return () => clearTimeout(timer)
    }
  }, [trigger])

  if (!isVisible) return null

  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
      {[...Array(count)].map((_, i) => (
        <MotionDiv
          key={i}
          className="absolute"
          initial={{
            x: '50%',
            y: '50%',
            scale: 0,
            opacity: 0,
          }}
          animate={{
            x: `${Math.random() * 100}%`,
            y: '-20%',
            scale: [0, 1, 0.8, 0],
            opacity: [0, 1, 1, 0],
            rotate: Math.random() * 360,
          }}
          transition={{
            duration: 2.5 + Math.random() * 1,
            delay: i * 0.1,
            ease: 'easeOut',
          }}
        >
          <Heart className="h-6 w-6 fill-pink-400 text-pink-400" />
        </MotionDiv>
      ))}
    </div>
  )
}

// Sparkle effect for special moments
export function SparkleEffect({
  active,
  children,
}: {
  active: boolean
  children: ReactNode
}) {
  return (
    <div className="relative">
      {children}
      {active && (
        <div className="pointer-events-none absolute inset-0">
          {[...Array(4)].map((_, i) => (
            <MotionDiv
              key={i}
              className="absolute"
              style={{
                top: `${20 + i * 20}%`,
                left: `${20 + i * 20}%`,
              }}
              initial={{ scale: 0, opacity: 0 }}
              animate={{
                scale: [0, 1, 0],
                opacity: [0, 1, 0],
                rotate: [0, 180, 360],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                delay: i * 0.2,
              }}
            >
              <Sparkles className="h-3 w-3 text-yellow-400" />
            </MotionDiv>
          ))}
        </div>
      )}
    </div>
  )
}

// Heartbeat animation for mutual likes
export function HeartbeatHeart({ active = true }: { active?: boolean }) {
  return (
    <MotionDiv
      animate={
        active
          ? {
              scale: [1, 1.2, 1],
            }
          : {}
      }
      transition={{
        duration: 1,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
    >
      <Heart className="h-5 w-5 fill-pink-400 text-pink-400" />
    </MotionDiv>
  )
}

// Pulsing ring animation for loading/activity
export function PulseRing({
  size = 40,
  color = 'pink',
}: {
  size?: number
  color?: string
}) {
  return (
    <div className="relative" style={{ width: size, height: size }}>
      {[...Array(3)].map((_, i) => (
        <MotionDiv
          key={i}
          className={`absolute inset-0 rounded-full border-2 border-${color}-400/30`}
          initial={{ scale: 0, opacity: 1 }}
          animate={{
            scale: [0, 1.5, 2],
            opacity: [1, 0.5, 0],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            delay: i * 0.6,
          }}
        />
      ))}
      <div
        className={`h-full w-full rounded-full bg-${color}-400/20 flex items-center justify-center`}
      >
        <Users
          className={`h-${Math.floor(size / 8)} w-${Math.floor(size / 8)} text-${color}-400`}
        />
      </div>
    </div>
  )
}

// Staggered list animation
export function StaggeredList({
  children,
  delay = 0.1,
}: {
  children: ReactNode[]
  delay?: number
}) {
  return (
    <>
      {children.map((child, index) => (
        <MotionDiv
          key={index}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.5,
            delay: index * delay,
            type: 'spring',
            stiffness: 100,
          }}
        >
          {child}
        </MotionDiv>
      ))}
    </>
  )
}

// Success confetti animation
export function SuccessConfetti({ trigger }: { trigger: boolean }) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    if (trigger) {
      setIsVisible(true)
      const timer = setTimeout(() => setIsVisible(false), 3000)
      return () => clearTimeout(timer)
    }
  }, [trigger])

  if (!isVisible) return null

  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
      {[...Array(20)].map((_, i) => {
        const icons = [Heart, Star, Sparkles]
        const Icon = icons[Math.floor(Math.random() * icons.length)]
        const colors = [
          'text-pink-400',
          'text-purple-400',
          'text-yellow-400',
          'text-rose-400',
        ]
        const color = colors[Math.floor(Math.random() * colors.length)]

        return (
          <MotionDiv
            key={i}
            className="absolute"
            initial={{
              x: '50%',
              y: '-10%',
              scale: 0,
              opacity: 0,
              rotate: 0,
            }}
            animate={{
              x: `${Math.random() * 100}%`,
              y: '110%',
              scale: [0, 1, 0.8, 0],
              opacity: [0, 1, 1, 0],
              rotate: Math.random() * 720,
            }}
            transition={{
              duration: 3 + Math.random() * 2,
              delay: i * 0.05,
              ease: 'easeOut',
            }}
          >
            <Icon
              className={`h-4 w-4 ${color} ${Icon === Heart ? 'fill-current' : ''}`}
            />
          </MotionDiv>
        )
      })}
    </div>
  )
}

// Hover scale effect for interactive elements
export function HoverScale({
  children,
  scale = 1.05,
  className = '',
  disabled = false,
}: {
  children: ReactNode
  scale?: number
  className?: string
  disabled?: boolean
}) {
  return (
    <MotionDiv
      className={className}
      whileHover={disabled ? {} : { scale }}
      whileTap={disabled ? {} : { scale: scale * 0.95 }}
      transition={{ type: 'spring', stiffness: 400, damping: 17 }}
    >
      {children}
    </MotionDiv>
  )
}

// Page transition wrapper
export function PageTransition({ children }: { children: ReactNode }) {
  return (
    <MotionDiv
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{
        duration: 0.5,
        type: 'spring',
        stiffness: 100,
      }}
    >
      {children}
    </MotionDiv>
  )
}

// Loading dots animation
export function LoadingDots({ size = 'sm' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizes = {
    sm: 'h-2 w-2',
    md: 'h-3 w-3',
    lg: 'h-4 w-4',
  }

  return (
    <div className="flex items-center gap-1">
      {[0, 1, 2].map((i) => (
        <MotionDiv
          key={i}
          className={`${sizes[size]} rounded-full bg-pink-400`}
          animate={{
            scale: [1, 1.2, 1],
            opacity: [1, 0.5, 1],
          }}
          transition={{
            duration: 0.8,
            repeat: Infinity,
            delay: i * 0.2,
          }}
        />
      ))}
    </div>
  )
}
