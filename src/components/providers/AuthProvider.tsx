'use client'

import { useEffect } from 'react'
import { initializeClientAuth } from '../../lib/auth/client-init'

interface AuthProviderProps {
  children: React.ReactNode
}

/**
 * Auth provider that initializes client-side authentication
 * on app startup for cross-browser session persistence
 */
export function AuthProvider({ children }: AuthProviderProps) {
  useEffect(() => {
    // Only run on client-side to avoid SSG/SSR issues
    if (typeof window !== 'undefined') {
      initializeClientAuth().catch((error) => {
        console.error('[AuthProvider] Initialization failed:', error)
      })
    }
  }, [])

  return <>{children}</>
}
