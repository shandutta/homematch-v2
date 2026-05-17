'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Heart,
  Users,
  Home,
  UserPlus,
  Sparkles,
  ArrowRight,
  Coffee,
  Star,
} from 'lucide-react'
import Link from 'next/link'
import {
  MotionDiv,
  scaleIn,
  normalTransition,
} from '@/components/ui/motion-components'
import { CouplesMessages } from '@/lib/utils/couples-messaging'

interface EmptyStateProps {
  className?: string
}

interface NoHouseholdStateProps extends EmptyStateProps {
  onInvitePartner?: () => void
}

// No household - user needs to create or join one
export function NoHouseholdState({
  className,
  onInvitePartner,
}: NoHouseholdStateProps) {
  return (
    <Card
      className={`card-glassmorphism-style border-hm-stone-600/60 bg-hm-obsidian-900/90 w-full ${className}`}
    >
      <CardContent className="p-8 text-center">
        <MotionDiv
          variants={scaleIn}
          initial="initial"
          animate="animate"
          transition={{
            ...normalTransition,
            delay: 0.2,
            type: 'spring',
            stiffness: 200,
          }}
          className="mb-6"
        >
          <div className="relative mx-auto flex h-24 w-24 items-center justify-center">
            {/* Soft gradient glow background */}
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-orange-500/20 via-amber-500/10 to-transparent blur-xl" />

            {/* Icon container with subtle pulse */}
            <MotionDiv
              animate={{ opacity: [0.8, 1, 0.8] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
              className="from-hm-obsidian-950 to-hm-obsidian-800 relative flex h-16 w-16 items-center justify-center rounded-2xl border border-orange-500/30 bg-gradient-to-br shadow-sm"
            >
              <Home className="h-8 w-8 text-orange-400/60" strokeWidth={1.5} />
              <UserPlus
                className="bg-hm-obsidian-900 absolute -right-2 -bottom-2 h-6 w-6 rounded-full p-1 text-orange-500"
                strokeWidth={2}
              />
            </MotionDiv>
          </div>
        </MotionDiv>

        <h2 className="text-hm-stone-200 mb-3 text-2xl font-semibold">
          {CouplesMessages.onboarding.household.create}
        </h2>

        <p className="text-hm-stone-400 mx-auto mb-2 max-w-md">
          {CouplesMessages.welcome.subtitle} - create a household to share your
          search!
        </p>

        <div className="text-hm-stone-500 mb-6 flex items-center justify-center gap-2 text-sm">
          <Sparkles className="h-4 w-4" />
          <span>
            Once everyone joins, HomeMatch will show overlap, differences, and
            homes worth reviewing together
          </span>
        </div>

        <div className="flex flex-wrap justify-center gap-3">
          {onInvitePartner && (
            <Button
              onClick={onInvitePartner}
              className="bg-hm-stone-300 hover:bg-hm-stone-200 text-white"
            >
              <UserPlus className="mr-2 h-4 w-4" />
              Invite Someone
            </Button>
          )}

          <Button
            asChild
            className={
              onInvitePartner
                ? 'border-hm-stone-600/70 text-hm-stone-300 hover:bg-hm-obsidian-800 hover:text-hm-stone-200'
                : 'bg-hm-stone-300 hover:bg-hm-stone-200 text-white'
            }
            variant={onInvitePartner ? 'outline' : 'default'}
          >
            <Link href="/household/create">
              <Home className="mr-2 h-4 w-4" />
              Create Household
            </Link>
          </Button>

          <Button
            variant="outline"
            asChild
            className="border-hm-stone-600/70 text-hm-stone-300 hover:bg-hm-obsidian-800 hover:text-hm-stone-200"
          >
            <Link href="/household/join">
              <Users className="mr-2 h-4 w-4" />
              Join Existing
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

// Single in household - waiting for partner
export function WaitingForPartnerState({
  className,
  householdId,
  onInvite,
}: EmptyStateProps & { householdId?: string; onInvite?: () => void }) {
  return (
    <Card
      className={`card-glassmorphism-style border-hm-stone-600/60 bg-hm-obsidian-900/90 w-full ${className}`}
    >
      <CardContent className="p-8 text-center">
        <MotionDiv
          variants={scaleIn}
          initial="initial"
          animate="animate"
          transition={{
            ...normalTransition,
            delay: 0.2,
            type: 'spring',
            stiffness: 200,
          }}
          className="mb-6"
        >
          <div className="relative mx-auto h-20 w-20">
            <MotionDiv
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 3, repeat: Infinity }}
            >
              <Heart className="h-20 w-20 fill-current text-purple-400/30" />
            </MotionDiv>
            <MotionDiv
              animate={{ scale: [0.8, 1.2, 0.8] }}
              transition={{ duration: 3, repeat: Infinity, delay: 1.5 }}
            >
              <Users className="absolute top-1/2 left-1/2 h-8 w-8 -translate-x-1/2 -translate-y-1/2 text-purple-400" />
            </MotionDiv>
          </div>
        </MotionDiv>

        <h2 className="text-hm-stone-200 mb-3 text-2xl font-semibold">
          {CouplesMessages.onboarding.household.invite}
        </h2>

        <p className="text-hm-stone-400 mx-auto mb-2 max-w-md">
          You&apos;re all set up! Now invite someone to join your household and{' '}
          {CouplesMessages.welcome.dashboard.toLowerCase()}.
        </p>

        <div className="text-hm-stone-500 mb-6 flex items-center justify-center gap-2 text-sm">
          <Coffee className="h-4 w-4" />
          <Heart className="h-4 w-4 fill-pink-400 text-pink-400" />
          <span>
            Start saving homes now; partner overlap will appear once they join
          </span>
        </div>

        <div className="flex flex-wrap justify-center gap-3">
          <Button
            onClick={onInvite}
            className="bg-hm-stone-300 hover:bg-hm-stone-200 text-white"
          >
            <UserPlus className="mr-2 h-4 w-4" />
            Send Invitation
          </Button>

          <Button
            variant="outline"
            asChild
            className="border-hm-stone-600/70 text-hm-stone-300 hover:bg-hm-obsidian-800 hover:text-hm-stone-200"
          >
            <Link href="/dashboard">
              <ArrowRight className="mr-2 h-4 w-4" />
              {CouplesMessages.cta.startSwiping}
            </Link>
          </Button>
        </div>

        {householdId && (
          <div className="border-hm-stone-600/60 bg-hm-obsidian-950/70 mt-6 rounded-lg border p-4">
            <p className="text-hm-stone-500 mb-2 text-xs">
              Share this household ID:
            </p>
            <code className="bg-hm-obsidian-800 text-hm-stone-300 rounded px-2 py-1 font-mono text-sm">
              {householdId}
            </code>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// No mutual likes yet - encourage swiping together
export function NoMutualLikesState({
  className,
  stats,
}: EmptyStateProps & { stats?: { total_household_likes?: number } }) {
  const hasIndividualLikes = (stats?.total_household_likes || 0) > 0

  return (
    <Card
      className={`card-glassmorphism-style border-hm-stone-600/60 bg-hm-obsidian-900/90 w-full ${className}`}
    >
      <CardContent className="p-8 text-center">
        <MotionDiv
          variants={scaleIn}
          initial="initial"
          animate="animate"
          transition={{
            ...normalTransition,
            delay: 0.2,
            type: 'spring',
            stiffness: 200,
          }}
          className="mb-6"
        >
          <div className="relative mx-auto h-20 w-20">
            {/* Animated double hearts */}
            <MotionDiv
              animate={{
                scale: [1, 1.1, 1],
                rotate: [0, 5, -5, 0],
              }}
              transition={{ duration: 4, repeat: Infinity }}
            >
              <Heart className="absolute top-2 left-2 h-16 w-16 fill-current text-pink-400/30" />
            </MotionDiv>
            <MotionDiv
              animate={{
                scale: [1, 1.1, 1],
                rotate: [0, -5, 5, 0],
              }}
              transition={{ duration: 4, repeat: Infinity, delay: 2 }}
            >
              <Heart className="absolute top-2 right-2 h-16 w-16 fill-current text-purple-400/30" />
            </MotionDiv>

            {/* Sparkles effect */}
            {[...Array(4)].map((_, i) => (
              <MotionDiv
                key={i}
                className="absolute"
                style={{
                  top: `${20 + i * 15}%`,
                  left: `${20 + i * 20}%`,
                }}
                animate={{
                  opacity: [0, 1, 0],
                  scale: [0, 1, 0],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  delay: i * 0.5,
                }}
              >
                <Sparkles className="h-3 w-3 text-yellow-400" />
              </MotionDiv>
            ))}
          </div>
        </MotionDiv>

        <h2 className="text-hm-stone-200 mb-3 text-2xl font-semibold">
          {hasIndividualLikes
            ? CouplesMessages.empty.noMutualLikes.title
            : CouplesMessages.empty.noLikes.title}
        </h2>

        <p className="text-hm-stone-400 mx-auto mb-2 max-w-md">
          {hasIndividualLikes
            ? CouplesMessages.empty.noMutualLikes.message
            : CouplesMessages.empty.noLikes.message}
        </p>

        <div className="text-hm-stone-500 mb-6 flex items-center justify-center gap-2 text-sm">
          <Star className="h-4 w-4" />
          <span>{CouplesMessages.empty.noMutualLikes.subtitle}</span>
        </div>

        <div className="flex flex-wrap justify-center gap-3">
          <Button
            asChild
            className="bg-hm-stone-300 hover:bg-hm-stone-200 text-white"
          >
            <Link href="/dashboard">
              <Heart className="mr-2 h-4 w-4 fill-current" />
              {CouplesMessages.cta.startSwiping}
            </Link>
          </Button>

          {hasIndividualLikes && (
            <Button
              variant="outline"
              asChild
              className="border-hm-stone-600/70 text-hm-stone-300 hover:bg-hm-obsidian-800 hover:text-hm-stone-200"
            >
              <Link href="/dashboard/activity">
                <Users className="mr-2 h-4 w-4" />
                {CouplesMessages.cta.viewActivity}
              </Link>
            </Button>
          )}
        </div>

        {hasIndividualLikes && (
          <div className="border-hm-stone-600/60 bg-hm-obsidian-950/70 mt-6 rounded-lg border p-4">
            <div className="text-hm-stone-500 flex items-center justify-center gap-2">
              <Heart className="h-4 w-4 fill-current" />
              <span className="text-sm">
                You&apos;ve liked {stats?.total_household_likes} properties so
                far
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Network/API error state
export function NetworkErrorState({
  className,
  onRetry,
}: EmptyStateProps & { onRetry: () => void }) {
  return (
    <Card
      className={`card-glassmorphism-style border-hm-stone-600/60 bg-hm-obsidian-900/90 w-full ${className}`}
    >
      <CardContent className="p-8 text-center">
        <MotionDiv
          variants={scaleIn}
          initial="initial"
          animate="animate"
          transition={{
            ...normalTransition,
            delay: 0.2,
            type: 'spring',
            stiffness: 200,
          }}
          className="mb-6"
        >
          <div className="relative mx-auto h-20 w-20">
            <MotionDiv
              animate={{ rotate: 360 }}
              transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
            >
              <div className="h-20 w-20 rounded-full border-4 border-red-400/20 border-t-red-400" />
            </MotionDiv>
            <Heart className="absolute top-1/2 left-1/2 h-8 w-8 -translate-x-1/2 -translate-y-1/2 text-red-400" />
          </div>
        </MotionDiv>

        <h2 className="text-hm-stone-200 mb-3 text-xl font-semibold">
          Connection Issue
        </h2>

        <p className="text-hm-stone-400 mx-auto mb-6 max-w-md">
          {CouplesMessages.error.network}
        </p>

        <Button
          onClick={onRetry}
          className="bg-hm-stone-300 hover:bg-hm-stone-200 text-white"
        >
          Try Again
        </Button>
      </CardContent>
    </Card>
  )
}
