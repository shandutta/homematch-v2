/**
 * Couples-centric messaging utilities for HomeMatch
 * Centralizes all couples-focused copy and messaging throughout the app
 */

export const CouplesMessages = {
  // Welcome Messages
  welcome: {
    new: 'Welcome to HomeMatch! Find your dream home together 🏠💕',
    returning: 'Welcome back',
    dashboard: 'Find your dream home together',
    subtitle: 'Swipe, match, and move in together',
  },

  // Dashboard Headers
  dashboard: {
    title: 'Your Home Search Journey',
    subtitle: 'Two hearts, one home - tracking your progress together',
    discover: 'Discover Your Next Home Together',
    activity: "Your Couple's Activity",
  },

  // Empty States
  empty: {
    noProperties: {
      title: 'All caught up!',
      message:
        "You've seen all available properties together. Check back later for new listings that might be perfect for both of you!",
      cta: 'New homes are added daily',
    },
    noLikes: {
      title: 'Start swiping to find homes you both love',
      message:
        'Your perfect match is waiting - discover properties that speak to both of you',
      subtitle: 'The best homes find couples who know what they want',
    },
    noMutualLikes: {
      title: 'Find Your First Match Together!',
      message:
        "Keep swiping to discover your first mutual like - it's the most exciting part!",
      subtitle:
        'Properties you both like will appear here as beautiful matches',
    },
    noActivity: {
      title: 'Your shared journey starts here',
      message:
        'Begin exploring properties together and watch your story unfold',
      cta: 'Start Your Adventure',
    },
  },

  // Success & Achievement Messages
  success: {
    mutualLike: "It's a match! You both loved this property 💕",
    firstMatch: "First mutual like! 🎉 You're already on the same page",
    milestone: {
      5: '5 mutual likes! Your home-hunting synchronicity is amazing! ✨',
      10: '10 properties you both love! You two have great taste 🏆',
      25: "25 mutual favorites! You're house hunting champions! 🎯",
    },
    streak: {
      3: "3-day search streak! You're committed partners 💪",
      7: 'Week-long search streak! Dedication goals 🔥',
      14: 'Two weeks strong! Your dream home is getting closer 🌟',
    },
  },

  // Encouragement Messages
  encouragement: {
    swiping: [
      'Keep swiping - your dream home is out there!',
      "You're getting closer to finding the one together",
      'Great taste! Your partner will love this area too',
      'Every swipe brings you closer to home',
      'Perfect neighborhoods are just a swipe away',
    ],
    progress: [
      "Amazing progress! You're making this look easy",
      'Your search is really picking up momentum',
      'You two are naturals at this',
      'Looking great! Keep up the fantastic work',
    ],
    patience: [
      "The perfect home takes time - you're doing great",
      'Every property teaches you something new about your preferences',
      "Quality over quantity - you're being wonderfully selective",
    ],
  },

  // Statistics & Activity
  stats: {
    viewed: {
      title: 'Properties Explored Together',
      subtitle: "Total homes you've discovered as a couple",
      empty: 'Start exploring properties together',
    },
    liked: {
      title: 'Properties You Both Saved',
      subtitle: "Favorites you're both interested in",
      empty: 'Heart properties you both love',
    },
    matches: {
      title: 'Mutual Favorites',
      subtitle: 'Properties that made both your hearts skip',
      empty: 'Your first match is coming soon',
    },
    activity: {
      recentTitle: 'Your Recent Journey Together',
      weeklyTitle: "This Week's Adventures",
      monthlyTitle: 'Your Monthly Progress',
    },
  },

  // Loading States
  loading: {
    properties: 'Finding perfect properties for both of you...',
    matching: 'Checking for mutual interests...',
    activity: 'Loading your shared journey...',
    general: 'Just a moment while we prepare something special...',
  },

  // Error States
  error: {
    network:
      "Having trouble connecting? Let's get you back to house hunting together",
    noData:
      'Looks like we need to refresh. Your home search journey continues in a moment!',
    general:
      "Something's not quite right, but don't worry - great homes are still out there!",
  },

  // Call to Actions
  cta: {
    startSwiping: 'Start Swiping Together',
    viewMatches: 'See Your Matches',
    invitePartner: 'Invite Your Partner',
    continueSearch: 'Continue Your Search',
    exploreMore: 'Explore More Homes',
    viewActivity: 'View Your Journey',
    createHousehold: 'Start Your Journey',
  },

  // Toast Messages
  toast: {
    like: 'Added to your favorites! ❤️',
    mutualLike: '🎉 Mutual match! You both love this one',
    pass: 'Not the one, but your perfect home is out there!',
    undo: 'Changed your mind? No problem!',
    partnerActivity: 'Your partner just liked a property!',
    milestone: 'Congratulations on your house hunting milestone! 🎯',
  },

  // Onboarding & Setup
  onboarding: {
    household: {
      create: 'Create your household to start searching together',
      invite: 'Invite your partner to join your home search',
      waiting: 'Waiting for your partner to join the adventure',
    },
    profile: {
      setup: "Let's personalize your home search journey",
      preferences: 'Tell us what makes a house feel like home for both of you',
    },
  },

  // Navigation & UI
  navigation: {
    couples: 'Matches',
    matches: 'Our Matches',
    activity: 'Our Activity',
    household: 'Our Home Search',
  },
} as const

// Helper functions for dynamic messaging
export const getRandomEncouragement = (
  category: keyof typeof CouplesMessages.encouragement = 'swiping'
) => {
  const messages = CouplesMessages.encouragement[category]
  return messages[Math.floor(Math.random() * messages.length)]
}

export const getMilestoneMessage = (count: number) => {
  if (count >= 25) return CouplesMessages.success.milestone[25]
  if (count >= 10) return CouplesMessages.success.milestone[10]
  if (count >= 5) return CouplesMessages.success.milestone[5]
  if (count === 1) return CouplesMessages.success.firstMatch
  return CouplesMessages.success.mutualLike
}

export const getStreakMessage = (days: number) => {
  if (days >= 14) return CouplesMessages.success.streak[14]
  if (days >= 7) return CouplesMessages.success.streak[7]
  if (days >= 3) return CouplesMessages.success.streak[3]
  return `${days} days of searching together! 💕`
}

// Property-specific messaging
export const getPropertyActionText = (
  hasPartner: boolean,
  isMutualLike?: boolean
) => {
  if (isMutualLike) return 'You both loved this!'
  if (hasPartner) return 'Your partner might love this too'
  return 'Save this for when your partner joins'
}

export const getEmptyStateText = (
  state: 'loading' | 'empty' | 'error',
  context?: string
) => {
  switch (state) {
    case 'loading':
      return context
        ? CouplesMessages.loading[
            context as keyof typeof CouplesMessages.loading
          ] || CouplesMessages.loading.general
        : CouplesMessages.loading.general
    case 'empty':
      return CouplesMessages.empty.noLikes
    case 'error':
      return CouplesMessages.error.general
    default:
      return CouplesMessages.empty.noLikes
  }
}
