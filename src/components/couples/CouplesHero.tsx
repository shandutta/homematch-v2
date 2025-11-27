'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Heart, Users, Sparkles, Flame, Zap } from 'lucide-react'
import { AnimatePresence } from 'framer-motion'
import { MotionDiv } from '@/components/ui/motion-components'
import { Skeleton } from '@/components/ui/skeleton'
import type { CouplesStats } from '@/lib/services/couples'

interface CouplesHeroProps {
  stats?: CouplesStats | null
  loading?: boolean
}

export function CouplesHero({ stats, loading }: CouplesHeroProps) {
  if (loading) {
    return (
      <Card className="bg-hm-obsidian-900 relative overflow-hidden rounded-xl border border-white/5">
        <div className="absolute inset-0 bg-gradient-to-br from-pink-500/10 via-purple-500/10 to-rose-500/10" />
        <CardContent className="relative p-8 text-center">
          <Skeleton className="mx-auto mb-4 h-8 w-64 bg-white/5" />
          <Skeleton className="mx-auto mb-6 h-6 w-96 bg-white/5" />
          <div className="flex items-center justify-center gap-8">
            {[1, 2, 3].map((i) => (
              <div key={i} className="text-center">
                <Skeleton className="mx-auto mb-2 h-8 w-16 bg-white/5" />
                <Skeleton className="mx-auto h-4 w-20 bg-white/5" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-hm-obsidian-900 relative overflow-hidden rounded-xl border border-pink-500/10">
      {/* Romantic background gradient - subtle */}
      <div className="absolute inset-0 bg-gradient-to-br from-pink-500/10 via-purple-500/5 to-rose-500/10" />
      <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/[0.02] to-transparent" />

      {/* Floating hearts animation - more subtle */}
      <div className="absolute inset-0 overflow-hidden">
        {[...Array(4)].map((_, i) => (
          <MotionDiv
            key={i}
            className="absolute text-pink-400/10"
            initial={{
              x: Math.random() * 100 + '%',
              y: '100%',
              scale: 0,
              rotate: 0,
            }}
            animate={{
              y: '-100%',
              scale: [0, 1, 0],
              rotate: 360,
            }}
            transition={{
              duration: 10 + Math.random() * 4,
              repeat: Infinity,
              delay: i * 2.5,
              ease: 'linear',
            }}
          >
            <Heart className="h-5 w-5 fill-current" />
          </MotionDiv>
        ))}
      </div>

      <CardContent className="relative p-8 text-center">
        <MotionDiv
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="mb-4 flex items-center justify-center gap-3">
            <MotionDiv
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <Heart className="h-7 w-7 fill-pink-400/80 text-pink-400/80" />
            </MotionDiv>
            <h1 className="font-display text-hm-stone-200 text-3xl font-medium tracking-tight">
              Your Love Story
            </h1>
            <MotionDiv
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 2, repeat: Infinity, delay: 1 }}
            >
              <Heart className="h-7 w-7 fill-rose-400/80 text-rose-400/80" />
            </MotionDiv>
          </div>

          <p className="text-hm-stone-400 mx-auto mb-8 max-w-2xl text-base">
            Discover your perfect home together. See what you both love, track
            your journey, and make memories as you find the place where your
            story continues.
          </p>

          {/* Stats */}
          <AnimatePresence mode="wait">
            {stats && (
              <MotionDiv
                className="flex flex-wrap items-center justify-center gap-6"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ delay: 0.3, duration: 0.6 }}
              >
                {/* Mutual likes */}
                <MotionDiv
                  className="flex items-center gap-2 text-pink-400"
                  whileHover={{ scale: 1.05 }}
                  transition={{ type: 'spring', stiffness: 400 }}
                >
                  <MotionDiv
                    animate={
                      stats.total_mutual_likes > 0
                        ? {
                            scale: [1, 1.2, 1],
                            rotate: [0, 10, -10, 0],
                          }
                        : {}
                    }
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <Heart className="h-5 w-5 fill-current" />
                  </MotionDiv>
                  <span className="font-display text-2xl font-medium">
                    {stats.total_mutual_likes}
                  </span>
                  <span className="text-hm-stone-500 text-sm">
                    {stats.total_mutual_likes === 1
                      ? 'mutual like'
                      : 'mutual likes'}
                  </span>
                </MotionDiv>

                {/* Total likes */}
                <MotionDiv
                  className="flex items-center gap-2 text-purple-400"
                  whileHover={{ scale: 1.05 }}
                >
                  <Users className="h-5 w-5" />
                  <span className="font-display text-2xl font-medium">
                    {stats.total_household_likes}
                  </span>
                  <span className="text-hm-stone-500 text-sm">
                    total {stats.total_household_likes === 1 ? 'like' : 'likes'}
                  </span>
                </MotionDiv>

                {/* Activity streak */}
                {stats.activity_streak_days > 0 && (
                  <MotionDiv
                    className="text-hm-amber-400 flex items-center gap-2"
                    whileHover={{ scale: 1.05 }}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 300, delay: 0.5 }}
                  >
                    <MotionDiv
                      animate={{
                        scale: [1, 1.1, 1],
                        rotate: [0, 5, -5, 0],
                      }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    >
                      <Flame className="h-5 w-5" />
                    </MotionDiv>
                    <span className="font-display text-2xl font-medium">
                      {stats.activity_streak_days}
                    </span>
                    <span className="text-hm-stone-500 text-sm">
                      day streak
                    </span>
                  </MotionDiv>
                )}

                {/* Milestone celebration */}
                {stats.total_mutual_likes >= 10 && (
                  <MotionDiv
                    className="text-hm-amber-400 flex items-center gap-2"
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: 'spring', stiffness: 300, delay: 0.7 }}
                  >
                    <Zap className="h-5 w-5" />
                    <span className="text-sm font-medium">On fire!</span>
                  </MotionDiv>
                )}
              </MotionDiv>
            )}

            {/* Empty state message */}
            {(!stats || stats.total_mutual_likes === 0) && (
              <MotionDiv
                className="text-center"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ delay: 0.3, duration: 0.6 }}
              >
                <div className="text-hm-stone-400 mb-2 flex items-center justify-center gap-2">
                  <MotionDiv
                    animate={{ rotate: 360 }}
                    transition={{
                      duration: 8,
                      repeat: Infinity,
                      ease: 'linear',
                    }}
                  >
                    <Sparkles className="text-hm-amber-400 h-5 w-5" />
                  </MotionDiv>
                  <span className="text-base">
                    {stats?.total_household_likes &&
                    stats.total_household_likes > 0
                      ? "You're both active! Keep swiping to find your first match."
                      : 'Start your journey together - swipe to find homes you both love!'}
                  </span>
                  <MotionDiv
                    animate={{ rotate: -360 }}
                    transition={{
                      duration: 8,
                      repeat: Infinity,
                      ease: 'linear',
                    }}
                  >
                    <Sparkles className="text-hm-amber-400 h-5 w-5" />
                  </MotionDiv>
                </div>

                {stats?.total_household_likes &&
                  stats.total_household_likes > 0 && (
                    <MotionDiv
                      className="text-hm-stone-500 text-sm"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.5 }}
                    >
                      You&apos;ve liked {stats.total_household_likes} properties
                      between you
                    </MotionDiv>
                  )}
              </MotionDiv>
            )}
          </AnimatePresence>
        </MotionDiv>
      </CardContent>
    </Card>
  )
}
