'use client'

import { useEffect, useState } from 'react'
import { Session } from '@supabase/supabase-js'
import { useRouter as useNextRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'react-hot-toast'
import { SwipeContainer } from '@/components/property/SwipeContainer'
import { Eye, Heart, X } from 'lucide-react'
// import { useSettingsStore } from '@/lib/stores/settingsStore';
// import { useSwipeStore } from '@/lib/stores/swipeStore';
import { DashboardData } from '@/lib/data/loader'
import {
  CouplesMessages,
  getRandomEncouragement,
} from '@/lib/utils/couples-messaging'

interface SwipeStats {
  totalViewed: number
  totalLiked: number
  totalPassed: number
}

import { UserProfile } from '@/types/database'
import { Property, Neighborhood } from '@/lib/schemas/property'

interface DashboardPageImplProps {
  initialData: DashboardData
  returning: boolean
  userProfile: UserProfile | null
  initialSwipeStats: SwipeStats
  session: Session | null
  router?: ReturnType<typeof useNextRouter>
}

export function DashboardPageImpl({
  initialData,
  returning,
  userProfile,
  initialSwipeStats,
  session,
  router: injectedRouter,
}: DashboardPageImplProps) {
  const nextRouter = useNextRouter()
  const router = injectedRouter ?? nextRouter
  const [swipeStats, setSwipeStats] = useState<SwipeStats>(initialSwipeStats)
  const [hasShownWelcome, setHasShownWelcome] = useState(false)

  useEffect(() => {
    if (returning) {
      const newUrl = new URL(window.location.href)
      newUrl.searchParams.delete('returning')
      window.history.replaceState({}, '', newUrl.toString())
      setHasShownWelcome(true)
    } else if (userProfile && !hasShownWelcome) {
      const userCreatedAt = new Date(userProfile.created_at!)
      const now = new Date()
      const timeDifference = now.getTime() - userCreatedAt.getTime()
      const daysDifference = timeDifference / (1000 * 3600 * 24)
      const isNewUser = daysDifference < 0.003 // approximately 5 minutes

      if (isNewUser) {
        toast.success(CouplesMessages.welcome.new)
        setHasShownWelcome(true)
      }
    }
  }, [returning, userProfile, session, hasShownWelcome])

  const handleLikedClick = () => {
    if (swipeStats.totalLiked > 0) {
      router.push('/dashboard/liked')
    }
  }

  const handlePassedClick = () => {
    if (swipeStats.totalPassed > 0) {
      router.push('/dashboard/disliked')
    }
  }

  const handleViewedClick = () => {
    if (swipeStats.totalViewed > 0) {
      router.push('/dashboard/viewed')
    }
  }

  return (
    <div className="p-token-xl container mx-auto">
      <div className="mb-token-xl">
        <h1 className="mb-token-sm text-token-3xl font-bold">
          {CouplesMessages.dashboard.title}
        </h1>
        <p className="text-muted-foreground">
          {CouplesMessages.dashboard.subtitle}
        </p>
      </div>

      <div className="mb-token-xl gap-token-lg grid grid-cols-1 md:grid-cols-3">
        <Card
          className={`bg-card duration-token-normal ease-token-out hover:shadow-token-lg border-2 transition-all ${
            swipeStats.totalViewed > 0
              ? 'border-primary/20 hover:border-primary/40 cursor-pointer hover:scale-105'
              : 'border-border cursor-default'
          }`}
          onClick={handleViewedClick}
          role="region"
          aria-label="Properties Viewed"
        >
          <CardHeader className="pb-token-sm flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-muted-foreground text-token-sm font-medium">
              {CouplesMessages.stats.viewed.title}
            </CardTitle>
            <div className="bg-primary/10 flex h-8 w-8 items-center justify-center rounded-full">
              <Eye className="text-primary h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-foreground text-token-3xl font-bold">
              {swipeStats.totalViewed}
            </div>
            <p className="text-muted-foreground mt-token-xs text-token-xs">
              {CouplesMessages.stats.viewed.subtitle}
            </p>
          </CardContent>
        </Card>

        <Card
          className={`bg-card duration-token-normal ease-token-out hover:shadow-token-lg border-2 transition-all ${
            swipeStats.totalLiked > 0
              ? 'border-token-success-light hover:border-token-success cursor-pointer hover:scale-105'
              : 'border-border cursor-default'
          }`}
          onClick={handleLikedClick}
          role="region"
          aria-label="Properties Liked"
        >
          <CardHeader className="pb-token-sm flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-muted-foreground text-token-sm font-medium">
              {CouplesMessages.stats.liked.title}
            </CardTitle>
            <div className="bg-token-success-light/10 flex h-8 w-8 items-center justify-center rounded-full">
              <Heart className="text-token-success h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-token-3xl text-token-success font-bold">
              {swipeStats.totalLiked}
            </div>
            <p className="text-muted-foreground mt-token-xs text-token-xs">
              {CouplesMessages.stats.liked.subtitle}
            </p>
          </CardContent>
        </Card>

        <Card
          className={`bg-card duration-token-normal ease-token-out hover:shadow-token-lg border-2 transition-all ${
            swipeStats.totalPassed > 0
              ? 'border-token-error-light hover:border-token-error cursor-pointer hover:scale-105'
              : 'border-border cursor-default'
          }`}
          onClick={handlePassedClick}
          role="region"
          aria-label="Properties Passed"
        >
          <CardHeader className="pb-token-sm flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-muted-foreground text-token-sm font-medium">
              Properties Passed
            </CardTitle>
            <div className="bg-token-error-light/10 flex h-8 w-8 items-center justify-center rounded-full">
              <X className="text-token-error h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-token-3xl text-token-error font-bold">
              {swipeStats.totalPassed}
            </div>
            <p className="text-muted-foreground mt-token-xs text-token-xs">
              Not quite right - but your perfect home is out there
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="bg-card rounded-token-lg p-token-lg shadow-token-sm">
        <h2 className="mb-token-md text-token-xl font-semibold">
          {CouplesMessages.dashboard.discover}
        </h2>
        <p className="text-muted-foreground mb-token-md text-sm">
          {getRandomEncouragement('swiping')}
        </p>
        <SwipeContainer
          properties={initialData.properties as unknown as Property[]}
          neighborhoods={initialData.neighborhoods as unknown as Neighborhood[]}
          onEmpty={() => {
            setHasShownWelcome(false)
            toast.success(CouplesMessages.empty.noProperties.message)
          }}
          onSwipe={(direction: 'left' | 'right') => {
            setSwipeStats((prev: SwipeStats) => ({
              totalViewed: prev.totalViewed + 1,
              totalLiked: prev.totalLiked + (direction === 'right' ? 1 : 0),
              totalPassed: prev.totalPassed + (direction === 'left' ? 1 : 0),
            }))
          }}
        />
      </div>
    </div>
  )
}
