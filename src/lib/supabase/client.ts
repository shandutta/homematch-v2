import { createBrowserClient } from '@supabase/ssr'
import { AuthApiError, type SupabaseClient } from '@supabase/supabase-js'
import type { AppDatabase } from '@/types/app-database'
import { isInvalidRefreshTokenError } from './auth-helpers'
import { getSupabaseAuthStorageKey } from './storage-keys'

const clearStaleSession = async (supabase: SupabaseClient<AppDatabase>) => {
  try {
    // Local scope avoids hitting the network when the refresh token is already invalid
    await supabase.auth.signOut({ scope: 'local' })
  } catch (err) {
    console.warn('[Supabase] Failed to clear stale session', err)
  }
}

const withRefreshRecovery = (supabase: SupabaseClient<AppDatabase>) => {
  const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === 'object' && value !== null

  const describe = (error: unknown): { code?: string; message?: string } => {
    if (error instanceof AuthApiError) {
      return { code: error.code, message: error.message }
    }
    if (isRecord(error)) {
      return {
        code: typeof error.code === 'string' ? error.code : undefined,
        message: typeof error.message === 'string' ? error.message : undefined,
      }
    }
    return {}
  }

  const originalGetSession = supabase.auth.getSession.bind(supabase.auth)

  const getSessionWithRecovery: typeof supabase.auth.getSession = async () => {
    try {
      const result = await originalGetSession()

      if (result.error && isInvalidRefreshTokenError(result.error)) {
        console.warn(
          '[Supabase] Clearing invalid refresh token and signing out',
          describe(result.error)
        )
        await clearStaleSession(supabase)
        return { data: { session: null }, error: null }
      }

      return result
    } catch (error) {
      if (isInvalidRefreshTokenError(error)) {
        console.warn(
          '[Supabase] Clearing invalid refresh token and signing out',
          describe(error)
        )
        await clearStaleSession(supabase)
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
          '[Supabase] Clearing invalid refresh token and signing out',
          describe(result.error)
        )
        await clearStaleSession(supabase)
        return originalGetUser()
      }

      return result
    } catch (error) {
      if (isInvalidRefreshTokenError(error)) {
        console.warn(
          '[Supabase] Clearing invalid refresh token and signing out',
          describe(error)
        )
        await clearStaleSession(supabase)
        return originalGetUser()
      }
      throw error
    }
  }
  supabase.auth.getUser = getUserWithRecovery
}

export const __withRefreshRecovery = withRefreshRecovery

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Missing Supabase browser configuration (NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY)'
    )
  }

  const hostname =
    typeof window !== 'undefined' && window.location?.hostname
      ? window.location.hostname
      : 'localhost'
  // Keep cookie/storage key aligned with middleware expectations and Supabase project fingerprint
  const storageKey = getSupabaseAuthStorageKey(hostname)

  const supabase = createBrowserClient<AppDatabase>(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookieOptions: {
        name: storageKey,
        path: '/',
        sameSite: 'lax',
      },
      auth: {
        detectSessionInUrl: true,
        storageKey,
        autoRefreshToken: true,
        persistSession: true,
      },
    }
  )

  withRefreshRecovery(supabase)

  return supabase
}

declare global {
  interface Window {
    createSupabaseClient?: typeof createClient
  }
}

if (
  typeof window !== 'undefined' &&
  process.env.NEXT_PUBLIC_TEST_MODE === 'true'
) {
  window.createSupabaseClient = createClient
}
