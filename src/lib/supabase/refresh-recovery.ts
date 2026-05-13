import type { SupabaseClient } from '@supabase/supabase-js'
import type { AppDatabase } from '@/types/app-database'
import { isInvalidRefreshTokenError } from './auth-helpers'

type SupabaseAuthSubset = Pick<
  SupabaseClient<AppDatabase>['auth'],
  'getSession' | 'getUser' | 'signOut'
>

export type SupabaseAuthRecoveryClient = {
  auth: SupabaseAuthSubset
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const describeAuthError = (
  error: unknown
): { code?: string; message?: string } => {
  // Duck-type AuthApiError without importing the class (avoids bundling @supabase/supabase-js
  // including realtime-js into the refresh-recovery chunk)
  if (isRecord(error) && typeof error.message === 'string') {
    return {
      code: typeof error.code === 'string' ? error.code : undefined,
      message: error.message,
    }
  }

  return {}
}

// M6 (2026-05-13 audit): dedupe concurrent clearStaleSession calls. When
// a user's refresh token expires, every in-flight getSession/getUser call
// independently detects the bad token and previously each one issued its
// own signOut. The race is benign (signOut is idempotent at the protocol
// level), but it's redundant work and noisy in logs. Coalesce them by
// keeping a shared in-flight promise per client; concurrent callers await
// the same clear instead of stampeding.
const clearStaleSessionInFlight = new WeakMap<
  SupabaseAuthRecoveryClient,
  Promise<void>
>()

const clearStaleSession = (
  supabase: SupabaseAuthRecoveryClient,
  logPrefix: string
): Promise<void> => {
  const existing = clearStaleSessionInFlight.get(supabase)
  if (existing) return existing

  const promise = (async () => {
    try {
      // Local scope avoids hitting the network when the refresh token is already invalid.
      await supabase.auth.signOut({ scope: 'local' })
    } catch (err) {
      console.warn(`${logPrefix} Failed to clear stale session`, err)
    } finally {
      clearStaleSessionInFlight.delete(supabase)
    }
  })()

  clearStaleSessionInFlight.set(supabase, promise)
  return promise
}

export const withRefreshRecovery = (
  supabase: SupabaseAuthRecoveryClient,
  options: { logPrefix?: string; context?: string } = {}
) => {
  const logPrefix = options.logPrefix ?? '[Supabase]'
  const context = options.context
  const contextLabel = context ? `[${context}]` : ''

  const originalGetSession = supabase.auth.getSession.bind(supabase.auth)
  const getSessionWithRecovery: typeof supabase.auth.getSession = async () => {
    try {
      const result = await originalGetSession()

      if (result.error && isInvalidRefreshTokenError(result.error)) {
        console.warn(
          `${logPrefix}${contextLabel} Clearing invalid refresh token during getSession`,
          describeAuthError(result.error)
        )
        await clearStaleSession(supabase, logPrefix)
        return { data: { session: null }, error: null }
      }

      return result
    } catch (error) {
      if (isInvalidRefreshTokenError(error)) {
        console.warn(
          `${logPrefix}${contextLabel} Clearing invalid refresh token during getSession`,
          describeAuthError(error)
        )
        await clearStaleSession(supabase, logPrefix)
        return { data: { session: null }, error: null }
      }
      throw error
    }
  }
  supabase.auth.getSession = getSessionWithRecovery

  const originalGetUser = supabase.auth.getUser.bind(supabase.auth)
  const getUserWithRecovery: typeof supabase.auth.getUser = async () => {
    try {
      const result = await originalGetUser()

      if (result.error && isInvalidRefreshTokenError(result.error)) {
        console.warn(
          `${logPrefix}${contextLabel} Clearing invalid refresh token during getUser`,
          describeAuthError(result.error)
        )
        await clearStaleSession(supabase, logPrefix)
        return originalGetUser()
      }

      return result
    } catch (error) {
      if (isInvalidRefreshTokenError(error)) {
        console.warn(
          `${logPrefix}${contextLabel} Clearing invalid refresh token during getUser`,
          describeAuthError(error)
        )
        await clearStaleSession(supabase, logPrefix)
        return originalGetUser()
      }
      throw error
    }
  }
  supabase.auth.getUser = getUserWithRecovery
}
