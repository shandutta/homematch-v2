'use client'

import { useCallback, useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Heart, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CouplesMutualLikesSection } from './CouplesMutualLikesSection'
import { CouplesActivityFeed } from './CouplesActivityFeed'
import { CouplesStats } from './CouplesStats'
import { CouplesHero } from './CouplesHero'
import { CouplesPageSkeleton } from './CouplesLoadingStates'
import {
  NoHouseholdState,
  WaitingForPartnerState,
  NetworkErrorState,
} from './CouplesEmptyStates'
import { DisputedPropertiesAlert } from './DisputedPropertiesAlert'
import { InvitePartnerModal } from './InvitePartnerModal'
import { createClient } from '@/lib/supabase/client'
import { toast } from '@/lib/utils/toast'
import type {
  MutualLike,
  HouseholdActivity,
  CouplesStats as CouplesStatsType,
} from '@/lib/services/couples'

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

export function CouplesPageClient() {
  const [mutualLikes, setMutualLikes] = useState<EnhancedMutualLike[]>([])
  const [activity, setActivity] = useState<HouseholdActivity[]>([])
  const [stats, setStats] = useState<CouplesStatsType | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)
  const [userHouseholdStatus, setUserHouseholdStatus] = useState<
    'loading' | 'no-household' | 'waiting-partner' | 'active' | 'error'
  >('loading')
  const [householdId, setHouseholdId] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [inviteModalOpen, setInviteModalOpen] = useState(false)

  const fetchCouplesData = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const supabase = createClient()
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session?.access_token) {
        toast.authRequired()
        setUserHouseholdStatus('error')
        setError('Authentication required')
        return
      }

      setUserId(session.user.id)

      const { data: userProfile, error: profileError } = await supabase
        .from('user_profiles')
        .select('household_id')
        .eq('id', session.user.id)
        .maybeSingle()

      if (profileError) {
        console.error('[Couples] Profile fetch error:', profileError)
        setUserHouseholdStatus('error')
        setError(
          profileError.message || 'Unknown error while loading your profile'
        )
        return
      }

      if (!userProfile?.household_id) {
        setUserHouseholdStatus('no-household')
        setHouseholdId(null)
        return
      }

      setHouseholdId(userProfile.household_id)

      const { data: household, error: householdError } = await supabase
        .from('households')
        .select('id, user_count')
        .eq('id', userProfile.household_id)
        .single()

      if (householdError) {
        console.error('[Couples] Household fetch error:', householdError)
      }

      let householdUserCount = household?.user_count ?? 1

      // `households.user_count` can drift (e.g. seed/test data or older joins).
      // If it looks like the user is alone, double-check membership via profiles.
      if (householdUserCount < 2) {
        const { count: memberCount, error: memberCountError } = await supabase
          .from('user_profiles')
          .select('id', { count: 'exact', head: true })
          .eq('household_id', userProfile.household_id)

        if (!memberCountError && typeof memberCount === 'number') {
          householdUserCount = Math.max(householdUserCount, memberCount)
        }
      }

      if (householdUserCount < 2) {
        setUserHouseholdStatus('waiting-partner')
        return
      }

      setUserHouseholdStatus('active')

      const authHeaders = {
        Authorization: `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      }

      const [mutualLikesRes, activityRes, statsRes] = await Promise.all([
        fetch('/api/couples/mutual-likes?includeProperties=true', {
          headers: authHeaders,
        }),
        fetch('/api/couples/activity?limit=10', {
          headers: authHeaders,
        }),
        fetch('/api/couples/stats', {
          headers: authHeaders,
        }),
      ])

      if (
        mutualLikesRes.status === 401 ||
        activityRes.status === 401 ||
        statsRes.status === 401
      ) {
        toast.authRequired()
        setError('Please sign in again')
        setUserHouseholdStatus('error')
        return
      }

      if (!mutualLikesRes.ok || !activityRes.ok || !statsRes.ok) {
        if (
          mutualLikesRes.status >= 500 ||
          activityRes.status >= 500 ||
          statsRes.status >= 500
        ) {
          throw new Error('Server error - please try again later')
        }
        throw new Error('Failed to fetch couples data')
      }

      const [mutualLikesData, activityData, statsData] = await Promise.all([
        mutualLikesRes.json(),
        activityRes.json(),
        statsRes.json(),
      ])

      setMutualLikes(mutualLikesData.mutualLikes || [])
      setActivity(activityData.activity || [])
      setStats(statsData.stats || null)

      if (retryCount > 0) {
        toast.success('Data loaded successfully!')
      }
    } catch (err) {
      console.error('Error fetching couples data:', err)

      const errorMessage =
        err instanceof Error ? err.message : 'Failed to load couples data'
      setError(errorMessage)
      setUserHouseholdStatus('error')

      const lowered = errorMessage.toLowerCase()
      if (
        lowered.includes('fetch') ||
        lowered.includes('network') ||
        lowered.includes('failed to fetch')
      ) {
        toast.networkError()
      } else {
        toast.error(errorMessage)
      }
    } finally {
      setLoading(false)
    }
  }, [retryCount])

  useEffect(() => {
    fetchCouplesData()
  }, [fetchCouplesData])

  const handleRetry = () => {
    setRetryCount((count) => count + 1)
  }

  const showSkeleton = loading && userHouseholdStatus === 'loading'

  if (showSkeleton) {
    return <CouplesPageSkeleton />
  }

  if (userHouseholdStatus === 'no-household') {
    // Don't show CouplesHero loading skeleton - just show the create household CTA
    return <NoHouseholdState />
  }

  if (userHouseholdStatus === 'waiting-partner') {
    return (
      <>
        <CouplesHero stats={stats} loading={loading} />
        <WaitingForPartnerState
          householdId={householdId || undefined}
          onInvite={() => setInviteModalOpen(true)}
        />
        {householdId && userId && (
          <InvitePartnerModal
            open={inviteModalOpen}
            onOpenChange={setInviteModalOpen}
            householdId={householdId}
            userId={userId}
          />
        )}
      </>
    )
  }

  if (userHouseholdStatus === 'error' || error) {
    return <NetworkErrorState onRetry={handleRetry} />
  }

  return (
    <>
      {householdId && userId && (
        <InvitePartnerModal
          open={inviteModalOpen}
          onOpenChange={setInviteModalOpen}
          householdId={householdId}
          userId={userId}
        />
      )}

      <div className="space-y-8">
        <CouplesHero stats={stats} loading={loading} />
        <DisputedPropertiesAlert className="overflow-hidden" />

        <div className="grid gap-8 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <CouplesMutualLikesSection
              mutualLikes={mutualLikes}
              loading={loading}
              error={error}
              householdStats={stats || undefined}
            />
            <CouplesActivityFeed activity={activity} />
          </div>

          <div className="space-y-6">
            <CouplesStats stats={stats} />

            <Card className="card-glassmorphism-style border-white/10">
              <CardContent className="flex items-center justify-between gap-4 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-pink-500/10">
                    <Heart className="h-5 w-5 text-pink-400" />
                  </div>
                  <div>
                    <p className="text-primary-foreground text-sm font-semibold">
                      Stay in sync
                    </p>
                    <p className="text-primary/60 text-xs">
                      Refresh to pull the latest data from your household.
                    </p>
                  </div>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRetry}
                  disabled={loading}
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Refresh
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  )
}
