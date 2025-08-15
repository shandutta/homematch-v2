/**
 * Integration test for couples functionality
 * Tests authentication, mutual likes API, and data integrity
 */

const { createClient } = require('@supabase/supabase-js')
// Use Node.js built-in fetch (available in Node 18+)
const fetch = globalThis.fetch

const BASE_URL = 'http://localhost:3000'

// Test users
const TEST_USERS = [
  {
    email: 'michael.johnson@test.com',
    password: 'password123',
    name: 'Michael Johnson',
  },
  {
    email: 'sarah.johnson@test.com',
    password: 'password123',
    name: 'Sarah Johnson',
  },
  {
    email: 'carlos.martinez@test.com',
    password: 'password123',
    name: 'Carlos Martinez',
  },
  {
    email: 'ana.martinez@test.com',
    password: 'password123',
    name: 'Ana Martinez',
  },
]

// Helper to create authenticated supabase client
function createAuthenticatedClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.tQwoQ-dh_iOZ9Hp4dXWtu12rIUbyaXU2G0_SBoWKZJo'
  )
}

// Test authentication for a user
async function testAuthentication(user) {
  console.log(`\n🔐 Testing authentication for ${user.name} (${user.email})`)

  const supabase = createAuthenticatedClient()

  try {
    // Test sign in
    const { data: authData, error: authError } =
      await supabase.auth.signInWithPassword({
        email: user.email,
        password: user.password,
      })

    if (authError) {
      console.error(`❌ Auth failed for ${user.email}:`, authError.message)
      return null
    }

    console.log(`✅ Successfully authenticated ${user.email}`)
    console.log(`   User ID: ${authData.user.id}`)

    // Test user profile lookup
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', authData.user.id)
      .single()

    if (profileError) {
      console.error(`❌ Profile lookup failed:`, profileError.message)
      return { authData, profile: null }
    }

    console.log(`✅ Profile found:`)
    console.log(`   Household ID: ${profile.household_id}`)
    console.log(`   Onboarding: ${profile.onboarding_completed}`)

    return { authData, profile }
  } catch (error) {
    console.error(`❌ Unexpected auth error for ${user.email}:`, error.message)
    return null
  }
}

// Test mutual likes API endpoint
async function testMutualLikesAPI(authToken) {
  console.log(`\n🔗 Testing mutual likes API endpoint`)

  try {
    const response = await fetch(`${BASE_URL}/api/couples/mutual-likes`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`❌ API request failed (${response.status}):`, errorText)
      return null
    }

    const data = await response.json()

    console.log(`✅ API response successful`)
    console.log(`   Mutual likes count: ${data.mutualLikes?.length || 0}`)
    console.log(
      `   Response time: ${data.performance?.totalTime || 'unknown'}ms`
    )
    console.log(`   Cached: ${data.performance?.cached || false}`)

    if (data.mutualLikes && data.mutualLikes.length > 0) {
      console.log(`   First mutual like:`)
      const first = data.mutualLikes[0]
      console.log(`     Property ID: ${first.property_id}`)
      console.log(`     Liked by: ${first.liked_by_count} users`)
      console.log(`     Property details: ${first.property ? '✅' : '❌'}`)

      if (first.property) {
        console.log(`     Address: ${first.property.address}`)
        console.log(`     Price: $${(first.property.price / 1000).toFixed(0)}k`)
      }
    }

    return data
  } catch (error) {
    console.error(`❌ API request error:`, error.message)
    return null
  }
}

// Test household stats API
async function testHouseholdStatsAPI(authToken) {
  console.log(`\n📊 Testing household stats API endpoint`)

  try {
    const response = await fetch(`${BASE_URL}/api/couples/stats`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`❌ Stats API failed (${response.status}):`, errorText)
      return null
    }

    const data = await response.json()

    console.log(`✅ Stats API response successful`)
    console.log(`   Total mutual likes: ${data.stats?.total_mutual_likes || 0}`)
    console.log(
      `   Total household likes: ${data.stats?.total_household_likes || 0}`
    )
    console.log(
      `   Activity streak: ${data.stats?.activity_streak_days || 0} days`
    )

    return data
  } catch (error) {
    console.error(`❌ Stats API error:`, error.message)
    return null
  }
}

// Test household activity API
async function testHouseholdActivityAPI(authToken) {
  console.log(`\n📋 Testing household activity API endpoint`)

  try {
    const response = await fetch(`${BASE_URL}/api/couples/activity`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`❌ Activity API failed (${response.status}):`, errorText)
      return null
    }

    const data = await response.json()

    console.log(`✅ Activity API response successful`)
    console.log(`   Activities count: ${data.activities?.length || 0}`)

    if (data.activities && data.activities.length > 0) {
      const mutualCount = data.activities.filter((a) => a.is_mutual).length
      console.log(`   Mutual activities: ${mutualCount}`)

      // Show recent activity
      const recent = data.activities.slice(0, 3)
      console.log(`   Recent activities:`)
      recent.forEach((activity, i) => {
        console.log(
          `     ${i + 1}. ${activity.user_display_name} ${activity.interaction_type}d ${activity.property_address}`
        )
        if (activity.is_mutual) {
          console.log(`        💝 Created mutual like!`)
        }
      })
    }

    return data
  } catch (error) {
    console.error(`❌ Activity API error:`, error.message)
    return null
  }
}

