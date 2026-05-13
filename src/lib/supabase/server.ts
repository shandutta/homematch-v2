import { createServerClient } from '@supabase/ssr'
import type { AppDatabase } from '@/types/app-database'
import { cookies, headers } from 'next/headers'
import type { NextRequest } from 'next/server'
import { buildSupabaseSessionCookieOptions } from './cookie-options'
import { getSupabaseAuthStorageKey } from './storage-keys'
import { withRefreshRecovery } from './refresh-recovery'

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
  // Clerk webhook (verified upstream by Svix signature) needs to upsert
  // user_profiles for new sign-ups, before the user has any session at all.
  | 'clerk-webhook'
  // Just-in-time profile bootstrap when a Clerk-authenticated user arrives
  // before the webhook has created their user_profiles row. Caller verifies
  // the Clerk session first; this only bypasses RLS for the user_profiles
  // insert keyed to that verified clerk_user_id.
  | 'clerk-profile-bootstrap'
  // Server-component reads of user_profiles for the currently-authenticated
  // Clerk user. RLS expects `auth.uid() = id`, but the anon-key server
  // client has no propagated Clerk session, so it returns 0 rows for Clerk
  // users. Caller MUST verify the Clerk session via auth() first; the read
  // is then scoped to the row that the verified Clerk session attests to.
  | 'clerk-profile-read'
  // Household write operations (create / join / invite) for the
  // currently-authenticated Clerk user. The legacy RPCs read auth.uid() and
  // auth.users, neither of which works for Clerk sessions. The Clerk-aware
  // API routes (/api/households, /api/households/[id]/invitations,
  // /api/households/join) verify the Clerk session, resolve the
  // user_profiles.id, then call this RPC with the explicit user_id.
  | 'clerk-household-write'

type CreateServiceClientOptions = {
  approvedCapability: ApprovedServiceRoleCapability
}

const APPROVED_SERVICE_ROLE_CAPABILITIES =
  new Set<ApprovedServiceRoleCapability>([
    'users-search',
    'household-disputes',
    'invite-acceptance',
    'invite-preview',
    'clerk-webhook',
    'clerk-profile-bootstrap',
    'clerk-profile-read',
    'clerk-household-write',
  ])

/**
 * Service-role client. Bypasses RLS — every call site must pass a
 * declared `approvedCapability` from the allowlist above. The TS type
 * makes the param required; the runtime check guards against `as any`
 * casts and dynamic invocations.
 *
 * A3 (2026-05-13 audit): the previous admin-runtime fallback (querying
 * admin_role_assignments) was removed. No live caller used it, and
 * having a fallback means new code can silently acquire the key without
 * declaring intent. To re-enable, add an `'admin-runtime'` capability
 * here AND the fallback function — make it explicit.
 */
export async function createServiceClient(options: CreateServiceClientOptions) {
  if (!APPROVED_SERVICE_ROLE_CAPABILITIES.has(options.approvedCapability)) {
    throw new Error(
      `Unknown service-role capability: ${String(options.approvedCapability)}. ` +
        `Add it to APPROVED_SERVICE_ROLE_CAPABILITIES in src/lib/supabase/server.ts.`
    )
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
