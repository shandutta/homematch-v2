import { NextRequest } from 'next/server'
import { createApiClient } from '@/lib/supabase/server'
import { DbInteractionType } from '@/types/app'
import type { Property } from '@/types/database'
import { ApiErrorHandler } from '@/lib/api/errors'
import {
  createInteractionRequestSchema,
  interactionDeleteRequestSchema,
  interactionSummarySchema,
  paginationQuerySchema,
} from '@/lib/schemas/api'
import { checkRateLimit, rateLimitKey } from '@/lib/middleware/rateLimiter'
import {
  getDbFiltersForInteractionType,
  mapInteractionTypeToDb,
  normalizeInteractionType,
} from '@/lib/utils/interaction-type'
import { CouplesService } from '@/lib/services/couples'
import { requireUserFromRequest } from '@/lib/api/auth'
import { ensureUserProfileForCurrentClerkUser } from '@/lib/auth/ensure-profile'
import { noStoreJson } from '@/lib/api/cache-control'

// user_profiles.id is a UUID. When a Clerk-authenticated user lands before
// their webhook-created profile exists, requireUserFromRequest falls back to
// returning the Clerk userId ("user_xxx") as user.id. Querying Supabase with
// that string yields a 22P02 invalid-input-syntax error, which we'd previously
// surface as a 500. Detect that fallback shape and route around it.
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const isLikelyClerkUserId = (id: string) =>
  id.startsWith('user_') && !UUID_PATTERN.test(id)

