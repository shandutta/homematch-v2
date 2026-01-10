import { createServerClient } from '@supabase/ssr'
import { AuthApiError, type SupabaseClient } from '@supabase/supabase-js'
import type { AppDatabase } from '@/types/app-database'
import { cookies, headers } from 'next/headers'
import type { NextRequest } from 'next/server'
import { isInvalidRefreshTokenError } from './auth-helpers'
import { getSupabaseAuthStorageKey } from './storage-keys'

type SupabaseAuthSubset = Pick<
  SupabaseClient<AppDatabase>['auth'],
  'getSession' | 'getUser' | 'signOut'
>

type SupabaseAuthClient = {
  auth: SupabaseAuthSubset
}

const clearStaleSession = async (supabase: SupabaseAuthClient) => {
  try {
    await supabase.auth.signOut({ scope: 'local' })
  } catch (err) {
    console.warn('[Supabase][Server] Failed to clear stale session', err)
  }
}

const withRefreshRecovery = (
  supabase: SupabaseAuthClient,
  context: 'server' | 'api' = 'server'
) => {
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
          `[Supabase][${context}] Clearing invalid refresh token during getSession`,
          describe(result.error)
        )
        await clearStaleSession(supabase)
        return { data: { session: null }, error: null }
      }
      return result
    } catch (error) {
      if (isInvalidRefreshTokenError(error)) {
        console.warn(
          `[Supabase][${context}] Clearing invalid refresh token during getSession`,
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
          `[Supabase][${context}] Clearing invalid refresh token during getUser`,
          describe(result.error)
        )
        await clearStaleSession(supabase)
        return originalGetUser()
      }
      return result
    } catch (error) {
      if (isInvalidRefreshTokenError(error)) {
        console.warn(
          `[Supabase][${context}] Clearing invalid refresh token during getUser`,
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

// Default server client for Server Components and normal server contexts
export async function createClient() {
  const cookieStore = await cookies()
  const headerStore = await headers()

  // Dynamic cookie name from host header
  const host = headerStore.get('host') || 'localhost:3000'
  const hostname = host.split(':')[0]
  const cookieName = getSupabaseAuthStorageKey(hostname)

  // Check for Authorization header (for API routes)
  const authHeader = headerStore.get('authorization')
  const bearerToken = authHeader?.replace('Bearer ', '')

  const supabase = createServerClient<AppDatabase>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: {
        name: cookieName,
        path: '/',
        sameSite: 'lax',
      },
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, {
                ...options,
                // Enhanced cookie configuration for session persistence
                httpOnly: false, // Allow client-side access for session hydration
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax', // Better cross-browser compatibility
                maxAge: 60 * 60 * 24 * 7, // 7 days
                path: '/',
              })
            )
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
      auth: {
        // Enable automatic token refresh and session persistence
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        flowType: 'pkce',
      },
      // If we have a bearer token from Authorization header, use it
      global: bearerToken
        ? {
            headers: {
              Authorization: `Bearer ${bearerToken}`,
            },
          }
        : undefined,
    }
  )

  withRefreshRecovery(supabase)

  return supabase
}

// API Route specific client that can handle NextRequest contexts
export function createApiClient(request?: NextRequest) {
  let authHeader: string | null = null
  let cookieData: { name: string; value: string }[] = []
  let hostname = 'localhost'

  if (request) {
    // Extract auth header from NextRequest
    authHeader = request.headers.get('authorization')

    // Use Next.js cookies API for reliable cookie access
    cookieData = request.cookies.getAll()

    // Get hostname for consistent cookie naming
    const host = request.headers.get('host') || 'localhost:3000'
    hostname = host.split(':')[0]
  }

  const bearerToken = authHeader?.replace('Bearer ', '')
  const cookieName = getSupabaseAuthStorageKey(hostname)

  const supabase = createServerClient<AppDatabase>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: {
        name: cookieName,
        path: '/',
        sameSite: 'lax',
      },
      cookies: {
        getAll() {
          return cookieData
        },
        setAll(_cookiesToSet) {
          // In API routes, we can't set cookies directly in the response here
          // The response headers need to be set by the API route itself
          // This is mainly for reading existing cookies
        },
      },
      auth: {
        autoRefreshToken: false, // Don't auto-refresh in API context
        persistSession: false, // Don't persist in API context
        detectSessionInUrl: false,
        flowType: 'pkce',
      },
      // If we have a bearer token from Authorization header, use it
      global: bearerToken
        ? {
            headers: {
              Authorization: `Bearer ${bearerToken}`,
            },
          }
        : undefined,
    }
  )

  withRefreshRecovery(supabase, 'api')

  // Monkey-patch getUser to automatically use the bearer token if available and no token is provided
  // This ensures that client.auth.getUser() works as expected in API routes even without session persistence
  const originalGetUser = supabase.auth.getUser.bind(supabase.auth)
  const getUserWithBearer: typeof supabase.auth.getUser = async (
    token?: string
  ) => {
    if (!token && bearerToken) {
      return originalGetUser(bearerToken)
    }
    return originalGetUser(token)
  }
  supabase.auth.getUser = getUserWithBearer

  return supabase
}

// Alternative server client with service role for administrative operations
// WARNING: This uses the service role key which bypasses RLS
// Only use for admin operations after proper authorization checks
export async function createServiceClient() {
  // Check if caller is authorized to use service role
  // This should be enhanced based on your specific authorization requirements
  const isAuthorized = await checkServiceRoleAuthorization()

  if (!isAuthorized) {
    throw new Error('Unauthorized access to service role client')
  }

  return createServerClient<AppDatabase>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        getAll: () => [],
        setAll: () => {},
      },
    }
  )
}

// Authorization check for service role usage
async function checkServiceRoleAuthorization(): Promise<boolean> {
  try {
    // Get the current user from the regular client
    const client = await createClient()
    const {
      data: { user },
      error,
    } = await client.auth.getUser()

    // Handle invalid refresh token gracefully
    if (error && isInvalidRefreshTokenError(error)) {
      console.warn('[Server] Invalid refresh token in service role check')
      return false
    }

    if (!user) return false

    // Check if user has admin role
    // This is a placeholder - implement your actual admin check logic
    const { data: profile } = await client
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    // Only allow service role for admin users
    // Adjust this based on your authorization model
    const role =
      profile &&
      typeof profile === 'object' &&
      'role' in profile &&
      typeof profile.role === 'string'
        ? profile.role
        : undefined
    return role === 'admin'
  } catch {
    return false
  }
}
