import { createClient } from '@/lib/supabase/client'
import type { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js'
import type { AppDatabase } from '@/types/app-database'

type PropertyInteractionPayload =
  AppDatabase['public']['Tables']['user_property_interactions']['Row']

type RealtimeMutualLikePayload =
  AppDatabase['public']['Functions']['get_realtime_mutual_like_payload']['Returns'][number]

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const toRealtimeMutualLikePayload = (
  value: unknown
): RealtimeMutualLikePayload | null => {
  if (!isRecord(value) || typeof value.has_mutual_like !== 'boolean') {
    return null
  }

  return {
    has_mutual_like: value.has_mutual_like,
    partner_name:
      typeof value.partner_name === 'string' ? value.partner_name : null,
    property_address:
      typeof value.property_address === 'string' ? value.property_address : null,
  }
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
  private supabasePromise: Promise<SupabaseClient<AppDatabase>> | null = null

  private async _getSupabase(): Promise<SupabaseClient<AppDatabase>> {
    if (!this.supabasePromise) {
      this.supabasePromise = createClient()
    }
    return this.supabasePromise
  }
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
      const supabase = await this._getSupabase()
      this.channel = supabase.channel(`couples:${householdId}`)
      const channel = this.channel

      // Listen for property interactions in this household
      channel
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'user_property_interactions',
            filter: `household_id=eq.${householdId}`,
          },
          this.handlePropertyInteraction.bind(this)
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'user_property_interactions',
            filter: `household_id=eq.${householdId}`,
          },
          this.handlePropertyInteraction.bind(this)
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
      const supabase = await this._getSupabase()
      await supabase.removeChannel(this.channel)
      this.channel = null
    }
    this.householdId = null
    this.callbacks = {}
  }

  /**
   * Handle property interaction events
   */
  private async handlePropertyInteraction(payload: {
    eventType?: string
    new?: Record<string, unknown>
    old?: Record<string, unknown>
  }): Promise<void> {
    try {
      if (payload.eventType !== 'INSERT' && payload.eventType !== 'UPDATE') {
        return
      }
      if (!payload.new) return
      const isInteractionPayload = (
        value: unknown
      ): value is PropertyInteractionPayload =>
        typeof value === 'object' &&
        value !== null &&
        'id' in value &&
        'user_id' in value &&
        'property_id' in value &&
        'household_id' in value &&
        'interaction_type' in value &&
        'created_at' in value
      if (!isInteractionPayload(payload.new)) return
      const interaction = payload.new

      const supabase = await this._getSupabase()

      // Get current user ID to check if this interaction is from partner
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user || interaction.user_id === user.id) {
        // Don't process our own interactions
        return
      }

      // Notify about partner activity
      if (this.callbacks.onPartnerActivity) {
        const { data: profile } = await supabase
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
          timestamp: interaction.created_at ?? new Date().toISOString(),
        })
      }

      // Check if this interaction creates a mutual like
      if (
        interaction.interaction_type === 'like' &&
        this.callbacks.onMutualLike
      ) {
        const { data: mutualPayload } = await supabase.rpc(
          'get_realtime_mutual_like_payload',
          {
            p_current_user_id: user.id,
            p_partner_user_id: interaction.user_id,
            p_property_id: interaction.property_id,
          }
        )
        const enriched = Array.isArray(mutualPayload)
          ? toRealtimeMutualLikePayload(mutualPayload[0])
          : toRealtimeMutualLikePayload(mutualPayload)

        if (enriched?.has_mutual_like) {
          this.callbacks.onMutualLike({
            propertyId: interaction.property_id,
            partnerUserId: interaction.user_id,
            partnerName: enriched.partner_name || 'Household member',
            propertyAddress: enriched.property_address || 'Unknown property',
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
    const channel = this.channel
    if (!channel) return

    try {
      if (typeof channel.send !== 'function') return
      await channel.send({
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
