import { useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { CouplesRealtime } from '@/lib/realtime/couples-realtime'
// import { useToast } from '@/hooks/use-toast'

interface MutualLikeData {
  propertyId: string
  partnerUserId: string
  partnerName: string
  propertyAddress: string
}

interface PartnerActivityData {
  userId: string
  userName: string
  propertyId: string
  interactionType: string
  timestamp: string
}

type LastActivityData =
  | MutualLikeData
  | PartnerActivityData
  | Record<string, never>

interface CouplesRealtimeState {
  isConnected: boolean
  lastActivity: {
    type: 'mutual_like' | 'partner_activity' | 'stats_update'
    data: LastActivityData
    timestamp: string
  } | null
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error'
}

interface UseCouplesRealtimeOptions {
  enableNotifications?: boolean
  enableMutualLikeAnimations?: boolean
  onMutualLike?: (data: MutualLikeData) => void
  onPartnerActivity?: (data: PartnerActivityData) => void
}

const COUPLES_QUERY_KEYS = {
  mutualLikes: ['couples', 'mutual-likes'],
  activity: ['couples', 'activity'],
  stats: ['couples', 'stats'],
}

/**
 * Hook to manage real-time couples features
 */
export function useCouplesRealtime(options: UseCouplesRealtimeOptions = {}) {
  const {
    enableNotifications = true,
    enableMutualLikeAnimations: _enableMutualLikeAnimations = false,
    onMutualLike,
    onPartnerActivity,
  } = options

  const [state, setState] = useState<CouplesRealtimeState>({
    isConnected: false,
    lastActivity: null,
    connectionStatus: 'disconnected',
  })

  const queryClient = useQueryClient()
  // const { toast } = useToast()
  const realtimeRef = useRef<CouplesRealtime | null>(null)
  const householdIdRef = useRef<string | null>(null)

  // Initialize real-time connection
  useEffect(() => {
    let mounted = true

    const initRealtime = async () => {
      try {
        setState((prev) => ({ ...prev, connectionStatus: 'connecting' }))

        const supabase = createClient()
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
          setState((prev) => ({ ...prev, connectionStatus: 'error' }))
          return
        }

        // Get user's household ID
        const { data: userProfile } = await supabase
          .from('user_profiles')
          .select('household_id')
          .eq('id', user.id)
          .single()

        if (!userProfile?.household_id) {
          setState((prev) => ({ ...prev, connectionStatus: 'error' }))
          return
        }

        if (!mounted) return

        householdIdRef.current = userProfile.household_id
        realtimeRef.current = new CouplesRealtime()

        // Subscribe to real-time updates
        await realtimeRef.current.subscribe(userProfile.household_id, {
          onMutualLike: (data) => {
            if (!mounted) return

            setState((prev) => ({
              ...prev,
              lastActivity: {
                type: 'mutual_like',
                data,
                timestamp: new Date().toISOString(),
              },
            }))

            // Show notification
            if (enableNotifications) {
              console.log(
                '🎉 Mutual Like!',
                `${data.partnerName} also liked ${data.propertyAddress}`
              )
              // toast({
              //   title: "🎉 Mutual Like!",
              //   description: `${data.partnerName} also liked ${data.propertyAddress}`,
              //   duration: 5000,
              // })
            }

            // Invalidate queries to refresh data
            queryClient.invalidateQueries({
              queryKey: COUPLES_QUERY_KEYS.mutualLikes,
            })
            queryClient.invalidateQueries({
              queryKey: COUPLES_QUERY_KEYS.stats,
            })

            // Call custom callback
            onMutualLike?.(data)
          },

          onPartnerActivity: (data) => {
            if (!mounted) return

            setState((prev) => ({
              ...prev,
              lastActivity: {
                type: 'partner_activity',
                data,
                timestamp: new Date().toISOString(),
              },
            }))

            // Show subtle notification for partner activity
            if (enableNotifications && data.interactionType === 'like') {
              console.log(
                'Partner Activity',
                `${data.userName} liked a property`
              )
              // toast({
              //   title: "Partner Activity",
              //   description: `${data.userName} liked a property`,
              //   duration: 3000,
              //   variant: "default",
              // })
            }

            // Invalidate activity queries
            queryClient.invalidateQueries({
              queryKey: COUPLES_QUERY_KEYS.activity,
            })

            // Call custom callback
            onPartnerActivity?.(data)
          },

          onHouseholdStatsUpdate: () => {
            if (!mounted) return

            setState((prev) => ({
              ...prev,
              lastActivity: {
                type: 'stats_update',
                data: {},
                timestamp: new Date().toISOString(),
              },
            }))

            // Invalidate stats
            queryClient.invalidateQueries({
              queryKey: COUPLES_QUERY_KEYS.stats,
            })
          },
        })

        if (mounted) {
          setState((prev) => ({
            ...prev,
            isConnected: true,
            connectionStatus: 'connected',
          }))
        }
      } catch (_error) {
        console.error(
          '[useCouplesRealtime] Error initializing real-time:',
          _error
        )
        if (mounted) {
          setState((prev) => ({ ...prev, connectionStatus: 'error' }))
        }
      }
    }

    initRealtime()

    return () => {
      mounted = false
      if (realtimeRef.current) {
        realtimeRef.current.unsubscribe()
      }
    }
  }, [queryClient, enableNotifications, onMutualLike, onPartnerActivity])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (realtimeRef.current) {
        realtimeRef.current.unsubscribe()
      }
    }
  }, [])

  // Methods to interact with real-time system
  const sendMessage = async (type: string, data: Record<string, unknown>) => {
    if (realtimeRef.current) {
      await realtimeRef.current.sendMessage(type, data)
    }
  }

  const reconnect = async () => {
    if (realtimeRef.current && householdIdRef.current) {
      setState((prev) => ({ ...prev, connectionStatus: 'connecting' }))
      try {
        await realtimeRef.current.unsubscribe()
        await realtimeRef.current.subscribe(householdIdRef.current, {
          onMutualLike: () => {}, // Will be set up in useEffect
          onPartnerActivity: () => {},
          onHouseholdStatsUpdate: () => {},
        })
        setState((prev) => ({
          ...prev,
          connectionStatus: 'connected',
          isConnected: true,
        }))
      } catch (_error) {
        setState((prev) => ({ ...prev, connectionStatus: 'error' }))
      }
    }
  }

  return {
    ...state,
    sendMessage,
    reconnect,
    householdId: householdIdRef.current,
  }
}

/**
 * Simple hook to just show mutual like notifications
 */
export function useMutualLikeNotifications() {
  return useCouplesRealtime({
    enableNotifications: true,
    enableMutualLikeAnimations: true,
  })
}

/**
 * Hook for partners who want to see each other's activity
 */
export function usePartnerActivityFeed() {
  const [recentActivities, setRecentActivities] = useState<
    PartnerActivityData[]
  >([])

  const realtime = useCouplesRealtime({
    enableNotifications: false, // Don't toast for activity feed
    onPartnerActivity: (data) => {
      setRecentActivities((prev) => [data, ...prev.slice(0, 9)]) // Keep last 10
    },
  })

  return {
    ...realtime,
    recentActivities,
    clearActivities: () => setRecentActivities([]),
  }
}
