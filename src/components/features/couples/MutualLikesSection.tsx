'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Heart,
  Users,
  ChevronRight,
  RefreshCw,
  Sparkles,
  Star,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { PropertyImage } from '@/components/ui/property-image'
import { AnimatePresence } from 'framer-motion'
import { MotionDiv } from '@/components/ui/motion-components'
import { MutualLikesBadge } from './MutualLikesBadge'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from '@/lib/utils/toast'
import { dashboardTokens } from '@/lib/styles/dashboard-tokens'

interface MutualLike {
  property_id: string
  property?: {
    address: string
    price: number
    bedrooms: number
    bathrooms: number
    image_urls?: string[]
  }
  liked_by_count: number
  first_liked_at: string
  last_liked_at: string
}

interface MutualLikesSectionProps {
  userId?: string
  className?: string
  mutualLikes?: MutualLike[]
  isLoading?: boolean
  error?: string | null
}

export function MutualLikesSection({
  userId,
  className = '',
  mutualLikes: propMutualLikes,
  isLoading: propIsLoading,
  error: propError,
}: MutualLikesSectionProps) {
  const [stateMutualLikes, setStateMutualLikes] = useState<MutualLike[]>([])
  const [stateLoading, setStateLoading] = useState(true)
  const [stateError, setStateError] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)

  // Use props if provided, otherwise use state
  const mutualLikes =
    propMutualLikes !== undefined ? propMutualLikes : stateMutualLikes
  const loading = propIsLoading !== undefined ? propIsLoading : stateLoading
  const error = propError !== undefined ? propError : stateError

  const fetchMutualLikes = useCallback(async () => {
    try {
      setStateLoading(true)
      setStateError(null)

      const response = await fetch('/api/couples/mutual-likes')

      if (response.status === 401) {
        toast.authRequired()
        throw new Error('Please sign in again')
      }

      if (response.status === 403) {
        toast.householdRequired()
        throw new Error('Join a household to see mutual likes')
      }

      if (!response.ok) {
        if (response.status >= 500) {
          throw new Error('Server error - please try again later')
        }
        throw new Error('Failed to fetch mutual likes')
      }

      const data = await response.json()
      setStateMutualLikes(data.mutualLikes || [])

      // Success toast on retry
      if (retryCount > 0) {
        toast.success('Mutual likes loaded successfully!')
      }
    } catch (err) {
      console.error('Error fetching mutual likes:', err)
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to load mutual likes'
      setStateError(errorMessage)

      // Show appropriate toast
      if (
        errorMessage.includes('fetch') ||
        errorMessage.includes('network') ||
        !navigator.onLine
      ) {
        toast.networkError()
      } else if (
        !errorMessage.includes('sign in') &&
        !errorMessage.includes('household')
      ) {
        toast.error('Failed to load mutual likes', errorMessage)
      }
    } finally {
      setStateLoading(false)
    }
  }, [retryCount])

  const handleRetry = () => {
    setRetryCount((prev) => prev + 1)
    fetchMutualLikes()
  }

  useEffect(() => {
    // Only fetch if props are not provided
    if (
      propMutualLikes === undefined &&
      propIsLoading === undefined &&
      propError === undefined
    ) {
      fetchMutualLikes()
    }
  }, [userId, propMutualLikes, propIsLoading, propError, fetchMutualLikes])

  if (loading) {
    return (
      <Card
        className={`border-white/10 ${className}`}
        style={{
          backgroundColor: dashboardTokens.colors.background.cardDark,
          borderColor: dashboardTokens.colors.secondary[700]
        }}
        data-testid="mutual-likes-loading"
      >
        <CardHeader>
          <CardTitle className="text-primary-foreground flex items-center gap-2 text-xl">
            <div className="relative">
              <Heart className="h-5 w-5 fill-current text-pink-400/50" />
              <Users className="absolute -top-1 -right-1 h-4 w-4 text-purple-400/50" />
            </div>
            <span>Both Liked</span>
            <MotionDiv
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            >
              <div className="h-4 w-4 rounded-full border-2 border-pink-400/30 border-t-pink-400" />
            </MotionDiv>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map((i) => (
            <MotionDiv
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="flex items-center gap-3 rounded-lg bg-white/5 p-3"
            >
              <Skeleton className="h-16 w-16 rounded-md bg-white/10" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-full bg-white/10" />
                <Skeleton className="h-5 w-20 bg-green-400/20" />
                <div className="flex gap-4">
                  <Skeleton className="h-3 w-12 bg-white/10" />
                  <Skeleton className="h-3 w-12 bg-white/10" />
                </div>
                <Skeleton className="h-3 w-24 bg-white/10" />
              </div>
            </MotionDiv>
          ))}
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card
        className={`border-couples-accent/20 ${className}`}
        style={{
          backgroundColor: dashboardTokens.colors.background.cardDark,
          borderColor: dashboardTokens.colors.secondary[700]
        }}
        data-testid="mutual-likes-error"
      >
        <CardHeader>
          <CardTitle className="text-primary-foreground flex items-center gap-2 text-xl">
            <div className="relative">
              <Heart className="h-5 w-5 fill-current text-couples-accent/50" />
              <Users className="absolute -top-1 -right-1 h-4 w-4 text-couples-accent/50" />
            </div>
            Both Liked
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="py-8 text-center">
            <MotionDiv
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200 }}
            >
              <Heart className="mx-auto mb-4 h-12 w-12 fill-current text-couples-accent/30" />
            </MotionDiv>

            <h3 className="text-primary-foreground mb-2 text-lg font-semibold">
              Couldn&apos;t load mutual likes
            </h3>

            <p className="mb-4 text-sm text-red-400/80">{error}</p>

            <Button
              onClick={handleRetry}
              size="sm"
              className="bg-gradient-to-r from-couples-accent to-couples-primary hover:opacity-80"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (mutualLikes.length === 0) {
    return (
      <Card
        className={`border-couples-primary/20 ${className}`}
        style={{
          backgroundColor: dashboardTokens.colors.background.cardDark,
          borderColor: dashboardTokens.colors.secondary[700]
        }}
        data-testid="mutual-likes-empty"
      >
        <CardHeader>
          <CardTitle className="text-primary-foreground flex items-center gap-2 text-xl">
            <div className="relative">
              <Heart className="h-5 w-5 fill-couples-primary text-couples-primary" />
              <Users className="absolute -top-1 -right-1 h-4 w-4 text-couples-secondary" />
            </div>
            Both Liked
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="py-8 text-center">
            <div className="mb-4 flex justify-center">
              <div className="relative">
                {/* Animated double hearts */}
                <MotionDiv
                  animate={{
                    scale: [1, 1.1, 1],
                    rotate: [0, 5, -5, 0],
                  }}
                  transition={{ duration: 4, repeat: Infinity }}
                >
                  <Heart className="h-12 w-12 fill-current text-couples-primary/30" />
                </MotionDiv>
                <MotionDiv
                  animate={{
                    scale: [1, 1.1, 1],
                    rotate: [0, -5, 5, 0],
                  }}
                  transition={{ duration: 4, repeat: Infinity, delay: 2 }}
                >
                  <Heart className="absolute top-0 left-4 h-12 w-12 fill-current text-couples-secondary/30" />
                </MotionDiv>

                {/* Sparkles effect */}
                <MotionDiv
                  className="absolute top-1 right-1"
                  animate={{
                    opacity: [0, 1, 0],
                    scale: [0, 1, 0],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                  }}
                >
                  <Sparkles className="h-3 w-3 text-yellow-400" />
                </MotionDiv>
              </div>
            </div>

            <MotionDiv
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <h3 className="text-primary-foreground mb-2 text-lg font-semibold">
                No mutual likes yet!
              </h3>

              <p className="mb-1 text-sm" style={{ color: dashboardTokens.colors.text.secondary }}>
                Properties you both like will appear here
              </p>

              <div className="flex items-center justify-center gap-2 text-xs" style={{ color: dashboardTokens.colors.text.muted }}>
                <Star className="h-3 w-3" />
                <span>Keep swiping to find your first match</span>
              </div>
            </MotionDiv>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card
      className={`${className}`}
      style={{
        backgroundColor: dashboardTokens.colors.background.cardDark,
        borderColor: dashboardTokens.colors.secondary[700]
      }}
      data-testid="mutual-likes-list"
    >
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-primary-foreground flex items-center gap-2 text-xl">
            <Heart className="h-5 w-5 fill-couples-primary text-couples-primary" />
            Both Liked ({mutualLikes.length})
            <Users className="h-5 w-5 text-couples-secondary" />
          </CardTitle>
          {mutualLikes.length > 3 && (
            <Button variant="ghost" size="sm" asChild>
              <Link href="/dashboard/mutual-likes">
                View all
                <ChevronRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <AnimatePresence mode="popLayout">
          {mutualLikes.slice(0, 3).map((like, index) => (
            <MotionDiv
              key={like.property_id}
              initial={{ opacity: 0, x: -20, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 20, scale: 0.95 }}
              transition={{
                delay: index * 0.1,
                type: 'spring',
                stiffness: 100,
              }}
              whileHover={{
                scale: 1.02,
                transition: { duration: 0.2 },
              }}
            >
              <Link href={`/properties/${like.property_id}`}>
                <div className="group relative rounded-lg border border-white/10 bg-white/5 p-3 transition-all hover:border-couples-primary/30 hover:bg-white/10">
                  <div className="flex items-start gap-3">
                    <div className="relative h-16 w-16 overflow-hidden rounded-md">
                      <PropertyImage
                        src={like.property?.image_urls}
                        alt={like.property?.address || 'Property'}
                        fill
                        className="object-cover"
                        sizes="64px"
                      />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex items-start justify-between gap-2">
                        <p className="text-primary-foreground truncate text-sm font-medium">
                          {like.property?.address ||
                            `Property ${like.property_id.slice(0, 8)}`}
                        </p>
                        <MutualLikesBadge
                          likedByCount={like.liked_by_count}
                          variant="compact"
                          showAnimation={false}
                        />
                      </div>

                      {like.property && (
                        <div className="flex items-center gap-3 text-xs" style={{ color: dashboardTokens.colors.text.secondary }}>
                          <span className="font-semibold" style={{ color: dashboardTokens.colors.success[500] }}>
                            ${(like.property.price / 1000).toFixed(0)}k
                          </span>
                          <span>{like.property.bedrooms} bed</span>
                          <span>{like.property.bathrooms} bath</span>
                        </div>
                      )}

                      <p className="mt-1 text-xs" style={{ color: dashboardTokens.colors.text.muted }}>
                        Liked{' '}
                        {new Date(like.last_liked_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <ChevronRight className="absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 opacity-0 transition-opacity group-hover:opacity-100" style={{ color: dashboardTokens.colors.text.muted }} />
                </div>
              </Link>
            </MotionDiv>
          ))}
        </AnimatePresence>
      </CardContent>
    </Card>
  )
}
