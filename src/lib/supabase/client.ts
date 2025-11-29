import { createBrowserClient } from '@supabase/ssr'
import { AuthApiError, type SupabaseClient } from '@supabase/supabase-js'
import { isInvalidRefreshTokenError } from './auth-helpers'

const clearStaleSession = async (supabase: SupabaseClient) => {
  try {
    // Local scope avoids hitting the network when the refresh token is already invalid
    await supabase.auth.signOut({ scope: 'local' })
  } catch (err) {
    console.warn('[Supabase] Failed to clear stale session', err)
  }
}

const withRefreshRecovery = (supabase: SupabaseClient) => {
  const describe = (error: unknown) => ({
    code: (error as AuthApiError | undefined)?.code,
    message: (error as AuthApiError | undefined)?.message,
  })

  const originalGetSession = supabase.auth.getSession.bind(supabase.auth)

  supabase.auth.getSession = (async () => {
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
  }) as typeof supabase.auth.getSession

  const originalGetUser = supabase.auth.getUser.bind(supabase.auth)
  supabase.auth.getUser = (async () => {
    try {
      const result = await originalGetUser()

      if (result.error && isInvalidRefreshTokenError(result.error)) {
        console.warn(
          '[Supabase] Clearing invalid refresh token and signing out',
          describe(result.error)
        )
        await clearStaleSession(supabase)
        return { data: { user: null }, error: null }
      }

      return result
    } catch (error) {
      if (isInvalidRefreshTokenError(error)) {
        console.warn(
          '[Supabase] Clearing invalid refresh token and signing out',
          describe(error)
        )
        await clearStaleSession(supabase)
        return { data: { user: null }, error: null }
      }
      throw error
    }
  }) as typeof supabase.auth.getUser
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

  const isTestEnv =
    process.env.NODE_ENV === 'test' ||
    process.env.NEXT_PUBLIC_TEST_MODE === 'true'

  const storageKey = isTestEnv
    ? `supabase-browser-${process.env.VITEST_POOL_ID || '1'}-${supabaseAnonKey.slice(0, 6)}`
    : undefined

  // Dynamic cookie configuration for dev/prod
  const cookieName =
    typeof window !== 'undefined' && window.location?.hostname
      ? `sb-${window.location.hostname.replace(/\./g, '-')}-auth-token`
      : 'sb-localhost-auth-token'

  const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey, {
    cookieOptions: {
      name: cookieName,
      path: '/',
      sameSite: 'lax',
    },
    auth: {
      detectSessionInUrl: true,
      storageKey,
      autoRefreshToken: true,
      persistSession: true,
    },
  })

  withRefreshRecovery(supabase)

  return supabase
}
