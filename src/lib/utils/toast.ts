'use client'

import { toast as sonnerToast } from 'sonner'

export const toast = {
  success: (message: string, description?: string) => {
    return sonnerToast.success(message, {
      description,
      duration: 4000,
    })
  },

  error: (message: string, description?: string) => {
    return sonnerToast.error(message, {
      description,
      duration: 6000,
    })
  },

  info: (message: string, description?: string) => {
    return sonnerToast.info(message, {
      description,
      duration: 4000,
    })
  },

  mutualLike: (propertyAddress: string, partnerName?: string) => {
    return sonnerToast.success('Mutual like!', {
      description: partnerName
        ? `${partnerName} also liked ${propertyAddress}.`
        : `Shared like for ${propertyAddress}.`,
      duration: 8000,
    })
  },

  streak: (days: number) => {
    return sonnerToast.success(`🔥 ${days} Day Streak!`, {
      description: 'Great momentum. Keep it going.',
      duration: 6000,
    })
  },

  partnerJoined: (partnerName: string) => {
    return sonnerToast.success('🎉 Welcome to the team!', {
      description: `${partnerName} has joined your household. Start swiping together!`,
      duration: 6000,
    })
  },

  networkError: () => {
    return sonnerToast.error('Connection Issue', {
      description: 'Please check your internet connection and try again.',
      duration: 5000,
    })
  },

  authRequired: () => {
    return sonnerToast.error('Sign In Required', {
      description: 'Please sign in to access shared household features.',
      duration: 5000,
    })
  },

  householdRequired: () => {
    return sonnerToast.error('Join a Household', {
      description:
        'Create or join a household to start sharing favorites together.',
      duration: 6000,
    })
  },
}