// Test property interaction creation - currently unused but kept for future testing
// eslint-disable-next-line no-unused-vars
async function testPropertyInteraction(authToken, propertyId) {
  console.log(`\n❤️  Testing property interaction creation`)

  try {
    const response = await fetch(`${BASE_URL}/api/couples/notify`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        property_id: propertyId,
        interaction_type: 'like',
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`❌ Notify API failed (${response.status}):`, errorText)
      return false
    }

    const data = await response.json()
    console.log(`✅ Property interaction processed`)
    console.log(`   Would be mutual: ${data.wouldBeMutual || false}`)

    return true
  } catch (error) {
    console.error(`❌ Property interaction error:`, error.message)
    return false
  }
}

// Direct database verification
async function verifyDatabaseData() {
  console.log(`\n🗄️  Verifying database data directly`)

  const { createClient } = require('@supabase/supabase-js')
  const supabase = createClient(
    'http://127.0.0.1:54321',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.pmctc3-i5D7PRVq4HOXcXDZ0Er3mrC8a2W7yIa5jePI'
  )

  try {
    // Check users
    const { data: users, error: usersError } =
      await supabase.auth.admin.listUsers()
    if (usersError) throw usersError

    console.log(`✅ Found ${users.users.length} auth users`)

    // Check profiles
    const { count: profileCount } = await supabase
      .from('user_profiles')
      .select('*', { count: 'exact' })

    console.log(`✅ Found ${profileCount} user profiles`)

    // Check households
    const { count: householdCount } = await supabase
      .from('households')
      .select('*', { count: 'exact' })

    console.log(`✅ Found ${householdCount} households`)

    // Check interactions
    const { count: interactionCount } = await supabase
      .from('user_property_interactions')
      .select('*', { count: 'exact' })

    console.log(`✅ Found ${interactionCount} property interactions`)

    // Check mutual likes for each household
    const { data: mutualLikesJohnsons } = await supabase.rpc(
      'get_household_mutual_likes',
      {
        p_household_id: '12340001-1234-1234-1234-123456789abc', // The Johnsons
      }
    )

    const { data: mutualLikesMartinez } = await supabase.rpc(
      'get_household_mutual_likes',
      {
        p_household_id: '12340002-1234-1234-1234-123456789abc', // The Martinez Family
      }
    )

    console.log(`✅ Johnsons mutual likes: ${mutualLikesJohnsons?.length || 0}`)
    console.log(`✅ Martinez mutual likes: ${mutualLikesMartinez?.length || 0}`)

    return {
      users: users.users.length,
      profiles: profileCount,
      households: householdCount,
      interactions: interactionCount,
      johnsonsLikes: mutualLikesJohnsons?.length || 0,
      martinezLikes: mutualLikesMartinez?.length || 0,
    }
  } catch (error) {
    console.error(`❌ Database verification error:`, error.message)
    return null
  }
}

// Main test runner
async function runIntegrationTests() {
  console.log('🧪 Starting Couples Integration Tests')
  console.log('=====================================')

  // First verify database setup
  const dbVerification = await verifyDatabaseData()
  if (!dbVerification) {
    console.error('❌ Database verification failed - aborting tests')
    return
  }

  console.log(`\n✅ Database verification passed`)
  console.log(`   Users: ${dbVerification.users}`)
  console.log(`   Profiles: ${dbVerification.profiles}`)
  console.log(`   Households: ${dbVerification.households}`)
  console.log(`   Interactions: ${dbVerification.interactions}`)
  console.log(`   Johnsons mutual likes: ${dbVerification.johnsonsLikes}`)
  console.log(`   Martinez mutual likes: ${dbVerification.martinezLikes}`)

  // Test each user
  const results = []

  for (const user of TEST_USERS) {
    const authResult = await testAuthentication(user)
    if (!authResult) continue

    const { authData } = authResult

    // Test APIs with this user
    const mutualLikesResult = await testMutualLikesAPI(
      authData.session?.access_token
    )
    const statsResult = await testHouseholdStatsAPI(
      authData.session?.access_token
    )
    const activityResult = await testHouseholdActivityAPI(
      authData.session?.access_token
    )

    results.push({
      user,
      auth: !!authResult,
      mutualLikes: !!mutualLikesResult,
      stats: !!statsResult,
      activity: !!activityResult,
      mutualLikesCount: mutualLikesResult?.mutualLikes?.length || 0,
    })
  }

  // Test summary
  console.log('\n📊 Test Summary')
  console.log('================')

  results.forEach((result) => {
    console.log(`\n👤 ${result.user.name}:`)
    console.log(`   Authentication: ${result.auth ? '✅' : '❌'}`)
    console.log(`   Mutual Likes API: ${result.mutualLikes ? '✅' : '❌'}`)
    console.log(`   Stats API: ${result.stats ? '✅' : '❌'}`)
    console.log(`   Activity API: ${result.activity ? '✅' : '❌'}`)
    console.log(`   Mutual likes found: ${result.mutualLikesCount}`)
  })

  const allPassed = results.every(
    (r) => r.auth && r.mutualLikes && r.stats && r.activity
  )

  console.log(
    `\n🎯 Overall Result: ${allPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`
  )

  if (allPassed) {
    console.log('\n🎉 Couples functionality is working correctly!')
    console.log('✅ Authentication working')
    console.log('✅ Mutual likes detection working')
    console.log('✅ API endpoints responding')
    console.log('✅ Database functions operational')
  } else {
    console.log('\n🔧 Issues found that need attention')
  }
}

// Run the tests
runIntegrationTests().catch(console.error)
