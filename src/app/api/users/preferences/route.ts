/* eslint-disable @typescript-eslint/consistent-type-assertions */
// Cast: request body is validated below; assigning the parsed shape back
// to the service-role update preserves the API contract without threading
// a Zod schema through every call site.
// @service-role-capability: Clerk-aware preference update. Verifies the
// Clerk session via requireUserFromRequest, bootstraps the profile row if
// needed, then updates user_profiles.preferences + onboarding_completed
// under service-role with the resolved profile UUID. The bypass is bounded
// to the row the verified Clerk session attests to.
// TODO(D1 follow-up): replace with a fully Clerk-aware Supabase JWT setup
// so the anon-key client can satisfy RLS and we can drop the service-role
// wrapper entirely.
/**
 * POST /api/users/preferences — save preference data + flip
 * onboarding_completed for the current Clerk-authenticated user.
 *
 * Used by the new /onboarding flow (ONBOARDING-001 from the audit) to
 * persist the preference-collection answers atomically and gate the
 * /dashboard redirect.
 */
import type { NextRequest } from 'next/server'
import { createApiClient } from '@/lib/supabase/server'
import { getServiceRoleClient } from '@/lib/supabase/service-role-client'
import { requireUserFromRequest } from '@/lib/api/auth'
import { ApiErrorHandler } from '@/lib/api/errors'
import { ensureUserProfileForCurrentClerkUser } from '@/lib/auth/ensure-profile'
import { noStoreJson } from '@/lib/api/cache-control'
import { checkRateLimit, rateLimitKey } from '@/lib/middleware/rateLimiter'

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const isLikelyClerkUserId = (id: string) =>
  id.startsWith('user_') && !UUID_PATTERN.test(id)

interface PreferencesBody {
  cities?: Array<{ city: string; state: string }>
  priceRange?: [number, number]
  bedrooms?: number
  bathrooms?: number
  householdType?: 'solo' | 'couple' | 'family' | 'roommates'
  // When true, mark onboarding_completed even if other fields are empty.
  // The "Skip for now" button on /onboarding hits this path so the
  // dashboard doesn't redirect-loop the user back to the form.
  markCompleted?: boolean
}

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null

const parsePreferences = (raw: unknown): PreferencesBody => {
  if (!isRecord(raw)) return {}
  const out: PreferencesBody = {}

  if (Array.isArray(raw.cities)) {
    const cities = raw.cities
      .filter(isRecord)
      .map((c) => {
        const city = typeof c.city === 'string' ? c.city.trim() : ''
        const state = typeof c.state === 'string' ? c.state.trim() : ''
        return city && state ? { city, state } : null
      })
      .filter((c): c is { city: string; state: string } => Boolean(c))
    if (cities.length) out.cities = cities
  }

  if (
    Array.isArray(raw.priceRange) &&
    raw.priceRange.length === 2 &&
    typeof raw.priceRange[0] === 'number' &&
    typeof raw.priceRange[1] === 'number' &&
    raw.priceRange[0] >= 0 &&
    raw.priceRange[1] >= raw.priceRange[0]
  ) {
    out.priceRange = [raw.priceRange[0], raw.priceRange[1]]
  }

  if (
    typeof raw.bedrooms === 'number' &&
    raw.bedrooms >= 0 &&
    raw.bedrooms <= 20
  ) {
    out.bedrooms = Math.floor(raw.bedrooms)
  }
  if (
    typeof raw.bathrooms === 'number' &&
    raw.bathrooms >= 0 &&
    raw.bathrooms <= 20
  ) {
    out.bathrooms = raw.bathrooms
  }

  if (
    raw.householdType === 'solo' ||
    raw.householdType === 'couple' ||
    raw.householdType === 'family' ||
    raw.householdType === 'roommates'
  ) {
    out.householdType = raw.householdType
  }

  if (typeof raw.markCompleted === 'boolean') {
    out.markCompleted = raw.markCompleted
  }

  return out
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createApiClient(request)
    const { user, response } = await requireUserFromRequest(supabase, request)

    if (!user || response) {
      return response ?? ApiErrorHandler.unauthorized()
    }

    let userId = user.id
    if (isLikelyClerkUserId(userId)) {
      const bootstrapped = await ensureUserProfileForCurrentClerkUser()
      if (!bootstrapped) {
        return ApiErrorHandler.serverError(
          'Failed to bootstrap user profile',
          new Error('ensure-profile returned null')
        )
      }
      userId = bootstrapped
    }

    if (isLikelyClerkUserId(userId)) {
      return ApiErrorHandler.unauthorized()
    }

    const rateLimitResponse = await checkRateLimit(
      rateLimitKey('users:preferences', userId)
    )
    if (rateLimitResponse) return rateLimitResponse

    let raw: unknown = null
    try {
      raw = await request.json()
    } catch {
      return ApiErrorHandler.badRequest('Invalid or missing JSON body')
    }
    const parsed = parsePreferences(raw)

    const sr = await getServiceRoleClient({
      approvedCapability: 'clerk-profile-read',
    })

    // Merge the new preference fields on top of whatever is already stored.
    // Reading the prior preferences first so we don't blow away unrelated
    // fields (e.g. notification settings live in preferences too).
    const { data: existing, error: readError } = await sr
      .from('user_profiles')
      .select('preferences')
      .eq('id', userId)
      .maybeSingle()

    if (readError) {
      return ApiErrorHandler.serverError('Profile lookup failed', readError)
    }

    const priorPreferences = isRecord(existing?.preferences)
      ? (existing.preferences as Record<string, unknown>)
      : {}

    const mergedPreferences: Record<string, unknown> = { ...priorPreferences }
    if (parsed.cities !== undefined) mergedPreferences.cities = parsed.cities
    if (parsed.priceRange !== undefined)
      mergedPreferences.priceRange = parsed.priceRange
    if (parsed.bedrooms !== undefined)
      mergedPreferences.bedrooms = parsed.bedrooms
    if (parsed.bathrooms !== undefined)
      mergedPreferences.bathrooms = parsed.bathrooms
    if (parsed.householdType !== undefined)
      mergedPreferences.householdType = parsed.householdType

    // onboarding_completed flips to true whenever we save anything (including
    // a skip) so the dashboard redirect doesn't loop the user back to /onboarding.
    const onboardingCompleted =
      parsed.markCompleted === true ||
      parsed.cities !== undefined ||
      parsed.priceRange !== undefined ||
      parsed.bedrooms !== undefined ||
      parsed.bathrooms !== undefined ||
      parsed.householdType !== undefined

    const { error: updateError } = await sr
      .from('user_profiles')
      .update({
        // Cast through Json — the Supabase generated types narrow to a Json
        // alias that doesn't accept Record<string, unknown> directly.
        preferences: mergedPreferences as Parameters<
          typeof sr.from
        >[0] extends never
          ? never
          : Record<string, unknown>,
        ...(onboardingCompleted ? { onboarding_completed: true } : {}),
        updated_at: new Date().toISOString(),
      } as Record<string, unknown>)
      .eq('id', userId)

    if (updateError) {
      return ApiErrorHandler.serverError(
        'Failed to save preferences',
        updateError
      )
    }

    return noStoreJson({ saved: true, onboardingCompleted })
  } catch (err) {
    console.error('[/api/users/preferences POST] Unexpected error:', err)
    return ApiErrorHandler.serverError('Failed to save preferences', err)
  }
}
