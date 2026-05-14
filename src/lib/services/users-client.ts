/* eslint-disable @typescript-eslint/consistent-type-assertions */
// Casts: API route JSON responses are owned in this repo and their shapes are
// enforced by the route handler. Casting once at the boundary beats threading
// a Zod schema through every call site.
//
// TODO(D1 follow-up, post-Phase-5): every method below that calls
// `createClient()` and then hits `user_profiles`, `households`,
// `saved_searches`, or `household_invitations` directly is broken for
// Clerk users. The browser anon-key client has no Supabase session, so
// `auth.uid()` is NULL — pre-Phase-5 it returned 0 rows via the
// `auth.uid() = id`/`= user_id` policies; post-Phase-5 (RLS policies
// dropped) it RLS-denies outright. Same end-user outcome (broken),
// just made explicit by Phase 5. Migrate each method to a Clerk-aware
// /api/* route that bridges through service-role + capability
// allowlist (see /api/households for the pattern). Codex flagged
// `createHousehold` (post-create read), `joinHousehold` /
// `leaveHousehold` (profile read+update), `updateProfile`,
// `getProfile`, `createProfile`, `getHouseholdInvitations`,
// `revokeHouseholdInvitation`, and all four `*SavedSearch*` methods.
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
  SavedSearchInsert,
  SavedSearchUpdate,
} from '@/types/database'

