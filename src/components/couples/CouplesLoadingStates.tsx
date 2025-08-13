'use client'

import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Heart, Users } from 'lucide-react'
import { MotionDiv, FadeInContainer, slideInRight, scaleIn, normalTransition } from '@/components/ui/motion-components'

// Enhanced skeleton with romantic theme
export function CouplesHeroSkeleton() {
  return (
    <Card className="relative overflow-hidden border-pink-500/20">
      <div className="absolute inset-0 bg-gradient-to-br from-pink-500/20 via-purple-500/20 to-rose-500/20" />

      {/* Floating hearts animation during loading */}
      <div className="absolute inset-0 overflow-hidden">
        {[...Array(3)].map((_, i) => (
          <MotionDiv
            key={i}
            className="absolute text-pink-400/10"
            initial={{ x: '20%', y: '100%', scale: 0 }}
            animate={{ y: '-100%', scale: [0, 1, 0] }}
            transition={{
              duration: 6,
              repeat: Infinity,
              delay: i * 2,
              ease: 'linear',
            }}
          >
            <Heart className="h-4 w-4 fill-current" />
          </MotionDiv>
        ))}
      </div>

      <CardContent className="relative p-8 text-center">
        <div className="mb-4 flex items-center justify-center gap-2">
          <Heart className="h-8 w-8 text-pink-400/30" />
          <Skeleton className="h-8 w-48 bg-white/10" />
          <Heart className="h-8 w-8 text-rose-400/30" />
        </div>

        <Skeleton className="mx-auto mb-6 h-6 w-96 bg-white/10" />
        <Skeleton className="mx-auto mb-8 h-5 w-80 bg-white/10" />

        <div className="flex items-center justify-center gap-8">
          {[1, 2, 3].map((i) => (
            <div key={i} className="text-center">
              <Skeleton className="mx-auto mb-2 h-8 w-12 bg-white/10" />
              <Skeleton className="mx-auto h-4 w-16 bg-white/10" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

export function CouplesMutualLikesSkeleton() {
  return (
    <Card className="card-glassmorphism-style border-pink-500/20">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Heart className="h-6 w-6 fill-current text-pink-400/30" />
          <Users className="absolute -top-1 -right-1 h-4 w-4 text-purple-400/30" />
          <Skeleton className="h-6 w-32 bg-white/10" />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <MotionDiv
              key={i}
              variants={slideInRight}
              initial="initial"
              animate="animate"
              transition={{ ...normalTransition, delay: i * 0.1 }}
              className="rounded-lg border border-pink-500/10 bg-gradient-to-br from-pink-500/5 via-purple-500/5 to-rose-500/5 p-4"
            >
              <div className="flex gap-4">
                <Skeleton className="h-20 w-20 flex-shrink-0 rounded-lg bg-white/10" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-full bg-white/10" />
                  <Skeleton className="h-5 w-20 bg-green-400/20" />
                  <div className="flex gap-4">
                    <Skeleton className="h-3 w-12 bg-white/10" />
                    <Skeleton className="h-3 w-12 bg-white/10" />
                    <Skeleton className="h-3 w-16 bg-white/10" />
                  </div>
                  <Skeleton className="h-3 w-24 bg-white/10" />
                </div>
              </div>
            </MotionDiv>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

export function CouplesActivitySkeleton() {
  return (
    <Card className="card-glassmorphism-style">
      <CardHeader>
        <Skeleton className="h-6 w-32 bg-white/10" />
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <MotionDiv
              key={i}
              variants={slideInRight}
              initial="initial"
              animate="animate"
              transition={{ ...normalTransition, delay: i * 0.1 }}
              className="flex items-center gap-3 rounded-lg bg-white/5 p-3"
            >
              <Skeleton className="h-10 w-10 rounded-full bg-white/10" />
              <div className="flex-1 space-y-1">
                <Skeleton className="h-3 w-full bg-white/10" />
                <Skeleton className="h-3 w-2/3 bg-white/10" />
              </div>
              <Skeleton className="h-3 w-16 bg-white/10" />
            </MotionDiv>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

export function CouplesStatsSkeleton() {
  return (
    <Card className="card-glassmorphism-style">
      <CardHeader>
        <Skeleton className="h-6 w-16 bg-white/10" />
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {[1, 2, 3, 4].map((i) => (
            <MotionDiv
              key={i}
              variants={scaleIn}
              initial="initial"
              animate="animate"
              transition={{ ...normalTransition, delay: i * 0.1 }}
              className="rounded-lg bg-gradient-to-br from-pink-500/5 to-purple-500/5 p-4 text-center"
            >
              <Skeleton className="mx-auto mb-2 h-8 w-8 rounded bg-white/10" />
              <Skeleton className="mx-auto mb-1 h-6 w-8 bg-white/10" />
              <Skeleton className="mx-auto h-3 w-16 bg-white/10" />
            </MotionDiv>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

// Comprehensive loading state for entire couples page
export function CouplesPageSkeleton() {
  return (
    <div className="space-y-8">
      <CouplesHeroSkeleton />

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <CouplesMutualLikesSkeleton />
          <CouplesActivitySkeleton />
        </div>

        <div>
          <CouplesStatsSkeleton />
        </div>
      </div>
    </div>
  )
}
