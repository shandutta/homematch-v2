'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Heart,
  Users,
  ChevronRight,
  Bed,
  Bath,
  Square,
  Calendar,
  Sparkles,
  Star,
  ArrowRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { PropertyImage } from '@/components/ui/property-image'
import { AnimatePresence } from 'framer-motion'
import { MotionDiv } from '@/components/ui/motion-components'
import { formatPrice } from '@/lib/utils/formatting'
import type { MutualLike } from '@/lib/services/couples'

// Enhanced mutual like type with optional property details
interface EnhancedMutualLike extends MutualLike {
  property?: {
    address: string
    price: number
    bedrooms: number
    bathrooms: number
    square_feet?: number
    images?: string[]
  }
}

interface CouplesMutualLikesSectionProps {
  mutualLikes: EnhancedMutualLike[]
  loading?: boolean
  error?: string | null
  householdStats?: { total_household_likes?: number }
}

export function CouplesMutualLikesSection({
  mutualLikes,
  loading = false,
  error = null,
  householdStats,
}: CouplesMutualLikesSectionProps) {
  // Loading state
  if (loading) {
    return (
      <Card className="card-glassmorphism-style border-pink-500/20">
        <CardHeader>
          <CardTitle className="text-hm-stone-100 flex items-center gap-2 text-xl">
            <div className="relative">
              <Heart className="h-6 w-6 fill-current text-pink-400/30" />
              <Users className="absolute -top-1 -right-1 h-4 w-4 text-purple-400/30" />
            </div>
            <div className="flex items-center gap-2">
              Mutual Likes
              <MotionDiv
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
              >
                <div className="h-4 w-4 rounded-full border-2 border-pink-400/30 border-t-pink-400" />
              </MotionDiv>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
            {[1, 2, 3].map((i) => (
              <MotionDiv
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="rounded-lg border border-pink-500/10 bg-gradient-to-br from-pink-500/5 via-purple-500/5 to-rose-500/5 p-4"
              >
                <div className="flex gap-4">
                  <div className="h-20 w-20 animate-pulse rounded-lg bg-white/10" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 animate-pulse rounded bg-white/10" />
                    <div className="h-5 w-20 animate-pulse rounded bg-green-400/20" />
                    <div className="flex gap-4">
                      <div className="h-3 w-12 animate-pulse rounded bg-white/10" />
                      <div className="h-3 w-12 animate-pulse rounded bg-white/10" />
                      <div className="h-3 w-16 animate-pulse rounded bg-white/10" />
                    </div>
                    <div className="h-3 w-24 animate-pulse rounded bg-white/10" />
                  </div>
                </div>
              </MotionDiv>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  // Error state
  if (error) {
    return (
      <Card className="card-glassmorphism-style border-red-500/20">
        <CardHeader>
          <CardTitle className="text-hm-stone-100 flex items-center gap-2 text-xl">
            <div className="relative">
              <Heart className="h-6 w-6 fill-current text-red-400/50" />
              <Users className="absolute -top-1 -right-1 h-4 w-4 text-red-400/50" />
            </div>
            Mutual Likes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="py-8 text-center">
            <div className="mb-4 flex justify-center">
              <Heart className="h-12 w-12 fill-current text-red-400/30" />
            </div>
            <h3 className="text-hm-stone-100 mb-2 text-lg font-semibold">
              Couldn&apos;t load mutual likes
            </h3>
            <p className="text-sm text-red-400/80">{error}</p>
          </div>
        </CardContent>
      </Card>
    )
  }
  // Enhanced empty state
  if (mutualLikes.length === 0) {
    const hasIndividualLikes = (householdStats?.total_household_likes || 0) > 0

    return (
      <Card className="card-glassmorphism-style border-pink-500/20">
        <CardHeader>
          <CardTitle className="text-hm-stone-100 flex items-center gap-2 text-xl">
            <div className="relative">
              <Heart className="h-6 w-6 fill-pink-400 text-pink-400" />
              <Users className="absolute -top-1 -right-1 h-4 w-4 text-purple-400" />
            </div>
            Mutual Likes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="py-12 text-center">
            <div className="mb-6 flex justify-center">
              <div className="relative">
                {/* Animated double hearts */}
                <MotionDiv
                  animate={{
                    scale: [1, 1.1, 1],
                    rotate: [0, 5, -5, 0],
                  }}
                  transition={{ duration: 4, repeat: Infinity }}
                >
                  <Heart className="h-16 w-16 fill-current text-pink-400/30" />
                </MotionDiv>
                <MotionDiv
                  animate={{
                    scale: [1, 1.1, 1],
                    rotate: [0, -5, 5, 0],
                  }}
                  transition={{ duration: 4, repeat: Infinity, delay: 2 }}
                >
                  <Heart className="absolute top-0 left-8 h-16 w-16 fill-current text-purple-400/30" />
                </MotionDiv>

                {/* Sparkles effect */}
                {[...Array(3)].map((_, i) => (
                  <MotionDiv
                    key={i}
                    className="absolute"
                    style={{
                      top: `${10 + i * 20}%`,
                      left: `${20 + i * 25}%`,
                    }}
                    animate={{
                      opacity: [0, 1, 0],
                      scale: [0, 1, 0],
                      rotate: [0, 180, 360],
                    }}
                    transition={{
                      duration: 3,
                      repeat: Infinity,
                      delay: i * 0.8,
                    }}
                  >
                    <Sparkles className="h-3 w-3 text-yellow-400" />
                  </MotionDiv>
                ))}
              </div>
            </div>

            <MotionDiv
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <h3 className="text-hm-stone-100 mb-3 text-2xl font-bold">
                {hasIndividualLikes
                  ? 'Find Your First Match!'
                  : 'No mutual likes yet!'}
              </h3>

              <p className="text-hm-stone-300 mx-auto mb-2 max-w-md">
                {hasIndividualLikes
                  ? 'You&apos;re both swiping! Keep going to discover properties you both love.'
                  : 'Start swiping together to discover homes you both love'}
              </p>

              {hasIndividualLikes && (
                <div className="text-hm-stone-400 mb-4 flex items-center justify-center gap-2 text-sm">
                  <Star className="h-4 w-4 text-yellow-400" />
                  <span>
                    You&apos;ve liked {householdStats?.total_household_likes}{' '}
                    properties together
                  </span>
                </div>
              )}

              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <Button
                  asChild
                  className="bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600"
                  size="lg"
                >
                  <Link href="/dashboard">
                    <Heart className="mr-2 h-4 w-4 fill-current" />
                    {hasIndividualLikes
                      ? 'Keep Swiping'
                      : 'Start Swiping Together'}
                  </Link>
                </Button>

                {hasIndividualLikes && (
                  <Button
                    variant="outline"
                    asChild
                    className="border-pink-500/30 text-pink-400 hover:bg-pink-500/10"
                  >
                    <Link href="/couples">
                      <ArrowRight className="mr-2 h-4 w-4" />
                      View Activity
                    </Link>
                  </Button>
                )}
              </div>
            </MotionDiv>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="card-glassmorphism-style border-pink-500/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-hm-stone-100 flex items-center gap-2 text-xl">
            <div className="relative">
              <Heart className="h-6 w-6 fill-pink-400 text-pink-400" />
              <Users className="absolute -top-1 -right-1 h-4 w-4 text-purple-400" />
            </div>
            Mutual Likes ({mutualLikes.length})
          </CardTitle>
          {mutualLikes.length > 6 && (
            <Button variant="ghost" size="sm" asChild>
              <Link
                href="/dashboard/mutual-likes"
                className="text-pink-400 hover:text-pink-300"
              >
                View all
                <ChevronRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <AnimatePresence mode="popLayout">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
            {mutualLikes.slice(0, 6).map((like, index) => (
              <MotionDiv
                key={like.property_id}
                layout
                initial={{ opacity: 0, y: 20, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.9 }}
                transition={{
                  delay: index * 0.1,
                  duration: 0.5,
                  type: 'spring',
                  stiffness: 100,
                }}
                whileHover={{
                  scale: 1.02,
                  transition: { duration: 0.2 },
                }}
              >
                <Link
                  href={`/properties/${like.property_id}?returnTo=/couples`}
                >
                  <div className="group relative rounded-lg border border-pink-500/20 bg-gradient-to-br from-pink-500/5 via-purple-500/5 to-rose-500/5 p-4 transition-all hover:border-pink-400/40 hover:bg-gradient-to-br hover:from-pink-500/10 hover:via-purple-500/10 hover:to-rose-500/10 hover:shadow-lg hover:shadow-pink-500/10">
                    <div className="flex gap-4">
                      <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg">
                        <PropertyImage
                          src={like.property?.images}
                          alt={like.property?.address || 'Property'}
                          fill
                          className="object-cover transition-transform group-hover:scale-105"
                          sizes="80px"
                        />

                        {/* Mutual like badge */}
                        <div className="absolute -top-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white/20 bg-gradient-to-r from-pink-500 to-purple-500 text-xs font-semibold text-white">
                          {like.liked_by_count}
                        </div>
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="mb-2 flex items-start justify-between gap-2">
                          <h3 className="text-hm-stone-100 truncate font-semibold">
                            {like.property?.address ||
                              `Property ${like.property_id.slice(0, 8)}`}
                          </h3>
                        </div>

                        {like.property && (
                          <>
                            <div className="mb-2 flex items-center gap-2">
                              <span className="text-lg font-bold text-green-400">
                                {formatPrice(like.property.price)}
                              </span>
                            </div>

                            <div className="text-hm-stone-300 mb-2 flex items-center gap-4 text-xs">
                              <div className="flex items-center gap-1">
                                <Bed className="h-3 w-3" />
                                <span>{like.property.bedrooms}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Bath className="h-3 w-3" />
                                <span>{like.property.bathrooms}</span>
                              </div>
                              {like.property.square_feet && (
                                <div className="flex items-center gap-1">
                                  <Square className="h-3 w-3" />
                                  <span>
                                    {like.property.square_feet.toLocaleString()}{' '}
                                    sqft
                                  </span>
                                </div>
                              )}
                            </div>
                          </>
                        )}

                        <div className="text-hm-stone-400 flex items-center gap-1 text-xs">
                          <Calendar className="h-3 w-3" />
                          <span>
                            Liked{' '}
                            {new Date(like.last_liked_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>

                    <ChevronRight className="text-hm-stone-400 absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 opacity-0 transition-opacity group-hover:opacity-100" />

                    {/* Romantic hover effect */}
                    <div className="pointer-events-none absolute inset-0 rounded-lg bg-gradient-to-r from-pink-500/0 via-purple-500/0 to-rose-500/0 transition-all group-hover:from-pink-500/5 group-hover:via-purple-500/5 group-hover:to-rose-500/5" />
                  </div>
                </Link>
              </MotionDiv>
            ))}
          </div>
        </AnimatePresence>

        {mutualLikes.length > 6 && (
          <div className="pt-4 text-center">
            <Button
              variant="outline"
              asChild
              className="border-pink-500/30 text-pink-400 hover:bg-pink-500/10"
            >
              <Link href="/dashboard/mutual-likes">
                View All {mutualLikes.length} Mutual Likes
                <Heart className="ml-2 h-4 w-4 fill-current" />
              </Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
