import {
  UserProfile,
  UserProfileInsert,
  UserProfileUpdate,
  Household,
  HouseholdInsert,
  HouseholdUpdate,
  HouseholdInvitation,
  HouseholdInvitationInsert,
  HouseholdInvitationUpdate,
  UserPropertyInteraction,
  UserPropertyInteractionInsert,
  SavedSearch,
  SavedSearchInsert,
  SavedSearchUpdate,
} from '@/types/database'
import { BaseService } from './base'
import type { ISupabaseClientFactory } from './interfaces'

export class UserService extends BaseService {
  constructor(clientFactory?: ISupabaseClientFactory) {
    super(clientFactory)
  }

  // User Profile Operations
  async getUserProfile(userId: string): Promise<UserProfile | null> {
    return this.executeSingleQuery(
      'fetching user profile',
      async (supabase) => {
        const { data, error } = await supabase
          .from('user_profiles')
          .select(
            'clerk_user_id, created_at, display_name, email, household_id, id, onboarding_completed, preferences, updated_at'
          )
          .eq('id', userId)
          .single()

        if (error) {
          if (this.isNotFoundError(error)) {
            return null
          }
          this.handleSupabaseError(error, 'fetching user profile', { userId })
        }

        return data
      }
    )
  }

  async createUserProfile(
    profile: UserProfileInsert
  ): Promise<UserProfile | null> {
    return this.executeSingleQuery(
      'creating user profile',
      async (supabase) => {
        const sanitizedProfile = this.sanitizeInput(profile)
        const { data, error } = await supabase
          .from('user_profiles')
          .insert(sanitizedProfile)
          .select()
          .single()

        if (error) {
          this.handleSupabaseError(error, 'creating user profile', { profile })
        }

        return data
      }
    )
  }

  async updateUserProfile(
    userId: string,
    updates: UserProfileUpdate
  ): Promise<UserProfile | null> {
    return this.executeSingleQuery(
      'updating user profile',
      async (supabase) => {
        const sanitizedUpdates = this.sanitizeInput(updates)
        const { data, error } = await supabase
          .from('user_profiles')
          .update({ ...sanitizedUpdates, updated_at: new Date().toISOString() })
          .eq('id', userId)
          .select()
          .single()

        if (error) {
          this.handleSupabaseError(error, 'updating user profile', {
            userId,
            updates,
          })
        }

        return data
      }
    )
  }

  async getUserProfileWithHousehold(
    userId: string
  ): Promise<(UserProfile & { household?: Household }) | null> {
    return this.executeSingleQuery(
      'fetching user profile with household',
      async (supabase) => {
        // Explicit columns per audit M13 — keeps the wire payload tight
        // and protects against future schema growth adding wide columns
        // that aren't used by callers of this method.
        const { data, error } = await supabase
          .from('user_profiles')
          .select(
            'clerk_user_id, created_at, display_name, email, household_id, id, onboarding_completed, preferences, updated_at, household:households(collaboration_mode, created_at, created_by, id, name, updated_at, user_count)'
          )
          .eq('id', userId)
          .single()

        if (error) {
          if (this.isNotFoundError(error)) {
            return null
          }
          this.handleSupabaseError(
            error,
            'fetching user profile with household',
            { userId }
          )
        }

        return data
          ? {
              ...data,
              household: data.household || undefined,
            }
          : null
      }
    )
  }

  // Household Operations
  async createHousehold(household: HouseholdInsert): Promise<Household | null> {
    const supabase = await this.getSupabase()

    // RLS requires created_by to match auth.uid(); set it when a session exists
    const {
      data: { user },
    } = await supabase.auth.getUser()

    const payload: HouseholdInsert = {
      ...household,
      created_by: household.created_by ?? user?.id,
    }

    const { data, error } = await supabase
      .from('households')
      .insert(payload)
      .select()
      .single()

    if (error) {
      console.error('Error creating household:', error)
      return null
    }

    return data
  }

  async getHousehold(householdId: string): Promise<Household | null> {
    const supabase = await this.getSupabase()
    const { data, error } = await supabase
      .from('households')
      .select(
        'collaboration_mode, created_at, created_by, id, name, updated_at, user_count'
      )
      .eq('id', householdId)
      .single()

    if (error) {
      console.error('Error fetching household:', error)
      return null
    }

    return data
  }

  async updateHousehold(
    householdId: string,
    updates: HouseholdUpdate
  ): Promise<Household | null> {
    const supabase = await this.getSupabase()
    const { data, error } = await supabase
      .from('households')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', householdId)
      .select()
      .single()

    if (error) {
      console.error('Error updating household:', error)
      return null
    }

    return data
  }

