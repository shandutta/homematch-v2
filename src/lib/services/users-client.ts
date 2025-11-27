'use client'

import { createClient } from '@/lib/supabase/client'
import {
  UserProfile,
  UserProfileInsert,
  UserProfileUpdate,
  Household,
  HouseholdInsert,
  HouseholdInvitation,
  HouseholdInvitationInsert,
  SavedSearch,
  SavedSearchUpdate,
} from '@/types/database'

export class UserServiceClient {
  static async updateProfile(
    userId: string,
    updates: UserProfileUpdate
  ): Promise<UserProfile> {
    const supabase = createClient()

    const { data, error } = await supabase
      .from('user_profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to update user profile: ${error.message}`)
    }

    return data
  }

  static async getProfile(userId: string): Promise<UserProfile | null> {
    const supabase = createClient()

    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return null // Profile not found
      }
      throw new Error(`Failed to get user profile: ${error.message}`)
    }

    return data
  }

  static async createProfile(profile: UserProfileInsert): Promise<UserProfile> {
    const supabase = createClient()

    const { data, error } = await supabase
      .from('user_profiles')
      .insert(profile)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to create user profile: ${error.message}`)
    }

    return data
  }

  // Household Operations
  static async createHousehold(household: HouseholdInsert): Promise<Household> {
    const supabase = createClient()

    // RLS: household inserts must set created_by to the current user
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession()

    if (sessionError || !session?.user) {
      throw new Error('Authentication required to create a household')
    }

    const payload: HouseholdInsert = {
      ...household,
      created_by: session.user.id,
    }

    const { data, error } = await supabase
      .from('households')
      .insert(payload)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to create household: ${error.message}`)
    }

    return data
  }

  static async joinHousehold(
    userId: string,
    householdId: string
  ): Promise<UserProfile> {
    return this.updateProfile(userId, { household_id: householdId })
  }

  static async leaveHousehold(userId: string): Promise<UserProfile> {
    return this.updateProfile(userId, { household_id: null })
  }

  // Household invitations
  static async getHouseholdInvitations(
    householdId: string
  ): Promise<HouseholdInvitation[]> {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('household_invitations')
      .select('*')
      .eq('household_id', householdId)
      .order('created_at', { ascending: false })

    if (error) {
      throw new Error(`Failed to load invites: ${error.message}`)
    }

    return data || []
  }

  static async createHouseholdInvitation(
    invite: Omit<
      HouseholdInvitationInsert,
      'status' | 'token' | 'created_at' | 'expires_at' | 'id' | 'created_by'
    >
  ): Promise<HouseholdInvitation> {
    const supabase = createClient()

    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession()

    if (sessionError || !session?.user) {
      throw new Error('Authentication required to send invitations')
    }

    // Verify the user belongs to the household to avoid RLS failures
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('household_id')
      .eq('id', session.user.id)
      .single()

    if (profileError || !profile?.household_id) {
      throw new Error('You need to join a household before sending invites')
    }

    if (profile.household_id !== invite.household_id) {
      throw new Error('You can only send invites for your household')
    }

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
    const token =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : Math.random().toString(36).slice(2)

    const payload: HouseholdInvitationInsert = {
      household_id: invite.household_id,
      invited_email: invite.invited_email?.trim().toLowerCase() || null,
      invited_name: invite.invited_name?.trim() || null,
      message: invite.message?.trim() || null,
      created_by: session.user.id,
      status: 'pending',
      token,
      expires_at: expiresAt.toISOString(),
    }

    const { data, error } = await supabase
      .from('household_invitations')
      .insert(payload)
      .select()
      .single()

    if (error) {
      const message = error.message || 'Failed to create invite'
      if (
        error.code === '42501' ||
        message.toLowerCase().includes('row-level security')
      ) {
        throw new Error('You must belong to this household to send invites.')
      }
      throw new Error(`Failed to create invite: ${message}`)
    }

    return data
  }

  static async revokeHouseholdInvitation(
    inviteId: string
  ): Promise<HouseholdInvitation> {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('household_invitations')
      .update({ status: 'revoked' })
      .eq('id', inviteId)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to revoke invite: ${error.message}`)
    }

    return data
  }

  // Alias for compatibility
  static async updateUserProfile(
    userId: string,
    updates: UserProfileUpdate
  ): Promise<UserProfile> {
    return this.updateProfile(userId, updates)
  }

  // Saved Search Operations
  static async getUserSavedSearches(userId: string): Promise<SavedSearch[]> {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('saved_searches')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching saved searches:', error)
      return []
    }

    return data || []
  }

  static async updateSavedSearch(
    searchId: string,
    updates: SavedSearchUpdate
  ): Promise<SavedSearch | null> {
    const supabase = createClient()
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

  static async deleteSavedSearch(searchId: string): Promise<boolean> {
    const supabase = createClient()
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
}
