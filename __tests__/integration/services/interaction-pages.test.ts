/**
 * Integration Tests for Property Interaction Pages
 *
 * Tests the complete workflow of property interactions:
 * - Liking properties
 * - Passing on properties
 * - Removing from likes (moves to passed)
 * - Liking from passed (moves to liked)
 * - Viewing properties
 *
 * These tests validate the actual database operations against Supabase.
 */

import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { describe, test, expect, beforeAll, afterEach } from 'vitest'

describe('Interaction Pages Integration Tests', () => {
  let supabase: ReturnType<typeof createClient<Database>>
  let testUserId: string | null = null
  let testPropertyId: string | null = null
  let testPropertyId2: string | null = null

  beforeAll(async () => {
    const supabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321'
    const supabaseKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseKey) {
      throw new Error('Missing Supabase key for integration tests')
    }

    supabase = createClient<Database>(supabaseUrl, supabaseKey)

    // Find a seeded test user (user_profiles is seeded in supabase/seed.sql)
    const { data: users } = await supabase
      .from('user_profiles')
      .select('id')
      .limit(1)

    if (users && users.length > 0) {
      testUserId = users[0].id
      console.log('Using existing user for testing:', testUserId)
    }

    // Find existing properties to test with
    const { data: properties } = await supabase
      .from('properties')
      .select('id')
      .eq('is_active', true)
      .limit(2)

    if (properties && properties.length >= 2) {
      testPropertyId = properties[0].id
      testPropertyId2 = properties[1].id
      console.log('Found test properties:', testPropertyId, testPropertyId2)
    } else if (properties && properties.length === 1) {
      testPropertyId = properties[0].id
      console.log('Found one test property:', testPropertyId)
    }
  })

  afterEach(async () => {
    // Clean up test interactions after each test
    if (testUserId && testPropertyId) {
      await supabase
        .from('user_property_interactions')
        .delete()
        .eq('user_id', testUserId)
        .eq('property_id', testPropertyId)
    }
    if (testUserId && testPropertyId2) {
      await supabase
        .from('user_property_interactions')
        .delete()
        .eq('user_id', testUserId)
        .eq('property_id', testPropertyId2)
    }
  })

  describe('Like Interaction', () => {
    test('should create a like interaction', async () => {
      if (!testUserId || !testPropertyId) {
        console.log('Skipping: missing test user or property')
        return
      }

      // Insert a like interaction
      const { data, error } = await supabase
        .from('user_property_interactions')
        .insert({
          user_id: testUserId,
          property_id: testPropertyId,
          interaction_type: 'like',
        })
        .select()
        .single()

      expect(error).toBeNull()
      expect(data).not.toBeNull()
      expect(data?.interaction_type).toBe('like')
      expect(data?.user_id).toBe(testUserId)
      expect(data?.property_id).toBe(testPropertyId)
    })

    test('should retrieve liked properties for a user', async () => {
      if (!testUserId || !testPropertyId) {
        console.log('Skipping: missing test user or property')
        return
      }

      // First, insert a like
      await supabase.from('user_property_interactions').insert({
        user_id: testUserId,
        property_id: testPropertyId,
        interaction_type: 'like',
      })

      // Query liked properties
      const { data: interactions, error } = await supabase
        .from('user_property_interactions')
        .select(
          `
          property_id,
          interaction_type,
          created_at,
          properties (*)
        `
        )
        .eq('user_id', testUserId)
        .eq('interaction_type', 'like')

      expect(error).toBeNull()
      expect(interactions).not.toBeNull()
      expect(interactions?.length).toBeGreaterThanOrEqual(1)

      const likedProperty = interactions?.find(
        (i) => i.property_id === testPropertyId
      )
      expect(likedProperty).toBeDefined()
      expect(likedProperty?.interaction_type).toBe('like')
    })
  })

  describe('Pass (Skip) Interaction', () => {
    test('should create a skip interaction', async () => {
      if (!testUserId || !testPropertyId) {
        console.log('Skipping: missing test user or property')
        return
      }

      const { data, error } = await supabase
        .from('user_property_interactions')
        .insert({
          user_id: testUserId,
          property_id: testPropertyId,
          interaction_type: 'skip',
        })
        .select()
        .single()

      expect(error).toBeNull()
      expect(data).not.toBeNull()
      expect(data?.interaction_type).toBe('skip')
    })

    test('should retrieve passed properties for a user', async () => {
      if (!testUserId || !testPropertyId) {
        console.log('Skipping: missing test user or property')
        return
      }

      // Insert a skip
      await supabase.from('user_property_interactions').insert({
        user_id: testUserId,
        property_id: testPropertyId,
        interaction_type: 'skip',
      })

      // Query skipped properties
      const { data: interactions, error } = await supabase
        .from('user_property_interactions')
        .select('property_id, interaction_type')
        .eq('user_id', testUserId)
        .eq('interaction_type', 'skip')

      expect(error).toBeNull()
      expect(interactions?.length).toBeGreaterThanOrEqual(1)
    })
  })

  describe('Remove from Likes (Move to Passed)', () => {
    test('should delete like and property no longer in liked list', async () => {
      if (!testUserId || !testPropertyId) {
        console.log('Skipping: missing test user or property')
        return
      }

      // First, like the property
      await supabase.from('user_property_interactions').insert({
        user_id: testUserId,
        property_id: testPropertyId,
        interaction_type: 'like',
      })

      // Verify it's in liked list
      const { data: likedBefore } = await supabase
        .from('user_property_interactions')
        .select('property_id')
        .eq('user_id', testUserId)
        .eq('property_id', testPropertyId)
        .eq('interaction_type', 'like')

      expect(likedBefore?.length).toBe(1)

      // Remove the like (delete the interaction)
      const { error: deleteError } = await supabase
        .from('user_property_interactions')
        .delete()
        .eq('user_id', testUserId)
        .eq('property_id', testPropertyId)

      expect(deleteError).toBeNull()

      // Verify it's no longer in liked list
      const { data: likedAfter } = await supabase
        .from('user_property_interactions')
        .select('property_id')
        .eq('user_id', testUserId)
        .eq('property_id', testPropertyId)
        .eq('interaction_type', 'like')

      expect(likedAfter?.length).toBe(0)
    })

    test('removing like should allow adding skip (simulating move to passed)', async () => {
      if (!testUserId || !testPropertyId) {
        console.log('Skipping: missing test user or property')
        return
      }

      // Like the property
      await supabase.from('user_property_interactions').insert({
        user_id: testUserId,
        property_id: testPropertyId,
        interaction_type: 'like',
      })

      // Delete the like
      await supabase
        .from('user_property_interactions')
        .delete()
        .eq('user_id', testUserId)
        .eq('property_id', testPropertyId)

      // Add skip (this happens automatically in the app when "remove from likes" is clicked)
      const { data, error } = await supabase
        .from('user_property_interactions')
        .insert({
          user_id: testUserId,
          property_id: testPropertyId,
          interaction_type: 'skip',
        })
        .select()
        .single()

      expect(error).toBeNull()
      expect(data?.interaction_type).toBe('skip')

      // Verify it's in passed list
      const { data: passed } = await supabase
        .from('user_property_interactions')
        .select('property_id')
        .eq('user_id', testUserId)
        .eq('property_id', testPropertyId)
        .eq('interaction_type', 'skip')

      expect(passed?.length).toBe(1)
    })
  })

  describe('Like from Passed (Move to Liked)', () => {
    test('should update skip to like when re-liking a passed property', async () => {
      if (!testUserId || !testPropertyId) {
        console.log('Skipping: missing test user or property')
        return
      }

      // First, skip the property
      await supabase.from('user_property_interactions').insert({
        user_id: testUserId,
        property_id: testPropertyId,
        interaction_type: 'skip',
      })

      // Delete existing interaction
      await supabase
        .from('user_property_interactions')
        .delete()
        .eq('user_id', testUserId)
        .eq('property_id', testPropertyId)

      // Insert new like
      const { data, error } = await supabase
        .from('user_property_interactions')
        .insert({
          user_id: testUserId,
          property_id: testPropertyId,
          interaction_type: 'like',
        })
        .select()
        .single()

      expect(error).toBeNull()
      expect(data?.interaction_type).toBe('like')

      // Verify it's now in liked list
      const { data: liked } = await supabase
        .from('user_property_interactions')
        .select('property_id')
        .eq('user_id', testUserId)
        .eq('property_id', testPropertyId)
        .eq('interaction_type', 'like')

      expect(liked?.length).toBe(1)

      // Verify it's NOT in passed list
      const { data: passed } = await supabase
        .from('user_property_interactions')
        .select('property_id')
        .eq('user_id', testUserId)
        .eq('property_id', testPropertyId)
        .eq('interaction_type', 'skip')

      expect(passed?.length).toBe(0)
    })
  })

  describe('View Interaction', () => {
    test('should create a view interaction', async () => {
      if (!testUserId || !testPropertyId) {
        console.log('Skipping: missing test user or property')
        return
      }

      const { data, error } = await supabase
        .from('user_property_interactions')
        .insert({
          user_id: testUserId,
          property_id: testPropertyId,
          interaction_type: 'view',
        })
        .select()
        .single()

      expect(error).toBeNull()
      expect(data?.interaction_type).toBe('view')
    })

    test('should retrieve viewed properties', async () => {
      if (!testUserId || !testPropertyId) {
        console.log('Skipping: missing test user or property')
        return
      }

      await supabase.from('user_property_interactions').insert({
        user_id: testUserId,
        property_id: testPropertyId,
        interaction_type: 'view',
      })

      const { data: views, error } = await supabase
        .from('user_property_interactions')
        .select('property_id, interaction_type')
        .eq('user_id', testUserId)
        .eq('interaction_type', 'view')

      expect(error).toBeNull()
      expect(views?.length).toBeGreaterThanOrEqual(1)
    })
  })

  describe('Interaction Summary', () => {
    test('should count interactions correctly', async () => {
      if (!testUserId || !testPropertyId || !testPropertyId2) {
        console.log('Skipping: need test user and two properties')
        return
      }

      // Insert different interaction types
      await supabase.from('user_property_interactions').insert([
        {
          user_id: testUserId,
          property_id: testPropertyId,
          interaction_type: 'like',
        },
        {
          user_id: testUserId,
          property_id: testPropertyId2,
          interaction_type: 'skip',
        },
      ])

      // Count likes
      const { count: likeCount } = await supabase
        .from('user_property_interactions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', testUserId)
        .eq('interaction_type', 'like')

      // Count skips
      const { count: skipCount } = await supabase
        .from('user_property_interactions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', testUserId)
        .eq('interaction_type', 'skip')

      expect(likeCount).toBeGreaterThanOrEqual(1)
      expect(skipCount).toBeGreaterThanOrEqual(1)
    })
  })

  describe('Complete Workflow', () => {
    test('should handle complete like → remove → pass → like workflow', async () => {
      if (!testUserId || !testPropertyId) {
        console.log('Skipping: missing test user or property')
        return
      }

      // Step 1: Like the property
      await supabase.from('user_property_interactions').insert({
        user_id: testUserId,
        property_id: testPropertyId,
        interaction_type: 'like',
      })

      // Verify in liked
      let { data: current } = await supabase
        .from('user_property_interactions')
        .select('interaction_type')
        .eq('user_id', testUserId)
        .eq('property_id', testPropertyId)
        .single()

      expect(current?.interaction_type).toBe('like')

      // Step 2: Remove from likes (delete + add skip)
      await supabase
        .from('user_property_interactions')
        .delete()
        .eq('user_id', testUserId)
        .eq('property_id', testPropertyId)

      await supabase.from('user_property_interactions').insert({
        user_id: testUserId,
        property_id: testPropertyId,
        interaction_type: 'skip',
      })

      // Verify in passed
      ;({ data: current } = await supabase
        .from('user_property_interactions')
        .select('interaction_type')
        .eq('user_id', testUserId)
        .eq('property_id', testPropertyId)
        .single())

      expect(current?.interaction_type).toBe('skip')

      // Step 3: Like again from passed (delete + add like)
      await supabase
        .from('user_property_interactions')
        .delete()
        .eq('user_id', testUserId)
        .eq('property_id', testPropertyId)

      await supabase.from('user_property_interactions').insert({
        user_id: testUserId,
        property_id: testPropertyId,
        interaction_type: 'like',
      })

      // Verify back in liked
      ;({ data: current } = await supabase
        .from('user_property_interactions')
        .select('interaction_type')
        .eq('user_id', testUserId)
        .eq('property_id', testPropertyId)
        .single())

      expect(current?.interaction_type).toBe('like')
    })

    test('should handle multiple properties with different states', async () => {
      if (!testUserId || !testPropertyId || !testPropertyId2) {
        console.log('Skipping: need test user and two properties')
        return
      }

      // Like first property
      await supabase.from('user_property_interactions').insert({
        user_id: testUserId,
        property_id: testPropertyId,
        interaction_type: 'like',
      })

      // Skip second property
      await supabase.from('user_property_interactions').insert({
        user_id: testUserId,
        property_id: testPropertyId2,
        interaction_type: 'skip',
      })

      // Query all interactions
      const { data: interactions } = await supabase
        .from('user_property_interactions')
        .select('property_id, interaction_type')
        .eq('user_id', testUserId)
        .in('property_id', [testPropertyId, testPropertyId2])

      expect(interactions?.length).toBe(2)

      const likedProp = interactions?.find(
        (i) => i.property_id === testPropertyId
      )
      const skippedProp = interactions?.find(
        (i) => i.property_id === testPropertyId2
      )

      expect(likedProp?.interaction_type).toBe('like')
      expect(skippedProp?.interaction_type).toBe('skip')
    })
  })

  describe('Unique Constraint Handling', () => {
    test('should handle duplicate interaction attempts gracefully', async () => {
      if (!testUserId || !testPropertyId) {
        console.log('Skipping: missing test user or property')
        return
      }

      // First like
      const { error: firstError } = await supabase
        .from('user_property_interactions')
        .insert({
          user_id: testUserId,
          property_id: testPropertyId,
          interaction_type: 'like',
        })

      expect(firstError).toBeNull()

      // Attempting to insert another like should fail with unique constraint
      // The app handles this by deleting first, but the DB should enforce uniqueness
      const { error: secondError } = await supabase
        .from('user_property_interactions')
        .insert({
          user_id: testUserId,
          property_id: testPropertyId,
          interaction_type: 'like',
        })

      // Should have an error (unique constraint violation)
      expect(secondError).not.toBeNull()
    })
  })
})
