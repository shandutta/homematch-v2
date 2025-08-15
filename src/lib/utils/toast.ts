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
    return sonnerToast.success("💕 It's a Match!", {
      description: partnerName
        ? `You and ${partnerName} both liked ${propertyAddress}!`
        : `You both liked ${propertyAddress}!`,
      duration: 8000,
    })
  },

  streak: (days: number) => {
    return sonnerToast.success(`🔥 ${days} Day Streak!`, {
      description: `You're on fire! Keep the momentum going.`,
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
      description: 'Please sign in to access couples features.',
      duration: 5000,
    })
  },

  householdRequired: () => {
    return sonnerToast.error('Join a Household', {
      description:
        'Create or join a household to start sharing favorites with your partner.',
      duration: 6000,
    })
  },
}
