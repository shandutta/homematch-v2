/* eslint-disable @typescript-eslint/consistent-type-assertions */
// Casts: user_profiles.preferences is `Json` (recursive), so we narrow once
// to Record<string, unknown> after an isRecord-style check below.
import type { NextRequest } from 'next/server'
import { createApiClient } from '@/lib/supabase/server'
import { getServiceRoleClient } from '@/lib/supabase/service-role-client'
import { requireUserFromRequest } from '@/lib/api/auth'
import { ApiErrorHandler } from '@/lib/api/errors'
import { ensureUserProfileForCurrentClerkUser } from '@/lib/auth/ensure-profile'
import { noStoreJson } from '@/lib/api/cache-control'

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const isLikelyClerkUserId = (id: string) =>
  id.startsWith('user_') && !UUID_PATTERN.test(id)

// @service-role-capability: anon-key Supabase client cannot read user_profiles
// for Clerk users because RLS expects auth.uid() = id and Clerk's session is
// not propagated to the anon-key client. Caller verified the Clerk session
// above via requireUserFromRequest, so the service-role SELECT is bounded to
// the already-resolved profile UUID.
// TODO(D1 follow-up): replace with a fully Clerk-aware Supabase JWT setup so
// the anon-key client can satisfy RLS and we can drop the service-role
// wrapper entirely.
// GET /api/users/me — current user's profile id, email, and household_id.
//
// Replaces direct supabase.auth.getSession() lookups in client components.
// Works with both Clerk cookies and the legacy Supabase bearer flow because
// requireUserFromRequest already handles both, and we bootstrap a profile
// row for Clerk users whose webhook hasn't fired yet.
export async function GET(request: NextRequest) {
  try {
    const supabase = createApiClient(request)
    const { user, response } = await requireUserFromRequest(supabase, request)

    if (!user || response) {
      return response ?? ApiErrorHandler.unauthorized()
    }

    let profileId = user.id
    if (isLikelyClerkUserId(profileId)) {
      const bootstrapped = await ensureUserProfileForCurrentClerkUser()
      if (bootstrapped) profileId = bootstrapped
    }

    if (isLikelyClerkUserId(profileId)) {
      // Authenticated but no profile UUID yet — return minimal shape so
      // callers can keep moving without 500-ing.
      return noStoreJson({
        id: profileId,
        email: user.email ?? null,
        household_id: null,
      })
    }

    // API-USERS-ME-001: the anon-key Supabase client is RLS-blocked for
    // Clerk-authenticated users (auth.uid() is null), so the SELECT below
    // used to return null `display_name` even when the DB had it. We
    // already verified the Clerk session above via requireUserFromRequest,
    // so route the read through the service-role client scoped to the
    // already-resolved profile UUID.
    const sr = await getServiceRoleClient({
      approvedCapability: 'clerk-profile-read',
    })
    const { data, error } = await sr
      .from('user_profiles')
      .select('id, email, display_name, household_id, preferences')
      .eq('id', profileId)
      .maybeSingle()

    if (error) {
      console.error('[/api/users/me] Lookup failed:', error)
      return ApiErrorHandler.serverError('Failed to load profile', error)
    }

    const preferences =
      data?.preferences && typeof data.preferences === 'object'
        ? (data.preferences as Record<string, unknown>)
        : {}
    const preferencesDisplayName =
      typeof preferences.display_name === 'string'
        ? preferences.display_name
        : null

    return noStoreJson({
      id: data?.id ?? profileId,
      email: data?.email ?? user.email ?? null,
      display_name: data?.display_name ?? preferencesDisplayName ?? null,
      household_id: data?.household_id ?? null,
    })
  } catch (err) {
    console.error('[/api/users/me] Unexpected error:', err)
    return ApiErrorHandler.serverError('Failed to load profile', err)
  }
}
