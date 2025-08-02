import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { InteractionType } from '@/types/app'
import { Property } from '@/types/database'

const interactionSchema = z.object({
  propertyId: z.string().uuid(),
  type: z.enum(['viewed', 'liked', 'skip']),
})

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const parsed = interactionSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parsed.error.flatten() },
        { status: 400 }
      )
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

    return NextResponse.json({ success: true, interaction: newInteraction })
  } catch (err) {
    console.error('POST /api/interactions unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
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
    const type = searchParams.get('type') as InteractionType | 'summary' | null

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

      const liked =
        typedData?.find(d => d.interaction_type === 'liked')?.count ?? 0
      const passed =
        typedData?.find(d => d.interaction_type === 'skip')?.count ?? 0
      const viewed =
        typedData?.find(d => d.interaction_type === 'viewed')?.count ?? 0

      return NextResponse.json({ liked, passed, viewed })
    }

    if (!['viewed', 'liked', 'skip'].includes(type)) {
      return NextResponse.json(
        { error: 'Invalid type parameter' },
        { status: 400 }
      )
    }

    const cursor = searchParams.get('cursor')
    const limit = parseInt(searchParams.get('limit') || '12', 10)

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
