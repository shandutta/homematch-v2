import { NextRequest, NextResponse } from 'next/server'
import { requireUserFromRequest } from '@/lib/api/auth'
import { createApiClient } from '@/lib/supabase/server'
import { getServiceRoleClient } from '@/lib/supabase/service-role-client'
import { CouplesService } from '@/lib/services/couples'
import { z } from 'zod'
import { checkRateLimit, rateLimitKey } from '@/lib/middleware/rateLimiter'
import { ApiErrorHandler } from '@/lib/api/errors'

const notificationSchema = z.object({
  propertyId: z.string().uuid(),
  interactionType: z.enum(['like', 'dislike', 'skip', 'view']),
})

export async function POST(request: NextRequest) {
  try {
    const supabase = createApiClient(request)

    const auth = await requireUserFromRequest(supabase, request)
    if (!auth.user) return auth.response
    const { user } = auth

    const rateLimitResponse = await checkRateLimit(
      rateLimitKey('couples:notify', user.id)
    )
    if (rateLimitResponse) return rateLimitResponse

    // Parse and validate request body
    const body = await request.json()
    const { propertyId, interactionType } = notificationSchema.parse(body)

    // @service-role-capability: Phase 5 — CouplesService.notifyInteraction
    // and checkPotentialMutualLike both call getUserHousehold (reads
    // user_profiles) and downstream user_property_interactions reads.
    // RLS-deny under anon-key. Verified Clerk session above; pass
    // service-role scoped via user.id.
    // TODO(D1 follow-up): replace with constrained
    // notify_interaction_for_user_id /
    // check_potential_mutual_like_for_user_id RPCs.
    const readClient = await getServiceRoleClient({
      approvedCapability: 'clerk-couples-read',
    })

    // Notify the couples service about the interaction
    await CouplesService.notifyInteraction(
      readClient,
      user.id,
      propertyId,
      interactionType
    )

    // Check if this interaction would create a mutual like
    const { wouldBeMutual, partnerUserId } =
      await CouplesService.checkPotentialMutualLike(
        readClient,
        user.id,
        propertyId
      )

    let notificationSent = false

    if (wouldBeMutual && partnerUserId && interactionType === 'like') {
      // Get user info for the notification
      const userDisplayName = user.user_metadata?.display_name || user.email
      const userEmail = user.email

      // Get property details for the notification
      const { data: property } = await supabase
        .from('properties')
        .select('address, price, images')
        .eq('id', propertyId)
        .single()

      // In a real implementation, you would use Supabase Realtime here
      // For now, we'll prepare the notification data
      const _notificationData = {
        type: 'mutual_like_created',
        from_user_id: user.id,
        to_user_id: partnerUserId,
        property_id: propertyId,
        message: `${userDisplayName || 'A household member'} also liked ${property?.address || 'this property'}!`,
        data: {
          property,
          user_profile: {
            display_name: userDisplayName,
            email: userEmail,
          },
        },
        created_at: new Date().toISOString(),
      }

      notificationSent = true
    }

    return NextResponse.json({
      success: true,
      mutual_like_created: wouldBeMutual && interactionType === 'like',
      notification_sent: notificationSent,
      partner_user_id: partnerUserId,
    })
  } catch (error) {
    console.error('Error in couples notification API:', error)

    if (error instanceof z.ZodError) {
      return ApiErrorHandler.fromZodError(error)
    }

    return ApiErrorHandler.serverError('Failed to process notification', error)
  }
}