export async function POST(request: NextRequest) {
  try {
    const supabase = createApiClient(request)
    const { user, response } = await requireUserFromRequest(supabase, request)

    if (!user || response) {
      return response ?? ApiErrorHandler.unauthorized()
    }

    // Bootstrap a user_profiles row if the Clerk webhook hasn't beaten us
    // to it. POST needs a real UUID since it's writing data.
    let userId = user.id
    if (isLikelyClerkUserId(userId)) {
      const profileId = await ensureUserProfileForCurrentClerkUser()
      if (!profileId) {
        return ApiErrorHandler.serverError(
          'Failed to bootstrap user profile',
          new Error('ensure-profile returned null')
        )
      }
      userId = profileId
    }

    // Rate limiting
    const rateLimitResponse = await checkRateLimit(
      rateLimitKey('interactions:create', userId)
    )
    if (rateLimitResponse) return rateLimitResponse

    let body: unknown
    try {
      body = await request.json()
    } catch (error) {
      return ApiErrorHandler.badRequest('Invalid or missing JSON body', error)
    }

    const parsed = createInteractionRequestSchema.safeParse(body)
    if (!parsed.success) {
      return ApiErrorHandler.fromZodError(parsed.error)
    }

    const { propertyId, type } = parsed.data
    const normalizedType = normalizeInteractionType(type)

    if (!normalizedType) {
      return ApiErrorHandler.badRequest('Invalid interaction type')
    }

    const dbInteractionType = mapInteractionTypeToDb(normalizedType)

    // Attach household_id for couples features (mutual likes, activity, stats)
    // Best-effort: if the profile is missing or inaccessible, fall back to null.
    const { data: userProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('household_id')
      .eq('id', userId)
      .maybeSingle()

    if (profileError) {
      console.warn(
        '[Interactions API] Failed to fetch user household_id:',
        profileError.message
      )
    }

    const householdId = userProfile?.household_id ?? null

    // Schema (since 20260508015000) enforces UNIQUE(user_id, property_id), so
    // there's at most one row per user/property. Use UPSERT on that conflict
    // target rather than DELETE+INSERT — the old pattern was non-atomic and
    // could collide with itself on rapid duplicate POSTs. (Supersedes the
    // /review M1 let/const lint fix on the old delete pattern.)
    //
    // Semantics:
    //   - like / dislike / skip: explicit user decision, override anything.
    //   - view: passive signal, must NOT clobber an existing like/dislike/skip.
    //     We upsert with ignoreDuplicates so a view-after-decision is a no-op.
    const isOverridingType = dbInteractionType !== 'view'

    const upsertResult = await supabase
      .from('user_property_interactions')
      .upsert(
        {
          user_id: userId,
          property_id: propertyId,
          household_id: householdId,
          interaction_type: dbInteractionType,
        },
        {
          onConflict: 'user_id,property_id',
          ignoreDuplicates: !isOverridingType,
        }
      )
      .select()
      .maybeSingle()

    if (upsertResult.error) {
      console.error('[Interactions API] Upsert error:', {
        code: upsertResult.error.code,
        message: upsertResult.error.message,
        details: upsertResult.error.details,
        hint: upsertResult.error.hint,
      })
      return ApiErrorHandler.serverError(
        'Failed to record interaction',
        upsertResult.error
      )
    }

    // ignoreDuplicates returns null on conflict-skip (a view arriving after an
    // existing like/skip/dislike). Fetch the existing row so callers see the
    // current state rather than a hollow response.
    let newInteraction = upsertResult.data
    if (!newInteraction) {
      const { data: existing } = await supabase
        .from('user_property_interactions')
        .select()
        .match({ user_id: userId, property_id: propertyId })
        .maybeSingle()
      newInteraction = existing
    }

    if (householdId) {
      CouplesService.clearHouseholdCache(householdId)
    }

    return ApiErrorHandler.success({ interaction: newInteraction })
  } catch (err) {
    return ApiErrorHandler.serverError('Failed to process interaction', err)
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createApiClient(request)
    const { user, response } = await requireUserFromRequest(supabase, request)

    if (!user || response) {
      return response ?? ApiErrorHandler.unauthorized()
    }

    // If user.id is the Clerk userId (profile not yet in Supabase), bootstrap
    // it now. After this, user.id either is a UUID or we accept the empty path.
    let userId = user.id
    if (isLikelyClerkUserId(userId)) {
      const profileId = await ensureUserProfileForCurrentClerkUser()
      if (profileId) {
        userId = profileId
      }
    }
    // Still not a UUID? Return an empty result instead of 500-ing. The user
    // is authenticated; they just don't have any data yet.
    if (isLikelyClerkUserId(userId)) {
      const fallbackType = request.nextUrl.searchParams.get('type')
      if (fallbackType === 'summary') {
        return noStoreJson({ liked: 0, passed: 0, viewed: 0 })
      }
      return noStoreJson({ items: [], nextCursor: null })
    }

    const { searchParams } = new URL(request.url)
    const queryParams = {
      type: searchParams.get('type'),
      cursor: searchParams.get('cursor') ?? undefined,
      limit: searchParams.get('limit') ?? undefined,
    }

    if (!queryParams.type) {
      return ApiErrorHandler.badRequest('Missing type query parameter')
    }

    if (queryParams.type === 'summary') {
      // Aggregate counts grouped by interaction_type for current user
      // Supabase JS doesn't support SQL GROUP BY directly via .group().
      // Use RPC to aggregate counts per type for the current user.
      type InteractionSummaryRow = {
        interaction_type: DbInteractionType
        count: number
      }

      // Add timeout for RPC call
      const rpcPromise = supabase.rpc('get_user_interaction_summary', {
        p_user_id: userId,
      })

      type SummaryResult = Awaited<typeof rpcPromise>

      const timeoutPromise: Promise<SummaryResult> = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Summary fetch timed out')), 10000)
      )

      let rpcResult: SummaryResult
      try {
        rpcResult = await Promise.race([rpcPromise, timeoutPromise])
      } catch (e) {
        console.error('Summary fetch timed out or failed:', e)
        return ApiErrorHandler.gatewayTimeout('Failed to fetch summary')
      }

      const { data, error } = rpcResult

      if (error) {
        console.error('Summary fetch failed:', error)
        return ApiErrorHandler.serverError('Failed to fetch summary', error)
      }

      const isRecord = (value: unknown): value is Record<string, unknown> =>
        typeof value === 'object' && value !== null
      const isInteractionSummaryRow = (
        value: unknown
      ): value is InteractionSummaryRow =>
        isRecord(value) &&
        typeof value.interaction_type === 'string' &&
        ['like', 'dislike', 'skip', 'view'].includes(value.interaction_type) &&
        typeof value.count === 'number'
      const summaryRows = Array.isArray(data)
        ? data.filter(isInteractionSummaryRow)
        : []

      const countFor = (...interactionTypes: DbInteractionType[]) => {
        if (!summaryRows) return 0
        return summaryRows
          .filter((row) => interactionTypes.includes(row.interaction_type))
          .reduce((total, row) => total + row.count, 0)
      }

      const summaryData = {
        liked: countFor('like'),
        passed: countFor('skip', 'dislike'),
        viewed: countFor('view'),
      }

      // Validate response against schema
      const validatedSummary = interactionSummarySchema.parse(summaryData)
      return noStoreJson(validatedSummary)
    }

    const type = normalizeInteractionType(queryParams.type)

    if (!type) {
      return ApiErrorHandler.badRequest('Invalid type parameter')
    }

    const paginationQuery = paginationQuerySchema.parse({
      cursor: queryParams.cursor,
      limit: queryParams.limit || '12',
    })
    const { cursor, limit } = paginationQuery
    const dbInteractionFilters = getDbFiltersForInteractionType(type)

    type InteractionWithProperty = {
      created_at: string
      property: Property | Property[] | null
    }

    // Join interactions -> properties for the current user
    // Note: selecting nested properties requires a foreign key relationship in Supabase
    let query = supabase
      .from('user_property_interactions')
      .select(
        `
        created_at,
        property:properties (*)
      `
      )
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (dbInteractionFilters.length === 1) {
      query = query.eq('interaction_type', dbInteractionFilters[0])
    } else {
      query = query.in('interaction_type', dbInteractionFilters)
    }

    if (cursor) {
      // Use created_at cursor pagination (fetch rows older than cursor)
      query = query.lt('created_at', cursor)
    }

    type InteractionQueryResult = Awaited<typeof query>

    // Add timeout for query execution
    const timeoutPromise: Promise<InteractionQueryResult> = new Promise(
      (_, reject) =>
        setTimeout(
          () => reject(new Error('Interactions list fetch timed out')),
          10000
        )
    )

    let queryResult: InteractionQueryResult
    try {
      queryResult = await Promise.race([query, timeoutPromise])
    } catch (e) {
      // A4 (2026-05-13 audit): the prior fallback returned 200 with an empty
      // list to dodge a test-harness retry loop. That hid real failures from
      // monitoring and from real users (who saw an empty list instead of
      // an error). Return 504 with a structured error and let the test
      // harness be fixed separately if it retries on 504.
      console.error('Interactions list fetch timed out or failed:', e)
      const message =
        e instanceof Error ? e.message : 'Interactions list fetch failed'
      return ApiErrorHandler.gatewayTimeout(message)
    }

    const { data, error } = queryResult
    const isInteractionWithProperty = (
      value: unknown
    ): value is InteractionWithProperty =>
      typeof value === 'object' &&
      value !== null &&
      'created_at' in value &&
      'property' in value
    const typedData = Array.isArray(data)
      ? data.filter(isInteractionWithProperty)
      : []

    if (error) {
      console.error('Interactions list failed:', error)
      return ApiErrorHandler.serverError(
        `Failed to fetch ${type} properties`,
        error
      )
    }

    // Flatten the structure: take the first property from the array.
    const items = (typedData ?? [])
      .map((row) => {
        if (!row.property) return null
        return Array.isArray(row.property) ? row.property[0] : row.property
      })
      .filter(Boolean)

    const nextCursor =
      (typedData?.length ?? 0) === limit
        ? typedData?.[typedData.length - 1]?.created_at
        : null

    return noStoreJson({ items, nextCursor })
  } catch (err) {
    console.error('GET /api/interactions unexpected error:', err)
    return ApiErrorHandler.serverError('Internal server error', err)
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = createApiClient(request)
    const { user, response } = await requireUserFromRequest(supabase, request)

    if (!user || response) {
      return response ?? ApiErrorHandler.unauthorized()
    }

    let userId = user.id
    if (isLikelyClerkUserId(userId)) {
      const profileId = await ensureUserProfileForCurrentClerkUser()
      if (!profileId) {
        // Nothing to delete if we can't resolve a profile.
        return ApiErrorHandler.success({ deleted: true, count: 0 })
      }
      userId = profileId
    }

    const rateLimitResponse = await checkRateLimit(
      rateLimitKey('interactions:delete', userId)
    )
    if (rateLimitResponse) return rateLimitResponse

    let body: unknown
    try {
      body = await request.json()
    } catch {
      body = null
    }

    const parsed = interactionDeleteRequestSchema.safeParse(body)
    if (!parsed.success) {
      return ApiErrorHandler.fromZodError(parsed.error)
    }

    const { propertyId } = parsed.data

    // Use select() to get back deleted rows and verify the delete worked
    const { data: deletedRows, error } = await supabase
      .from('user_property_interactions')
      .delete()
      .match({ user_id: userId, property_id: propertyId })
      .select()

    if (error) {
      console.error('[Interactions DELETE] Error:', error)
      return ApiErrorHandler.serverError('Failed to delete interaction', error)
    }

    if (!deletedRows || deletedRows.length === 0) {
      console.warn(
        '[Interactions DELETE] No rows deleted - interaction may not exist or RLS blocked'
      )
    }

    const householdIdsToClear = new Set(
      (deletedRows ?? [])
        .map((row) => row.household_id)
        .filter((id): id is string => Boolean(id))
    )
    householdIdsToClear.forEach((id) => CouplesService.clearHouseholdCache(id))

    return ApiErrorHandler.success({
      deleted: true,
      count: deletedRows?.length ?? 0,
    })
  } catch (err) {
    console.error('[Interactions DELETE] Unexpected error:', err)
    return ApiErrorHandler.serverError('Failed to delete interaction', err)
  }
}
