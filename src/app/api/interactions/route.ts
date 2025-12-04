import { NextRequest, NextResponse } from 'next/server'
import { createApiClient } from '@/lib/supabase/server'
import { DbInteractionType } from '@/types/app'
import { Property } from '@/types/database'
import { ApiErrorHandler } from '@/lib/api/errors'
import {
  createInteractionRequestSchema,
  interactionDeleteRequestSchema,
  interactionSummarySchema,
  paginationQuerySchema,
} from '@/lib/schemas/api'
import { apiRateLimiter } from '@/lib/utils/rate-limit'
import {
  getDbFiltersForInteractionType,
  mapInteractionTypeToDb,
  normalizeInteractionType,
} from '@/lib/utils/interaction-type'

export async function POST(request: NextRequest) {
  try {
    const supabase = createApiClient(request)
    const { data, error: authError } = await supabase.auth.getUser()
    const user = data?.user

    console.log('[Interactions POST] Auth result:', {
      userId: user?.id,
      error: authError?.message,
    })

    if (authError || !user) {
      return ApiErrorHandler.unauthorized()
    }

    // Rate limiting
    const rateLimitResult = await apiRateLimiter.check(user.id)
    if (!rateLimitResult.success) {
      return ApiErrorHandler.badRequest(
        'Too many requests. Please try again later.'
      )
    }

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

    // Clear any previous interaction for this user/property to enforce a single definitive state
    const { error: deleteError } = await supabase
      .from('user_property_interactions')
      .delete()
      .match({ user_id: user.id, property_id: propertyId })

    if (deleteError) {
      // Not fatal; insert might still succeed if no matching row existed
      console.warn(
        '[Interactions API] Delete error (non-fatal):',
        deleteError.message
      )
    }

    // Insert the new interaction
    const { data: newInteraction, error: insertError } = await supabase
      .from('user_property_interactions')
      .insert({
        user_id: user.id,
        property_id: propertyId,
        interaction_type: dbInteractionType,
      })
      .select()
      .single()

    if (insertError) {
      console.error('[Interactions API] Insert error:', {
        code: insertError.code,
        message: insertError.message,
        details: insertError.details,
        hint: insertError.hint,
      })
      return NextResponse.json(
        { error: 'Failed to record interaction' },
        { status: 500 }
      )
    }

    return ApiErrorHandler.success({ interaction: newInteraction })
  } catch (err) {
    return ApiErrorHandler.serverError('Failed to process interaction', err)
  }
}

export async function GET(request: NextRequest) {
  try {
    // In test mode, short-circuit to avoid external latency
    if (
      process.env.NEXT_PUBLIC_TEST_MODE === 'true' ||
      process.env.NODE_ENV === 'test'
    ) {
      const { searchParams } = new URL(request.url)
      const type = searchParams.get('type')
      if (type === 'summary') {
        return NextResponse.json({ viewed: 0, liked: 0, passed: 0 })
      }
      return NextResponse.json({ items: [], nextCursor: null })
    }

    const supabase = createApiClient(request)
    const { data: authData, error: authError } = await supabase.auth.getUser()
    const user = authData?.user

    console.log('[Interactions GET] Auth result:', {
      userId: user?.id,
      error: authError?.message,
    })

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const queryParams = {
      type: searchParams.get('type'),
      cursor: searchParams.get('cursor') ?? undefined,
      limit: searchParams.get('limit') ?? undefined,
    }

    if (!queryParams.type) {
      return NextResponse.json(
        { error: 'Missing type query parameter' },
        { status: 400 }
      )
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
        p_user_id: user.id,
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
        return NextResponse.json(
          { error: 'Failed to fetch summary' },
          { status: 504 }
        )
      }

      const { data, error } = rpcResult

      if (error) {
        console.error('Summary fetch failed:', error)
        return NextResponse.json(
          { error: 'Failed to fetch summary' },
          { status: 500 }
        )
      }

      const summaryRows = data as InteractionSummaryRow[] | null

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
      return NextResponse.json(validatedSummary)
    }

    const type = normalizeInteractionType(queryParams.type)

    if (!type) {
      return NextResponse.json(
        { error: 'Invalid type parameter' },
        { status: 400 }
      )
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
      .eq('user_id', user.id)
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
      console.error('Interactions list fetch timed out or failed:', e)
      return NextResponse.json(
        { error: `Failed to fetch ${type} properties` },
        { status: 504 }
      )
    }

    const { data, error } = queryResult
    const typedData = data as InteractionWithProperty[] | null

    if (error) {
      console.error('Interactions list failed:', error)
      return NextResponse.json(
        { error: `Failed to fetch ${type} properties` },
        { status: 500 }
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

    return NextResponse.json({ items, nextCursor })
  } catch (err) {
    console.error('GET /api/interactions unexpected error:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = createApiClient(request)
    const { data, error: authError } = await supabase.auth.getUser()
    const user = data?.user

    console.log('[Interactions DELETE] Auth result:', {
      userId: user?.id,
      error: authError?.message,
    })

    if (authError || !user) {
      return ApiErrorHandler.unauthorized()
    }

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

    console.log('[Interactions DELETE] Attempting delete:', {
      userId: user.id,
      propertyId,
    })

    // Use select() to get back deleted rows and verify the delete worked
    const { data: deletedRows, error } = await supabase
      .from('user_property_interactions')
      .delete()
      .match({ user_id: user.id, property_id: propertyId })
      .select()

    console.log('[Interactions DELETE] Result:', {
      deletedCount: deletedRows?.length ?? 0,
      error: error?.message,
    })

    if (error) {
      console.error('[Interactions DELETE] Error:', error)
      return ApiErrorHandler.serverError('Failed to delete interaction', error)
    }

    if (!deletedRows || deletedRows.length === 0) {
      console.warn(
        '[Interactions DELETE] No rows deleted - interaction may not exist or RLS blocked'
      )
    }

    return ApiErrorHandler.success({
      deleted: true,
      count: deletedRows?.length ?? 0,
    })
  } catch (err) {
    console.error('[Interactions DELETE] Unexpected error:', err)
    return ApiErrorHandler.serverError('Failed to delete interaction', err)
  }
}
