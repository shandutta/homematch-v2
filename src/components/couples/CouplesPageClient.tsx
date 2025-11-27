'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Heart, RefreshCw } from 'lucide-react'
import {
  MotionDiv,
  scaleIn,
  fadeInUp,
  slideInRight,
} from '@/components/ui/motion-components'
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

// Enhanced mutual like type with optional property details from API
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
  const [creatingHousehold, setCreatingHousehold] = useState(false)

  const fetchCouplesData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const supabase = createClient()
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session?.access_token) {
        toast.authRequired()
        setError('Authentication required')
        return
      }

      // Store user ID
      setUserId(session.user.id)

      // First check user's household status (simple query without join)
      const { data: userProfile, error: profileError } = await supabase
        .from('user_profiles')
        .select('household_id')
        .eq('id', session.user.id)
        .maybeSingle()

      if (profileError) {
        console.error('[Couples] Profile fetch error:', {
          message: profileError.message,
          code: profileError.code,
          details: profileError.details,
          hint: profileError.hint,
        })
        setUserHouseholdStatus('error')
        setError('Failed to load your profile')
        return
      }

      if (!userProfile) {
        setUserHouseholdStatus('no-household')
        setHouseholdId(null)
        return
      }

      console.log('[Couples] Profile fetch:', {
        householdId: userProfile.household_id,
        hasError: false,
        userId: session.user.id,
      })

      if (!userProfile.household_id) {
        setUserHouseholdStatus('no-household')
        setHouseholdId(null)
        return
      }

      // Store household ID
      setHouseholdId(userProfile.household_id)

      // Fetch household info separately to check user count
      const { data: household } = await supabase
        .from('households')
        .select('id, user_count')
        .eq('id', userProfile.household_id)
        .single()

      const householdUserCount = household?.user_count || 1
      if (householdUserCount < 2) {
        setUserHouseholdStatus('waiting-partner')
        return
      }

      setUserHouseholdStatus('active')

      const authHeaders = {
        Authorization: `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      }

      // Fetch all couples data in parallel
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

      // Handle different types of errors
      if (
        mutualLikesRes.status === 401 ||
        activityRes.status === 401 ||
        statsRes.status === 401
      ) {
        toast.authRequired()
        setError('Please sign in again')
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
      setStats(statsData.stats)

      // Success toast if this was a retry
      if (retryCount > 0) {
        toast.success('Data loaded successfully!')
      }
    } catch (err) {
      console.error('Error fetching couples data:', err)

      const errorMessage =
        err instanceof Error ? err.message : 'Failed to load couples data'
      setError(errorMessage)

      // Show appropriate toast
      if (
        errorMessage.includes('fetch') ||
        errorMessage.includes('network') ||
        !navigator.onLine
      ) {
        toast.networkError()
      } else {
        toast.error('Failed to load couples data', errorMessage)
      }
    } finally {
      setLoading(false)
    }
  }, [retryCount])

  const handleRetry = () => {
    setRetryCount((prev) => prev + 1)
    fetchCouplesData()
  }

  // Handle invite from no-household state - creates household first then opens modal
  const handleInviteFromNoHousehold = async () => {
    if (creatingHousehold) return

    setCreatingHousehold(true)
    try {
      const supabase = createClient()
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session?.user) {
        toast.authRequired()
        return
      }

      // Create a new household using RPC (handles both creation and profile update)
      console.log('[Household Create] Calling RPC for user:', session.user.id)
      const { data: newHouseholdId, error: createError } = await supabase.rpc(
        'create_household_for_user'
      )

      console.log('[Household Create] RPC result:', {
        newHouseholdId,
        createError,
        errorMessage: createError?.message,
        errorCode: createError?.code,
        errorKeys: createError ? Object.keys(createError) : null,
      })

      if (createError) {
        // Log the raw error for debugging
        console.error(
          '[Household Create] Raw error:',
          JSON.stringify(createError, null, 2)
        )
        throw new Error(
          createError.message || createError.code || 'Unknown RPC error'
        )
      }

      if (!newHouseholdId) {
        throw new Error('RPC returned no household ID')
      }

      // Set the state
      setHouseholdId(newHouseholdId)
      setUserId(session.user.id)
      setUserHouseholdStatus('waiting-partner')

      // Open the invite modal
      setInviteModalOpen(true)

      toast.success('Household created! Now invite your partner.')
    } catch (err) {
      // Supabase errors don't serialize well - extract useful info
      const errorDetails = {
        message: err instanceof Error ? err.message : String(err),
        code: (err as { code?: string })?.code,
        details: (err as { details?: string })?.details,
        hint: (err as { hint?: string })?.hint,
      }
      console.error('Error creating household:', errorDetails)
      toast.error(
        'Failed to create household',
        errorDetails.message || 'Please try again'
      )
    } finally {
      setCreatingHousehold(false)
    }
  }

  useEffect(() => {
    fetchCouplesData()
  }, [fetchCouplesData])

  // Loading state
  if (loading || userHouseholdStatus === 'loading') {
    return <CouplesPageSkeleton />
  }

  // No household state
  if (userHouseholdStatus === 'no-household') {
    return (
      <>
        <MotionDiv
          variants={fadeInUp}
          initial="initial"
          animate="animate"
          transition={{ duration: 0.5 }}
        >
          <NoHouseholdState onInvitePartner={handleInviteFromNoHousehold} />
        </MotionDiv>
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

  // Waiting for partner state
  if (userHouseholdStatus === 'waiting-partner') {
    return (
      <>
        <MotionDiv
          variants={fadeInUp}
          initial="initial"
          animate="animate"
          transition={{ duration: 0.5 }}
        >
          <WaitingForPartnerState
            householdId={householdId || undefined}
            onInvite={() => setInviteModalOpen(true)}
          />
        </MotionDiv>
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

  // Error state with retry option
  if (error) {
    // Network/connection error
    if (
      error.includes('fetch') ||
      error.includes('network') ||
      !navigator.onLine
    ) {
      return <NetworkErrorState onRetry={handleRetry} />
    }

    // Generic error state
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Card className="card-glassmorphism-style max-w-md border-red-500/20">
          <CardContent className="p-6 text-center">
            <MotionDiv
              variants={scaleIn}
              initial="initial"
              animate="animate"
              transition={{ type: 'spring', stiffness: 200 }}
            >
              <Heart className="mx-auto mb-4 h-12 w-12 text-red-400" />
            </MotionDiv>

            <h2 className="text-primary-foreground mb-2 text-xl font-semibold">
              Something went wrong
            </h2>

            <p className="text-primary/60 mb-4 text-sm">{error}</p>

            <div className="flex justify-center gap-2">
              <Button
                onClick={handleRetry}
                size="sm"
                className="bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <MotionDiv
      className="space-y-8"
      variants={fadeInUp}
      initial="initial"
      animate="animate"
      transition={{ duration: 0.5 }}
    >
      <CouplesHero stats={stats} />

      {/* Disputed Properties Alert */}
      <MotionDiv
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05, duration: 0.5 }}
      >
        <DisputedPropertiesAlert />
      </MotionDiv>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Main Content Area */}
        <div className="space-y-6 lg:col-span-2">
          {/* Mutual Likes Section */}
          <MotionDiv
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1, duration: 0.5 }}
          >
            <CouplesMutualLikesSection
              mutualLikes={mutualLikes}
              householdStats={
                stats
                  ? { total_household_likes: stats.total_household_likes }
                  : undefined
              }
            />
          </MotionDiv>

          {/* Activity Feed */}
          <MotionDiv
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            <CouplesActivityFeed activity={activity} />
          </MotionDiv>
        </div>

        {/* Sidebar with Stats */}
        <MotionDiv
          variants={slideInRight}
          initial="initial"
          animate="animate"
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          <CouplesStats stats={stats} />
        </MotionDiv>
      </div>
    </MotionDiv>
  )
}
