/* eslint-disable @typescript-eslint/consistent-type-assertions */
import { NextRequest, NextResponse } from 'next/server'
import { createApiClient } from '@/lib/supabase/server'
import { requireUserFromRequest } from '@/lib/api/auth'
import { noStoreJson } from '@/lib/api/cache-control'
import { ApiErrorHandler } from '@/lib/api/errors'

export async function GET(request: NextRequest) {
  const supabase = createApiClient(request)

  const auth = await requireUserFromRequest(supabase, request)
  if (!auth.user) return auth.response
  const { user } = auth

  const propertyId = request.nextUrl.searchParams.get('propertyId')
  if (!propertyId) {
    return NextResponse.json('propertyId is required', { status: 400 })
  }

  const { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .select('id, household_id')
    .eq('id', user.id)
    .maybeSingle()

  if (profileError) {
    return ApiErrorHandler.serverError('Failed to fetch profile', profileError)
  }

  const householdId =
    (profile as { id: string; household_id: string | null } | null)
      ?.household_id ?? null

  if (!householdId) {
    return noStoreJson({ reactions: [], householdId: null })
  }

  const { data: interactionsData } = await supabase
    .from('user_property_interactions')
    .select('user_id, interaction_type, created_at')
    .eq('property_id', propertyId)
    .eq('household_id', householdId)
    .order('created_at', { ascending: false })
    .maybeSingle()

  const interactions = (
    interactionsData as Array<{
      user_id: string
      interaction_type: string
      created_at: string
    }> | null
  ) ?? []

  if (!interactions.length) {
    return noStoreJson({ reactions: [], householdId })
  }

  // Deduplicate: keep most-recent interaction per user
  const seen = new Set<string>()
  const deduped = interactions.filter((i) => {
    if (seen.has(i.user_id)) return false
    seen.add(i.user_id)
    return true
  })

  const userIds = deduped.map((i) => i.user_id)
  const { data: profilesData } = await supabase
    .from('user_profiles')
    .select('id, display_name')
    .in('id', userIds)
    .maybeSingle()

  const profiles = (
    profilesData as Array<{ id: string; display_name: string | null }> | null
  ) ?? []

  const profileMap = new Map(profiles.map((p) => [p.id, p.display_name]))

  const reactions = deduped.map((i) => ({
    user_id: i.user_id,
    display_name: profileMap.get(i.user_id) ?? 'Household member',
    interaction_type: i.interaction_type,
    created_at: i.created_at,
  }))

  return noStoreJson({ reactions, householdId })
}

export async function POST() {
  return NextResponse.json('Method not allowed', { status: 405 })
}
export async function PUT() {
  return NextResponse.json('Method not allowed', { status: 405 })
}
export async function DELETE() {
  return NextResponse.json('Method not allowed', { status: 405 })
}
export async function PATCH() {
  return NextResponse.json('Method not allowed', { status: 405 })
}