  async getHouseholdMembers(householdId: string): Promise<UserProfile[]> {
    const supabase = await this.getSupabase()
    const { data, error } = await supabase
      .from('user_profiles')
      .select(
        'clerk_user_id, created_at, display_name, email, household_id, id, onboarding_completed, preferences, updated_at'
      )
      .eq('household_id', householdId)

    if (error) {
      console.error('Error fetching household members:', error)
      return []
    }

    return data || []
  }

  async joinHousehold(
    userId: string,
    householdId: string
  ): Promise<UserProfile | null> {
    const supabase = await this.getSupabase()

    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('household_id')
      .eq('id', userId)
      .single()

    if (profileError) {
      console.error('Error checking existing household:', profileError)
      return null
    }

    if (profile?.household_id) {
      // Already in a household (either the same or different) - no-op here.
      return this.getUserProfile(userId)
    }

    const updatedProfile = await this.updateUserProfile(userId, {
      household_id: householdId,
    })

    return updatedProfile
  }

  async leaveHousehold(userId: string): Promise<UserProfile | null> {
    const supabase = await this.getSupabase()

    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('household_id')
      .eq('id', userId)
      .single()

    if (profileError) {
      console.error('Error checking household before leave:', profileError)
      return null
    }

    const householdId = profile?.household_id
    if (!householdId) {
      return this.getUserProfile(userId)
    }

    return this.updateUserProfile(userId, { household_id: null })
  }

  async getHouseholdInvitations(
    householdId: string
  ): Promise<HouseholdInvitation[]> {
    return this.executeArrayQuery(
      'fetching household invitations',
      async (supabase) => {
        const { data, error } = await supabase
          .from('household_invitations')
          .select(
            'accepted_at, accepted_by, created_at, created_by, expires_at, household_id, id, invited_email, invited_name, message, status, token, updated_at'
          )
          .eq('household_id', householdId)
          .order('created_at', { ascending: false })

        if (error) {
          this.handleSupabaseError(error, 'fetching household invitations', {
            householdId,
          })
        }

        return data || []
      }
    )
  }

  async createHouseholdInvitation(
    invite: HouseholdInvitationInsert
  ): Promise<HouseholdInvitation | null> {
    return this.executeSingleQuery(
      'creating household invitation',
      async (supabase) => {
        const sanitizedInvite = this.sanitizeInput(invite)
        const { data, error } = await supabase
          .from('household_invitations')
          .insert(sanitizedInvite)
          .select()
          .single()

        if (error) {
          this.handleSupabaseError(error, 'creating household invitation', {
            invite,
          })
        }

        return data
      }
    )
  }

  async updateHouseholdInvitation(
    invitationId: string,
    updates: HouseholdInvitationUpdate
  ): Promise<HouseholdInvitation | null> {
    return this.executeSingleQuery(
      'updating household invitation',
      async (supabase) => {
        const sanitizedUpdates = this.sanitizeInput(updates)
        const { data, error } = await supabase
          .from('household_invitations')
          .update(sanitizedUpdates)
          .eq('id', invitationId)
          .select()
          .single()

        if (error) {
          this.handleSupabaseError(error, 'updating household invitation', {
            invitationId,
            updates,
          })
        }

        return data
      }
    )
  }

  async getHouseholdInvitationByToken(
    token: string
  ): Promise<HouseholdInvitation | null> {
    return this.executeSingleQuery(
      'fetching household invitation by token',
      async (supabase) => {
        const { data, error } = await supabase
          .from('household_invitations')
          .select(
            'accepted_at, accepted_by, created_at, created_by, expires_at, household_id, id, invited_email, invited_name, message, status, token, updated_at'
          )
          .eq('token', token)
          .single()

        if (error) {
          this.handleSupabaseError(
            error,
            'fetching household invitation by token',
            { token }
          )
        }

        return data
      }
    )
  }

  // User Property Interactions
  async recordInteraction(
    interaction: UserPropertyInteractionInsert
  ): Promise<UserPropertyInteraction | null> {
    const supabase = await this.getSupabase()
    const { data, error } = await supabase
      .from('user_property_interactions')
      .upsert(interaction, {
        onConflict: 'user_id,property_id,interaction_type',
      })
      .select()
      .single()

    if (error) {
      console.error('Error recording interaction:', error)
      return null
    }

    return data
  }

  async getUserInteractions(
    userId: string,
    options: { limit?: number; offset?: number } | number = {}
  ): Promise<UserPropertyInteraction[]> {
    // Per audit M15: accept either a legacy `limit` number for backward
    // compatibility, or an options object with `limit` + `offset` for
    // pagination. Limit is clamped to [1, 200]; offset is clamped to >= 0.
    const opts = typeof options === 'number' ? { limit: options } : options
    const limit = Math.min(Math.max(opts.limit ?? 50, 1), 200)
    const offset = Math.max(opts.offset ?? 0, 0)

    const supabase = await this.getSupabase()
    const { data, error } = await supabase
      .from('user_property_interactions')
      .select(
        'created_at, household_id, id, interaction_type, property_id, score_data, user_id'
      )
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('Error fetching user interactions:', error)
      return []
    }

