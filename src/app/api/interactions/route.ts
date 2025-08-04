import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { InteractionType } from '@/types/app'
import { Property } from '@/types/database'
import { ApiErrorHandler } from '@/lib/api/errors'
import { apiRateLimiter } from '@/lib/utils/rate-limit'
import {
  createInteractionRequestSchema,
  interactionSummarySchema,
  paginationQuerySchema
} from '@/lib/schemas/api'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return ApiErrorHandler.unauthorized()
    }

    // Rate limiting
    const rateLimitResult = await apiRateLimiter.check(user.id)
    if (!rateLimitResult.success) {
      return ApiErrorHandler.badRequest('Too many requests. Please try again later.')
    }

    const body = await request.json()
    const parsed = createInteractionRequestSchema.safeParse(body)
    if (!parsed.success) {
      return ApiErrorHandler.fromZodError(parsed.error)
    }

    const { propertyId, type } = parsed.data

    // Clear any previous interaction for this user/property to enforce a single definitive state
    const { error: deleteError } = await supabase
      .from('user_property_interactions')
      .delete()
      .match({ user_id: user.id, property_id: propertyId })

    if (deleteError) {
      // Not fatal; insert might still succeed if no matching row existed
      console.warn('Warning deleting previous interaction:', deleteError.message)
    }

    // Insert the new interaction
    const { data: newInteraction, error: insertError } = await supabase
      .from('user_property_interactions')
      .insert({
        user_id: user.id,
        property_id: propertyId,
        interaction_type: type,
      })
      .select()
      .single()

    if (insertError) {
      console.error('Insert interaction failed:', insertError)
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
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const queryParams = {
      type: searchParams.get('type'),
      cursor: searchParams.get('cursor'),
      limit: searchParams.get('limit')
    }
    
    const type = queryParams.type as InteractionType | 'summary' | null

    if (!type) {
      return NextResponse.json(
        { error: 'Missing type query parameter' },
        { status: 400 }
      )
    }

    if (type === 'summary') {
      // Aggregate counts grouped by interaction_type for current user
      // Supabase JS doesn't support SQL GROUP BY directly via .group().
      // Use RPC to aggregate counts per type for the current user.
      const { data, error } = await supabase.rpc('get_user_interaction_summary', {
        p_user_id: user.id,
      })

      if (error) {
        console.error('Summary fetch failed:', error)
        return NextResponse.json(
          { error: 'Failed to fetch summary' },
          { status: 500 }
        )
      }

      // Define the expected shape of the RPC response for type safety
      type InteractionSummaryRow = {
        interaction_type: InteractionType
        count: number
      }
      const typedData = data as InteractionSummaryRow[] | null

      const summaryData = {
        liked: typedData?.find(d => d.interaction_type === 'liked')?.count ?? 0,
        passed: typedData?.find(d => d.interaction_type === 'skip')?.count ?? 0,
        viewed: typedData?.find(d => d.interaction_type === 'viewed')?.count ?? 0
      }

      // Validate response against schema
      const validatedSummary = interactionSummarySchema.parse(summaryData)
      return NextResponse.json(validatedSummary)
    }

    if (!['viewed', 'liked', 'skip'].includes(type)) {
      return NextResponse.json(
        { error: 'Invalid type parameter' },
        { status: 400 }
      )
    }

    const paginationQuery = paginationQuerySchema.parse({
      cursor: queryParams.cursor,
      limit: queryParams.limit || '12'
    })
    const { cursor, limit } = paginationQuery

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
      .eq('interaction_type', type)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (cursor) {
      // Use created_at cursor pagination (fetch rows older than cursor)
      query = query.lt('created_at', cursor)
    }

    const { data, error } = await query

    if (error) {
      console.error('Interactions list failed:', error)
      return NextResponse.json(
        { error: `Failed to fetch ${type} properties` },
        { status: 500 }
      )
    }

    // Define the expected shape of the query response for type safety
    // Supabase returns the joined table as an array, even for a to-one relationship.
    type InteractionWithProperty = {
      created_at: string
      property: Property[] | null // It's an array
    }
    const typedData = data as InteractionWithProperty[] | null

    // Flatten the structure: take the first property from the array.
    const items = (typedData ?? [])
      .map(row => (row.property ? row.property[0] : null))
      .filter(Boolean)

    const nextCursor =
      (data?.length ?? 0) === limit ? data?.[data.length - 1]?.created_at : null

    return NextResponse.json({ items, nextCursor })
  } catch (err) {
    console.error('GET /api/interactions unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
