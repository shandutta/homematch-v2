'use client'

import { createClient } from '@/lib/supabase/client'
import {
  UserProfile,
  UserProfileInsert,
  UserProfileUpdate,
  Household,
  HouseholdInsert,
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
    const { data, error } = await supabase
      .from('households')
      .insert(household)
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
