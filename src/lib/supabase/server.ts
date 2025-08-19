import { createServerClient } from '@supabase/ssr'
import { cookies, headers } from 'next/headers'
import type { NextRequest } from 'next/server'

// Default server client for Server Components and normal server contexts
export async function createClient() {
  const cookieStore = await cookies()
  const headerStore = await headers()

  // Check for Authorization header (for API routes)
  const authHeader = headerStore.get('authorization')
  const bearerToken = authHeader?.replace('Bearer ', '')

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
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
                httpOnly: true, // SECURITY: Prevent XSS
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
}

// API Route specific client that can handle NextRequest contexts
export function createApiClient(request?: NextRequest) {
  let authHeader: string | null = null
  let cookieData: { name: string; value: string }[] = []

  if (request) {
    // Extract auth header from NextRequest
    authHeader = request.headers.get('authorization')

    // Extract cookies from NextRequest
    const cookieStr = request.headers.get('cookie')
    if (cookieStr) {
      cookieData = cookieStr
        .split(';')
        .map((c) => {
          const [name, value] = c.trim().split('=')
          return { name, value: decodeURIComponent(value) }
        })
        .filter((c) => c.name && c.value)
    }
  }

  const bearerToken = authHeader?.replace('Bearer ', '')

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
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

  return createServerClient(
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
    } = await client.auth.getUser()

    if (!user) return false

    // Check if user has admin role
    // This is a placeholder - implement your actual admin check logic
    const { data: profile } = await client
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    // Only allow service role for admin users
    // Adjust this based on your authorization model
    return profile?.role === 'admin'
  } catch {
    return false
  }
}
