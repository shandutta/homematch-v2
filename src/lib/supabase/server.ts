import { createServerClient } from '@supabase/ssr'
import type { AppDatabase } from '@/types/app-database'
import { cookies, headers } from 'next/headers'
import type { NextRequest } from 'next/server'

// Phase 1 (dual-auth elimination, 2026-05-13): the previous
// implementations wrapped both clients in `withRefreshRecovery` and
// kept dynamic per-host cookie names so a Supabase session could
// recover from an expired refresh token across host boundaries. Clerk
// is now the sole identity provider — Supabase has no session to
// recover and no auth-cookie machinery to maintain. Both clients
// collapse to anon-keyed DB readers with `persistSession: false`.
//
// What stayed:
//   - `bearerToken` extraction from the Authorization header (used by
//     API routes that mint a JWT for direct DB query auth, NOT for
//     Supabase auth sessions).

// Default server client for Server Components and normal server contexts
export async function createClient() {
  const headerStore = await headers()
  // cookies() is still awaited so any future cookie-based use is wired up,
  // but no cookie auth state is shipped to the client.
  await cookies()

  const authHeader = headerStore.get('authorization')
  const bearerToken = authHeader?.replace('Bearer ', '')

  return createServerClient<AppDatabase>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => [],
        setAll: () => {},
      },
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
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
  const authHeader = request?.headers.get('authorization') ?? null
  const bearerToken = authHeader?.replace('Bearer ', '')

  return createServerClient<AppDatabase>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => [],
        setAll: () => {},
      },
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
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
  // Phase 2 (Supabase-auth elimination): write paths that previously
  // depended on auth.uid()=user_id RLS policies on
  // user_property_interactions / user_profiles / saved_searches /
  // household_property_resolutions. Clerk users have no Supabase
  // session, so auth.uid() is NULL on the anon-key client and the
  // upsert/update is RLS-blocked. Clerk-aware routes verify the
  // Clerk session, resolve user_profiles.id, then write under
  // service-role with the resolved user_id explicitly in the row.
  | 'clerk-interactions-write'
  | 'clerk-user-profile-write'
  | 'clerk-saved-search-write'
  | 'clerk-household-resolution-write'
  // Phase 2b: avatar storage uploads. The avatars bucket has an RLS
  // policy requiring (storage.foldername(name))[1] = auth.uid()::text
  // which excludes Clerk users (auth.uid() is NULL). Routes use this
  // capability AFTER resolving user_profiles.id, then write storage
  // objects under a folder named for that resolved UUID.
  | 'clerk-avatar-storage-write'

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
    'clerk-interactions-write',
    'clerk-user-profile-write',
    'clerk-saved-search-write',
    'clerk-household-resolution-write',
    'clerk-avatar-storage-write',
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