export class UserServiceClient {
  static async updateProfile(
    userId: string,
    updates: UserProfileUpdate
  ): Promise<UserProfile> {
    const supabase = await createClient()

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
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('user_profiles')
      .select(
        'clerk_user_id, created_at, display_name, email, household_id, id, onboarding_completed, preferences, updated_at'
      )
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
    const supabase = await createClient()

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
  /**
   * Creates a household for the current user via the Clerk-aware
   * /api/households route, which calls the new
   * create_household_by_user_id(UUID, TEXT) RPC under service-role with the
   * verified profile UUID.
   *
   * HOUSEHOLD-001: previously this called supabase.rpc('create_household_for_user')
   * which read auth.uid() — null for Clerk users — and 400'd every request,
   * blocking the matching feature for every Clerk signup.
   */
  static async createHousehold(household: HouseholdInsert): Promise<Household> {
    const res = await fetch('/api/households', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: household.name || null }),
    })
    if (!res.ok) {
      const message = await res
        .json()
        .then((j) => (typeof j?.error === 'string' ? j.error : null))
        .catch(() => null)
      throw new Error(
        message || `Failed to create household: HTTP ${res.status}`
      )
    }
    const body = (await res.json()) as { id?: string }
    const resolvedHouseholdId = typeof body.id === 'string' ? body.id : null
    if (!resolvedHouseholdId) {
      throw new Error('Failed to create household: no ID returned')
    }

    // Fetch the created household to return full data. RLS allows the
    // member to SELECT their own household, so the anon client is fine here.
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('households')
      .select()
      .eq('id', resolvedHouseholdId)
      .single()
    if (error) {
      throw new Error(`Failed to fetch created household: ${error.message}`)
    }
    return data
  }

  static async joinHousehold(
    userId: string,
    householdId: string
  ): Promise<UserProfile> {
    const supabase = await createClient()

    const { data: existingProfile, error: existingProfileError } =
      await supabase
        .from('user_profiles')
        .select('household_id')
        .eq('id', userId)
        .single()

    if (existingProfileError) {
      throw new Error(
        `Failed to load your profile before joining: ${existingProfileError.message}`
      )
    }

    if (existingProfile?.household_id) {
      if (existingProfile.household_id === householdId) {
        const profile = await this.getProfile(userId)
        if (!profile) {
          throw new Error('Failed to load profile after joining household')
        }
        return profile
      }

      throw new Error(
        'You already belong to a household. Leave it before joining another.'
      )
    }

    const { data: updatedProfile, error: updateProfileError } = await supabase
      .from('user_profiles')
      .update({ household_id: householdId })
      .eq('id', userId)
      .select()
      .single()

    if (updateProfileError) {
      throw new Error(`Failed to join household: ${updateProfileError.message}`)
    }

    return updatedProfile
  }

  static async leaveHousehold(userId: string): Promise<UserProfile> {
    const supabase = await createClient()

    const { data: existingProfile, error: existingProfileError } =
      await supabase
        .from('user_profiles')
        .select('household_id')
        .eq('id', userId)
        .single()

    if (existingProfileError) {
      throw new Error(
        `Failed to load your profile before leaving: ${existingProfileError.message}`
      )
    }

    const householdId = existingProfile?.household_id
    if (!householdId) {
      const profile = await this.getProfile(userId)
      if (!profile) {
        throw new Error('Failed to load profile after leaving household')
      }
      return profile
    }

    const { data: updatedProfile, error: updateProfileError } = await supabase
      .from('user_profiles')
      .update({ household_id: null })
      .eq('id', userId)
      .select()
      .single()

    if (updateProfileError) {
      throw new Error(
        `Failed to leave household: ${updateProfileError.message}`
      )
    }

    return updatedProfile
  }

  // Household invitations
  static async getHouseholdInvitations(
    householdId: string
  ): Promise<HouseholdInvitation[]> {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('household_invitations')
      .select(
        'accepted_at, accepted_by, created_at, created_by, expires_at, household_id, id, invited_email, invited_name, message, status, token, updated_at'
      )
      .eq('household_id', householdId)
      .order('created_at', { ascending: false })

    if (error) {
      throw new Error(`Failed to load invites: ${error.message}`)
    }

    return data || []
  }

  /**
   * Creates a household invitation via the Clerk-aware
   * /api/households/invitations route.
   *
   * HOUSEHOLD-001: the prior anon-client path called supabase.auth.getSession()
   * (null for Clerk users) and INSERTed via the anon-key client (RLS-blocked).
   * Both checks failed for every Clerk-authenticated user.
   */
  static async createHouseholdInvitation(
    invite: Omit<
      HouseholdInvitationInsert,
      'status' | 'token' | 'created_at' | 'expires_at' | 'id' | 'created_by'
    >
  ): Promise<HouseholdInvitation> {
    const res = await fetch('/api/households/invitations', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        household_id: invite.household_id,
        invited_email: invite.invited_email?.trim().toLowerCase() || null,
        invited_name: invite.invited_name?.trim() || null,
        message: invite.message?.trim() || null,
      }),
    })
    if (!res.ok) {
      const message = await res
        .json()
        .then((j) => (typeof j?.error === 'string' ? j.error : null))
        .catch(() => null)
      throw new Error(message || `Failed to create invite: HTTP ${res.status}`)
    }
    const body = (await res.json()) as { invitation?: HouseholdInvitation }
    if (!body.invitation) {
      throw new Error('Failed to create invite: no invitation returned')
    }
    return body.invitation
  }

  static async revokeHouseholdInvitation(
    inviteId: string
  ): Promise<HouseholdInvitation> {
    const supabase = await createClient()
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
  static async createSavedSearch(
    search: SavedSearchInsert
  ): Promise<SavedSearch | null> {
    const supabase = await createClient()
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

  static async getUserSavedSearches(
    userId: string,
    options: { limit?: number; offset?: number } = {}
  ): Promise<SavedSearch[]> {
    // Per audit M15: support pagination. Limit clamped to [1, 200];
    // offset clamped to >= 0. Default limit = 50.
    const limit = Math.min(Math.max(options.limit ?? 50, 1), 200)
    const offset = Math.max(options.offset ?? 0, 0)

    const supabase = await createClient()
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

  static async updateSavedSearch(
    searchId: string,
    updates: SavedSearchUpdate
  ): Promise<SavedSearch | null> {
    const supabase = await createClient()
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
    const supabase = await createClient()
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
