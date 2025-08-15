'use client'

import React, { createContext, useContext, useCallback } from 'react'
import { toast } from 'react-hot-toast'
import {
  Heart,
  Trophy,
  Flame,
  ThumbsUp,
  RotateCcw,
  Home,
  Zap,
  PartyPopper,
  Star,
  Target,
  Medal,
  LucideIcon,
} from 'lucide-react'
import {
  CouplesMessages,
  getMilestoneMessage,
  getStreakMessage,
  getRandomEncouragement,
} from '@/lib/utils/couples-messaging'

interface CouplesProgressContextType {
  showMutualLikeToast: (propertyAddress?: string, _partnerName?: string) => void
  showMilestoneToast: (
    count: number,
    type: 'mutual_likes' | 'days_active' | 'properties_viewed'
  ) => void
  showEncouragementToast: (
    context?: 'swiping' | 'progress' | 'patience'
  ) => void
  showWelcomeToast: (isReturning?: boolean) => void
  showActionToast: (action: 'like' | 'pass' | 'undo', context?: string) => void
}

const CouplesProgressContext = createContext<
  CouplesProgressContextType | undefined
>(undefined)

export function useCouplesProgress() {
  const context = useContext(CouplesProgressContext)
  if (!context) {
    throw new Error(
      'useCouplesProgress must be used within CouplesProgressProvider'
    )
  }
  return context
}

interface CouplesProgressProviderProps {
  children: React.ReactNode
}

export function CouplesProgressProvider({
  children,
}: CouplesProgressProviderProps) {
  // Helper function to create icon JSX from Lucide components
  const createIconElement = (
    IconComponent: LucideIcon,
    className = 'h-4 w-4'
  ) => {
    return <IconComponent className={className} />
  }

  const showMutualLikeToast = useCallback(
    (propertyAddress?: string, _partnerName?: string) => {
      const message = propertyAddress
        ? `${CouplesMessages.success.mutualLike} - ${propertyAddress}`
        : CouplesMessages.success.mutualLike

      toast.success(message, {
        duration: 4000,
        icon: createIconElement(Heart, 'h-4 w-4 fill-pink-400 text-pink-400'),
        style: {
          background: 'linear-gradient(135deg, #fef7ff 0%, #f3e8ff 100%)',
          border: '1px solid #e9d5ff',
          color: '#7c3aed',
        },
      })
    },
    []
  )

  const showMilestoneToast = useCallback(
    (
      count: number,
      type: 'mutual_likes' | 'days_active' | 'properties_viewed'
    ) => {
      let message: string
      let iconComponent: LucideIcon

      switch (type) {
        case 'mutual_likes':
          message = getMilestoneMessage(count)
          iconComponent = Trophy
          break
        case 'days_active':
          message = getStreakMessage(count)
          iconComponent = Flame
          break
        case 'properties_viewed':
          if (count === 10)
            message =
              "10 properties explored together! You're getting the hang of this"
          else if (count === 50)
            message = '50 properties viewed! Your dedication is amazing'
          else if (count === 100)
            message = 'Century club! 100 properties explored together!'
          else
            message = `${count} properties explored on your journey together!`

          if (count === 10) iconComponent = Star
          else if (count === 50) iconComponent = Target
          else if (count === 100) iconComponent = Medal
          else iconComponent = ThumbsUp
          break
        default:
          message = CouplesMessages.success.mutualLike
          iconComponent = PartyPopper
      }

      toast.success(message, {
        duration: 5000,
        icon: createIconElement(iconComponent, 'h-4 w-4 text-orange-500'),
        style: {
          background: 'linear-gradient(135deg, #fff7ed 0%, #fed7aa 100%)',
          border: '1px solid #fdba74',
          color: '#ea580c',
          fontWeight: '600',
        },
      })
    },
    []
  )

  const showEncouragementToast = useCallback(
    (context: 'swiping' | 'progress' | 'patience' = 'swiping') => {
      const message = getRandomEncouragement(context)

      toast(message, {
        duration: 3000,
        icon: createIconElement(Zap, 'h-4 w-4 text-green-600'),
        style: {
          background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
          border: '1px solid #bbf7d0',
          color: '#166534',
        },
      })
    },
    []
  )

  const showWelcomeToast = useCallback((isReturning = false) => {
    const message = isReturning
      ? CouplesMessages.welcome.returning
      : CouplesMessages.welcome.new

    toast.success(message, {
      duration: 4000,
      icon: createIconElement(Home, 'h-4 w-4 text-amber-600'),
      style: {
        background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
        border: '1px solid #fcd34d',
        color: '#92400e',
      },
    })
  }, [])

  const showActionToast = useCallback(
    (action: 'like' | 'pass' | 'undo', context?: string) => {
      let message: string
      let iconComponent: LucideIcon
      let styling = {}

      switch (action) {
        case 'like':
          message = context
            ? `${CouplesMessages.toast.like} ${context}`
            : CouplesMessages.toast.like
          iconComponent = Heart
          styling = {
            background: 'linear-gradient(135deg, #fef2f2 0%, #fecaca 100%)',
            border: '1px solid #f87171',
            color: '#dc2626',
          }
          break
        case 'pass':
          message = CouplesMessages.toast.pass
          iconComponent = ThumbsUp
          styling = {
            background: 'linear-gradient(135deg, #f9fafb 0%, #e5e7eb 100%)',
            border: '1px solid #d1d5db',
            color: '#6b7280',
          }
          break
        case 'undo':
          message = CouplesMessages.toast.undo
          iconComponent = RotateCcw
          styling = {
            background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
            border: '1px solid #93c5fd',
            color: '#2563eb',
          }
          break
        default:
          message = 'Action completed'
          iconComponent = ThumbsUp
      }

      toast(message, {
        duration: 2000,
        icon: createIconElement(
          iconComponent,
          `h-4 w-4 ${action === 'like' ? 'fill-red-400 text-red-400' : action === 'undo' ? 'text-blue-600' : 'text-gray-600'}`
        ),
        style: styling,
      })
    },
    []
  )

  const value: CouplesProgressContextType = {
    showMutualLikeToast,
    showMilestoneToast,
    showEncouragementToast,
    showWelcomeToast,
    showActionToast,
  }

  return (
    <CouplesProgressContext.Provider value={value}>
      {children}
    </CouplesProgressContext.Provider>
  )
}
