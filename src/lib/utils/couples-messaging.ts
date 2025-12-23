/**
 * Household-centric messaging utilities for HomeMatch
 * Centralizes shared-search copy and messaging throughout the app
 */

export const CouplesMessages = {
  // Welcome Messages
  welcome: {
    new: 'Welcome to HomeMatch! Find a place that works for everyone.',
    returning: 'Welcome back',
    dashboard: 'Find a place that works for everyone',
    subtitle: 'Swipe, compare, and move forward together',
  },

  // Dashboard Headers
  dashboard: {
    title: 'Your Home Search',
    subtitle: 'Shared progress for your household',
    discover: 'Discover Your Next Home',
    activity: 'Household Activity',
  },

  // Empty States
  empty: {
    noProperties: {
      title: 'All caught up!',
      message:
        "You've seen all available properties in this search. Check back later for new listings that fit your filters.",
      cta: 'New homes are added daily',
    },
    noLikes: {
      title: 'Start swiping to find shared favorites',
      message: 'Build a short list everyone can get behind.',
      subtitle: 'Clear must-haves make decisions faster',
    },
    noMutualLikes: {
      title: 'Find your first shared favorite',
      message: 'Keep swiping to discover your first mutual like.',
      subtitle: 'Properties everyone likes will appear here',
    },
    noActivity: {
      title: 'Your shared search starts here',
      message: 'Begin exploring properties and watch your activity roll in.',
      cta: 'Start exploring',
    },
  },

  // Success & Achievement Messages
  success: {
    mutualLike: 'Shared favorite! Everyone liked this property.',
    firstMatch: "First mutual like! You're already aligned.",
    milestone: {
      5: '5 mutual likes! The list is getting sharper.',
      10: '10 shared favorites! You are finding your groove.',
      25: '25 mutual likes! Your short list is on fire.',
    },
    streak: {
      3: '3-day search streak! Solid momentum.',
      7: 'Week-long search streak! Great consistency.',
      14: 'Two weeks strong! The right home is getting closer.',
    },
  },

  // Encouragement Messages
  encouragement: {
    swiping: [
      'Keep swiping - your next great fit is out there!',
      "You're getting closer to the right place for your household",
      'Great pick! Others will appreciate this area too',
      'Every swipe sharpens your short list',
      'Strong neighborhoods are just a swipe away',
    ],
    progress: [
      'Nice progress! This search is moving.',
      'Your list is getting sharper.',
      'You are making fast decisions as a group.',
      'Good pace - keep it up.',
    ],
    patience: [
      'The right home takes time - you are doing fine.',
      'Every property teaches you something about your must-haves.',
      'Quality over quantity - you are being selective.',
    ],
  },

  // Statistics & Activity
  stats: {
    viewed: {
      title: 'Properties Explored Together',
      subtitle: "Total homes you've explored as a household",
      empty: 'Start exploring properties',
    },
    liked: {
      title: 'Properties You Both Saved',
      subtitle: 'Favorites the household saved',
      empty: 'Like properties to save them here',
    },
    matches: {
      title: 'Mutual Favorites',
      subtitle: 'Properties everyone liked',
      empty: 'Your first mutual like is coming soon',
    },
    activity: {
      recentTitle: 'Recent Household Activity',
      weeklyTitle: "This Week's Momentum",
      monthlyTitle: 'Monthly Progress',
    },
  },

  // Loading States
  loading: {
    properties: 'Finding strong fits for your household...',
    matching: 'Checking for mutual interests...',
    activity: 'Loading household activity...',
    general: 'Hang tight while we update your search...',
  },

  // Error States
  error: {
    network: "Having trouble connecting? Let's get you back to house hunting.",
    noData:
      'Looks like we need to refresh. Your search will be back in a moment!',
    general: 'Something is not quite right, but the listings are still there.',
  },

  // Call to Actions
  cta: {
    startSwiping: 'Start swiping',
    viewMatches: 'See mutual likes',
    invitePartner: 'Invite someone',
    continueSearch: 'Continue Your Search',
    exploreMore: 'Explore More Homes',
    viewActivity: 'View household activity',
    createHousehold: 'Start a household',
  },

  // Toast Messages
  toast: {
    like: 'Added to your favorites!',
    mutualLike: 'Mutual like! Everyone saved this one.',
    pass: 'Not the one, but your perfect home is out there!',
    undo: 'Changed your mind? No problem!',
    partnerActivity: 'A household member just liked a property.',
    milestone: 'Nice milestone in your search!',
  },

  // Onboarding & Setup
  onboarding: {
    household: {
      create: 'Create a household to start searching together',
      invite: 'Invite a household member to join the search',
      waiting: 'Waiting for a household member to join',
    },
    profile: {
      setup: "Let's personalize your home search",
      preferences: 'Tell us what matters most to your household',
    },
  },

  // Navigation & UI
  navigation: {
    couples: 'Household',
    matches: 'Mutual Likes',
    activity: 'Household Activity',
    household: 'Household Search',
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
  return `${days} days of searching together!`
}

// Property-specific messaging
export const getPropertyActionText = (
  hasPartner: boolean,
  isMutualLike?: boolean
) => {
  if (isMutualLike) return 'Everyone liked this!'
  if (hasPartner) return 'A household member might like this too'
  return 'Save this for when someone else joins'
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
