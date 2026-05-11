import { createServerClient } from '@supabase/ssr'
import type { AppDatabase } from '@/types/app-database'
import { cookies, headers } from 'next/headers'
import type { NextRequest } from 'next/server'
import { buildSupabaseSessionCookieOptions } from './cookie-options'
import { getSupabaseAuthStorageKey } from './storage-keys'
import { withRefreshRecovery } from './refresh-recovery'
import { isInvalidRefreshTokenError } from './auth-helpers'

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
              cookieStore.set(
                name,
                value,
                buildSupabaseSessionCookieOptions(options)
              )
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

  withRefreshRecovery(supabase, {
    logPrefix: '[Supabase][Server]',
    context: 'server',
  })

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

  withRefreshRecovery(supabase, {
    logPrefix: '[Supabase][Server]',
    context: 'api',
  })

  return supabase
}

export type ApprovedServiceRoleCapability =
  | 'users-search'
  | 'household-disputes'
  | 'invite-acceptance'
  | 'invite-preview'

type CreateServiceClientOptions = {
  approvedCapability?: ApprovedServiceRoleCapability
}

const APPROVED_SERVICE_ROLE_CAPABILITIES =
  new Set<ApprovedServiceRoleCapability>([
    'users-search',
    'household-disputes',
    'invite-acceptance',
    'invite-preview',
  ])

// Alternative server client with service role for administrative operations
// WARNING: This uses the service role key which bypasses RLS
// Only use for admin operations after proper authorization checks, or for an
// explicit repo-approved capability with route-local auth/resource guards.
export async function createServiceClient(
  options: CreateServiceClientOptions = {}
) {
  const hasApprovedCapability =
    options.approvedCapability !== undefined &&
    APPROVED_SERVICE_ROLE_CAPABILITIES.has(options.approvedCapability)

  // Check if caller is authorized to use service role
  const isAuthorized =
    hasApprovedCapability || (await checkServiceRoleAuthorization())

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

const SERVICE_ROLE_AUTHORIZED_ROLES = new Set(['admin'])

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

    if (error || !user) return false

    const { data: assignment, error: assignmentError } = await client
      .from('admin_role_assignments')
      .select('role, enabled, expires_at')
      .eq('user_id', user.id)
      .maybeSingle()

    if (assignmentError || !assignment || !assignment.enabled) return false
    if (!SERVICE_ROLE_AUTHORIZED_ROLES.has(assignment.role)) return false

    if (assignment.expires_at) {
      const expiresAt = Date.parse(assignment.expires_at)
      if (Number.isNaN(expiresAt) || expiresAt <= Date.now()) return false
    }

    return true
  } catch {
    return false
  }
}
