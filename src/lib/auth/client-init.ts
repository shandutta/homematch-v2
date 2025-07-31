'use client'

import { createClient } from '../supabase/client'

/**
 * Client-side auth initialization for cross-browser compatibility
 * Call this early in the app lifecycle to ensure sessions are restored properly
 */
export async function initializeClientAuth() {
  if (typeof window === 'undefined') return

  const supabase = createClient()

  try {
    // Force session restoration on page load
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession()

    if (error) {
      console.warn('[Auth Init] Session restoration failed:', error.message)

      // Try to recover from storage directly
      const storageKey = 'homematch-auth-token'
      const storedAuth =
        localStorage?.getItem(storageKey) || sessionStorage?.getItem(storageKey)

      if (storedAuth) {
        console.debug('[Auth Init] Found stored auth, attempting restoration')
        try {
          const authData = JSON.parse(storedAuth)
          if (authData.access_token) {
            // Force a token refresh to validate stored session
            await supabase.auth.refreshSession()
          }
        } catch (_parseError) {
          console.warn('[Auth Init] Stored auth data invalid, clearing')
          localStorage?.removeItem(storageKey)
          sessionStorage?.removeItem(storageKey)
        }
      }
    } else if (session) {
      console.debug('[Auth Init] Session restored successfully')

      // Ensure token is fresh if it's close to expiry
      const expiresAt = session.expires_at
      const now = Math.floor(Date.now() / 1000)
      const timeToExpiry = expiresAt ? expiresAt - now : 0

      // Refresh if expiring within 5 minutes
      if (timeToExpiry < 300) {
        console.debug('[Auth Init] Token expiring soon, refreshing')
        await supabase.auth.refreshSession()
      }
    }

    // Set up automatic token refresh with error handling
    const refreshInterval = setInterval(
      async () => {
        try {
          const {
            data: { session: currentSession },
          } = await supabase.auth.getSession()

          if (currentSession) {
            const expiresAt = currentSession.expires_at
            const now = Math.floor(Date.now() / 1000)
            const timeToExpiry = expiresAt ? expiresAt - now : 0

            // Refresh if expiring within 10 minutes
            if (timeToExpiry < 600) {
              console.debug('[Auth Init] Proactive token refresh')
              await supabase.auth.refreshSession()
            }
          }
        } catch (error) {
          console.warn('[Auth Init] Periodic refresh failed:', error)
        }
      },
      5 * 60 * 1000
    ) // Check every 5 minutes

    // Clean up interval on page unload
    window.addEventListener('beforeunload', () => {
      clearInterval(refreshInterval)
    })
  } catch (error) {
    console.error('[Auth Init] Initialization failed:', error)
  }
}

/**
 * Enhanced page navigation handler that ensures auth state
 */
export async function handleAuthenticatedNavigation(targetUrl: string) {
  if (typeof window === 'undefined') return

  const supabase = createClient()

  try {
    // Verify current session before navigation
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession()

    if (error || !session) {
      console.warn('[Auth Nav] No valid session, redirecting to login')
      window.location.href = '/login'
      return
    }

    // Ensure session will persist across navigation
    const { error: refreshError } = await supabase.auth.refreshSession()

    if (refreshError) {
      console.warn(
        '[Auth Nav] Session refresh failed, may lose auth on navigation'
      )
    }

    // Navigate to target URL
    window.location.href = targetUrl
  } catch (error) {
    console.error('[Auth Nav] Navigation error:', error)
    window.location.href = '/login'
  }
}
