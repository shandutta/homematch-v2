'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { Heart, Users, Home, Sparkles } from 'lucide-react'
import {
  CouplesMessages,
  getRandomEncouragement,
} from '@/lib/utils/couples-messaging'

interface CouplesLoadingWrapperProps {
  isLoading?: boolean
  loadingText?: string
  context?: 'properties' | 'matching' | 'activity' | 'general'
  children: React.ReactNode
  className?: string
  showIcon?: boolean
  showEncouragement?: boolean
}

const LOADING_MESSAGES = {
  properties: CouplesMessages.loading.properties,
  matching: CouplesMessages.loading.matching,
  activity: CouplesMessages.loading.activity,
  general: CouplesMessages.loading.general,
}

const LOADING_ICONS = {
  properties: Home,
  matching: Heart,
  activity: Users,
  general: Sparkles,
}

export function CouplesLoadingWrapper({
  isLoading = false,
  loadingText,
  context = 'general',
  children,
  className = '',
  showIcon = true,
  showEncouragement = true,
}: CouplesLoadingWrapperProps) {
  if (!isLoading) {
    return <>{children}</>
  }

  const message = loadingText || LOADING_MESSAGES[context]
  const Icon = LOADING_ICONS[context]
  const encouragement = showEncouragement
    ? getRandomEncouragement('swiping')
    : null

  return (
    <div
      className={`flex flex-col items-center justify-center p-8 text-center ${className}`}
    >
      {/* Animated Icon */}
      {showIcon && (
        <motion.div
          className="mb-6 flex h-16 w-16 items-center justify-center rounded-full border border-purple-300/30 bg-gradient-to-r from-purple-500/20 to-pink-500/20"
          animate={{
            scale: [1, 1.1, 1],
            rotate: [0, 5, -5, 0],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        >
          <Icon className="h-8 w-8 text-purple-600" />
        </motion.div>
      )}

      {/* Loading Dots Animation */}
      <motion.div
        className="mb-4 flex space-x-2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        {[0, 1, 2].map((index) => (
          <motion.div
            key={index}
            className="h-3 w-3 rounded-full bg-gradient-to-r from-purple-500 to-pink-500"
            animate={{
              scale: [1, 1.5, 1],
              opacity: [1, 0.5, 1],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              delay: index * 0.2,
              ease: 'easeInOut',
            }}
          />
        ))}
      </motion.div>

      {/* Loading Message */}
      <motion.h3
        className="mb-2 text-lg font-semibold text-gray-800"
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4 }}
      >
        {message}
      </motion.h3>

      {/* Encouragement Text */}
      {encouragement && (
        <motion.p
          className="text-muted-foreground max-w-xs text-sm"
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          {encouragement}
        </motion.p>
      )}

      {/* Subtle Heart Animation */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {[...Array(3)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute opacity-20"
            style={{
              left: `${20 + i * 30}%`,
              top: `${30 + i * 20}%`,
            }}
            animate={{
              scale: [0.8, 1.2, 0.8],
              opacity: [0.2, 0.4, 0.2],
              rotate: [0, 360],
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              delay: i * 1.3,
              ease: 'easeInOut',
            }}
          >
            <Heart className="h-4 w-4 fill-current text-pink-400" />
          </motion.div>
        ))}
      </div>
    </div>
  )
}

// Convenience hook for consistent loading states
export function useCouplesLoading(
  isLoading: boolean,
  context?: 'properties' | 'matching' | 'activity' | 'general'
) {
  return {
    isLoading,
    context: context || 'general',
    message: context
      ? LOADING_MESSAGES[context]
      : CouplesMessages.loading.general,
  }
}
