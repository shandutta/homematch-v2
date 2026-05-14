/**
 * @module MutualLikesAPI
 * @description API endpoint for retrieving properties liked by multiple household members.
 * Provides mutual likes data with optional property details enrichment.
 */

import { NextRequest } from 'next/server'
import { createApiClient } from '@/lib/supabase/server'
import { getServiceRoleClient } from '@/lib/supabase/service-role-client'
import { requireUserFromRequest } from '@/lib/api/auth'
import { CouplesService } from '@/lib/services/couples'
import { withRateLimit } from '@/lib/middleware/rateLimiter'
import { noStoreJson } from '@/lib/api/cache-control'
import { ApiErrorHandler } from '@/lib/api/errors'

/**
 * GET /api/couples/mutual-likes
 *
 * Retrieves all properties that have been liked by multiple household members
 *
 * @param {NextRequest} request - The incoming request object
 * @query {string} [includeProperties=true] - Whether to include full property details
 *
 * @returns {Promise<NextResponse>} JSON response with mutual likes data
 * @returns {200} Success - Returns array of mutual likes with optional property details
 * @returns {401} Unauthorized - User is not authenticated
 * @returns {500} Internal Server Error - Failed to fetch mutual likes
 *
 * @description
 * This endpoint fetches all properties that have been liked by 2 or more household members.
 * It uses the CouplesService which implements caching and optimized database queries.
 * Property details can be optionally included to reduce client-side API calls.
 *
 * @complexity O(n) where n is the number of mutual likes
 * @performance Cached responses return in <100ms, fresh queries in 200-500ms
 * @callsTo CouplesService.getMutualLikes, supabase.from('properties')
 *
 * @example
 * // Fetch mutual likes with property details
 * GET /api/couples/mutual-likes?includeProperties=true
 *
 * // Response
 * {
 *   "mutualLikes": [
 *     {
 *       "property_id": "123",
 *       "liked_by_count": 2,
 *       "first_liked_at": "2024-01-01T00:00:00Z",
 *       "last_liked_at": "2024-01-02T00:00:00Z",
 *       "property": {
 *         "address": "123 Main St",
 *         "price": 500000,
 *         "bedrooms": 3,
 *         "bathrooms": 2
 *       }
 *     }
 *   ],
 *   "performance": {
 *     "totalTime": 150,
 *     "cached": false,
 *     "count": 1
 *   }
 * }
 */
export async function GET(request: NextRequest) {
  // Apply rate limiting (30 requests per minute for standard tier)
  return withRateLimit(request, async () => {
    const startTime = Date.now()

    try {
      const supabase = createApiClient(request)

      const auth = await requireUserFromRequest(supabase, request)
      if (!auth.user) return auth.response
      const { user } = auth

      // Parse query parameters
      const searchParams = request.nextUrl.searchParams
      const includePropertyDetails =
        searchParams.get('includeProperties') !== 'false'

      // @service-role-capability: Phase 5 dropped the user_profiles self-read
      // policy that CouplesService.getUserHousehold relied on (and the
      // user_property_interactions self-read policy that
      // getMutualLikesFallback relied on). Clerk users have no Supabase
      // session anyway, so the anon-key reads return 0 rows. The Clerk
      // session is already verified above; passing the service-role client
      // scopes the reads through user_id / household_id WHERE clauses
      // resolved from that verified session.
      // TODO(D1 follow-up): replace with a constrained
      // get_mutual_likes_for_user_id RPC that the service can call
      // through anon-key.
      const readClient = await getServiceRoleClient({
        approvedCapability: 'clerk-couples-read',
      })

      // Get mutual likes for the user's household (now cached and optimized)
      // Add timeout to prevent hanging
      const mutualLikesPromise = CouplesService.getMutualLikes(
        readClient,
        user.id
      )

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error('Mutual likes fetch timed out')),
          10000
        )
      )

      const mutualLikes = await Promise.race([
        mutualLikesPromise,
        timeoutPromise,
      ])

      if (mutualLikes.length === 0) {
        const totalTime = Date.now() - startTime
        return noStoreJson({
          mutualLikes: [],
          performance: {
            totalTime,
            cached: totalTime < 100, // Likely cached if very fast
            count: 0,
          },
        })
      }

      let enrichedLikes = mutualLikes

      // Fetch property details if requested
      if (includePropertyDetails) {
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
      }

      const totalTime = Date.now() - startTime

      return noStoreJson({
        mutualLikes: enrichedLikes,
        performance: {
          totalTime,
          cached: totalTime < 100, // Likely cached if very fast
          count: enrichedLikes.length,
        },
      })
    } catch (error) {
      console.error('Error in mutual-likes API:', error)
      return ApiErrorHandler.serverError('Failed to fetch mutual likes', error)
    }
  })
}
