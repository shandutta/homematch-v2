'use client'

import { useEffect, useState } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { AppDatabase } from '@/types/app-database'
import { createClient } from '@/lib/supabase/client'

export interface UseSupabaseClientResult {
  client: SupabaseClient<AppDatabase> | null
  error: string | null
  isLoading: boolean
}

/**
 * React hook that wraps the async createClient() for components that need
 * the Supabase browser client at render time (e.g. auth forms that
 * conditionally render based on client availability).
 *
 * Returns { client, error, isLoading } – mirrors the existing IIFE / useMemo
 * patterns used in LoginForm, SignupForm, ResetPasswordForm, and
 * VerifyEmailForm.
 */
export function useSupabaseClient(): UseSupabaseClientResult {
  const [state, setState] = useState<UseSupabaseClientResult>({
    client: null,
    error: null,
    isLoading: true,
  })

  useEffect(() => {
    let cancelled = false
    createClient()
      .then((client) => {
        if (!cancelled) setState({ client, error: null, isLoading: false })
      })
      .catch((err) => {
        if (!cancelled) {
          setState({
            client: null,
            error:
              err instanceof Error
                ? err.message
                : 'Authentication is not configured for this environment.',
            isLoading: false,
          })
        }
      })
    return () => {
      cancelled = true
    }
  }, [])

  return state
}