    return data || []
  }

  async getPropertyInteractions(
    propertyId: string
  ): Promise<UserPropertyInteraction[]> {
    const supabase = await this.getSupabase()
    const { data, error } = await supabase
      .from('user_property_interactions')
      .select(
        'created_at, household_id, id, interaction_type, property_id, score_data, user_id'
      )
      .eq('property_id', propertyId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching property interactions:', error)
      return []
    }

    return data || []
  }

  async getUserInteractionsByType(
    userId: string,
    type: 'like' | 'dislike' | 'skip' | 'view'
  ): Promise<UserPropertyInteraction[]> {
    const supabase = await this.getSupabase()
    const { data, error } = await supabase
      .from('user_property_interactions')
      .select(
        'created_at, household_id, id, interaction_type, property_id, score_data, user_id'
      )
      .eq('user_id', userId)
      .eq('interaction_type', type)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching user interactions by type:', error)
      return []
    }

    return data || []
  }

  async getUserInteractionsByTypes(
    userId: string,
    types: Array<'like' | 'dislike' | 'skip' | 'view'>
  ): Promise<UserPropertyInteraction[]> {
    if (types.length === 0) return []
    const supabase = await this.getSupabase()
    const { data, error } = await supabase
      .from('user_property_interactions')
      .select(
        'created_at, household_id, id, interaction_type, property_id, score_data, user_id'
      )
      .eq('user_id', userId)
      .in('interaction_type', types)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching user interactions by types:', error)
      return []
    }

    return data || []
  }

  // Saved Searches
  async createSavedSearch(
    search: SavedSearchInsert
  ): Promise<SavedSearch | null> {
    const supabase = await this.getSupabase()
    const { data, error } = await supabase
      .from('saved_searches')
      .insert(search)
      .select()
      .single()

    if (error) {
      console.error('Error creating saved search:', error)
      return null
    }

    return data
  }

  async getUserSavedSearches(
    userId: string,
    options: { limit?: number; offset?: number } = {}
  ): Promise<SavedSearch[]> {
    // Per audit M15: support pagination. Limit is clamped to [1, 200];
    // offset is clamped to >= 0. Default limit = 50.
    const limit = Math.min(Math.max(options.limit ?? 50, 1), 200)
    const offset = Math.max(options.offset ?? 0, 0)

    const supabase = await this.getSupabase()
    const { data, error } = await supabase
      .from('saved_searches')
      .select('created_at, filters, household_id, id, is_active, name, user_id')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('Error fetching saved searches:', error)
      return []
    }

    return data || []
  }

  async updateSavedSearch(
    searchId: string,
    updates: SavedSearchUpdate
  ): Promise<SavedSearch | null> {
    const supabase = await this.getSupabase()
    const { data, error } = await supabase
      .from('saved_searches')
      .update(updates)
      .eq('id', searchId)
      .select()
      .single()

    if (error) {
      console.error('Error updating saved search:', error)
      return null
    }

    return data
  }

  async deleteSavedSearch(searchId: string): Promise<boolean> {
    const supabase = await this.getSupabase()
    const { error } = await supabase
      .from('saved_searches')
      .update({ is_active: false })
      .eq('id', searchId)

    if (error) {
      console.error('Error deleting saved search:', error)
      return false
    }

    return true
  }

  // Analytics and Insights
  async getUserActivitySummary(userId: string) {
    const [likes, passes, views, savedSearches] = await Promise.all([
      this.getUserInteractionsByType(userId, 'like'),
      this.getUserInteractionsByTypes(userId, ['dislike', 'skip']),
      this.getUserInteractionsByType(userId, 'view'),
      this.getUserSavedSearches(userId),
    ])

    return {
      likes: likes.length,
      dislikes: passes.length,
      views: views.length,
      saved_searches: savedSearches.length,
      total_interactions: likes.length + passes.length + views.length,
    }
  }

  async getHouseholdActivitySummary(householdId: string) {
    const members = await this.getHouseholdMembers(householdId)

    const activities = await Promise.all(
      members.map((member) => this.getUserActivitySummary(member.id))
    )

    return {
      members: members.length,
      total_likes: activities.reduce(
        (sum, activity) => sum + activity.likes,
        0
      ),
      total_dislikes: activities.reduce(
        (sum, activity) => sum + activity.dislikes,
        0
      ),
      total_views: activities.reduce(
        (sum, activity) => sum + activity.views,
        0
      ),
      total_saved_searches: activities.reduce(
        (sum, activity) => sum + activity.saved_searches,
        0
      ),
      total_interactions: activities.reduce(
        (sum, activity) => sum + activity.total_interactions,
        0
      ),
    }
  }
}
