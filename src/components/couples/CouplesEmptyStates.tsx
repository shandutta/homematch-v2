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
import { MotionDiv, scaleIn, normalTransition } from '@/components/ui/motion-components'
import { CouplesMessages } from '@/lib/utils/couples-messaging'

interface EmptyStateProps {
  className?: string
}

// No household - user needs to create or join one
export function NoHouseholdState({ className }: EmptyStateProps) {
  return (
    <Card
      className={`card-glassmorphism-style border-orange-500/20 ${className}`}
    >
      <CardContent className="p-8 text-center">
        <MotionDiv
          variants={scaleIn}
          initial="initial"
          animate="animate"
          transition={{ ...normalTransition, delay: 0.2, type: 'spring', stiffness: 200 }}
          className="mb-6"
        >
          <div className="relative mx-auto h-20 w-20">
            <MotionDiv
              animate={{ rotate: 360 }}
              transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
            >
              <Home className="h-20 w-20 text-orange-400/30" />
            </MotionDiv>
            <UserPlus className="absolute top-1/2 left-1/2 h-8 w-8 -translate-x-1/2 -translate-y-1/2 text-orange-400" />
          </div>
        </MotionDiv>

        <h2 className="text-primary-foreground mb-3 text-2xl font-bold">
          {CouplesMessages.onboarding.household.create}
        </h2>

        <p className="text-primary/70 mx-auto mb-2 max-w-md">
          {CouplesMessages.welcome.subtitle} - create a household to share your
          journey!
        </p>

        <div className="text-primary/50 mb-6 flex items-center justify-center gap-2 text-sm">
          <Sparkles className="h-4 w-4" />
          <span>
            Once you both join, you&apos;ll discover mutual likes and track your
            progress as a team
          </span>
        </div>

        <div className="flex flex-wrap justify-center gap-3">
          <Button
            asChild
            className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600"
          >
            <Link href="/household/create">
              <Home className="mr-2 h-4 w-4" />
              Create Household
            </Link>
          </Button>

          <Button
            variant="outline"
            asChild
            className="border-orange-500/30 text-orange-400 hover:bg-orange-500/10"
          >
            <Link href="/household/join">
              <UserPlus className="mr-2 h-4 w-4" />
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
}: EmptyStateProps & { householdId?: string }) {
  return (
    <Card
      className={`card-glassmorphism-style border-purple-500/20 ${className}`}
    >
      <CardContent className="p-8 text-center">
        <MotionDiv
          variants={scaleIn}
          initial="initial"
          animate="animate"
          transition={{ ...normalTransition, delay: 0.2, type: 'spring', stiffness: 200 }}
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

        <h2 className="text-primary-foreground mb-3 text-2xl font-bold">
          {CouplesMessages.onboarding.household.invite}
        </h2>

        <p className="text-primary/70 mx-auto mb-2 max-w-md">
          You&apos;re all set up! Now invite your partner to join your household
          and {CouplesMessages.welcome.dashboard.toLowerCase()}.
        </p>

        <div className="text-primary/50 mb-6 flex items-center justify-center gap-2 text-sm">
          <Coffee className="h-4 w-4" />
          <Heart className="h-4 w-4 fill-pink-400 text-pink-400" />
          <span>
            Feel free to start exploring and save favorites while you wait
          </span>
        </div>

        <div className="flex flex-wrap justify-center gap-3">
          <Button className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600">
            <UserPlus className="mr-2 h-4 w-4" />
            Send Invitation
          </Button>

          <Button
            variant="outline"
            asChild
            className="border-purple-500/30 text-purple-400 hover:bg-purple-500/10"
          >
            <Link href="/dashboard">
              <ArrowRight className="mr-2 h-4 w-4" />
              {CouplesMessages.cta.startSwiping}
            </Link>
          </Button>
        </div>

        {householdId && (
          <div className="mt-6 rounded-lg border border-purple-500/20 bg-purple-500/5 p-4">
            <p className="mb-2 text-xs text-purple-400/70">
              Share this household ID:
            </p>
            <code className="rounded bg-purple-900/20 px-2 py-1 font-mono text-sm text-purple-300">
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
      className={`card-glassmorphism-style border-pink-500/20 ${className}`}
    >
      <CardContent className="p-8 text-center">
        <MotionDiv
          variants={scaleIn}
          initial="initial"
          animate="animate"
          transition={{ ...normalTransition, delay: 0.2, type: 'spring', stiffness: 200 }}
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

        <h2 className="text-primary-foreground mb-3 text-2xl font-bold">
          {hasIndividualLikes
            ? CouplesMessages.empty.noMutualLikes.title
            : CouplesMessages.empty.noLikes.title}
        </h2>

        <p className="text-primary/70 mx-auto mb-2 max-w-md">
          {hasIndividualLikes
            ? CouplesMessages.empty.noMutualLikes.message
            : CouplesMessages.empty.noLikes.message}
        </p>

        <div className="text-primary/50 mb-6 flex items-center justify-center gap-2 text-sm">
          <Star className="h-4 w-4" />
          <span>{CouplesMessages.empty.noMutualLikes.subtitle}</span>
        </div>

        <div className="flex flex-wrap justify-center gap-3">
          <Button
            asChild
            className="bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600"
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
              className="border-pink-500/30 text-pink-400 hover:bg-pink-500/10"
            >
              <Link href="/dashboard/activity">
                <Users className="mr-2 h-4 w-4" />
                {CouplesMessages.cta.viewActivity}
              </Link>
            </Button>
          )}
        </div>

        {hasIndividualLikes && (
          <div className="mt-6 rounded-lg border border-pink-500/20 bg-pink-500/5 p-4">
            <div className="flex items-center justify-center gap-2 text-pink-400/70">
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
    <Card className={`card-glassmorphism-style border-red-500/20 ${className}`}>
      <CardContent className="p-8 text-center">
        <MotionDiv
          variants={scaleIn}
          initial="initial"
          animate="animate"
          transition={{ ...normalTransition, delay: 0.2, type: 'spring', stiffness: 200 }}
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

        <h2 className="text-primary-foreground mb-3 text-xl font-semibold">
          Connection Issue
        </h2>

        <p className="text-primary/70 mx-auto mb-6 max-w-md">
          {CouplesMessages.error.network}
        </p>

        <Button
          onClick={onRetry}
          className="bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600"
        >
          Try Again
        </Button>
      </CardContent>
    </Card>
  )
}
