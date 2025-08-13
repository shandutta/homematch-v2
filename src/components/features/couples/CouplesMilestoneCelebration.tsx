'use client'

import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Heart, Trophy, Star, Flame, Home, Users } from 'lucide-react'
import {
  CouplesMessages,
  getMilestoneMessage,
  getStreakMessage,
} from '@/lib/utils/couples-messaging'

interface MilestoneData {
  type: 'mutual_like' | 'milestone' | 'streak' | 'first_match'
  count?: number
  propertyAddress?: string
  partnerName?: string
  days?: number
}

interface CouplesMilestoneCelebrationProps {
  milestone?: MilestoneData | null
  onCelebrationComplete?: () => void
  className?: string
}

// Removed unused variants - using inline animations instead

export function CouplesMilestoneCelebration({
  milestone,
  onCelebrationComplete,
  className = '',
}: CouplesMilestoneCelebrationProps) {
  const [showCelebration, setShowCelebration] = useState(false)

  useEffect(() => {
    if (milestone) {
      setShowCelebration(true)

      // Auto-hide celebration after 4 seconds
      const timer = setTimeout(() => {
        setShowCelebration(false)
        onCelebrationComplete?.()
      }, 4000)

      return () => clearTimeout(timer)
    }
  }, [milestone, onCelebrationComplete])

  if (!milestone || !showCelebration) {
    return null
  }

  const getCelebrationContent = () => {
    switch (milestone.type) {
      case 'mutual_like':
        return {
          icon: Heart,
          title: "It's a Match!",
          message: milestone.propertyAddress
            ? `You both loved ${milestone.propertyAddress}!`
            : CouplesMessages.success.mutualLike,
          color: 'from-pink-500 to-red-500',
          bgColor: 'from-pink-50 to-red-50',
        }

      case 'first_match':
        return {
          icon: Star,
          title: 'First Match!',
          message: CouplesMessages.success.firstMatch,
          color: 'from-yellow-500 to-orange-500',
          bgColor: 'from-yellow-50 to-orange-50',
        }

      case 'milestone': {
        const count = milestone.count || 0
        return {
          icon: Trophy,
          title: `${count} Mutual Favorites!`,
          message: getMilestoneMessage(count),
          color: 'from-purple-500 to-pink-500',
          bgColor: 'from-purple-50 to-pink-50',
        }
      }

      case 'streak': {
        const days = milestone.days || 0
        return {
          icon: Flame,
          title: `${days}-Day Streak!`,
          message: getStreakMessage(days),
          color: 'from-orange-500 to-red-500',
          bgColor: 'from-orange-50 to-red-50',
        }
      }

      default:
        return {
          icon: Heart,
          title: 'Celebration!',
          message: 'Great job house hunting together!',
          color: 'from-purple-500 to-pink-500',
          bgColor: 'from-purple-50 to-pink-50',
        }
    }
  }

  const { icon: Icon, title, message, color, bgColor } = getCelebrationContent()

  return (
    <AnimatePresence>
      {showCelebration && (
        <motion.div
          className={`fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm ${className}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => {
            setShowCelebration(false)
            onCelebrationComplete?.()
          }}
        >
          {/* Confetti Effect */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            {[...Array(12)].map((_, i) => (
              <motion.div
                key={i}
                className={`absolute h-3 w-3 bg-gradient-to-r ${color} rounded-full`}
                style={{
                  left: `${Math.random() * 100}%`,
                  top: '10%',
                }}
                initial={{ y: -100, opacity: 0, scale: 0 }}
                animate={{
                  y: [0, -20, 100],
                  opacity: [0, 1, 0],
                  scale: [0, 1, 0.5],
                  rotate: [0, 180, 360],
                }}
                transition={{
                  duration: 3,
                  ease: 'easeOut',
                  delay: i * 0.1,
                }}
              />
            ))}
          </div>

          {/* Celebration Card */}
          <motion.div
            className={`relative mx-4 max-w-md rounded-2xl bg-gradient-to-br ${bgColor} border border-white/20 p-8 text-center shadow-2xl`}
            initial={{ scale: 0, rotate: -180, opacity: 0 }}
            animate={{ scale: [0, 1.2, 1], rotate: 0, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Animated Icon */}
            <motion.div
              className="mx-auto mb-6 flex h-20 w-20 items-center justify-center"
              animate={{
                scale: [1, 1.2, 1],
                rotate: [0, 10, -10, 0],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            >
              <div
                className={`rounded-full bg-gradient-to-r ${color} p-4 shadow-lg`}
              >
                <Icon className="h-12 w-12 text-white" />
              </div>
            </motion.div>

            {/* Title */}
            <motion.h2
              className="mb-4 text-3xl font-bold text-gray-800"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              {title}
            </motion.h2>

            {/* Message */}
            <motion.p
              className="mb-6 text-lg text-gray-600"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              {message}
            </motion.p>

            {/* Partner Icon */}
            <motion.div
              className="flex items-center justify-center gap-2 text-gray-500"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
            >
              <Users className="h-5 w-5" />
              <span className="text-sm">Together we&apos;re unstoppable!</span>
              <Home className="h-5 w-5" />
            </motion.div>

            {/* Close hint */}
            <motion.div
              className="mt-6 text-xs text-gray-400"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
            >
              Tap anywhere to continue
            </motion.div>

            {/* Background Pattern */}
            <div className="absolute inset-0 overflow-hidden rounded-2xl">
              {[...Array(6)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute opacity-10"
                  style={{
                    left: `${20 + i * 15}%`,
                    top: `${10 + i * 10}%`,
                  }}
                  animate={{
                    scale: [1, 1.5, 1],
                    opacity: [0.1, 0.3, 0.1],
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    delay: i * 0.5,
                  }}
                >
                  <Heart className="h-6 w-6 fill-current" />
                </motion.div>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
