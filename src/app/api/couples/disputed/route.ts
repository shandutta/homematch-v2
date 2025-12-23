import { NextRequest, NextResponse } from 'next/server'
import { createApiClient } from '@/lib/supabase/server'
import { getServiceRoleClient } from '@/lib/supabase/service-role-client'

export interface DisputedProperty {
  property_id: string
  property: {
    address: string
    price: number
    bedrooms: number
    bathrooms: number
    square_feet?: number
    images?: string[]
    listing_status: string
  }
  partner1: {
    user_id: string
    user_name: string
    user_email: string
    interaction_type: 'like' | 'dislike' | 'skip'
    created_at: string
    score_data?: Record<string, unknown>
    notes?: string
  }
  partner2: {
    user_id: string
    user_name: string
    user_email: string
    interaction_type: 'like' | 'dislike' | 'skip'
    created_at: string
    score_data?: Record<string, unknown>
    notes?: string
  }
  status: 'pending' | 'discussed' | 'resolved' | 'final_pass'
  resolution_type?:
    | 'scheduled_viewing'
    | 'saved_for_later'
    | 'final_pass'
    | 'discussion_needed'
  last_updated: string
}

export async function GET(request: NextRequest) {
  const startTime = Date.now()

  try {
    const supabase = createApiClient(request)

    // Get the current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's household
    const { data: userProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('household_id, display_name, email')
      .eq('id', user.id)
      .single()

    if (profileError || !userProfile?.household_id) {
      return NextResponse.json({ error: 'No household found' }, { status: 404 })
    }

    const serviceClient = await getServiceRoleClient()

    // Get all household members
    const { data: householdMembers, error: householdMembersError } =
      await serviceClient
        .from('user_profiles')
        .select('id, display_name, email')
        .eq('household_id', userProfile.household_id)

    if (householdMembersError) {
      console.error(
        '[Disputed API] Error fetching household members:',
        householdMembersError
      )
      return NextResponse.json(
        { error: 'Failed to fetch household members' },
        { status: 500 }
      )
    }

    if (!householdMembers || householdMembers.length < 2) {
      return NextResponse.json({
        disputedProperties: [],
        performance: {
          totalTime: Date.now() - startTime,
        },
      })
    }

    const resolvedPropertyIds = new Set<string>()
    const { data: resolutions, error: resolutionsError } = await serviceClient
      .from('household_property_resolutions')
      .select('property_id')
      .eq('household_id', userProfile.household_id)

    if (resolutionsError) {
      console.error(
        '[Disputed API] Error fetching resolutions:',
        resolutionsError
      )
    } else {
      for (const resolution of resolutions ?? []) {
        if (resolution?.property_id) {
          resolvedPropertyIds.add(resolution.property_id as string)
        }
      }
    }

    // Query to find properties with conflicting reactions (like vs dislike/skip)
    // or properties where only one person has interacted
    const { data: interactions, error: interactionsError } = await serviceClient
      .from('user_property_interactions')
      .select(
        `
        id,
        user_id,
        property_id,
        interaction_type,
        created_at,
        score_data,
        properties (
          address,
          price,
          bedrooms,
          bathrooms,
          square_feet,
          images,
          listing_status
        )
      `
      )
      .eq('household_id', userProfile.household_id)
      .in('interaction_type', ['like', 'dislike', 'skip'])
      .order('created_at', { ascending: false })

    if (interactionsError) {
      console.error(
        '[Disputed API] Error fetching interactions:',
        interactionsError
      )
      return NextResponse.json(
        { error: 'Failed to fetch property interactions' },
        { status: 500 }
      )
    }

    // Group interactions by property_id
    const propertiesMap = new Map<
      string,
      {
        property: {
          address: string
          price: number
          bedrooms: number
          bathrooms: number
          square_feet?: number
          images?: string[]
          listing_status: string
        } | null
        interactions: Array<{
          user_id: string
          interaction_type: string
          created_at: string
          score_data?: Record<string, unknown>
        }>
      }
    >()

    interactions?.forEach((interaction) => {
      const propertyId = interaction.property_id

      if (resolvedPropertyIds.has(propertyId)) return

      if (!propertiesMap.has(propertyId)) {
        propertiesMap.set(propertyId, {
          property: Array.isArray(interaction.properties)
            ? interaction.properties[0]
            : interaction.properties,
          interactions: [],
        })
      }

      propertiesMap.get(propertyId)!.interactions.push({
        user_id: interaction.user_id,
        interaction_type: interaction.interaction_type,
        created_at: interaction.created_at as string,
        score_data: interaction.score_data as Record<string, unknown>,
      })
    })

    // Find disputed properties (conflicting interactions)
    const disputedProperties: DisputedProperty[] = []

    propertiesMap.forEach((propData, propertyId) => {
      // Only consider properties with interactions from multiple users
      if (propData.interactions.length >= 2) {
        const userInteractions = new Map()

        // Get the latest interaction from each user for this property
        propData.interactions.forEach((interaction) => {
          if (
            !userInteractions.has(interaction.user_id) ||
            new Date(interaction.created_at) >
              new Date(userInteractions.get(interaction.user_id).created_at)
          ) {
            userInteractions.set(interaction.user_id, interaction)
          }
        })

        const interactionArray = Array.from(userInteractions.values())

        // Check if there's a conflict (different interaction types)
        if (interactionArray.length >= 2) {
          const interactionTypes = new Set(
            interactionArray.map((i) => i.interaction_type)
          )

          // Dispute if: like vs dislike/skip, or any conflicting interactions
          const hasConflict =
            interactionTypes.has('like') &&
            (interactionTypes.has('dislike') || interactionTypes.has('skip'))

          if (hasConflict) {
            // Find the two users with conflicting interactions
            const partner1Interaction = interactionArray[0]
            const partner2Interaction = interactionArray[1]

            const partner1Profile = householdMembers.find(
              (m) => m.id === partner1Interaction.user_id
            )
            const partner2Profile = householdMembers.find(
              (m) => m.id === partner2Interaction.user_id
            )

            if (partner1Profile && partner2Profile) {
              disputedProperties.push({
                property_id: propertyId,
                property: {
                  address:
                    (propData.property?.address as string) || 'Unknown Address',
                  price: (propData.property?.price as number) || 0,
                  bedrooms: (propData.property?.bedrooms as number) || 0,
                  bathrooms: (propData.property?.bathrooms as number) || 0,
                  square_feet: propData.property?.square_feet as
                    | number
                    | undefined,
                  images: (propData.property?.images as string[]) || [],
                  listing_status:
                    (propData.property?.listing_status as string) || 'unknown',
                },
                partner1: {
                  user_id: partner1Profile.id,
                  user_name:
                    partner1Profile.display_name ||
                    partner1Profile.email ||
                    'Household member',
                  user_email: partner1Profile.email || '',
                  interaction_type: partner1Interaction.interaction_type as
                    | 'like'
                    | 'dislike'
                    | 'skip',
                  created_at: partner1Interaction.created_at,
                  score_data: partner1Interaction.score_data,
                  notes:
                    (partner1Interaction.score_data?.notes as string) ||
                    undefined,
                },
                partner2: {
                  user_id: partner2Profile.id,
                  user_name:
                    partner2Profile.display_name ||
                    partner2Profile.email ||
                    'Household member',
                  user_email: partner2Profile.email || '',
                  interaction_type: partner2Interaction.interaction_type as
                    | 'like'
                    | 'dislike'
                    | 'skip',
                  created_at: partner2Interaction.created_at,
                  score_data: partner2Interaction.score_data,
                  notes:
                    (partner2Interaction.score_data?.notes as string) ||
                    undefined,
                },
                status: 'pending',
                last_updated: Math.max(
                  new Date(partner1Interaction.created_at).getTime(),
                  new Date(partner2Interaction.created_at).getTime()
                ).toString(),
              })
            }
          }
        }
      }
    })

    // Sort by most recent interactions first
    disputedProperties.sort(
      (a, b) =>
        new Date(b.last_updated).getTime() - new Date(a.last_updated).getTime()
    )

    const totalTime = Date.now() - startTime

    return NextResponse.json({
      disputedProperties,
      performance: {
        totalTime,
        count: disputedProperties.length,
      },
    })
  } catch (error) {
    console.error('Error in disputed properties API:', error)
    return NextResponse.json(
      { error: 'Failed to fetch disputed properties' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = createApiClient(request)

    // Get the current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { property_id, resolution_type } = body

    if (!property_id || !resolution_type) {
      return NextResponse.json(
        { error: 'Property ID and resolution type are required' },
        { status: 400 }
      )
    }

    const allowedResolutionTypes = new Set([
      'scheduled_viewing',
      'saved_for_later',
      'final_pass',
      'discussion_needed',
    ])

    if (!allowedResolutionTypes.has(resolution_type)) {
      return NextResponse.json(
        { error: 'Invalid resolution type' },
        { status: 400 }
      )
    }

    const { data: userProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('household_id')
      .eq('id', user.id)
      .single()

    if (profileError || !userProfile?.household_id) {
      return NextResponse.json({ error: 'No household found' }, { status: 404 })
    }

    const now = new Date().toISOString()
    const serviceClient = await getServiceRoleClient()
    const { error: upsertError } = await serviceClient
      .from('household_property_resolutions')
      .upsert(
        {
          household_id: userProfile.household_id,
          property_id,
          resolution_type,
          resolved_by: user.id,
          resolved_at: now,
          updated_at: now,
        },
        { onConflict: 'household_id,property_id' }
      )

    if (upsertError) {
      console.error(
        '[Disputed API] Error saving resolution:',
        upsertError.message
      )
      return NextResponse.json(
        { error: 'Failed to save resolution' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      property_id,
      resolution_type,
      timestamp: now,
    })
  } catch (error) {
    console.error('Error updating disputed property resolution:', error)
    return NextResponse.json(
      { error: 'Failed to update resolution' },
      { status: 500 }
    )
  }
}
