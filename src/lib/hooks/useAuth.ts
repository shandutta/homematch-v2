'use client'

import { useState, useEffect } from 'react'
import { createClient } from '../supabase/client'
import { initializeAuthState, getCurrentUser, ensureAuthSession } from '../auth/session'
import type { User } from '@supabase/supabase-js'

export interface UseAuthResult {
  user: User | null
  loading: boolean
  signOut: () => Promise<void>
  refreshUser: () => Promise<void>
  isAuthenticated: boolean
}

/**
 * Enhanced auth hook with session persistence and cross-browser support
 */
export function useAuth(): UseAuthResult {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()

    // Initialize auth state management
    initializeAuthState()

    // Get initial session
    const getInitialSession = async () => {
      try {
        setLoading(true)
        
        // Ensure session is valid
        const hasValidSession = await ensureAuthSession()
        
        if (hasValidSession) {
          const currentUser = await getCurrentUser()
          setUser(currentUser)
        } else {
          setUser(null)
        }
      } catch (error) {
        console.error('[useAuth] Initial session error:', error)
        setUser(null)
      } finally {
        setLoading(false)
      }
    }

    getInitialSession()

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.debug('[useAuth] Auth state change:', event)
      
      if (event === 'SIGNED_IN' && session) {
        setUser(session.user)
        setLoading(false)
      } else if (event === 'SIGNED_OUT') {
        setUser(null)
        setLoading(false)
      } else if (event === 'TOKEN_REFRESHED' && session) {
        setUser(session.user)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const signOut = async () => {
    const supabase = createClient()
    setLoading(true)
    
    try {
      const { error } = await supabase.auth.signOut()
      if (error) {
        console.error('[useAuth] Sign out error:', error)
      }
    } catch (error) {
      console.error('[useAuth] Sign out error:', error)
    } finally {
      setUser(null)
      setLoading(false)
    }
  }

  const refreshUser = async () => {
    try {
      const currentUser = await getCurrentUser()
      setUser(currentUser)
    } catch (error) {
      console.error('[useAuth] Refresh user error:', error)
    }
  }

  return {
    user,
    loading,
    signOut,
    refreshUser,
    isAuthenticated: !!user,
  }
}