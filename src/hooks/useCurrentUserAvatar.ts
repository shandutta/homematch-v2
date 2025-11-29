'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { AvatarData } from '@/lib/constants/avatars'

interface UserAvatarState {
  displayName: string | null
  email: string | null
  avatar: AvatarData | null
  isLoading: boolean
}

/**
 * Hook to get the current user's avatar data for display in Header and other components.
 * Fetches user profile data including avatar from preferences.
 */
export function useCurrentUserAvatar(): UserAvatarState {
  const [state, setState] = useState<UserAvatarState>({
    displayName: null,
    email: null,
    avatar: null,
    isLoading: true,
  })

  useEffect(() => {
    const supabase = createClient()

    async function fetchUserAvatar() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
          setState({
            displayName: null,
            email: null,
            avatar: null,
            isLoading: false,
          })
          return
        }

        // Fetch user profile with avatar
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('preferences')
          .eq('id', user.id)
          .single()

        const preferences = (profile?.preferences || {}) as {
          display_name?: string
          avatar?: AvatarData
        }

        setState({
          displayName:
            preferences.display_name ||
            user.user_metadata?.full_name ||
            user.email?.split('@')[0] ||
            null,
          email: user.email || null,
          avatar: preferences.avatar || null,
          isLoading: false,
        })
      } catch (error) {
        console.error('Failed to fetch user avatar:', error)
        setState((prev) => ({ ...prev, isLoading: false }))
      }
    }

    fetchUserAvatar()

    // Subscribe to auth changes to refresh avatar data
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      fetchUserAvatar()
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  return state
}
