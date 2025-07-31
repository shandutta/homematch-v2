import { createClient } from '../supabase/client'
import type { User } from '@supabase/supabase-js'

/**
 * Enhanced session management utilities for cross-browser compatibility
 */

let authStateListener: (() => void) | null = null

export interface AuthState {
  user: User | null
  loading: boolean
}

/**
 * Initialize auth state listener for automatic session management
 */
export function initializeAuthState() {
  if (typeof window === 'undefined') return

  const supabase = createClient()

  // Clean up existing listener
  if (authStateListener) {
    authStateListener()
  }

  // Set up new auth state listener
  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange(async (event, session) => {
    console.debug('[Auth] State change:', event, session?.user?.email)

    // Handle different auth events
    switch (event) {
      case 'SIGNED_IN':
        // Ensure session is properly stored
        if (session) {
          await refreshSession()
        }
        break
      case 'SIGNED_OUT':
        // Clear any cached data
        clearAuthCache()
        break
      case 'TOKEN_REFRESHED':
        console.debug('[Auth] Token refreshed successfully')
        break
      case 'PASSWORD_RECOVERY':
        console.debug('[Auth] Password recovery initiated')
        break
    }
  })

  authStateListener = () => subscription.unsubscribe()
}

/**
 * Force refresh the current session
 */
export async function refreshSession() {
  if (typeof window === 'undefined') return null

  const supabase = createClient()

  try {
    const {
      data: { session },
      error,
    } = await supabase.auth.refreshSession()

    if (error) {
      console.warn('[Auth] Session refresh failed:', error.message)
      return null
    }

    console.debug('[Auth] Session refreshed successfully')
    return session
  } catch (error) {
    console.error('[Auth] Session refresh error:', error)
    return null
  }
}

/**
 * Get current user with session validation
 */
export async function getCurrentUser() {
  if (typeof window === 'undefined') return null

  const supabase = createClient()

  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser()

    if (error) {
      console.warn('[Auth] Get user failed:', error.message)
      // Try to refresh session if user fetch fails
      await refreshSession()
      return null
    }

    return user
  } catch (error) {
    console.error('[Auth] Get user error:', error)
    return null
  }
}

/**
 * Clear auth-related cache and storage
 */
export function clearAuthCache() {
  if (typeof window === 'undefined') return

  try {
    // Clear auth-related items from both storage types
    const authKeys = [
      'homematch-auth-token',
      'sb-' +
        process.env.NEXT_PUBLIC_SUPABASE_URL?.split('//')[1]?.split('.')[0] +
        '-auth-token',
    ]

    authKeys.forEach((key) => {
      localStorage?.removeItem(key)
      sessionStorage?.removeItem(key)
    })

    console.debug('[Auth] Cache cleared')
  } catch (error) {
    console.warn('[Auth] Cache clear failed:', error)
  }
}

/**
 * Ensure auth session is properly established before navigation
 */
export async function ensureAuthSession(): Promise<boolean> {
  if (typeof window === 'undefined') return false

  const supabase = createClient()

  try {
    // First try to get current session
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (session) {
      console.debug('[Auth] Session validated')
      return true
    }

    // If no session, try to refresh
    const refreshedSession = await refreshSession()
    return refreshedSession !== null
  } catch (error) {
    console.error('[Auth] Session validation error:', error)
    return false
  }
}

/**
 * Sign out with proper cleanup
 */
export async function signOut() {
  if (typeof window === 'undefined') return

  const supabase = createClient()

  try {
    // Clear cache first
    clearAuthCache()

    // Then sign out
    const { error } = await supabase.auth.signOut()

    if (error) {
      console.warn('[Auth] Sign out error:', error.message)
    } else {
      console.debug('[Auth] Signed out successfully')
    }
  } catch (error) {
    console.error('[Auth] Sign out error:', error)
  }
}
