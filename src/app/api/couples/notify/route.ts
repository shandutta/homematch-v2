import { NextRequest, NextResponse } from 'next/server'
import { createApiClient } from '@/lib/supabase/server'
import { CouplesService } from '@/lib/services/couples'
import { z } from 'zod'

const notificationSchema = z.object({
  propertyId: z.string().uuid(),
  interactionType: z.enum(['like', 'dislike', 'skip', 'view']),
})

export async function POST(request: NextRequest) {
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

    // Parse and validate request body
    const body = await request.json()
    const { propertyId, interactionType } = notificationSchema.parse(body)

    // Notify the couples service about the interaction
    await CouplesService.notifyInteraction(
      supabase,
      user.id,
      propertyId,
      interactionType
    )

    // Check if this interaction would create a mutual like
    const { wouldBeMutual, partnerUserId } =
      await CouplesService.checkPotentialMutualLike(
        supabase,
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
        message: `${userDisplayName || 'Your partner'} also liked ${property?.address || 'this property'}!`,
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
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to process notification' },
      { status: 500 }
    )
  }
}
