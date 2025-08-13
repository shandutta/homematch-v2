import { NextRequest, NextResponse } from 'next/server'
import { createApiClient } from '@/lib/supabase/server'
import { CouplesService } from '@/lib/services/couples'

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

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams
    const includePropertyDetails =
      searchParams.get('includeProperties') !== 'false'

    // Get mutual likes for the user's household (now cached and optimized)
    const mutualLikes = await CouplesService.getMutualLikes(supabase, user.id)

    if (mutualLikes.length === 0) {
      return NextResponse.json({
        mutualLikes: [],
        performance: {
          totalTime: Date.now() - startTime,
          cached: false,
        },
      })
    }

    let enrichedLikes = mutualLikes

    // Fetch property details if requested
    if (includePropertyDetails) {
      const propertyQueryStart = Date.now()
      const propertyIds = mutualLikes.map((ml) => ml.property_id)

      const { data: properties, error: propertiesError } = await supabase
        .from('properties')
        .select(
          'id, address, price, bedrooms, bathrooms, square_feet, property_type, images, listing_status'
        )
        .in('id', propertyIds)

      if (propertiesError) {
        console.error(
          '[MutualLikes API] Error fetching properties:',
          propertiesError
        )
        // Continue without property details rather than failing
      }

      // Merge property data with mutual likes
      enrichedLikes = mutualLikes.map((like) => {
        const property = properties?.find((p) => p.id === like.property_id)
        return {
          ...like,
          property: property || null,
        }
      })

      console.log(
        `[MutualLikes API] Property details fetched in ${Date.now() - propertyQueryStart}ms`
      )
    }

    const totalTime = Date.now() - startTime
    console.log(
      `[MutualLikes API] Total request time: ${totalTime}ms for ${enrichedLikes.length} mutual likes`
    )

    return NextResponse.json({
      mutualLikes: enrichedLikes,
      performance: {
        totalTime,
        cached: totalTime < 100, // Likely cached if very fast
        count: enrichedLikes.length,
      },
    })
  } catch (error) {
    console.error('Error in mutual-likes API:', error)
    return NextResponse.json(
      { error: 'Failed to fetch mutual likes' },
      { status: 500 }
    )
  }
}
