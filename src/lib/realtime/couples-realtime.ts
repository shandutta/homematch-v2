import { createClient } from '@/lib/supabase/client'
import type { RealtimeChannel } from '@supabase/supabase-js'
// import type { Database } from '@/types/supabase'

// type PropertyInteractionPayload = Database['public']['Tables']['user_property_interactions']['Row']
type PropertyInteractionPayload = {
  id: string
  user_id: string
  property_id: string
  household_id: string
  interaction_type: string
  score_data: Record<string, unknown> | null
  created_at: string
}

interface CouplesRealtimeCallbacks {
  onMutualLike?: (data: {
    propertyId: string
    partnerUserId: string
    partnerName: string
    propertyAddress: string
  }) => void
  onPartnerActivity?: (data: {
    userId: string
    userName: string
    propertyId: string
    interactionType: string
    timestamp: string
  }) => void
  onHouseholdStatsUpdate?: () => void
}

export class CouplesRealtime {
  private supabase = createClient()
  private channel: RealtimeChannel | null = null
  private householdId: string | null = null
  private callbacks: CouplesRealtimeCallbacks = {}

  /**
   * Subscribe to real-time updates for a household
   */
  async subscribe(
    householdId: string,
    callbacks: CouplesRealtimeCallbacks
  ): Promise<void> {
    try {
      this.householdId = householdId
      this.callbacks = callbacks

      // Unsubscribe from any existing channel
      await this.unsubscribe()

      // Create a new channel for the household
      this.channel = this.supabase.channel(`couples:${householdId}`)

      // Listen for property interactions in this household
      this.channel
        .on(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          'postgres_changes' as any,
          {
            event: 'INSERT',
            schema: 'public',
            table: 'user_property_interactions',
            filter: `household_id=eq.${householdId}`,
          },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          this.handlePropertyInteraction.bind(this) as any
        )
        .on(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          'postgres_changes' as any,
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'user_property_interactions',
            filter: `household_id=eq.${householdId}`,
          },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          this.handlePropertyInteraction.bind(this) as any
        )
        .subscribe((status) => {
          if (process.env.NODE_ENV === 'development') {
            console.log(`[CouplesRealtime] Subscription status: ${status}`)
          }
        })
    } catch (error) {
      console.error(
        '[CouplesRealtime] Error subscribing to real-time updates:',
        error
      )
    }
  }

  /**
   * Unsubscribe from real-time updates
   */
  async unsubscribe(): Promise<void> {
    if (this.channel) {
      await this.supabase.removeChannel(this.channel)
      this.channel = null
    }
    this.householdId = null
    this.callbacks = {}
  }

  /**
   * Handle property interaction events
   */
  private async handlePropertyInteraction(payload: {
    eventType: 'INSERT' | 'UPDATE'
    new: PropertyInteractionPayload
    old?: PropertyInteractionPayload
  }): Promise<void> {
    try {
      const interaction = payload.new

      // Get current user ID to check if this interaction is from partner
      const {
        data: { user },
      } = await this.supabase.auth.getUser()
      if (!user || interaction.user_id === user.id) {
        // Don't process our own interactions
        return
      }

      // Notify about partner activity
      if (this.callbacks.onPartnerActivity) {
        const { data: profile } = await this.supabase
          .from('user_profiles')
          .select('display_name, email')
          .eq('id', interaction.user_id)
          .single()
        const userDisplayName =
          profile?.display_name || profile?.email || 'Household member'

        this.callbacks.onPartnerActivity({
          userId: interaction.user_id,
          userName: userDisplayName,
          propertyId: interaction.property_id,
          interactionType: interaction.interaction_type,
          timestamp: interaction.created_at,
        })
      }

      // Check if this interaction creates a mutual like
      if (
        interaction.interaction_type === 'like' &&
        this.callbacks.onMutualLike
      ) {
        const { data: myLike } = await this.supabase
          .from('user_property_interactions')
          .select('id')
          .eq('user_id', user.id)
          .eq('property_id', interaction.property_id)
          .eq('interaction_type', 'like')
          .single()

        if (myLike) {
          // This creates a mutual like!
          const { data: profile } = await this.supabase
            .from('user_profiles')
            .select('display_name, email')
            .eq('id', interaction.user_id)
            .single()
          const userDisplayName =
            profile?.display_name || profile?.email || 'Household member'

          const { data: property } = await this.supabase
            .from('properties')
            .select('address')
            .eq('id', interaction.property_id)
            .single()

          this.callbacks.onMutualLike({
            propertyId: interaction.property_id,
            partnerUserId: interaction.user_id,
            partnerName: userDisplayName,
            propertyAddress: property?.address || 'Unknown property',
          })
        }
      }

      // Update household stats
      if (this.callbacks.onHouseholdStatsUpdate) {
        this.callbacks.onHouseholdStatsUpdate()
      }
    } catch (error) {
      console.error(
        '[CouplesRealtime] Error handling property interaction:',
        error
      )
    }
  }

  /**
   * Send a real-time message to the partner (for custom notifications)
   */
  async sendMessage(
    type: string,
    data: Record<string, unknown>
  ): Promise<void> {
    if (!this.channel) return

    try {
      await this.channel.send({
        type: 'broadcast',
        event: 'couples_message',
        payload: {
          type,
          data,
          timestamp: new Date().toISOString(),
        },
      })
    } catch (error) {
      console.error('[CouplesRealtime] Error sending message:', error)
    }
  }

  /**
   * Get the current household ID
   */
  getHouseholdId(): string | null {
    return this.householdId
  }

  /**
   * Check if currently subscribed to real-time updates
   */
  isSubscribed(): boolean {
    return this.channel !== null
  }
}
