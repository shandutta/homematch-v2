import { AuthApiError, type SupabaseClient } from '@supabase/supabase-js'
import type { AppDatabase } from '@/types/app-database'
import { isInvalidRefreshTokenError } from './auth-helpers'

type SupabaseAuthSubset = Pick<
  SupabaseClient<AppDatabase>['auth'],
  'getSession' | 'getUser' | 'signOut'
>

export type SupabaseAuthRecoveryClient = {
  auth: SupabaseAuthSubset
}

const describeAuthError = (error: unknown): { code?: string; message?: string } => {
  if (error instanceof AuthApiError) {
    return { code: error.code, message: error.message }
  }

  if (typeof error === 'object' && error !== null) {
    const record = error as Record<string, unknown>
    return {
      code: typeof record.code === 'string' ? record.code : undefined,
      message: typeof record.message === 'string' ? record.message : undefined,
    }
  }

  return {}
}

const clearStaleSession = async (
  supabase: SupabaseAuthRecoveryClient,
  logPrefix: string
) => {
  try {
    // Local scope avoids hitting the network when the refresh token is already invalid.
    await supabase.auth.signOut({ scope: 'local' })
  } catch (err) {
    console.warn(`${logPrefix} Failed to clear stale session`, err)
  }
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
